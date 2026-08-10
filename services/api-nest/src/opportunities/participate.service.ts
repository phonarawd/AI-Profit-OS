/**
 * Engine §48.13.1 · POST /opportunities/:id/participate
 * P0b~P5 · participate_requests + trade_executions · idempotency_key
 * KYC 0 · practice/circuit/principal via RiskService · external HTTP 0
 * userId = JWT session only (§0.9.3)
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { join } from "node:path";
import { InProcessEventBus } from "../events/in-process.bus";
import { ExecutionPolicyAdminService } from "../execution-policy/execution-policy.admin.service";
import { LedgerBucketsService } from "../ledger/ledger.buckets.service";
import {
  assertAmountUsdt,
  cmpAmount,
  formatAmount,
  parseAmount,
} from "../ledger/ledger.money";
import {
  assertFingerprintMatch,
  fingerprintPayload,
  participateSemantic,
} from "../ledger/idempotency-fingerprint";
import { LedgerPostingService } from "../ledger/ledger.posting.service";
import { PostgresService } from "../db/postgres";
import { PreflightService } from "../loop/preflight.service";
import { RiskService } from "../risk/risk.service";
import {
  checkParticipateMembershipGuards,
  membershipDefaults,
  mergeEffectivePolicy,
} from "../membership/membership.mi";
import { OPPORTUNITY_EVENTS } from "./opportunities.events";

const req = createRequire(__filename);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const settlementRule = req(
  join(__dirname, "..", "..", "..", "engine-rust", "settlement_rule.cjs"),
) as {
  guardParticipate: (ctx: {
    matchBlocked?: boolean;
    compareReady?: boolean;
    nowMs: number;
    staleAtMs: number;
    priceStaleMaxSec?: number;
  }) => "OK" | "MATCH_BLOCKED" | "COMPARE_NOT_READY" | "PRICE_STALE_DATA";
  usdtGe: (a: string, b: string) => boolean;
  DEFAULT_PRICE_STALE_MAX_SEC: number;
};

export type ParticipateBody = {
  opportunityId?: string;
  pricingVersion?: number;
  minProfitUsdt?: string;
  amountUsdt?: string;
  idempotencyKey?: string;
  /** §51.24.2 / §48.13.1 P0 — Nest POST preflight 발급분만 유효 */
  preflightToken?: string;
};

export type ParticipateProof = {
  tradeId: string;
  pricingVersion: number;
  buyPriceUsdt: string;
  sellPriceUsdt: string;
  expectedProfitUsdt: string;
  fxSnapshotId: string;
  proofHash: string;
  capturedAt: string;
};

export type ParticipateResult = {
  ok: true;
  participateRequestId: string;
  tradeId: string;
  opportunityId: string;
  pricingVersion: number;
  expectedProfitUsdt: string;
  amountUsdt: string;
  status: "accepted";
  tradeStatus: "running";
  reused: boolean;
  priceSoftAccept: boolean;
  /** §51.16 proof-at-participate · stored on trade asset */
  proof?: ParticipateProof;
};

type OppRow = {
  id: string;
  pricing_version: number;
  expected_profit_usdt: string;
  required_capital_usdt: string;
  pricing: Record<string, unknown> | null;
  stale_at: Date;
  status: string;
  capital_band: string | null;
  asset_id: string;
  asset_label: string;
  category: string;
  fx_snapshot_id: string;
  execution_mode: string;
};

type ExistingParticipate = {
  id: string;
  trade_id: string | null;
  status: string;
  pricing_version: number;
  capital_usdt: string;
  opportunity_id: string;
  user_id: string;
  min_profit_usdt: string;
  request_fingerprint: string | null;
};

type ExistingTrade = {
  id: string;
  status: string;
  expected_profit_usdt: string;
  pricing_version: number;
};

@Injectable()
export class ParticipateService {
  constructor(
    private readonly db: PostgresService,
    private readonly buckets: LedgerBucketsService,
    private readonly posting: LedgerPostingService,
    private readonly risk: RiskService,
    private readonly executionPolicy: ExecutionPolicyAdminService,
    private readonly bus: InProcessEventBus,
    private readonly preflight: PreflightService,
  ) {}

  async participate(
    userId: string,
    pathOpportunityId: string,
    body: ParticipateBody,
  ): Promise<ParticipateResult> {
    this.assertSessionUserId(userId);

    const validated = this.validateBody(body);
    if (validated.opportunityId !== pathOpportunityId) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        toastCode: "VALIDATION_ERROR",
        message: "opportunityId must match path :id",
        statusCode: 400,
      });
    }

    // P0 — UI §51.24 PreCTA · missing/invalid → 412 PREFLIGHT_REQUIRED
    this.preflight.assertValid(
      userId,
      pathOpportunityId,
      validated.preflightToken,
    );

    const opp = await this.loadOpportunity(pathOpportunityId);
    if (!opp) throw new NotFoundException("opportunity not found");
    if (opp.status !== "available" || opp.execution_mode !== "orchestrate") {
      throw new ConflictException({
        code: "OPPORTUNITY_EXPIRED",
        toastCode: "OPPORTUNITY_EXPIRED",
        statusCode: 409,
      });
    }

    const hidden = await this.isHiddenForUser(userId, pathOpportunityId);
    if (hidden) throw new NotFoundException("opportunity not found");

    const expectedProfitUsdt = await this.resolveExpectedProfit(
      userId,
      pathOpportunityId,
      opp.expected_profit_usdt,
    );

    // P0b — matchBlocked
    const matchBlocked = await this.readMatchBlocked(userId);

    // P1 + P5 — compareReady · priceHardStale (no external API)
    const pricing = opp.pricing || {};
    const compareReady = Boolean(pricing.compareReady);
    const nowMs = Date.now();
    const staleAtMs = new Date(opp.stale_at).getTime();
    const guard = settlementRule.guardParticipate({
      matchBlocked,
      compareReady,
      nowMs,
      staleAtMs,
      priceStaleMaxSec: settlementRule.DEFAULT_PRICE_STALE_MAX_SEC,
    });
    if (guard === "MATCH_BLOCKED") {
      throw new ForbiddenException({
        code: "MATCH_BLOCKED",
        toastCode: "MATCH_BLOCKED",
        statusCode: 403,
      });
    }
    if (guard === "COMPARE_NOT_READY") {
      throw new ConflictException({
        code: "COMPARE_NOT_READY",
        toastCode: "COMPARE_NOT_READY",
        statusCode: 409,
      });
    }
    if (guard === "PRICE_STALE_DATA") {
      throw new ConflictException({
        code: "PRICE_STALE_DATA",
        toastCode: "PRICE_STALE_DATA",
        statusCode: 409,
      });
    }

    // P2 — practice / circuit / frozen · principal
    await this.risk.assertBeforeParticipate({
      userId,
      practiceDebitAttempt: false,
      requestedBucket: "principal",
    });

    let buckets;
    try {
      buckets = await this.buckets.getUserBuckets(userId);
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw new ForbiddenException({
          code: "INSUFFICIENT_PRINCIPAL",
          toastCode: "INSUFFICIENT_PRINCIPAL",
          statusCode: 403,
        });
      }
      throw e;
    }

    let amountUsdt: string;
    try {
      amountUsdt = assertAmountUsdt(validated.amountUsdt, "amountUsdt");
    } catch {
      throw new BadRequestException("amountUsdt must be decimal string > 0");
    }
    const required = formatAmount(parseAmount(opp.required_capital_usdt));
    if (cmpAmount(amountUsdt, required) !== 0) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        toastCode: "VALIDATION_ERROR",
        message: "amountUsdt must equal requiredCapitalUsdt",
        statusCode: 400,
      });
    }
    if (cmpAmount(amountUsdt, buckets.principalUsdt) > 0) {
      throw new ForbiddenException({
        code: "INSUFFICIENT_PRINCIPAL",
        toastCode: "INSUFFICIENT_PRINCIPAL",
        statusCode: 403,
      });
    }
    if (cmpAmount(buckets.principalUsdt, "0") <= 0) {
      throw new ForbiddenException({
        code: "INSUFFICIENT_BALANCE",
        toastCode: "INSUFFICIENT_BALANCE",
        statusCode: 403,
      });
    }

    const requestFingerprint = fingerprintPayload(
      participateSemantic({
        userId,
        opportunityId: validated.opportunityId,
        pricingVersion: validated.pricingVersion,
        minProfitUsdt: validated.minProfitUsdt,
        amountUsdt,
      }),
    );
    const existing = await this.findByIdempotency(
      validated.idempotencyKey,
      requestFingerprint,
    );
    if (existing) {
      return existing;
    }

    const { policy } = await this.executionPolicy.get();

    // Membership daily/band guards (§0.0.7) — slots = real per-opportunity count (P2-1)
    await this.assertMembershipGuards(userId, opp.id, opp.capital_band, policy);

    // P4 — priceSoftAccept (§43 · ≠ Soft60)
    const versionOk = validated.pricingVersion === opp.pricing_version;
    const softAccept =
      !versionOk &&
      settlementRule.usdtGe(expectedProfitUsdt, validated.minProfitUsdt) &&
      this.withinSlippageBound(
        expectedProfitUsdt,
        validated.minProfitUsdt,
        policy.slippageBoundBps,
      );
    if (!versionOk && !softAccept) {
      throw new ConflictException({
        code: "PRICE_STALE",
        toastCode: "PRICE_STALE",
        statusCode: 409,
      });
    }
    // Soft path still requires expected ≥ policy floor
    if (
      softAccept &&
      !settlementRule.usdtGe(expectedProfitUsdt, policy.minProfitUsdt)
    ) {
      throw new ConflictException({
        code: "PRICE_STALE",
        toastCode: "PRICE_STALE",
        statusCode: 409,
      });
    }

    const buyPriceUsdt = String(
      (pricing as Record<string, unknown>).buyPriceUsdt ??
        (pricing as Record<string, unknown>).buy_usdt ??
        "0",
    );
    const sellPriceUsdt = String(
      (pricing as Record<string, unknown>).sellPriceUsdt ??
        (pricing as Record<string, unknown>).sell_usdt ??
        "0",
    );

    try {
      return await this.insertAccepted({
        userId,
        opportunityId: pathOpportunityId,
        pricingVersion: opp.pricing_version,
        minProfitUsdt: validated.minProfitUsdt,
        amountUsdt,
        expectedProfitUsdt,
        buyPriceUsdt,
        sellPriceUsdt,
        idempotencyKey: validated.idempotencyKey,
        requestFingerprint,
        priceSoftAccept: softAccept,
        asset: {
          assetId: opp.asset_id,
          label: opp.asset_label,
          category: opp.category,
          fxSnapshotId: opp.fx_snapshot_id,
        },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/idempotency_key|unique/i.test(msg)) {
        const again = await this.findByIdempotency(
          validated.idempotencyKey,
          requestFingerprint,
        );
        if (again) return again;
        throw new ConflictException("idempotency conflict");
      }
      if (
        e instanceof ServiceUnavailableException ||
        e instanceof ForbiddenException ||
        e instanceof BadRequestException ||
        e instanceof ConflictException
      ) {
        throw e;
      }
      throw e;
    }
  }

  private validateBody(body: ParticipateBody): {
    opportunityId: string;
    pricingVersion: number;
    minProfitUsdt: string;
    amountUsdt: string;
    idempotencyKey: string;
    preflightToken: string;
  } {
    const opportunityId = String(body.opportunityId ?? "").trim();
    const pricingVersion = Number(body.pricingVersion);
    const minProfitUsdt = String(body.minProfitUsdt ?? "");
    const amountUsdt = String(body.amountUsdt ?? "");
    const idempotencyKey = String(body.idempotencyKey ?? "");
    const preflightToken = String(body.preflightToken ?? "").trim();

    if (!opportunityId) {
      throw new BadRequestException("opportunityId required");
    }
    if (
      !Number.isInteger(pricingVersion) ||
      pricingVersion < 1
    ) {
      throw new BadRequestException("pricingVersion must be integer ≥ 1");
    }
    if (!/^-?[0-9]+(\.[0-9]+)?$/.test(minProfitUsdt)) {
      throw new BadRequestException("minProfitUsdt must be decimal string");
    }
    if (!/^-?[0-9]+(\.[0-9]+)?$/.test(amountUsdt)) {
      throw new BadRequestException("amountUsdt must be decimal string");
    }
    if (idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }
    // Session SoT only — ignore any client-supplied identity fields
    return {
      opportunityId,
      pricingVersion,
      minProfitUsdt: formatAmount(parseAmount(minProfitUsdt)),
      amountUsdt,
      idempotencyKey,
      preflightToken,
    };
  }

  private assertSessionUserId(userId: string) {
    if (
      typeof userId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        userId,
      )
    ) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }
  }

  private async readMatchBlocked(userId: string): Promise<boolean> {
    const r = await this.db.query<{ match_blocked: boolean }>(
      `SELECT match_blocked
         FROM public.user_capability
        WHERE user_id = $1::uuid`,
      [userId],
    );
    return r.rows[0]?.match_blocked === true;
  }

  private async loadOpportunity(id: string): Promise<OppRow | null> {
    const { rows } = await this.db.query<OppRow>(
      `SELECT id::text, pricing_version, expected_profit_usdt::text,
              required_capital_usdt::text, pricing, stale_at, status,
              capital_band, asset_id, asset_label, category,
              fx_snapshot_id, execution_mode
         FROM public.opportunities
        WHERE id = $1::uuid`,
      [id],
    );
    return rows[0] ?? null;
  }

  private async isHiddenForUser(
    userId: string,
    opportunityId: string,
  ): Promise<boolean> {
    const r = await this.db.query<{ hidden: boolean }>(
      `SELECT hidden
         FROM public.user_opportunity_overrides
        WHERE user_id = $1::uuid AND opportunity_id = $2::uuid`,
      [userId, opportunityId],
    );
    return r.rows[0]?.hidden === true;
  }

  private async resolveExpectedProfit(
    userId: string,
    opportunityId: string,
    base: string,
  ): Promise<string> {
    const r = await this.db.query<{
      expected_profit_usdt_override: string | null;
    }>(
      `SELECT expected_profit_usdt_override::text
         FROM public.user_opportunity_overrides
        WHERE user_id = $1::uuid AND opportunity_id = $2::uuid`,
      [userId, opportunityId],
    );
    const ov = r.rows[0]?.expected_profit_usdt_override;
    if (ov != null && ov !== "") {
      return formatAmount(parseAmount(ov));
    }
    return formatAmount(parseAmount(base));
  }

  /**
   * Soft-accept slippage: expected must not sit more than bound below the
   * client's minProfit floor (bps of minProfit). Pure local math · HTTP 0.
   */
  private withinSlippageBound(
    expectedProfitUsdt: string,
    minProfitUsdt: string,
    slippageBoundBps: number,
  ): boolean {
    if (!settlementRule.usdtGe(expectedProfitUsdt, minProfitUsdt)) {
      return false;
    }
    const min = parseAmount(minProfitUsdt);
    const exp = parseAmount(expectedProfitUsdt);
    if (min <= 0n) return exp >= 0n;
    // expected already ≥ min ⇒ downside vs client floor is 0 → always in bound
    void slippageBoundBps;
    return true;
  }

  /**
   * P2-1 fix — real remaining capacity, not the global policy constant.
   * Counts concurrently running/requeue trades on THIS opportunity only.
   */
  private async countActiveTradesForOpportunity(
    opportunityId: string,
  ): Promise<number> {
    const r = await this.db.query<{ n: string }>(
      `SELECT count(*)::text AS n
         FROM public.trade_executions
        WHERE opportunity_id = $1::uuid
          AND status IN ('running', 'requeue')`,
      [opportunityId],
    );
    return Number(r.rows[0]?.n ?? 0);
  }

  private async assertMembershipGuards(
    userId: string,
    opportunityId: string,
    opportunityCapitalBand: string | null,
    policy: {
      dailyUserMatchCap: number;
      dailyOppSlotsDefault: number;
      membershipBandOverlayEnabled?: boolean;
      matchStrictness: string;
      minProfitUsdt: string;
      staleAllowanceSec: number;
      maxRematchCount: number;
      retryWaitSec: number;
      slippageBoundBps: number;
    },
  ): Promise<void> {
    const mem = await this.db.query<{
      membership: string;
      max_capital_band: string;
      daily_user_match_cap: number;
      daily_matches_used: number;
      match_strictness: string;
    }>(
      `SELECT membership, max_capital_band, daily_user_match_cap,
              daily_matches_used, match_strictness
         FROM public.user_membership
        WHERE user_id = $1::uuid`,
      [userId],
    );
    const row = mem.rows[0];
    const defaults = membershipDefaults("sprout");
    const membership = row?.membership ?? defaults.membership;
    const maxCapitalBand = row?.max_capital_band ?? defaults.maxCapitalBand;
    const dailyMatchesUsed = Number(row?.daily_matches_used ?? 0);

    const ov = await this.db.query<{
      match_strictness: string;
      min_profit_usdt: string | null;
      stale_allowance_sec: number | null;
      max_rematch_count: number | null;
      daily_user_match_cap: number | null;
    }>(
      `SELECT match_strictness, min_profit_usdt::text, stale_allowance_sec,
              max_rematch_count, daily_user_match_cap
         FROM public.user_match_policy_overrides
        WHERE user_id = $1::uuid`,
      [userId],
    );
    const override = ov.rows[0];
    const effective = mergeEffectivePolicy({
      basePolicy: {
        matchStrictness: policy.matchStrictness,
        minProfitUsdt: policy.minProfitUsdt,
        staleAllowanceSec: policy.staleAllowanceSec,
        maxRematchCount: policy.maxRematchCount,
        retryWaitSec: policy.retryWaitSec,
        slippageBoundBps: policy.slippageBoundBps,
        dailyUserMatchCap: policy.dailyUserMatchCap,
        dailyOppSlotsDefault: policy.dailyOppSlotsDefault,
      },
      membership,
      capitalBand: opportunityCapitalBand ?? "micro",
      membershipBandOverlayEnabled: policy.membershipBandOverlayEnabled === true,
      userOverride: override
        ? {
            matchStrictnessOverride: override.match_strictness,
            minProfitUsdt: override.min_profit_usdt ?? undefined,
            staleAllowanceSec: override.stale_allowance_sec ?? undefined,
            maxRematchCount: override.max_rematch_count ?? undefined,
            dailyUserMatchCap: override.daily_user_match_cap ?? undefined,
          }
        : undefined,
    }) as { dailyUserMatchCap?: number };

    const dailyOppSlotsDefault = Number(policy.dailyOppSlotsDefault) || 1;
    const activeTrades = await this.countActiveTradesForOpportunity(
      opportunityId,
    );
    const slotsLeft = Math.max(0, dailyOppSlotsDefault - activeTrades);

    const hit = checkParticipateMembershipGuards({
      opportunityCapitalBand: opportunityCapitalBand ?? "micro",
      maxCapitalBand,
      dailyMatchesUsed,
      dailyUserMatchCap:
        Number(effective.dailyUserMatchCap) ||
        Number(row?.daily_user_match_cap ?? defaults.dailyUserMatchCap),
      slotsLeft,
    });
    if (hit) {
      throw new ForbiddenException({
        code: hit.code,
        toastCode: hit.code,
        message: hit.message,
        statusCode: 403,
      });
    }
  }

  private async findByIdempotency(
    idempotencyKey: string,
    incomingFingerprint: string,
  ): Promise<ParticipateResult | null> {
    const pr = await this.db.query<ExistingParticipate>(
      `SELECT id::text, trade_id::text, status, pricing_version,
              capital_usdt::text, opportunity_id::text,
              user_id::text, min_profit_usdt::text, request_fingerprint
         FROM public.participate_requests
        WHERE idempotency_key = $1`,
      [idempotencyKey],
    );
    const row = pr.rows[0];
    if (!row || row.status !== "accepted" || !row.trade_id) return null;

    const stored =
      row.request_fingerprint?.trim() ||
      fingerprintPayload(
        participateSemantic({
          userId: row.user_id,
          opportunityId: row.opportunity_id,
          pricingVersion: row.pricing_version,
          minProfitUsdt: formatAmount(parseAmount(row.min_profit_usdt)),
          amountUsdt: formatAmount(parseAmount(row.capital_usdt)),
        }),
      );
    assertFingerprintMatch({ stored, incoming: incomingFingerprint });

    const tr = await this.db.query<ExistingTrade>(
      `SELECT id::text, status, expected_profit_usdt::text, pricing_version
         FROM public.trade_executions
        WHERE id = $1::uuid`,
      [row.trade_id],
    );
    const trade = tr.rows[0];
    if (!trade) return null;

    return {
      ok: true,
      participateRequestId: row.id,
      tradeId: trade.id,
      opportunityId: row.opportunity_id,
      pricingVersion: trade.pricing_version,
      expectedProfitUsdt: formatAmount(
        parseAmount(trade.expected_profit_usdt),
      ),
      amountUsdt: formatAmount(parseAmount(row.capital_usdt)),
      status: "accepted",
      tradeStatus: "running",
      reused: true,
      priceSoftAccept: false,
    };
  }

  private buildParticipateProof(input: {
    tradeId: string;
    pricingVersion: number;
    buyPriceUsdt: string;
    sellPriceUsdt: string;
    expectedProfitUsdt: string;
    fxSnapshotId: string;
    capturedAt: string;
  }): ParticipateProof {
    const canonical = JSON.stringify({
      tradeId: input.tradeId,
      pricingVersion: input.pricingVersion,
      buyPriceUsdt: input.buyPriceUsdt,
      sellPriceUsdt: input.sellPriceUsdt,
      expectedProfitUsdt: input.expectedProfitUsdt,
      fxSnapshotId: input.fxSnapshotId,
      capturedAt: input.capturedAt,
    });
    const proofHash = createHash("sha256").update(canonical).digest("hex");
    return { ...input, proofHash };
  }

  private async insertAccepted(input: {
    userId: string;
    opportunityId: string;
    pricingVersion: number;
    minProfitUsdt: string;
    amountUsdt: string;
    expectedProfitUsdt: string;
    buyPriceUsdt: string;
    sellPriceUsdt: string;
    idempotencyKey: string;
    requestFingerprint: string;
    priceSoftAccept: boolean;
    asset: {
      assetId: string;
      label: string;
      category: string;
      fxSnapshotId: string;
    };
  }): Promise<ParticipateResult> {
    // Lock capital principal → locked (§49) before trade rows
    const lockJournal = await this.posting.postJournal({
      idempotencyKey: `participate_lock:${input.idempotencyKey}`,
      journalType: "participate_lock",
      referenceType: "participate_request",
      referenceId: input.idempotencyKey,
      memo: "participate principal→locked",
      fxSnapshotId: input.asset.fxSnapshotId,
      createdBy: input.userId,
      lines: [
        {
          account: { userId: input.userId, bucket: "principal" },
          direction: "debit",
          amountUsdt: input.amountUsdt,
        },
        {
          account: { userId: input.userId, bucket: "locked" },
          direction: "credit",
          amountUsdt: input.amountUsdt,
        },
      ],
    });

    const created = await this.db.withTransaction(async (client) => {
      const capturedAt = new Date().toISOString();
      const tradeIns = await client.query<{ id: string }>(
        `INSERT INTO public.trade_executions (
           user_id, opportunity_id, pricing_version, status,
           expected_profit_usdt, idempotency_key, asset
         ) VALUES (
           $1::uuid, $2::uuid, $3, 'running',
           $4::numeric, $5, $6::jsonb
         )
         RETURNING id::text`,
        [
          input.userId,
          input.opportunityId,
          input.pricingVersion,
          input.expectedProfitUsdt,
          input.idempotencyKey,
          JSON.stringify({
            assetId: input.asset.assetId,
            label: input.asset.label,
            category: input.asset.category,
            priceSoftAccept: input.priceSoftAccept,
            lockJournalId: lockJournal.id,
          }),
        ],
      );
      const tradeId = tradeIns.rows[0]?.id;
      if (!tradeId) throw new ConflictException("trade insert failed");

      // §51.16 — every participate stores proof (SHA256 canonical JSON)
      const proof = this.buildParticipateProof({
        tradeId,
        pricingVersion: input.pricingVersion,
        buyPriceUsdt: input.buyPriceUsdt,
        sellPriceUsdt: input.sellPriceUsdt,
        expectedProfitUsdt: input.expectedProfitUsdt,
        fxSnapshotId: input.asset.fxSnapshotId,
        capturedAt,
      });
      await client.query(
        `UPDATE public.trade_executions
            SET asset = COALESCE(asset, '{}'::jsonb) || $2::jsonb
          WHERE id = $1::uuid`,
        [
          tradeId,
          JSON.stringify({ participateProof: proof, proofHash: proof.proofHash }),
        ],
      );

      const prIns = await client.query<{ id: string }>(
        `INSERT INTO public.participate_requests (
           user_id, opportunity_id, pricing_version, min_profit_usdt,
           capital_usdt, status, trade_id, idempotency_key, request_fingerprint
         ) VALUES (
           $1::uuid, $2::uuid, $3, $4::numeric,
           $5::numeric, 'accepted', $6::uuid, $7, $8
         )
         RETURNING id::text`,
        [
          input.userId,
          input.opportunityId,
          input.pricingVersion,
          input.minProfitUsdt,
          input.amountUsdt,
          tradeId,
          input.idempotencyKey,
          input.requestFingerprint,
        ],
      );
      const participateRequestId = prIns.rows[0]?.id;
      if (!participateRequestId) {
        throw new ConflictException("participate_request insert failed");
      }

      if (!lockJournal.reused) {
        await client.query(
          `UPDATE public.user_membership
              SET daily_matches_used = daily_matches_used + 1,
                  updated_at = now()
            WHERE user_id = $1::uuid`,
          [input.userId],
        );
      }

      return { tradeId, participateRequestId, proof };
    });

    if (!lockJournal.reused) {
      this.bus.emit(OPPORTUNITY_EVENTS.participateConfirmed, {
        userId: input.userId,
        opportunityId: input.opportunityId,
        tradeId: created.tradeId,
        participateRequestId: created.participateRequestId,
        amountUsdt: input.amountUsdt,
        expectedProfitUsdt: input.expectedProfitUsdt,
        pricingVersion: input.pricingVersion,
        priceSoftAccept: input.priceSoftAccept,
      });
    }

    return {
      ok: true,
      participateRequestId: created.participateRequestId,
      tradeId: created.tradeId,
      opportunityId: input.opportunityId,
      pricingVersion: input.pricingVersion,
      expectedProfitUsdt: input.expectedProfitUsdt,
      amountUsdt: input.amountUsdt,
      status: "accepted",
      tradeStatus: "running",
      reused: Boolean(lockJournal.reused),
      priceSoftAccept: input.priceSoftAccept,
      proof: created.proof,
    };
  }
}

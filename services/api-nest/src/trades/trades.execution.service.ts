/**
 * Engine §48.13 / §0.9 E-R5 — Nest → settlement_rule.cjs (Rust SSOT · FFI 0)
 * Soft60/Hard90 · REQUEUE · MATCH_TIMEOUT · MATCH_SUCCESS → settlement journal
 * SettlementCompletedFanout consumes ledger.journal.posted unchanged
 * FORBIDDEN inputs to Rule: ticker · mission · demo
 */

import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import { CLOCK, type Clock } from "../common/clock";
import { ExecutionPolicyAdminService } from "../execution-policy/execution-policy.admin.service";
import {
  cmpAmount,
  formatAmount,
  parseAmount,
} from "../ledger/ledger.money";
import { LedgerPostingService } from "../ledger/ledger.posting.service";
import {
  SYSTEM_ACCOUNT_CODES,
  type PostingLineInput,
} from "../ledger/ledger.types";
import { PostgresService } from "../db/postgres";
import { MoneyCircuitService } from "../risk/money-circuit.service";
import { RiskService } from "../risk/risk.service";
import {
  evaluatePayoutFeasibility,
  payoutFeasible,
} from "../simulation/simulation.engine";
import { SimulationAdminService } from "../simulation/simulation.admin.service";
import { toRulePolicy } from "../execution-policy/execution-policy.mi";
import { mergeEffectivePolicy } from "../membership/membership.mi";

const req = createRequire(__filename);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const settlementRule = req(
  join(__dirname, "..", "..", "..", "engine-rust", "settlement_rule.cjs"),
) as {
  SOFT_SEC: number;
  HARD_SEC: number;
  softDeadlineMs: (acceptedAtMs: number) => number;
  hardDeadlineMs: (acceptedAtMs: number) => number;
  evaluateExecution: (ctx: Record<string, unknown>) => string;
};

export type TradeExecutionState = {
  tradeId: string;
  opportunityId: string;
  pricingVersion: number;
  status:
    | "running"
    | "requeue"
    | "success"
    | "safe_stop"
    | "cancelled"
    | "failed";
  resultCode?:
    | "MATCH_SUCCESS"
    | "REQUEUE"
    | "PRICE_MOVED"
    | "BELOW_MIN_PROFIT"
    | "CANCELLED_BY_USER"
    | "CIRCUIT_OPEN"
    | "SYSTEM_FAILED"
    | "MATCH_TIMEOUT";
  stepIndex: 0 | 1 | 2 | 3 | 4;
  progressPct: number;
  logLine?: string;
  expectedProfitUsdt: string;
  settledProfitUsdt?: string;
  softDeadlineAt?: string;
  hardDeadlineAt?: string;
  rematchCount?: number;
  /** Phase0 channel marker — Phase1+ may switch to SSE without Rule changes */
  transport: "polling";
  asset: {
    id: string;
    label: string;
    iconUrl?: string;
    ref?: string;
  };
};

type TradeRow = {
  id: string;
  user_id: string;
  opportunity_id: string;
  pricing_version: number;
  status: TradeExecutionState["status"];
  result_code: TradeExecutionState["resultCode"] | null;
  step_index: number;
  progress_pct: string;
  log_line: string | null;
  expected_profit_usdt: string;
  settled_profit_usdt: string | null;
  ledger_journal_id: string | null;
  idempotency_key: string;
  asset: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

type OppRow = {
  id: string;
  status: string;
  pricing_version: number;
  expected_profit_usdt: string;
  required_capital_usdt: string;
  pricing: Record<string, unknown> | null;
  stale_at: Date;
  fx_snapshot_id: string;
  capital_band: string | null;
};

const TERMINAL_STATUSES = new Set([
  "success",
  "safe_stop",
  "cancelled",
  "failed",
]);

const LIST_LIMIT = 50;

@Injectable()
export class TradeExecutionService {
  constructor(
    private readonly db: PostgresService,
    private readonly posting: LedgerPostingService,
    private readonly risk: RiskService,
    private readonly circuit: MoneyCircuitService,
    private readonly executionPolicy: ExecutionPolicyAdminService,
    private readonly simulation: SimulationAdminService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async get(userId: string, tradeId: string): Promise<TradeExecutionState> {
    this.assertSessionUserId(userId);
    const trade = await this.loadTrade(tradeId, userId);
    if (!trade) throw new NotFoundException("trade not found");
    return this.toState(trade);
  }

  /** 기존 toState 투영만. 새 money 필드 0 · userId=JWT only */
  async list(userId: string): Promise<{ items: TradeExecutionState[] }> {
    this.assertSessionUserId(userId);
    const { rows } = await this.db.query<TradeRow>(
      `SELECT id::text, user_id::text, opportunity_id::text, pricing_version,
              status, result_code, step_index, progress_pct::text, log_line,
              expected_profit_usdt::text, settled_profit_usdt::text,
              ledger_journal_id::text, idempotency_key, asset,
              created_at, updated_at
         FROM public.trade_executions
        WHERE user_id = $1::uuid
        ORDER BY created_at DESC
        LIMIT $2`,
      [userId, LIST_LIMIT],
    );
    return { items: rows.map((row) => this.toState(row)) };
  }

  /**
   * Phase0 polling tick. Phase1+ realtime-service may fan the same state via SSE
   * — Rule evaluation + DB updates stay here (response channel swap only).
   */
  async executeTick(
    userId: string,
    tradeId: string,
  ): Promise<TradeExecutionState> {
    this.assertSessionUserId(userId);
    const trade = await this.loadTrade(tradeId, userId);
    if (!trade) throw new NotFoundException("trade not found");

    if (TERMINAL_STATUSES.has(trade.status)) {
      return this.toState(trade);
    }

    const nowMs = this.clock.nowMs();
    const acceptedAtMs = new Date(trade.created_at).getTime();
    const rematchCount = Number(trade.asset?.rematchCount ?? 0) || 0;

    const opp = await this.loadOpportunity(trade.opportunity_id);
    if (!opp) {
      return this.finalizeSafeStop(trade, "SYSTEM_FAILED", nowMs, acceptedAtMs);
    }

    const capital = await this.loadCapitalUsdt(trade.id, trade.user_id);
    const expectedProfitUsdt = await this.resolveExpectedProfit(
      trade.user_id,
      trade.opportunity_id,
      opp.expected_profit_usdt,
    );
    const pricing = opp.pricing || {};
    const compareReady = Boolean(pricing.compareReady);
    const listingLegsFresh = this.resolveListingLegsFresh(pricing, compareReady);
    const rulePolicy = await this.resolveRulePolicy(
      trade.user_id,
      opp.capital_band,
    );
    const circuit = await this.circuit.getState();
    const userState = await this.risk.getUserState(trade.user_id);
    const simulationPayoutFeasible = await this.resolveSimulationPayoutFeasible(
      trade.opportunity_id,
      compareReady,
    );

    // Rule context — ticker/mission/demo MUST NOT appear as inputs
    const ctx = {
      nowMs,
      participateAcceptedAtMs: acceptedAtMs,
      circuitStatus: circuit.open === true ? "open" : "closed",
      userStatus: userState.status,
      opportunityStatus: opp.status,
      compareReady,
      staleAtMs: new Date(opp.stale_at).getTime(),
      expectedProfitUsdt,
      tradePricingVersion: trade.pricing_version,
      opportunityPricingVersion: opp.pricing_version,
      simulationPayoutFeasible,
      listingLegsFresh,
      rematchCount,
      policy: rulePolicy,
      // presentation ignored by Rule (§48.13) · presentation ≠ credit
      presentationDurationSec: 12,
    };

    const resultCode = settlementRule.evaluateExecution(ctx) as NonNullable<
      TradeExecutionState["resultCode"]
    >;

    if (resultCode === "MATCH_SUCCESS") {
      return this.finalizeMatchSuccess(trade, {
        nowMs,
        acceptedAtMs,
        expectedProfitUsdt,
        capitalUsdt: capital,
        platformMarginUsdt: String(pricing.platformMarginUsdt ?? "0"),
        fxSnapshotId: opp.fx_snapshot_id,
        rematchCount,
      });
    }

    if (resultCode === "REQUEUE") {
      return this.applyRequeue(trade, rematchCount, nowMs, acceptedAtMs);
    }

    // Terminal safe-stop / failed — unlock locked capital · credit 0
    return this.finalizeSafeStop(trade, resultCode, nowMs, acceptedAtMs, capital);
  }

  private async finalizeMatchSuccess(
    trade: TradeRow,
    input: {
      nowMs: number;
      acceptedAtMs: number;
      expectedProfitUsdt: string;
      capitalUsdt: string;
      platformMarginUsdt: string;
      fxSnapshotId: string;
      rematchCount: number;
    },
  ): Promise<TradeExecutionState> {
    if (trade.ledger_journal_id) {
      return this.toState(trade);
    }
    const deadlines = {
      softDeadlineAt: new Date(
        settlementRule.softDeadlineMs(input.acceptedAtMs),
      ).toISOString(),
      hardDeadlineAt: new Date(
        settlementRule.hardDeadlineMs(input.acceptedAtMs),
      ).toISOString(),
    };

    // Money-safety fix (PUTDUK continuation session, Step 7.2): claim the
    // terminal transition FIRST via this single atomic status-guarded
    // UPDATE, and only the caller that actually wins the claim (1 row
    // returned) may post the settlement journal below. The previous
    // ordering posted the journal unconditionally before this UPDATE ran,
    // so a concurrent finalizeSafeStop call racing on the same
    // still-"running" row (e.g. two overlapping polling ticks, or a
    // client retry-after-timeout racing the original in-flight request)
    // could both decide a terminal outcome and each post its own journal
    // (settlement:<tradeId> AND participate_unlock:<tradeId> - different
    // idempotency keys, so postJournal's own dedupe never catches this) -
    // double-crediting principal and leaving the locked bucket short.
    // Claiming atomically first makes that impossible: Postgres serializes
    // concurrent single-statement UPDATEs against the same row, so at most
    // one of the racing calls ever sees 1 row affected here.
    const asset = { ...trade.asset, rematchCount: input.rematchCount };
    const claimed = await this.db.query<TradeRow>(
      `UPDATE public.trade_executions
          SET status = 'success',
              result_code = 'MATCH_SUCCESS',
              step_index = 4,
              progress_pct = 100,
              log_line = $2,
              expected_profit_usdt = $3::numeric,
              settled_profit_usdt = $3::numeric,
              asset = $4::jsonb,
              updated_at = now()
        WHERE id = $1::uuid
          AND status IN ('running', 'requeue')
        RETURNING id::text, user_id::text, opportunity_id::text, pricing_version,
                  status, result_code, step_index, progress_pct::text, log_line,
                  expected_profit_usdt::text, settled_profit_usdt::text,
                  ledger_journal_id::text, idempotency_key, asset,
                  created_at, updated_at`,
      [trade.id, "MATCH_SUCCESS", input.expectedProfitUsdt, JSON.stringify(asset)],
    );

    if (claimed.rows.length === 0) {
      // Lost the race - some other concurrent call already finalized this
      // trade (to success, or to a different terminal result). Never post
      // a journal in this branch; return whatever the winner committed.
      const finalRow = (await this.reloadTrade(trade.id)) ?? trade;
      return this.toState(finalRow, deadlines);
    }

    const lines: PostingLineInput[] = [
      {
        account: { userId: trade.user_id, bucket: "locked" },
        direction: "debit",
        amountUsdt: input.capitalUsdt,
      },
      {
        account: { userId: trade.user_id, bucket: "principal" },
        direction: "credit",
        amountUsdt: input.capitalUsdt,
      },
      {
        account: { systemCode: SYSTEM_ACCOUNT_CODES.OPPORTUNITY_POOL },
        direction: "debit",
        amountUsdt: input.expectedProfitUsdt,
      },
      {
        account: { userId: trade.user_id, bucket: "profit" },
        direction: "credit",
        amountUsdt: input.expectedProfitUsdt,
      },
    ];
    if (cmpAmount(input.platformMarginUsdt, "0") > 0) {
      lines.push(
        {
          account: { systemCode: SYSTEM_ACCOUNT_CODES.OPPORTUNITY_POOL },
          direction: "debit",
          amountUsdt: formatAmount(parseAmount(input.platformMarginUsdt)),
        },
        {
          account: { systemCode: SYSTEM_ACCOUNT_CODES.FEE_REVENUE },
          direction: "credit",
          amountUsdt: formatAmount(parseAmount(input.platformMarginUsdt)),
        },
      );
    }

    // This call already exclusively owns the "success" claim above, so
    // idempotencyKey here is now belt-and-suspenders (a process crash
    // between the claim and this post is a separate durability gap -
    // Step 7.3 - not the concurrency race this fix closes).
    const journal = await this.posting.postJournal({
      idempotencyKey: `settlement:${trade.id}`,
      journalType: "settlement",
      referenceType: "trade",
      referenceId: trade.id,
      memo: "MATCH_SUCCESS settlement",
      fxSnapshotId: input.fxSnapshotId,
      createdBy: trade.user_id,
      lines,
    });

    // SettlementCompletedFanout listens to LEDGER_EVENTS.journalPosted — do not emit here

    const { rows } = await this.db.query<TradeRow>(
      `UPDATE public.trade_executions
          SET ledger_journal_id = $2::uuid,
              updated_at = now()
        WHERE id = $1::uuid
        RETURNING id::text, user_id::text, opportunity_id::text, pricing_version,
                  status, result_code, step_index, progress_pct::text, log_line,
                  expected_profit_usdt::text, settled_profit_usdt::text,
                  ledger_journal_id::text, idempotency_key, asset,
                  created_at, updated_at`,
      [trade.id, journal.id],
    );
    const finalRow = rows[0] ?? claimed.rows[0];
    return this.toState(finalRow, deadlines);
  }

  private async applyRequeue(
    trade: TradeRow,
    rematchCount: number,
    nowMs: number,
    acceptedAtMs: number,
  ): Promise<TradeExecutionState> {
    const nextRematch =
      trade.status === "requeue" ? rematchCount : rematchCount + 1;
    const presentation = this.presentationProgress(nowMs, acceptedAtMs);
    const asset = { ...trade.asset, rematchCount: nextRematch };
    // P1-3: status-guarded WHERE — see finalizeMatchSuccess comment.
    const { rows } = await this.db.query<TradeRow>(
      `UPDATE public.trade_executions
          SET status = 'requeue',
              result_code = 'REQUEUE',
              step_index = $2,
              progress_pct = $3,
              log_line = 'REQUEUE',
              asset = $4::jsonb,
              updated_at = now()
        WHERE id = $1::uuid
          AND status IN ('running', 'requeue')
        RETURNING id::text, user_id::text, opportunity_id::text, pricing_version,
                  status, result_code, step_index, progress_pct::text, log_line,
                  expected_profit_usdt::text, settled_profit_usdt::text,
                  ledger_journal_id::text, idempotency_key, asset,
                  created_at, updated_at`,
      [
        trade.id,
        presentation.stepIndex,
        presentation.progressPct,
        JSON.stringify(asset),
      ],
    );
    const finalRow = rows[0] ?? (await this.reloadTrade(trade.id)) ?? trade;
    return this.toState(finalRow, {
      softDeadlineAt: new Date(
        settlementRule.softDeadlineMs(acceptedAtMs),
      ).toISOString(),
      hardDeadlineAt: new Date(
        settlementRule.hardDeadlineMs(acceptedAtMs),
      ).toISOString(),
      rematchCount: nextRematch,
    });
  }

  private async finalizeSafeStop(
    trade: TradeRow,
    resultCode: NonNullable<TradeExecutionState["resultCode"]>,
    nowMs: number,
    acceptedAtMs: number,
    capitalUsdt?: string,
  ): Promise<TradeExecutionState> {
    const deadlines = {
      softDeadlineAt: new Date(
        settlementRule.softDeadlineMs(acceptedAtMs),
      ).toISOString(),
      hardDeadlineAt: new Date(
        settlementRule.hardDeadlineMs(acceptedAtMs),
      ).toISOString(),
    };
    const capital =
      capitalUsdt ?? (await this.loadCapitalUsdt(trade.id, trade.user_id));
    const status: TradeExecutionState["status"] =
      resultCode === "SYSTEM_FAILED" ? "failed" : "safe_stop";
    const presentation = this.presentationProgress(nowMs, acceptedAtMs);

    // Money-safety fix (PUTDUK continuation session, Step 7.2): claim the
    // terminal transition FIRST via this atomic status-guarded UPDATE -
    // see the matching comment in finalizeMatchSuccess for the exact race
    // this ordering closes (this call and a concurrent finalizeMatchSuccess
    // both reading the same still-"running" row could otherwise each post
    // their own journal for the same locked capital).
    const claimed = await this.db.query<TradeRow>(
      `UPDATE public.trade_executions
          SET status = $2,
              result_code = $3,
              step_index = $4,
              progress_pct = $5,
              log_line = $3,
              updated_at = now()
        WHERE id = $1::uuid
          AND status IN ('running', 'requeue')
        RETURNING id::text, user_id::text, opportunity_id::text, pricing_version,
                  status, result_code, step_index, progress_pct::text, log_line,
                  expected_profit_usdt::text, settled_profit_usdt::text,
                  ledger_journal_id::text, idempotency_key, asset,
                  created_at, updated_at`,
      [trade.id, status, resultCode, presentation.stepIndex, presentation.progressPct],
    );

    if (claimed.rows.length === 0) {
      // Lost the race - some other concurrent call already finalized this
      // trade. Never post an unlock journal in this branch.
      const finalRow = (await this.reloadTrade(trade.id)) ?? trade;
      return this.toState(finalRow, deadlines);
    }

    if (cmpAmount(capital, "0") <= 0 || trade.ledger_journal_id) {
      return this.toState(claimed.rows[0], deadlines);
    }

    const journal = await this.posting.postJournal({
      idempotencyKey: `participate_unlock:${trade.id}`,
      journalType: "participate_unlock",
      referenceType: "trade",
      referenceId: trade.id,
      memo: `safe_stop ${resultCode}`,
      createdBy: trade.user_id,
      lines: [
        {
          account: { userId: trade.user_id, bucket: "locked" },
          direction: "debit",
          amountUsdt: capital,
        },
        {
          account: { userId: trade.user_id, bucket: "principal" },
          direction: "credit",
          amountUsdt: capital,
        },
      ],
    });

    const { rows } = await this.db.query<TradeRow>(
      `UPDATE public.trade_executions
          SET ledger_journal_id = $2::uuid,
              updated_at = now()
        WHERE id = $1::uuid
        RETURNING id::text, user_id::text, opportunity_id::text, pricing_version,
                  status, result_code, step_index, progress_pct::text, log_line,
                  expected_profit_usdt::text, settled_profit_usdt::text,
                  ledger_journal_id::text, idempotency_key, asset,
                  created_at, updated_at`,
      [trade.id, journal.id],
    );
    const finalRow = rows[0] ?? claimed.rows[0];
    return this.toState(finalRow, deadlines);
  }

  private presentationProgress(
    nowMs: number,
    acceptedAtMs: number,
  ): { stepIndex: 0 | 1 | 2 | 3 | 4; progressPct: number } {
    const softMs = settlementRule.SOFT_SEC * 1000;
    const elapsed = Math.max(0, nowMs - acceptedAtMs);
    const ratio = Math.min(0.99, softMs > 0 ? elapsed / softMs : 0);
    const progressPct = Math.floor(ratio * 100);
    const stepIndex = Math.min(4, Math.floor(ratio * 5)) as 0 | 1 | 2 | 3 | 4;
    return { stepIndex, progressPct };
  }

  private resolveListingLegsFresh(
    pricing: Record<string, unknown>,
    compareReady: boolean,
  ): boolean {
    if (typeof pricing.listingLegsFresh === "boolean") {
      return pricing.listingLegsFresh;
    }
    // Day-1 local: both legs present + compareReady · external HTTP 0
    const buy = pricing.buyPriceUsdt != null && pricing.buyMarketId != null;
    const sell = pricing.sellPriceUsdt != null && pricing.sellMarketId != null;
    return compareReady && buy && sell && pricing.gradeMismatch !== true;
  }

  private async resolveSimulationPayoutFeasible(
    opportunityId: string,
    compareReady: boolean,
  ): Promise<boolean> {
    const latest = await this.simulation.latestOrNull();
    const feasibility = (
      latest?.report as
        | { feasibility?: Array<{ opportunityId: string; payoutFeasible: boolean }> }
        | undefined
    )?.feasibility;
    if (
      Array.isArray(feasibility) &&
      feasibility.some((f) => f.opportunityId === opportunityId)
    ) {
      return payoutFeasible(opportunityId, feasibility);
    }
    // No report row yet — live §51.4 evaluatePayoutFeasibility (HTTP 0)
    return evaluatePayoutFeasibility({
      opportunityId,
      compareReady,
    }).payoutFeasible;
  }

  private async resolveRulePolicy(
    userId: string,
    opportunityCapitalBand: string | null,
  ) {
    const { policy } = await this.executionPolicy.get();
    const mem = await this.db.query<{ membership: string }>(
      `SELECT membership
         FROM public.user_membership
        WHERE user_id = $1::uuid`,
      [userId],
    );
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
    const membership = mem.rows[0]?.membership ?? "sprout";
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
    });
    return toRulePolicy(effective);
  }

  private async loadTrade(
    tradeId: string,
    userId: string,
  ): Promise<TradeRow | null> {
    const { rows } = await this.db.query<TradeRow>(
      `SELECT id::text, user_id::text, opportunity_id::text, pricing_version,
              status, result_code, step_index, progress_pct::text, log_line,
              expected_profit_usdt::text, settled_profit_usdt::text,
              ledger_journal_id::text, idempotency_key, asset,
              created_at, updated_at
         FROM public.trade_executions
        WHERE id = $1::uuid AND user_id = $2::uuid`,
      [tradeId, userId],
    );
    return rows[0] ?? null;
  }

  /** P1-3 — fresh re-read after a status-guarded UPDATE affected 0 rows */
  private async reloadTrade(tradeId: string): Promise<TradeRow | null> {
    const { rows } = await this.db.query<TradeRow>(
      `SELECT id::text, user_id::text, opportunity_id::text, pricing_version,
              status, result_code, step_index, progress_pct::text, log_line,
              expected_profit_usdt::text, settled_profit_usdt::text,
              ledger_journal_id::text, idempotency_key, asset,
              created_at, updated_at
         FROM public.trade_executions
        WHERE id = $1::uuid`,
      [tradeId],
    );
    return rows[0] ?? null;
  }

  private async loadOpportunity(id: string): Promise<OppRow | null> {
    const { rows } = await this.db.query<OppRow>(
      `SELECT id::text, status, pricing_version, expected_profit_usdt::text,
              required_capital_usdt::text, pricing, stale_at, fx_snapshot_id,
              capital_band
         FROM public.opportunities
        WHERE id = $1::uuid`,
      [id],
    );
    return rows[0] ?? null;
  }

  private async loadCapitalUsdt(
    tradeId: string,
    userId: string,
  ): Promise<string> {
    const r = await this.db.query<{ capital_usdt: string }>(
      `SELECT capital_usdt::text
         FROM public.participate_requests
        WHERE trade_id = $1::uuid AND user_id = $2::uuid
        ORDER BY created_at DESC
        LIMIT 1`,
      [tradeId, userId],
    );
    if (r.rows[0]?.capital_usdt) {
      return formatAmount(parseAmount(r.rows[0].capital_usdt));
    }
    return "0";
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

  private toState(
    trade: TradeRow,
    extra?: Partial<TradeExecutionState>,
  ): TradeExecutionState {
    const acceptedAtMs = new Date(trade.created_at).getTime();
    const asset = trade.asset || {};
    return {
      tradeId: trade.id,
      opportunityId: trade.opportunity_id,
      pricingVersion: trade.pricing_version,
      status: trade.status,
      resultCode: trade.result_code ?? undefined,
      stepIndex: Math.min(4, Math.max(0, Number(trade.step_index) || 0)) as
        | 0
        | 1
        | 2
        | 3
        | 4,
      progressPct: Number(trade.progress_pct) || 0,
      logLine: trade.log_line ?? undefined,
      expectedProfitUsdt: formatAmount(parseAmount(trade.expected_profit_usdt)),
      settledProfitUsdt:
        trade.settled_profit_usdt != null
          ? formatAmount(parseAmount(trade.settled_profit_usdt))
          : undefined,
      softDeadlineAt: new Date(
        settlementRule.softDeadlineMs(acceptedAtMs),
      ).toISOString(),
      hardDeadlineAt: new Date(
        settlementRule.hardDeadlineMs(acceptedAtMs),
      ).toISOString(),
      rematchCount: Number(asset.rematchCount ?? 0) || 0,
      transport: "polling",
      asset: {
        id: String(asset.assetId ?? asset.id ?? trade.opportunity_id),
        label: String(asset.label ?? ""),
        ...(typeof asset.iconUrl === "string"
          ? { iconUrl: asset.iconUrl }
          : {}),
        ...(typeof asset.ref === "string" ? { ref: asset.ref } : {}),
      },
      ...extra,
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
}

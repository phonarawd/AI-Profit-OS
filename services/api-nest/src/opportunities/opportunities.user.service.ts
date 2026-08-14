/**
 * User opportunity feed · Engine §0.9 E-R3
 * DTO = schemas/opportunity-card.v1.json
 * Classification = buildBalanceAwareFeedWithOverrides
 * executionPlatforms / expectedSellDays = user surface 0
 * arbitrageTypeKo = DB pass-through
 */

import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import { CLOCK, Inject, type Clock } from "../common/clock";
import { ExecutionPolicyAdminService } from "../execution-policy/execution-policy.admin.service";
import { LedgerBucketsService } from "../ledger/ledger.buckets.service";
import { PostgresService } from "../db/postgres";
import { buildBalanceAwareFeedWithOverrides } from "./balance-aware-feed";
import {
  assetIconForCategory,
  isV1FeedArbitrageType,
  projectCapitalProviderUserSurface,
  V1_FEED_ARBITRAGE_TYPES,
  withTimeSensitiveTag,
} from "./opportunities.mi";
import type { UserOpportunityOverrideV1 } from "./user-opportunity-override.merge";

const req = createRequire(__filename);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const settlementRule = req(
  join(__dirname, "..", "..", "..", "engine-rust", "settlement_rule.cjs"),
) as {
  isPriceFresh: (ctx: {
    nowMs: number;
    staleAtMs: number;
    priceStaleMaxSec?: number;
  }) => boolean;
  DEFAULT_PRICE_STALE_MAX_SEC: number;
};

type OppUserRow = {
  id: string;
  asset_id: string;
  pricing_version: number;
  priced_at: Date;
  expected_profit_usdt: string;
  expected_profit_krw_approx: string | null;
  fx_snapshot_id: string;
  estimated_duration_sec: number;
  ai_confidence_score: string;
  difficulty: string;
  tags: string[] | null;
  required_capital_usdt: string;
  execution_mode: string;
  execution_platforms: string[] | null;
  category: string;
  asset_label: string;
  asset_image_url: string;
  asset_image_source: string;
  asset_image_alt_ko: string;
  arbitrage_type: string;
  arbitrage_type_ko: string;
  pricing: Record<string, unknown> | null;
  stale_at: Date;
  status: string;
  capital_band: string | null;
  sell_success_rate: string | null;
  sell_success_window_days: number | null;
  sell_success_as_of: Date | null;
  risk_score: number | null;
};

type OverrideRow = {
  user_id: string;
  opportunity_id: string;
  hidden: boolean;
  force_show: boolean;
  pin_order: number | null;
  margin_pct_override: string | null;
  expected_profit_usdt_override: string | null;
  capital_band_force: string | null;
  reason: string;
  updated_by_admin_id: string;
  updated_at: Date;
};

type ClassifiedSlice = {
  id: string;
  bucket: string;
  suggestDepositUsdt: string;
  forceShowPromoted: boolean;
  pinOrder: number | null;
  compareReady: boolean;
  capitalBand: string | null;
  aiPick: boolean;
  expectedProfitUsdt: string | null;
  marginPct: string | null;
  requiredCapitalUsdt: string;
  classificationOwner: string;
};

@Injectable()
export class OpportunitiesUserService {
  constructor(
    private readonly db: PostgresService,
    private readonly buckets: LedgerBucketsService,
    private readonly executionPolicy: ExecutionPolicyAdminService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * PTF-00C P0-E/C-01 — same canonical Clock seam + same canonical
   * DEFAULT_PRICE_STALE_MAX_SEC threshold participate uses. No duplicate
   * magic TTL. Participate remains the FINAL authority (a row read as fresh
   * here can still go stale between read and click) — this only stops an
   * *already*-stale row from ever entering the feed/detail response.
   */
  private isRowFresh(staleAt: Date): boolean {
    return settlementRule.isPriceFresh({
      nowMs: this.clock.nowMs(),
      staleAtMs: new Date(staleAt).getTime(),
      priceStaleMaxSec: settlementRule.DEFAULT_PRICE_STALE_MAX_SEC,
    });
  }

  async listFeed(userId: string) {
    this.assertSessionUserId(userId);
    const principalUsdt = await this.readPrincipalUsdt(userId);
    const { policy } = await this.executionPolicy.get();
    const allRows = await this.loadFeedCandidateRows();
    const rows = allRows.filter((r) => this.isRowFresh(r.stale_at));
    const overridesByOpportunityId = await this.loadOverridesMap(userId);

    const feed = buildBalanceAwareFeedWithOverrides({
      principalUsdt,
      cards: rows.map((r) => this.toFeedCardInput(r)),
      overridesByOpportunityId,
      executionPolicy: policy,
    });

    const byId = new Map(rows.map((r) => [r.id, r]));
    const items = (feed.items as ClassifiedSlice[])
      .map((classified) => {
        const row = byId.get(classified.id);
        if (!row) return null;
        return this.toUserCard(row, classified, {
          includePricing: false,
        });
      })
      .filter((x): x is Record<string, unknown> => x != null);

    return {
      principalUsdt: feed.principalUsdt,
      nearMissCapUsdt: feed.nearMissCapUsdt,
      classificationOwner: feed.classificationOwner,
      affordableCount: feed.affordableCount,
      nearMissCount: feed.nearMissCount,
      lockedHighCount: feed.lockedHighCount,
      hiddenCount: feed.hiddenCount,
      topSuggestDepositUsdt: feed.topSuggestDepositUsdt,
      v1FeedArbitrageTypes: [...V1_FEED_ARBITRAGE_TYPES],
      items,
    };
  }

  async getById(userId: string, opportunityId: string) {
    this.assertSessionUserId(userId);
    if (!opportunityId?.trim()) {
      throw new NotFoundException("opportunity not found");
    }

    const principalUsdt = await this.readPrincipalUsdt(userId);
    const { policy } = await this.executionPolicy.get();
    const row = await this.loadRowById(opportunityId);
    if (!row) throw new NotFoundException("opportunity not found");
    // PTF-00C P0-E/C-01 — getById follows the same freshness authority as
    // the feed (§12): an already-stale row is treated as not-found, exactly
    // like a hidden override, rather than silently showing stale money data.
    if (!this.isRowFresh(row.stale_at)) {
      throw new NotFoundException("opportunity not found");
    }

    const overridesByOpportunityId = await this.loadOverridesMap(userId, [
      opportunityId,
    ]);
    const ov = overridesByOpportunityId[opportunityId] ?? null;
    if (ov?.hidden === true) {
      throw new NotFoundException("opportunity not found");
    }

    const feed = buildBalanceAwareFeedWithOverrides({
      principalUsdt,
      cards: [this.toFeedCardInput(row)],
      overridesByOpportunityId,
      executionPolicy: policy,
    });
    const classified = (feed.items as ClassifiedSlice[])[0];
    if (!classified) {
      throw new NotFoundException("opportunity not found");
    }

    return {
      principalUsdt: feed.principalUsdt,
      nearMissCapUsdt: feed.nearMissCapUsdt,
      classificationOwner: feed.classificationOwner,
      item: this.toUserCard(row, classified, {
        includePricing: true,
      }),
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

  private async readPrincipalUsdt(userId: string): Promise<string> {
    try {
      const buckets = await this.buckets.getUserBuckets(userId);
      return buckets.principalUsdt;
    } catch (e) {
      if (e instanceof NotFoundException) return "0";
      throw e;
    }
  }

  private async loadFeedCandidateRows(): Promise<OppUserRow[]> {
    const { rows } = await this.db.query<OppUserRow>(
      `SELECT id::text, asset_id, pricing_version, priced_at,
              expected_profit_usdt::text, expected_profit_krw_approx::text,
              fx_snapshot_id, estimated_duration_sec,
              ai_confidence_score::text, difficulty, tags,
              required_capital_usdt::text, execution_mode, execution_platforms,
              category, asset_label, asset_image_url, asset_image_source,
              asset_image_alt_ko, arbitrage_type, arbitrage_type_ko,
              pricing, stale_at, status, capital_band,
              sell_success_rate::text, sell_success_window_days,
              sell_success_as_of, risk_score
         FROM public.opportunities
        WHERE status = 'available'
          AND execution_mode = 'orchestrate'
          AND COALESCE((pricing->>'compareReady')::boolean, false) = true
          AND arbitrage_type = ANY($1::text[])
          AND NULLIF(BTRIM(arbitrage_type_ko), '') IS NOT NULL
          AND NULLIF(BTRIM(asset_image_url), '') IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT 200`,
      [[...V1_FEED_ARBITRAGE_TYPES]],
    );
    return rows.filter((r) => isV1FeedArbitrageType(r.arbitrage_type));
  }

  private async loadRowById(id: string): Promise<OppUserRow | null> {
    const { rows } = await this.db.query<OppUserRow>(
      `SELECT id::text, asset_id, pricing_version, priced_at,
              expected_profit_usdt::text, expected_profit_krw_approx::text,
              fx_snapshot_id, estimated_duration_sec,
              ai_confidence_score::text, difficulty, tags,
              required_capital_usdt::text, execution_mode, execution_platforms,
              category, asset_label, asset_image_url, asset_image_source,
              asset_image_alt_ko, arbitrage_type, arbitrage_type_ko,
              pricing, stale_at, status, capital_band,
              sell_success_rate::text, sell_success_window_days,
              sell_success_as_of, risk_score
         FROM public.opportunities
        WHERE id = $1::uuid`,
      [id],
    );
    return rows[0] ?? null;
  }

  private async loadOverridesMap(
    userId: string,
    opportunityIds?: string[],
  ): Promise<Record<string, UserOpportunityOverrideV1 | null>> {
    const params: unknown[] = [userId];
    let sql = `SELECT user_id::text, opportunity_id::text, hidden, force_show,
                      pin_order, margin_pct_override::text,
                      expected_profit_usdt_override::text, capital_band_force,
                      reason, updated_by_admin_id::text, updated_at
                 FROM public.user_opportunity_overrides
                WHERE user_id = $1::uuid`;
    if (opportunityIds && opportunityIds.length > 0) {
      params.push(opportunityIds);
      sql += ` AND opportunity_id = ANY($2::uuid[])`;
    }
    const { rows } = await this.db.query<OverrideRow>(sql, params);
    const out: Record<string, UserOpportunityOverrideV1 | null> = {};
    for (const r of rows) {
      out[r.opportunity_id] = {
        userId: r.user_id,
        opportunityId: r.opportunity_id,
        hidden: r.hidden,
        forceShow: r.force_show,
        pinOrder: r.pin_order,
        marginPctOverride: r.margin_pct_override,
        expectedProfitUsdtOverride: r.expected_profit_usdt_override,
        capitalBandForce: (r.capital_band_force as
          | UserOpportunityOverrideV1["capitalBandForce"]
          | null) ?? null,
        reason: r.reason,
        updatedByAdminId: r.updated_by_admin_id,
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    }
    return out;
  }

  private toFeedCardInput(r: OppUserRow) {
    const pricing = r.pricing || {};
    const tags = Array.isArray(r.tags) ? r.tags : [];
    return {
      id: r.id,
      requiredCapitalUsdt: r.required_capital_usdt,
      expectedProfitUsdt: r.expected_profit_usdt,
      compareReady: Boolean(pricing.compareReady),
      capitalBand: r.capital_band,
      aiPick: tags.includes("ai_pick"),
      marginPct:
        pricing.adminMarginPct != null
          ? String(pricing.adminMarginPct)
          : pricing.marginPct != null
            ? String(pricing.marginPct)
            : null,
      status: r.status,
    };
  }

  private toUserCard(
    row: OppUserRow,
    classified: ClassifiedSlice,
    opts: { includePricing: boolean },
  ): Record<string, unknown> {
    const pricing = row.pricing || {};
    const tags = withTimeSensitiveTag(row.tags, {
      staleAt: row.stale_at,
    });

    const krwRaw = row.expected_profit_krw_approx;
    const expectedProfitKrwApprox =
      krwRaw != null && krwRaw !== "" ? Number(krwRaw) : 0;

    /** INTERNAL fields present before user strip (never leak to response) */
    const internal: Record<string, unknown> = {
      id: row.id,
      pricingVersion: row.pricing_version,
      pricedAt: new Date(row.priced_at).toISOString(),
      expectedProfitUsdt:
        classified.expectedProfitUsdt ?? row.expected_profit_usdt,
      expectedProfitKrwApprox: Number.isFinite(expectedProfitKrwApprox)
        ? expectedProfitKrwApprox
        : 0,
      fxSnapshotId: row.fx_snapshot_id,
      estimatedDurationSec: row.estimated_duration_sec,
      aiConfidenceScore: Number(row.ai_confidence_score),
      difficulty: row.difficulty,
      tags,
      requiredCapitalUsdt: classified.requiredCapitalUsdt,
      executionMode: row.execution_mode || "orchestrate",
      /** stripped for user — Admin/INTERNAL only */
      executionPlatforms: Array.isArray(row.execution_platforms)
        ? row.execution_platforms
        : [],
      category: row.category,
      assetId: row.asset_id,
      assetLabel: row.asset_label,
      assetImageUrl: row.asset_image_url,
      assetImageSource: row.asset_image_source,
      assetImageAltKo: row.asset_image_alt_ko || row.asset_label,
      assetIcon: assetIconForCategory(row.category),
      /** DB pass-through · UI hardcode map FORBIDDEN */
      arbitrageType: row.arbitrage_type,
      arbitrageTypeKo: row.arbitrage_type_ko,
      staleAt: new Date(row.stale_at).toISOString(),
      status: row.status,
    };

    if (row.sell_success_rate != null && row.sell_success_rate !== "") {
      internal.sellSuccessRate = Number(row.sell_success_rate);
    }
    if (row.sell_success_window_days != null) {
      internal.sellSuccessWindowDays = row.sell_success_window_days;
    }
    if (row.sell_success_as_of) {
      internal.sellSuccessAsOf = new Date(row.sell_success_as_of).toISOString();
    }
    if (row.risk_score != null) {
      internal.riskScore = row.risk_score;
    }
    if (opts.includePricing) {
      internal.pricing = pricing;
    }
    if (pricing.expectedSellDays != null) {
      internal.expectedSellDays = Number(pricing.expectedSellDays);
    }

    const userCard = projectCapitalProviderUserSurface(internal, {
      audience: "user",
    });

    return {
      ...userCard,
      bucket: classified.bucket,
      suggestDepositUsdt: classified.suggestDepositUsdt,
      forceShowPromoted: classified.forceShowPromoted,
      pinOrder: classified.pinOrder,
      compareReady: classified.compareReady,
      capitalBand: classified.capitalBand,
      aiPick: classified.aiPick,
      marginPct: classified.marginPct,
      classificationOwner: classified.classificationOwner,
    };
  }
}

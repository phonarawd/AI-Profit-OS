/**
 * Engine §0.9 Phase A — promote assets with live listings to opportunities.
 * INSERT only · existing rows never overwritten · ensureMinCatalog skip 유지.
 */
import { Injectable, Logger } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { InProcessEventBus } from "../events/in-process.bus";
import {
  buildOpportunityPromotionFromLiveListings,
  DAY1_FX_SNAPSHOT_ID,
  DEFAULT_BUY_MARKET,
  DEFAULT_SELL_MARKET,
} from "./opportunities.mi";
import { OPPORTUNITY_EVENTS } from "./opportunities.events";

type DbAssetRow = {
  asset_id: string;
  category: string;
  asset_label: string;
  image_url: string;
  image_source: string;
  image_alt_ko: string;
  meta: Record<string, unknown>;
};

type DbListingRow = {
  market_id: string;
  price_usdt: string;
  stale_at: Date;
  observed_at: Date;
};

export type OpportunityPromotionResult = {
  attempted: number;
  promoted: number;
  skipped: number;
};

@Injectable()
export class OpportunityPromotionService {
  private readonly logger = new Logger(OpportunityPromotionService.name);

  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
  ) {}

  /**
   * Assets with persisted listings but no opportunity row → INSERT when guards pass.
   */
  async promoteFromLiveListings(
    assetIds: string[],
  ): Promise<OpportunityPromotionResult> {
    if (!this.db.configured()) {
      return { attempted: 0, promoted: 0, skipped: 0 };
    }

    const unique = [
      ...new Set(
        assetIds.map((id) => String(id || "").trim()).filter((id) => id.length > 0),
      ),
    ];
    let promoted = 0;
    let skipped = 0;

    const fx = await this.resolveFxContext();
    if (!fx) {
      this.logger.warn("promotion skipped: fx_snapshots empty");
      return { attempted: unique.length, promoted: 0, skipped: unique.length };
    }

    for (const assetId of unique) {
      try {
        const didPromote = await this.promoteOneAsset(assetId, fx);
        if (didPromote) promoted += 1;
        else skipped += 1;
      } catch (e) {
        skipped += 1;
        this.logger.warn(
          `promotion skipped (fail-closed): asset=${assetId} err=${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }
    }

    return { attempted: unique.length, promoted, skipped };
  }

  private async resolveFxContext(): Promise<{
    fxSnapshotId: string;
    usdtKrw: string;
  } | null> {
    const { rows } = await this.db.query<{ id: string; usd_krw: string }>(
      `SELECT id, usd_krw::text
         FROM public.fx_snapshots
        ORDER BY captured_at DESC
        LIMIT 1`,
    );
    const row = rows[0];
    if (!row) return null;
    return { fxSnapshotId: row.id, usdtKrw: row.usd_krw };
  }

  private async promoteOneAsset(
    assetId: string,
    fx: { fxSnapshotId: string; usdtKrw: string },
  ): Promise<boolean> {
    const existing = await this.db.query<{ id: string }>(
      `SELECT id::text FROM public.opportunities WHERE asset_id = $1 LIMIT 1`,
      [assetId],
    );
    if (existing.rows[0]) return false;

    const assetRes = await this.db.query<DbAssetRow>(
      `SELECT asset_id, category, asset_label, image_url, image_source,
              image_alt_ko, meta
         FROM public.assets
        WHERE asset_id = $1`,
      [assetId],
    );
    const assetRow = assetRes.rows[0];
    if (!assetRow) return false;

    const listingsRes = await this.db.query<DbListingRow>(
      `SELECT market_id, price_usdt::text, stale_at, observed_at
         FROM public.listings
        WHERE asset_id = $1`,
      [assetId],
    );
    if (listingsRes.rows.length < 2) return false;

    const listings = listingsRes.rows.map((L) => ({
      marketId: L.market_id,
      priceUsdt: L.price_usdt,
      staleAt: L.stale_at.toISOString(),
      observedAt: L.observed_at.toISOString(),
    }));

    const built = buildOpportunityPromotionFromLiveListings({
      asset: {
        assetId: assetRow.asset_id,
        category: assetRow.category,
        assetLabel: assetRow.asset_label,
        imageUrl: assetRow.image_url,
        imageSource: assetRow.image_source,
        imageAltKo: assetRow.image_alt_ko,
        meta: assetRow.meta,
      },
      listings,
      buyMarketId: DEFAULT_BUY_MARKET,
      sellMarketId: DEFAULT_SELL_MARKET,
      fxSnapshotId: fx.fxSnapshotId || DAY1_FX_SNAPSHOT_ID,
      usdtKrw: fx.usdtKrw,
    });
    if (!built.ok) return false;

    const opp = built.opportunity as Record<string, unknown>;
    const pricing = opp.pricing as Record<string, unknown>;
    await this.db.query(
      `INSERT INTO public.opportunities (
         asset_id, pricing_version, priced_at, expected_profit_usdt,
         expected_profit_krw_approx, fx_snapshot_id, estimated_duration_sec,
         ai_confidence_score, difficulty, tags, required_capital_usdt,
         execution_mode, execution_platforms, category, asset_label,
         asset_image_url, asset_image_source, asset_image_alt_ko,
         arbitrage_type, arbitrage_type_ko, pricing, stale_at, status,
         sell_success_rate, sell_success_window_days, sell_success_as_of,
         risk_score, grade_mismatch, image_missing, capital_band
       ) VALUES (
         $1,$2,$3::timestamptz,$4::numeric,$5::numeric,$6,$7,
         $8::numeric,$9,$10::text[],$11::numeric,
         $12,$13::text[],$14,$15,
         $16,$17,$18,
         $19,$20,$21::jsonb,$22::timestamptz,$23,
         $24::numeric,$25,$26::timestamptz,
         $27,$28,$29,$30
       )`,
      [
        assetId,
        opp.pricingVersion,
        opp.pricedAt,
        opp.expectedProfitUsdt,
        opp.expectedProfitKrwApprox,
        opp.fxSnapshotId,
        opp.estimatedDurationSec,
        opp.aiConfidenceScore,
        opp.difficulty,
        opp.tags,
        opp.requiredCapitalUsdt,
        opp.executionMode,
        opp.executionPlatforms,
        opp.category,
        opp.assetLabel,
        opp.assetImageUrl,
        opp.assetImageSource,
        opp.assetImageAltKo,
        opp.arbitrageType,
        opp.arbitrageTypeKo,
        JSON.stringify(pricing),
        opp.staleAt,
        opp.status,
        opp.sellSuccessRate,
        opp.sellSuccessWindowDays,
        opp.sellSuccessAsOf,
        opp.riskScore,
        opp.gradeMismatch,
        opp.imageMissing,
        opp.capitalBand,
      ],
    );

    this.bus.emit(OPPORTUNITY_EVENTS.priceUpdated, {
      id: assetId,
      pricingVersion: 1,
      patch: {
        expectedProfitUsdt: String(opp.expectedProfitUsdt ?? ""),
        pricing,
        capitalBand: opp.capitalBand,
        compareReady: Boolean(pricing.compareReady),
      },
    });
    return true;
  }
}

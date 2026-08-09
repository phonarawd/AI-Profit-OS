/**
 * Engine §0.9 E-R6 — remote DB min catalog ensure.
 * Admin vertical seeds + ebay-ingest-shaped listings → opportunities available≥1.
 * Day-1 CHECK(ebay|admin) · amazon/yahoo INSERT attempts = 0.
 */
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { OpportunitiesAdminService } from "./opportunities.admin.service";
import {
  buildMinCatalogRuntimeSeed,
  DAY1_FX_SNAPSHOT_ID,
  day1FxSnapshot,
  FORBIDDEN_INGEST_ADAPTERS,
  normalizeIngestListingsForPersist,
} from "./opportunities.mi";

export type CatalogRuntimeSeedResult = {
  ok: true;
  skipped: boolean;
  reason?: string;
  fxSnapshotId: string;
  assetsUpserted: number;
  listingsUpserted: number;
  opportunitiesUpserted: number;
  availableCount: number;
  compareReadyTrue: number;
  compareReadyFalse: number;
  forbiddenInsertAttempts: number;
};

@Injectable()
export class CatalogRuntimeSeedService implements OnModuleInit {
  private readonly logger = new Logger(CatalogRuntimeSeedService.name);

  constructor(
    private readonly db: PostgresService,
    private readonly opportunities: OpportunitiesAdminService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureMinCatalog();
    } catch (e) {
      this.logger.warn(
        `catalog runtime seed skipped: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  /**
   * Idempotent min catalog for user feed wiring.
   * Skip when available≥1 ∧ assets≥1 ∧ listings≥1 already present.
   */
  async ensureMinCatalog(): Promise<CatalogRuntimeSeedResult> {
    if (!this.db.configured()) {
      return {
        ok: true,
        skipped: true,
        reason: "DATABASE_URL unset",
        fxSnapshotId: DAY1_FX_SNAPSHOT_ID,
        assetsUpserted: 0,
        listingsUpserted: 0,
        opportunitiesUpserted: 0,
        availableCount: 0,
        compareReadyTrue: 0,
        compareReadyFalse: 0,
        forbiddenInsertAttempts: 0,
      };
    }

    const counts = await this.countCatalog();
    if (
      counts.available >= 1 &&
      counts.assets >= 1 &&
      counts.listings >= 1
    ) {
      return {
        ok: true,
        skipped: true,
        reason: "min catalog already present",
        fxSnapshotId: counts.fxSnapshotId || DAY1_FX_SNAPSHOT_ID,
        assetsUpserted: 0,
        listingsUpserted: 0,
        opportunitiesUpserted: 0,
        availableCount: counts.available,
        compareReadyTrue: counts.compareReadyTrue,
        compareReadyFalse: counts.compareReadyFalse,
        forbiddenInsertAttempts: 0,
      };
    }

    await this.ensureFxSnapshot();

    const cards = await this.opportunities.seedTradingCardAssets();
    const bags = await this.opportunities.seedLuxuryBagAssets();
    const watches = await this.opportunities.seedWatchAssets();
    const assetsUpserted =
      Number(cards.count ?? 0) +
      Number(bags.count ?? 0) +
      Number(watches.count ?? 0);

    const plan = buildMinCatalogRuntimeSeed();
    // Hard lock — builders must never queue amazon/yahoo
    if (plan.forbiddenInsertAttempts.length !== 0) {
      throw new Error("catalog seed forbiddenInsertAttempts must be 0");
    }
    for (const forbidden of FORBIDDEN_INGEST_ADAPTERS) {
      if (
        plan.bundles.some((b) =>
          b.listings.some((L) => String(L.adapterId) === forbidden),
        )
      ) {
        throw new Error(`catalog seed attempted ${forbidden} listing`);
      }
    }

    let listingsUpserted = 0;
    let opportunitiesUpserted = 0;
    let compareReadyTrue = 0;
    let compareReadyFalse = 0;

    for (const bundle of plan.bundles) {
      const persisted = await this.persistIngestListings(
        bundle.listings,
        "ebay",
      );
      listingsUpserted += persisted.upserted;

      const opp = bundle.opportunity;
      const pricing = opp.pricing as { compareReady?: boolean };
      if (pricing.compareReady === true) compareReadyTrue += 1;
      else compareReadyFalse += 1;

      const upserted = await this.upsertOpportunityFromBundle(opp);
      if (upserted) opportunitiesUpserted += 1;
    }

    const after = await this.countCatalog();
    return {
      ok: true,
      skipped: false,
      fxSnapshotId: DAY1_FX_SNAPSHOT_ID,
      assetsUpserted,
      listingsUpserted,
      opportunitiesUpserted,
      availableCount: after.available,
      compareReadyTrue,
      compareReadyFalse,
      forbiddenInsertAttempts: 0,
    };
  }

  /**
   * Persist ebay|admin ingest listings to PG (preview E2E path reuse).
   * amazon/yahoo → throw · query: asset placeholders skipped.
   */
  async persistIngestListings(
    rawListings: unknown[],
    adapterId: string,
  ): Promise<{ upserted: number; skipped: number }> {
    if (!this.db.configured()) return { upserted: 0, skipped: 0 };
    if (
      FORBIDDEN_INGEST_ADAPTERS.includes(
        adapterId as (typeof FORBIDDEN_INGEST_ADAPTERS)[number],
      )
    ) {
      throw new Error(`Day-1 FORBIDDEN adapter INSERT: ${adapterId}`);
    }

    const rows = normalizeIngestListingsForPersist(rawListings, adapterId);
    let upserted = 0;
    let skipped = 0;
    for (const row of rows) {
      const assetOk = await this.db.query<{ ok: number }>(
        `SELECT 1 AS ok FROM public.assets WHERE asset_id = $1 LIMIT 1`,
        [row.assetId],
      );
      if (!assetOk.rows[0]) {
        skipped += 1;
        continue;
      }

      const existing = await this.db.query<{ id: string }>(
        `SELECT id::text FROM public.listings
          WHERE asset_id = $1 AND market_id = $2
            AND external_item_id IS NOT DISTINCT FROM $3
          LIMIT 1`,
        [row.assetId, row.marketId, row.externalItemId],
      );

      if (existing.rows[0]) {
        await this.db.query(
          `UPDATE public.listings SET
             price_usdt = $2::numeric,
             currency = $3,
             title = $4,
             url = $5,
             image_url = $6,
             observed_at = $7::timestamptz,
             stale_at = $8::timestamptz,
             marketplace_id = $9,
             adapter_id = $10,
             raw = $11::jsonb,
             updated_at = now()
           WHERE id = $1::uuid`,
          [
            existing.rows[0].id,
            row.priceUsdt,
            row.currency,
            row.title,
            row.url,
            row.imageUrl,
            row.observedAt,
            row.staleAt,
            row.marketplaceId,
            row.adapterId,
            JSON.stringify(row.raw),
          ],
        );
      } else {
        await this.db.query(
          `INSERT INTO public.listings (
             asset_id, market_id, adapter_id, marketplace_id, external_item_id,
             title, price_usdt, currency, url, image_url,
             observed_at, stale_at, raw
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7::numeric,$8,$9,$10,
             $11::timestamptz,$12::timestamptz,$13::jsonb
           )`,
          [
            row.assetId,
            row.marketId,
            row.adapterId,
            row.marketplaceId,
            row.externalItemId,
            row.title,
            row.priceUsdt,
            row.currency,
            row.url,
            row.imageUrl,
            row.observedAt,
            row.staleAt,
            JSON.stringify(row.raw),
          ],
        );
      }
      upserted += 1;
    }
    return { upserted, skipped };
  }

  private async ensureFxSnapshot(): Promise<void> {
    const fx = day1FxSnapshot();
    await this.db.query(
      `INSERT INTO public.fx_snapshots (
         id, usd_krw, source, captured_at, formula_id, sources, usdt_usd, usd_krw_frank
       ) VALUES ($1,$2::numeric,$3,$4::timestamptz,$5,$6::text[],NULL,NULL)
       ON CONFLICT (id) DO NOTHING`,
      [
        fx.fxSnapshotId,
        fx.usdKrw,
        "coingecko",
        fx.capturedAt,
        fx.formulaId,
        fx.sources,
      ],
    );
    // If another snapshot exists but day1 id missing — still OK (FK can use day1 after insert)
    const any = await this.db.query<{ id: string }>(
      `SELECT id FROM public.fx_snapshots ORDER BY captured_at DESC LIMIT 1`,
    );
    if (!any.rows[0]) {
      throw new Error("fx_snapshots empty after ensure");
    }
  }

  private async upsertOpportunityFromBundle(
    opp: Record<string, unknown>,
  ): Promise<boolean> {
    const assetId = String(opp.assetId);
    const existing = await this.db.query<{ id: string }>(
      `SELECT id::text FROM public.opportunities WHERE asset_id = $1 LIMIT 1`,
      [assetId],
    );
    if (existing.rows[0]) return false;

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
    return true;
  }

  private async countCatalog(): Promise<{
    assets: number;
    listings: number;
    available: number;
    compareReadyTrue: number;
    compareReadyFalse: number;
    fxSnapshotId: string | null;
  }> {
    const { rows } = await this.db.query<{
      assets: string;
      listings: string;
      available: string;
      cr_true: string;
      cr_false: string;
      fx_id: string | null;
    }>(
      `SELECT
         (SELECT count(*)::text FROM public.assets) AS assets,
         (SELECT count(*)::text FROM public.listings) AS listings,
         (SELECT count(*)::text FROM public.opportunities WHERE status = 'available') AS available,
         (SELECT count(*)::text FROM public.opportunities
           WHERE COALESCE((pricing->>'compareReady')::boolean, false) = true) AS cr_true,
         (SELECT count(*)::text FROM public.opportunities
           WHERE COALESCE((pricing->>'compareReady')::boolean, false) = false) AS cr_false,
         COALESCE(
           (SELECT id FROM public.fx_snapshots WHERE id = $1 LIMIT 1),
           (SELECT id FROM public.fx_snapshots ORDER BY captured_at DESC LIMIT 1)
         ) AS fx_id`,
      [DAY1_FX_SNAPSHOT_ID],
    );
    const r = rows[0];
    return {
      assets: Number(r?.assets ?? 0),
      listings: Number(r?.listings ?? 0),
      available: Number(r?.available ?? 0),
      compareReadyTrue: Number(r?.cr_true ?? 0),
      compareReadyFalse: Number(r?.cr_false ?? 0),
      fxSnapshotId: r?.fx_id ?? null,
    };
  }
}

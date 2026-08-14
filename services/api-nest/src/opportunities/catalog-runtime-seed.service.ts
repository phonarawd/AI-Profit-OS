/**
 * Engine §0.9 E-R6 — remote DB min catalog ensure.
 * Admin vertical seeds + ebay-ingest-shaped listings → opportunities available≥1.
 * Day-1 CHECK(ebay|admin) · amazon/yahoo INSERT attempts = 0.
 */
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { OpportunitiesAdminService } from "./opportunities.admin.service";
import { FxSnapshotService } from "./fx-snapshot.service";
import {
  buildMinCatalogRuntimeSeed,
  DAY1_FX_SNAPSHOT_ID,
  day1FxSnapshot,
  FORBIDDEN_INGEST_ADAPTERS,
  normalizeIngestListingsForPersist,
  normalizeNativeToUsdt,
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
    private readonly fxSnapshots: FxSnapshotService,
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
   * §0.10 — exact match 후 Asset Master / opportunity에 ebay image provenance 반영.
   * host must be i.ebayimg.com · imageSource=ebay.
   */
  async applyEbayImageProvenance(input: {
    assetId: string;
    imageUrl: string;
  }): Promise<{ ok: boolean; reason?: string }> {
    if (!this.db.configured()) return { ok: false, reason: "DATABASE_URL unset" };
    const assetId = String(input.assetId || "").trim();
    const imageUrl = String(input.imageUrl || "").trim();
    if (!assetId || assetId.startsWith("query:")) {
      return { ok: false, reason: "invalid assetId" };
    }
    let host = "";
    try {
      host = new URL(imageUrl).hostname.toLowerCase();
    } catch {
      return { ok: false, reason: "invalid imageUrl" };
    }
    if (host !== "i.ebayimg.com" && !host.endsWith(".ebayimg.com")) {
      return { ok: false, reason: "image host must be i.ebayimg.com" };
    }

    await this.db.query(
      `UPDATE public.assets SET
         image_url = $2,
         image_source = 'ebay',
         updated_at = now()
       WHERE asset_id = $1`,
      [assetId, imageUrl],
    );
    await this.db.query(
      `UPDATE public.opportunities SET
         asset_image_url = $2,
         asset_image_source = 'ebay',
         updated_at = now()
       WHERE asset_id = $1`,
      [assetId, imageUrl],
    );
    return { ok: true };
  }

  /**
   * Persist ebay|admin ingest listings to PG (preview E2E path reuse).
   * amazon/yahoo → throw · query: placeholders must be resolved before call
   * (identity match) — remaining query: rows are still skipped as safety guard.
   *
   * PTF-00C P0-A — price_usdt is only ever written after genuine native→USDT
   * normalization (or identity, when nativeCurrency=USDT). A row whose FX
   * normalization fails is skipped (never inserted with a fabricated/raw
   * value) and counted separately so the failure stays observable — one bad
   * row must not discard the rest of the batch.
   */
  async persistIngestListings(
    rawListings: unknown[],
    adapterId: string,
  ): Promise<{ upserted: number; skipped: number; fxNormalizationFailed: number }> {
    if (!this.db.configured()) {
      return { upserted: 0, skipped: 0, fxNormalizationFailed: 0 };
    }
    if (
      FORBIDDEN_INGEST_ADAPTERS.includes(
        adapterId as (typeof FORBIDDEN_INGEST_ADAPTERS)[number],
      )
    ) {
      throw new Error(`Day-1 FORBIDDEN adapter INSERT: ${adapterId}`);
    }

    const { rows, skipped: normalizeSkipped } = normalizeIngestListingsForPersist(
      rawListings,
      adapterId,
    );
    let upserted = 0;
    let skipped = normalizeSkipped.length;
    let fxNormalizationFailed = 0;
    const fxSnapshot =
      rows.some((r) => r.nativeCurrency !== "USDT") &&
      (await this.fxSnapshots.getLatestUsableSnapshot());

    for (const row of rows) {
      const assetOk = await this.db.query<{ ok: number }>(
        `SELECT 1 AS ok FROM public.assets WHERE asset_id = $1 LIMIT 1`,
        [row.assetId],
      );
      if (!assetOk.rows[0]) {
        skipped += 1;
        continue;
      }

      let priceUsdt: string;
      let fxSnapshotId: string | null;
      let denominationStatus: "normalized" = "normalized";
      if (row.nativeCurrency === "USDT") {
        priceUsdt = row.nativeAmount;
        fxSnapshotId = null;
      } else {
        try {
          if (!fxSnapshot) throw new Error("FX_MISSING: no usable snapshot");
          const normalized = normalizeNativeToUsdt({
            nativeAmount: row.nativeAmount,
            nativeCurrency: row.nativeCurrency,
            snapshot: fxSnapshot,
          });
          priceUsdt = normalized.normalizedUsdt;
          fxSnapshotId = fxSnapshot.id;
        } catch (e) {
          this.logger.warn(
            `FX normalization failed — skip listing (fail-closed): asset=${row.assetId} currency=${row.nativeCurrency} err=${
              e instanceof Error ? e.message : String(e)
            }`,
          );
          fxNormalizationFailed += 1;
          continue;
        }
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
          // currency always tracks price_usdt's true denomination (USDT) —
          // native_currency is the separate, honest native-reading pairing.
          `UPDATE public.listings SET
             price_usdt = $2::numeric,
             currency = 'USDT',
             native_amount = $3::numeric,
             native_currency = $4,
             fx_snapshot_id = $5,
             price_denomination_status = $6,
             title = $7,
             url = $8,
             image_url = $9,
             observed_at = $10::timestamptz,
             stale_at = $11::timestamptz,
             marketplace_id = $12,
             adapter_id = $13,
             raw = $14::jsonb,
             updated_at = now()
           WHERE id = $1::uuid`,
          [
            existing.rows[0].id,
            priceUsdt,
            row.nativeAmount,
            row.nativeCurrency,
            fxSnapshotId,
            denominationStatus,
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
             title, price_usdt, currency, native_amount, native_currency,
             fx_snapshot_id, price_denomination_status, url, image_url,
             observed_at, stale_at, raw
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7::numeric,'USDT',$8::numeric,$9,
             $10,$11,$12,$13,
             $14::timestamptz,$15::timestamptz,$16::jsonb
           )`,
          [
            row.assetId,
            row.marketId,
            row.adapterId,
            row.marketplaceId,
            row.externalItemId,
            row.title,
            priceUsdt,
            row.nativeAmount,
            row.nativeCurrency,
            fxSnapshotId,
            denominationStatus,
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
    return { upserted, skipped, fxNormalizationFailed };
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

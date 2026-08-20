import { Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { InProcessEventBus } from "../events/in-process.bus";
import { AssetImageR2Service } from "./asset-image-r2.service";
import {
  approxKrwFromSnapshot,
  assertPublishImageGuard,
  canAutoPublishAvailable,
  computeOpportunityPricing,
  DEFAULT_PLATFORM_MARGIN_PCT,
  evaluateBagListingMatch,
  evaluateCardListingMatch,
  evaluateListingGradeMatch,
  evaluateWatchListingMatch,
  isImageMissing,
  isWhaleCapitalPath,
  luxuryBagSeedsAsAssetMasters,
  normalizeAssetMaster,
  resolveAssetImage,
  resolveCapitalBand,
  tradingCardSeedsAsAssetMasters,
  watchSeedsAsAssetMasters,
  WHALE_MIN_REQUIRED_CAPITAL_USDT,
} from "./opportunities.mi";
import { OPPORTUNITY_EVENTS } from "./opportunities.events";
import { OpportunityRepriceService } from "./opportunity-reprice.service";
import type {
  OpportunityAdminListItem,
  OpportunityAdminListQuery,
  UpdateOpportunityPricingRequest,
} from "./opportunities.types";

type OppRow = {
  id: string;
  asset_id: string;
  pricing_version: number;
  priced_at: Date;
  expected_profit_usdt: string;
  expected_profit_krw_approx: string | null;
  fx_snapshot_id: string;
  required_capital_usdt: string;
  category: string;
  asset_label: string;
  asset_image_url: string;
  pricing: Record<string, unknown>;
  stale_at: Date;
  status: string;
  grade_mismatch: boolean;
  image_missing: boolean;
  capital_band: string | null;
};

type AssetRow = {
  asset_id: string;
  category: string;
  asset_label: string;
  image_url: string;
  image_source: string;
  image_alt_ko: string;
  image_rights_note_ko: string;
  image_fetched_at: Date | null;
  meta: Record<string, unknown>;
  updated_at: Date;
};

@Injectable()
export class OpportunitiesAdminService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
    private readonly assetImages: AssetImageR2Service,
    private readonly reprice: OpportunityRepriceService,
  ) {}

  async list(
    query: OpportunityAdminListQuery,
  ): Promise<{ items: OpportunityAdminListItem[]; filters: string[] }> {
    const lim = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const clauses: string[] = ["1=1"];
    const params: unknown[] = [];
    let i = 1;

    if (query.status) {
      clauses.push(`status = $${i++}`);
      params.push(query.status);
    }
    if (query.category) {
      clauses.push(`category = $${i++}`);
      params.push(query.category);
    }
    if (query.capitalBand) {
      clauses.push(`capital_band = $${i++}`);
      params.push(query.capitalBand);
    }
    if (query.gradeMismatch != null) {
      clauses.push(`grade_mismatch = $${i++}`);
      params.push(query.gradeMismatch);
    }
    if (query.image_missing != null) {
      clauses.push(`image_missing = $${i++}`);
      params.push(query.image_missing);
    }
    if (query.compareReady != null) {
      clauses.push(`(pricing->>'compareReady')::boolean = $${i++}`);
      params.push(query.compareReady);
    }

    params.push(lim);
    const { rows } = await this.db.query<OppRow>(
      `SELECT id, asset_id, pricing_version, priced_at,
              expected_profit_usdt::text, expected_profit_krw_approx::text,
              fx_snapshot_id, required_capital_usdt::text, category,
              asset_label, asset_image_url, pricing, stale_at, status,
              grade_mismatch, image_missing, capital_band
         FROM public.opportunities
        WHERE ${clauses.join(" AND ")}
        ORDER BY updated_at DESC
        LIMIT $${i}`,
      params,
    );

    return {
      filters: [
        "compareReady",
        "gradeMismatch",
        "image_missing",
        "capitalBand",
        "status",
        "category",
      ],
      items: rows.map((r) => this.toListItem(r)),
    };
  }

  async get(id: string): Promise<OpportunityAdminListItem | null> {
    const { rows } = await this.db.query<OppRow>(
      `SELECT id, asset_id, pricing_version, priced_at,
              expected_profit_usdt::text, expected_profit_krw_approx::text,
              fx_snapshot_id, required_capital_usdt::text, category,
              asset_label, asset_image_url, pricing, stale_at, status,
              grade_mismatch, image_missing, capital_band
         FROM public.opportunities WHERE id = $1`,
      [id],
    );
    return rows[0] ? this.toListItem(rows[0]) : null;
  }

  /**
   * PATCH /admin/opportunities/:id/pricing · §36
   * Optimistic lock on expectedPricingVersion · pricingVersion++
   */
  async patchPricing(id: string, body: UpdateOpportunityPricingRequest) {
    if (!body.updatedByAdminId?.trim()) {
      throw new Error("updatedByAdminId required");
    }
    if (
      typeof body.expectedPricingVersion !== "number" ||
      !Number.isFinite(body.expectedPricingVersion)
    ) {
      throw new Error("expectedPricingVersion required");
    }

    const item = await this.db.withTransaction(async (client) => {
      const { rows } = await client.query<OppRow>(
        `SELECT id, asset_id, pricing_version, priced_at,
                expected_profit_usdt::text, expected_profit_krw_approx::text,
                fx_snapshot_id, required_capital_usdt::text, category,
                asset_label, asset_image_url, pricing, stale_at, status,
                grade_mismatch, image_missing, capital_band
           FROM public.opportunities
          WHERE id = $1
          FOR UPDATE`,
        [id],
      );
      const row = rows[0];
      if (!row) throw new Error("opportunity not found");
      if (row.pricing_version !== body.expectedPricingVersion) {
        const err = new Error("PRICE_STALE");
        (err as Error & { code: string }).code = "PRICE_STALE";
        throw err;
      }

      const prev = row.pricing || {};
      const buyMarketId = String(
        body.buyMarketId ?? prev.buyMarketId ?? "ebay_us",
      );
      const sellMarketId = String(
        body.sellMarketId ?? prev.sellMarketId ?? "ebay_gb",
      );

      let buyPriceUsdt = String(prev.buyPriceUsdt ?? "0");
      let sellPriceUsdt = String(prev.sellPriceUsdt ?? "0");
      if (body.useAdminOverride) {
        if (body.adminBuyUsdt != null) buyPriceUsdt = String(body.adminBuyUsdt);
        if (body.adminSellUsdt != null) {
          sellPriceUsdt = String(body.adminSellUsdt);
        }
      }

      const computed = computeOpportunityPricing({
        buyMarketId,
        sellMarketId,
        buyPriceUsdt,
        sellPriceUsdt,
        adminMarginPct: body.adminMarginPct,
        platformMarginPct: DEFAULT_PLATFORM_MARGIN_PCT,
        requiredCapitalUsdt: row.required_capital_usdt,
        useAdminOverride: Boolean(body.useAdminOverride),
        gradeMismatch: row.grade_mismatch,
        imageMissing: row.image_missing,
      });

      const pricing = {
        ...prev,
        ...computed,
        adminBuyUsdt: body.adminBuyUsdt ?? prev.adminBuyUsdt,
        adminSellUsdt: body.adminSellUsdt ?? prev.adminSellUsdt,
        adminMarginPct: body.adminMarginPct ?? prev.adminMarginPct,
        useAdminOverride: Boolean(body.useAdminOverride),
        lastAdminEditBy: body.updatedByAdminId,
      };

      const capitalBand = resolveCapitalBand(row.required_capital_usdt);
      let expectedProfitKrw: string | null = row.expected_profit_krw_approx;
      const fx = await client.query<{
        usd_krw: string;
        formula_id: string | null;
      }>(
        `SELECT usd_krw::text, formula_id FROM public.fx_snapshots WHERE id = $1`,
        [row.fx_snapshot_id],
      );
      if (fx.rows[0]) {
        expectedProfitKrw = approxKrwFromSnapshot(computed.expectedProfitUsdt, {
          usdtKrw: fx.rows[0].usd_krw,
        });
      }

      const nextVersion = row.pricing_version + 1;
      const asOf = new Date().toISOString();
      const updated = await this.reprice.persistComputedPricing(client, {
        id,
        pricing,
        expectedProfitUsdt: computed.expectedProfitUsdt,
        expectedProfitKrw,
        capitalBand,
        nextVersion,
        asOf,
      });
      return this.toListItem(updated);
    });

    this.bus.emit(OPPORTUNITY_EVENTS.priceUpdated, {
      id: item.id,
      pricingVersion: item.pricingVersion,
      patch: {
        expectedProfitUsdt: item.expectedProfitUsdt,
        pricing: item.pricing,
        capitalBand: item.capitalBand,
        compareReady: item.compareReady,
      },
    });
    return item;
  }

  /**
   * GET /admin/opportunities/assets · ?image_missing= · tab=assets queue
   */
  async listAssets(query: {
    image_missing?: boolean;
    category?: string;
    limit?: number;
  }) {
    const lim = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const clauses: string[] = ["1=1"];
    const params: unknown[] = [];
    let i = 1;

    if (query.category) {
      clauses.push(`category = $${i++}`);
      params.push(query.category);
    }
    if (query.image_missing != null) {
      if (query.image_missing) {
        clauses.push(`(image_url IS NULL OR btrim(image_url) = '')`);
      } else {
        clauses.push(`(image_url IS NOT NULL AND btrim(image_url) <> '')`);
      }
    }

    params.push(lim);
    const { rows } = await this.db.query<AssetRow>(
      `SELECT asset_id, category, asset_label, image_url, image_source,
              image_alt_ko, image_rights_note_ko, image_fetched_at, meta, updated_at
         FROM public.assets
        WHERE ${clauses.join(" AND ")}
        ORDER BY updated_at DESC
        LIMIT $${i}`,
      params,
    );

    return {
      bucket: this.assetImages.bucketName(),
      filters: ["image_missing", "category"],
      items: rows.map((r) => this.toAssetItem(r)),
    };
  }

  async upsertAsset(body: Record<string, unknown>) {
    const asset = normalizeAssetMaster({
      assetId: String(body.assetId ?? ""),
      category: body.category as "watch" | "trading_card" | "luxury_bag",
      assetLabel: String(body.assetLabel ?? ""),
      imageUrl: String(body.imageUrl ?? ""),
      imageSource: body.imageSource as
        | "ebay"
        | "pokemontcg"
        | "ygoprodeck"
        | "admin_r2",
      imageAltKo: body.imageAltKo ? String(body.imageAltKo) : undefined,
      imageFetchedAt: body.imageFetchedAt
        ? String(body.imageFetchedAt)
        : undefined,
      meta: (body.meta as object) || {},
    });

    await this.db.query(
      `INSERT INTO public.assets (
         asset_id, category, asset_label, image_url, image_source,
         image_alt_ko, image_rights_note_ko, image_fetched_at, meta
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
       ON CONFLICT (asset_id) DO UPDATE SET
         category = EXCLUDED.category,
         asset_label = EXCLUDED.asset_label,
         image_url = EXCLUDED.image_url,
         image_source = EXCLUDED.image_source,
         image_alt_ko = EXCLUDED.image_alt_ko,
         image_fetched_at = EXCLUDED.image_fetched_at,
         meta = EXCLUDED.meta,
         updated_at = now()`,
      [
        asset.assetId,
        asset.category,
        asset.assetLabel,
        asset.imageUrl,
        asset.imageSource,
        asset.imageAltKo,
        asset.imageRightsNoteKo,
        asset.imageFetchedAt,
        JSON.stringify(asset.meta),
      ],
    );

    await this.syncOpportunityImagesFromAsset(asset);
    this.bus.emit(OPPORTUNITY_EVENTS.assetUpserted, { assetId: asset.assetId });
    return asset;
  }

  /**
   * Upsert Engine trading_card seed (pokemontcg/ygoprodeck meta · ebay quote keys).
   * POST /admin/opportunities/assets/seed/trading-card
   */
  async seedTradingCardAssets() {
    const rows = tradingCardSeedsAsAssetMasters();
    const upserted: string[] = [];
    for (const asset of rows) {
      await this.upsertAsset({
        assetId: asset.assetId,
        category: asset.category,
        assetLabel: asset.assetLabel,
        imageUrl: asset.imageUrl,
        imageSource: asset.imageSource,
        imageAltKo: asset.imageAltKo,
        imageFetchedAt: asset.imageFetchedAt ?? undefined,
        meta: asset.meta,
      });
      upserted.push(asset.assetId);
    }
    return {
      ok: true,
      category: "trading_card",
      count: upserted.length,
      assetIds: upserted,
      quoteLegs: ["ebay_us", "ebay_gb", "admin"],
      catalogSources: ["pokemontcg", "ygoprodeck"],
    };
  }

  /**
   * Upsert Engine luxury_bag seed (manual meta · admin_r2 image · ebay|admin legs).
   * POST /admin/opportunities/assets/seed/luxury-bag
   */
  async seedLuxuryBagAssets() {
    const rows = luxuryBagSeedsAsAssetMasters();
    const upserted: string[] = [];
    for (const asset of rows) {
      await this.upsertAsset({
        assetId: asset.assetId,
        category: asset.category,
        assetLabel: asset.assetLabel,
        imageUrl: asset.imageUrl,
        imageSource: asset.imageSource,
        imageAltKo: asset.imageAltKo,
        imageFetchedAt: asset.imageFetchedAt ?? undefined,
        meta: asset.meta,
      });
      upserted.push(asset.assetId);
    }
    return {
      ok: true,
      category: "luxury_bag",
      count: upserted.length,
      assetIds: upserted,
      quoteLegs: ["ebay_us", "ebay_gb", "ebay_de", "ebay_au", "admin"],
      imageSource: "admin_r2",
      filterChipKo: "가방",
    };
  }

  /**
   * Upsert Engine watch seed (PP/AP/Rolex · whale≥100k Ultra · admin_r2 · ebay|admin).
   * POST /admin/opportunities/assets/seed/watch
   */
  async seedWatchAssets() {
    const rows = watchSeedsAsAssetMasters();
    const upserted: string[] = [];
    let whaleCount = 0;
    for (const asset of rows) {
      await this.upsertAsset({
        assetId: asset.assetId,
        category: asset.category,
        assetLabel: asset.assetLabel,
        imageUrl: asset.imageUrl,
        imageSource: asset.imageSource,
        imageAltKo: asset.imageAltKo,
        imageFetchedAt: asset.imageFetchedAt ?? undefined,
        meta: asset.meta,
      });
      upserted.push(asset.assetId);
      const capital = String(
        (asset.meta as { requiredCapitalUsdt?: string })?.requiredCapitalUsdt ??
          "0",
      );
      if (isWhaleCapitalPath(capital)) whaleCount += 1;
    }
    return {
      ok: true,
      category: "watch",
      count: upserted.length,
      assetIds: upserted,
      quoteLegs: ["ebay_us", "ebay_gb", "ebay_de", "ebay_au", "admin"],
      imageSource: "admin_r2",
      filterChipKo: "시계",
      whaleMinRequiredCapitalUsdt: WHALE_MIN_REQUIRED_CAPITAL_USDT,
      whaleCount,
      requiredBrands: ["Patek Philippe", "Audemars Piguet", "Rolex"],
    };
  }

  /**
   * Engine §0.0 · Admin bag match (brand+model(+size/color)).
   * Fuzzy-alone ⇒ canAutoPublish=false.
   */
  evaluateBagMatch(body: Record<string, unknown>) {
    const assetMeta = {
      brand: body.brand != null ? String(body.brand) : undefined,
      model: body.model != null ? String(body.model) : undefined,
      size: body.size != null ? String(body.size) : undefined,
      color: body.color != null ? String(body.color) : undefined,
    };
    const listingMeta =
      body.listingBrand != null || body.listingModel != null
        ? {
            brand:
              body.listingBrand != null
                ? String(body.listingBrand)
                : undefined,
            model:
              body.listingModel != null
                ? String(body.listingModel)
                : undefined,
            size:
              body.listingSize != null ? String(body.listingSize) : undefined,
            color:
              body.listingColor != null
                ? String(body.listingColor)
                : undefined,
          }
        : undefined;

    const bag = evaluateBagListingMatch({
      assetMeta,
      listingMeta,
      listingTitle:
        body.listingTitle != null ? String(body.listingTitle) : undefined,
    });

    return {
      canAutoPublish: bag.canAutoPublish,
      fuzzyAloneForbidden: bag.fuzzyAloneForbidden,
      badge: bag.fuzzyAloneForbidden ? "bagFuzzyAlone" : null,
      badgeLabelKo: bag.fuzzyAloneForbidden ? "가방 퍼지 단독" : null,
      bag,
    };
  }

  /**
   * Engine §0.0 · Admin watch match (brand+reference(+model)).
   * Fuzzy-alone ⇒ canAutoPublish=false.
   */
  evaluateWatchMatch(body: Record<string, unknown>) {
    const assetMeta = {
      brand: body.brand != null ? String(body.brand) : undefined,
      reference:
        body.reference != null ? String(body.reference) : undefined,
      model: body.model != null ? String(body.model) : undefined,
    };
    const listingMeta =
      body.listingBrand != null || body.listingReference != null
        ? {
            brand:
              body.listingBrand != null
                ? String(body.listingBrand)
                : undefined,
            reference:
              body.listingReference != null
                ? String(body.listingReference)
                : undefined,
            model:
              body.listingModel != null
                ? String(body.listingModel)
                : undefined,
          }
        : undefined;

    const watch = evaluateWatchListingMatch({
      assetMeta,
      listingMeta,
      listingTitle:
        body.listingTitle != null ? String(body.listingTitle) : undefined,
    });

    return {
      canAutoPublish: watch.canAutoPublish,
      fuzzyAloneForbidden: watch.fuzzyAloneForbidden,
      badge: watch.fuzzyAloneForbidden ? "watchFuzzyAlone" : null,
      badgeLabelKo: watch.fuzzyAloneForbidden ? "시계 퍼지 단독" : null,
      watch,
    };
  }

  /**
   * §51.12 · Admin gradeMismatch badge input.
   * Body: gradeDeclared · listingTitle · listingCaption · optional card match keys
   */
  evaluateGradeMismatch(body: Record<string, unknown>) {
    const gradeDeclared =
      body.gradeDeclared != null ? String(body.gradeDeclared) : null;
    const listingTitle =
      body.listingTitle != null ? String(body.listingTitle) : undefined;
    const listingCaption =
      body.listingCaption != null ? String(body.listingCaption) : undefined;

    const grade = evaluateListingGradeMatch({
      gradeDeclared,
      listingTitle,
      listingCaption,
    });

    const assetMeta = {
      set: body.set != null ? String(body.set) : undefined,
      number: body.number != null ? String(body.number) : undefined,
      lang: body.lang != null ? String(body.lang) : "en",
      finish: body.finish != null ? String(body.finish) : "normal",
      game: body.game != null ? String(body.game) : undefined,
      gradeDeclared: gradeDeclared ?? undefined,
    };
    const listingMeta =
      body.listingSet != null || body.listingNumber != null
        ? {
            set: body.listingSet != null ? String(body.listingSet) : undefined,
            number:
              body.listingNumber != null
                ? String(body.listingNumber)
                : undefined,
            lang: body.listingLang != null ? String(body.listingLang) : "en",
            finish:
              body.listingFinish != null
                ? String(body.listingFinish)
                : "normal",
            game: body.game != null ? String(body.game) : undefined,
          }
        : undefined;

    const card = evaluateCardListingMatch({
      assetMeta,
      listingMeta,
      listingTitle,
      listingCaption,
    });

    return {
      gradeMismatch: grade.gradeMismatch,
      badge: grade.gradeMismatch ? "gradeMismatch" : null,
      badgeLabelKo: grade.gradeMismatch ? "등급 불일치" : null,
      compareReadyBlocked: grade.gradeMismatch,
      grade,
      card,
    };
  }

  /**
   * POST /admin/opportunities/assets/:assetId/image
   * R2 public URL register · source=admin_r2 · SKU key assets/{category}/{assetId}
   */
  async registerAssetImage(
    assetId: string,
    body: Record<string, unknown>,
  ) {
    const category = body.category as
      | "watch"
      | "trading_card"
      | "luxury_bag"
      | undefined;
    if (!category) throw new Error("category required");

    const r2 = this.assetImages.resolveAdminUpload({
      assetId,
      category,
      contentType: body.contentType
        ? String(body.contentType)
        : undefined,
      publicUrl: body.publicUrl ? String(body.publicUrl) : undefined,
      objectKey: body.objectKey ? String(body.objectKey) : undefined,
    });

    const signedPut = this.assetImages.signedPutHint(
      r2.objectKey,
      body.contentType ? String(body.contentType) : "image/jpeg",
    );

    const existing = await this.db.query<{
      asset_label: string;
      image_alt_ko: string;
    }>(
      `SELECT asset_label, image_alt_ko FROM public.assets WHERE asset_id = $1`,
      [assetId],
    );

    const assetLabel =
      String(body.assetLabel ?? existing.rows[0]?.asset_label ?? assetId);
    const imageAltKo =
      String(body.imageAltKo ?? existing.rows[0]?.image_alt_ko ?? assetLabel);

    const asset = await this.upsertAsset({
      assetId,
      category,
      assetLabel,
      imageUrl: r2.imageUrl,
      imageSource: r2.imageSource,
      imageAltKo,
      imageFetchedAt: new Date().toISOString(),
      meta: {
        ...(typeof body.meta === "object" && body.meta ? body.meta : {}),
        r2ObjectKey: r2.objectKey,
        r2Bucket: r2.bucket,
      },
    });

    return {
      ...asset,
      assetImageUrl: asset.imageUrl,
      r2: {
        bucket: r2.bucket,
        objectKey: r2.objectKey,
        signedPut,
      },
    };
  }

  /**
   * Background hydrate helper — user click-path fetch 금지.
   */
  hydrateAssetImage(input: {
    assetId: string;
    category: "watch" | "trading_card" | "luxury_bag";
    assetLabel: string;
    assetMaster?: {
      imageUrl?: string;
      imageSource?: string;
      imageAltKo?: string;
    } | null;
    catalog?: {
      imageUrl?: string;
      imageSmall?: string;
      imageLarge?: string;
      imageSource?: "pokemontcg" | "ygoprodeck";
      family?: string;
    } | null;
    listing?: { imageUrl?: string } | null;
  }) {
    return resolveAssetImage(input);
  }

  /**
   * §0.0.6 publish gate — compareReady ∧ assetImageUrl (imageOptional default false).
   */
  evaluatePublishGuard(input: {
    compareReady: boolean;
    assetImageUrl?: string | null;
    useAdminOverride?: boolean;
    imageOptional?: boolean;
    category?: string;
    imageSource?: string;
    assetId?: string;
  }) {
    return {
      canPublish: canAutoPublishAvailable(input),
      ...assertPublishImageGuard(input),
    };
  }

  private async syncOpportunityImagesFromAsset(asset: {
    assetId: string;
    category: string;
    assetLabel: string;
    imageUrl: string;
    imageSource: string;
    imageAltKo: string;
  }) {
    const imageMissing = isImageMissing({ imageUrl: asset.imageUrl });
    const { rows } = await this.db.query<{
      id: string;
      status: string;
      pricing: Record<string, unknown>;
    }>(
      `UPDATE public.opportunities SET
          asset_label = $2,
          category = $3,
          asset_image_url = $4,
          asset_image_source = $5,
          asset_image_alt_ko = $6,
          image_missing = $7,
          updated_at = now()
        WHERE asset_id = $1
        RETURNING id, status, pricing`,
      [
        asset.assetId,
        asset.assetLabel,
        asset.category,
        asset.imageUrl,
        asset.imageSource,
        asset.imageAltKo,
        imageMissing,
      ],
    );

    for (const row of rows) {
      const compareReady = Boolean(row.pricing?.compareReady);
      const imageOptional = Boolean(row.pricing?.imageOptional);
      const useAdminOverride = Boolean(row.pricing?.useAdminOverride);
      const canPublish = canAutoPublishAvailable({
        compareReady,
        assetImageUrl: asset.imageUrl,
        useAdminOverride,
        imageOptional,
      });
      if (row.status === "available" && !canPublish) {
        await this.db.query(
          `UPDATE public.opportunities SET status = 'paused', updated_at = now()
            WHERE id = $1`,
          [row.id],
        );
        this.bus.emit(OPPORTUNITY_EVENTS.statusChanged, {
          id: row.id,
          status: "paused",
          reason: "image_guard",
        });
      }
    }
  }

  private toAssetItem(r: AssetRow) {
    const imageMissing = isImageMissing({ imageUrl: r.image_url });
    return {
      assetId: r.asset_id,
      category: r.category,
      assetLabel: r.asset_label,
      /** Same field user card uses — Admin preview */
      assetImageUrl: r.image_url,
      imageUrl: r.image_url,
      imageSource: r.image_source,
      imageAltKo: r.image_alt_ko,
      imageRightsNoteKo: r.image_rights_note_ko,
      imageFetchedAt: r.image_fetched_at
        ? new Date(r.image_fetched_at).toISOString()
        : null,
      imageMissing,
      meta: r.meta || {},
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  private toListItem(r: OppRow): OpportunityAdminListItem {
    const pricing = r.pricing || {};
    return {
      id: r.id,
      pricingVersion: r.pricing_version,
      assetId: r.asset_id,
      assetLabel: r.asset_label,
      assetImageUrl: r.asset_image_url,
      category: r.category,
      status: r.status,
      expectedProfitUsdt: r.expected_profit_usdt,
      requiredCapitalUsdt: r.required_capital_usdt,
      capitalBand: r.capital_band,
      compareReady: Boolean(pricing.compareReady),
      gradeMismatch: Boolean(r.grade_mismatch),
      imageMissing: Boolean(r.image_missing),
      pricing,
      pricedAt: new Date(r.priced_at).toISOString(),
      staleAt: new Date(r.stale_at).toISOString(),
    };
  }
}

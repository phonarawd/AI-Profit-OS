/**
 * Engine §0.9 E-R6 — catalog runtime seed builders (pure).
 * Reuses Admin vertical seeds + ebay-ingest-shaped listings (preview E2E shape).
 * Day-1 legs = ebay|admin only · amazon/yahoo INSERT attempts = 0.
 */

const {
  tradingCardSeedsAsAssetMasters,
} = require("./trading-card-seed.cjs");
const { luxuryBagSeedsAsAssetMasters } = require("./luxury-bag-seed.cjs");
const { watchSeedsAsAssetMasters } = require("./watch-seed.cjs");
const { computeOpportunityPricing } = require("./pricing-formula.cjs");
const { composeFxSnapshot, approxKrwFromSnapshot } = require("./fx-snapshot-formula.cjs");
const {
  canAutoPublishAvailable,
  assertPublishImageGuard,
} = require("./asset-image.cjs");
const { isImageMissing } = require("./asset-master.cjs");
const {
  projectOpportunityScanFields,
} = require("./opportunity-scan.cjs");
const { assertNotForbidden, isForbiddenAdapterId } = require("./forbidden.cjs");
const { DAY1_LEG_PAIRS } = require("./pipeline.cjs");
const { assertAmount, mulAmount, addAmount } = require("./money.cjs");

const DAY1_FX_SNAPSHOT_ID = "fx_day1_runtime_seed";
/** Deterministic Day-1 USDT→KRW (cg_usdt_krw) until live FX ingest lands */
const DAY1_USDT_KRW = "1380";
const LISTING_STALE_SEC = 300;
const MARKETPLACE_BY_MARKET = Object.freeze({
  ebay_us: "EBAY_US",
  ebay_gb: "EBAY_GB",
  ebay_de: "EBAY_DE",
  ebay_au: "EBAY_AU",
});

const FORBIDDEN_INGEST_ADAPTERS = Object.freeze(["amazon", "yahoo_jp"]);

/**
 * Day-1 FX snapshot row (migration + Nest ensure share id).
 */
function day1FxSnapshot(capturedAt = new Date().toISOString()) {
  return composeFxSnapshot({
    fxSnapshotId: DAY1_FX_SNAPSHOT_ID,
    capturedAt,
    primary: { usdtKrw: DAY1_USDT_KRW },
  });
}

/**
 * All Admin vertical Asset Master rows (trading_card + luxury_bag + watch).
 * @returns {ReturnType<typeof tradingCardSeedsAsAssetMasters>}
 */
function listDay1AssetMasters() {
  return [
    ...tradingCardSeedsAsAssetMasters(),
    ...luxuryBagSeedsAsAssetMasters(),
    ...watchSeedsAsAssetMasters(),
  ];
}

/**
 * Reject amazon/yahoo at builder boundary (Day-1 CHECK invariant).
 * @param {{ adapterId?: string, marketId?: string }} input
 */
function assertDay1ListingLeg(input) {
  const adapterId = String(input.adapterId ?? "");
  const marketId = String(input.marketId ?? "");
  if (FORBIDDEN_INGEST_ADAPTERS.includes(adapterId)) {
    throw new Error(`Day-1 FORBIDDEN adapter INSERT: ${adapterId}`);
  }
  if (isForbiddenAdapterId(adapterId)) {
    throw new Error(`FORBIDDEN adapter: ${adapterId}`);
  }
  assertNotForbidden({ adapterId, marketId, source: adapterId });
  if (adapterId !== "ebay" && adapterId !== "admin") {
    throw new Error(`Day-1 listing adapter must be ebay|admin got ${adapterId}`);
  }
  if (
    !["ebay_us", "ebay_gb", "ebay_de", "ebay_au", "admin"].includes(marketId)
  ) {
    throw new Error(`Day-1 marketId invalid: ${marketId}`);
  }
}

/**
 * Ebay-adapter ingest-shaped listing (preview E2E record shape).
 * @param {{
 *   assetId: string,
 *   marketId: 'ebay_us'|'ebay_gb'|'ebay_de'|'ebay_au',
 *   priceUsdt: string,
 *   title: string,
 *   imageUrl?: string,
 *   observedAt?: string,
 * }} input
 */
function buildEbayIngestListing(input) {
  const marketId = input.marketId;
  const marketplaceId = MARKETPLACE_BY_MARKET[marketId];
  if (!marketplaceId) throw new Error(`no marketplace for ${marketId}`);
  assertDay1ListingLeg({ adapterId: "ebay", marketId });
  const observedAt = input.observedAt || new Date().toISOString();
  const externalItemId = `runtime_seed_${input.assetId}_${marketId}`;
  return {
    id: `lst_ebay_${marketplaceId}_${externalItemId}`,
    assetId: input.assetId,
    marketId,
    adapterId: "ebay",
    marketplaceId,
    externalItemId,
    title: input.title,
    priceUsdt: assertAmount(String(input.priceUsdt), "priceUsdt"),
    currency: "USDT",
    url: `https://www.ebay.com/itm/${encodeURIComponent(externalItemId)}`,
    imageUrl: input.imageUrl || null,
    observedAt,
    staleAt: new Date(
      Date.parse(observedAt) + LISTING_STALE_SEC * 1000,
    ).toISOString(),
  };
}

/**
 * @param {object} asset normalizeAssetMaster row
 * @param {{ compareReadyForceFalse?: boolean, observedAt?: string }} [opts]
 */
function buildRuntimeSeedBundleForAsset(asset, opts = {}) {
  const capital = assertAmount(
    String(asset.meta?.requiredCapitalUsdt ?? "100"),
    "requiredCapitalUsdt",
  );
  const buyPrice = capital;
  // ebay fee ~13.5% both legs ⇒ sell/buy must exceed ~1.34 for profit>0
  const sellPrice = addAmount(mulAmount(buyPrice, "1.40"), "20");
  const observedAt = opts.observedAt || new Date().toISOString();
  const buyListing = buildEbayIngestListing({
    assetId: asset.assetId,
    marketId: "ebay_us",
    priceUsdt: buyPrice,
    title: `${asset.assetLabel} (US)`,
    imageUrl: asset.imageUrl,
    observedAt,
  });
  const sellListing = buildEbayIngestListing({
    assetId: asset.assetId,
    marketId: "ebay_gb",
    priceUsdt: sellPrice,
    title: `${asset.assetLabel} (GB)`,
    imageUrl: asset.imageUrl,
    observedAt,
  });

  const imageMissing = isImageMissing({ imageUrl: asset.imageUrl });
  const gradeMismatch = opts.compareReadyForceFalse === true;
  const pricing = computeOpportunityPricing({
    buyMarketId: "ebay_us",
    buyPriceUsdt: buyPrice,
    sellMarketId: "ebay_gb",
    sellPriceUsdt: sellPrice,
    requiredCapitalUsdt: capital,
    gradeMismatch,
    imageMissing,
    legsFresh: true,
    pricingSource: "adapter",
  });

  const fx = day1FxSnapshot(observedAt);
  const scan = projectOpportunityScanFields({
    arbitrageType: "price",
    staleAt: buyListing.staleAt,
    now: Date.parse(observedAt),
  });

  const publish = {
    compareReady: pricing.compareReady,
    assetImageUrl: asset.imageUrl,
  };
  const canPublish = canAutoPublishAvailable(publish);
  const imageGuard = assertPublishImageGuard({
    compareReady: pricing.compareReady,
    assetImageUrl: asset.imageUrl,
    category: asset.category,
    imageSource: asset.imageSource,
    assetId: asset.assetId,
  });

  const status =
    canPublish && imageGuard.ok && pricing.compareReady
      ? "available"
      : "paused";

  const expectedProfitKrw = approxKrwFromSnapshot(pricing.expectedProfitUsdt, {
    usdtKrw: fx.usdtKrw,
  });

  return {
    listings: [buyListing, sellListing],
    opportunity: {
      assetId: asset.assetId,
      pricingVersion: 1,
      pricedAt: observedAt,
      expectedProfitUsdt: pricing.expectedProfitUsdt,
      expectedProfitKrwApprox: expectedProfitKrw,
      fxSnapshotId: fx.fxSnapshotId,
      estimatedDurationSec: 12,
      aiConfidenceScore: "72.00",
      difficulty: "normal",
      tags: scan.tags,
      requiredCapitalUsdt: capital,
      executionMode: "orchestrate",
      executionPlatforms: [],
      category: asset.category,
      assetLabel: asset.assetLabel,
      assetImageUrl: asset.imageUrl,
      assetImageSource: asset.imageSource,
      assetImageAltKo: asset.imageAltKo || asset.assetLabel,
      arbitrageType: scan.arbitrageType,
      arbitrageTypeKo: scan.arbitrageTypeKo,
      pricing,
      staleAt: buyListing.staleAt,
      status,
      gradeMismatch: pricing.gradeMismatch,
      imageMissing: pricing.imageMissing,
      capitalBand: pricing.capitalBand,
      sellSuccessRate: scan.sellSuccessRate ?? null,
      sellSuccessWindowDays: scan.sellSuccessWindowDays ?? null,
      sellSuccessAsOf: scan.sellSuccessAsOf ?? null,
      riskScore: 2,
    },
    publishGuard: { canPublish, imageGuard },
  };
}

/**
 * Build min catalog bundles: all assets · first of each category compareReady
 * true when possible · one forced false per category (일부 true).
 * @returns {{
 *   fx: ReturnType<typeof day1FxSnapshot>,
 *   assets: ReturnType<typeof listDay1AssetMasters>,
 *   bundles: ReturnType<typeof buildRuntimeSeedBundleForAsset>[],
 *   day1LegPair: { buy: string, sell: string },
 *   forbiddenInsertAttempts: string[],
 * }}
 */
function buildMinCatalogRuntimeSeed(opts = {}) {
  const assets = listDay1AssetMasters();
  const observedAt = opts.observedAt || new Date().toISOString();
  const byCat = { trading_card: [], luxury_bag: [], watch: [] };
  for (const a of assets) {
    if (byCat[a.category]) byCat[a.category].push(a);
  }

  /** @type {ReturnType<typeof buildRuntimeSeedBundleForAsset>[]} */
  const bundles = [];
  for (const cat of ["trading_card", "luxury_bag", "watch"]) {
    const rows = byCat[cat];
    if (!rows.length) continue;
    // First → compareReady aspirational true
    bundles.push(
      buildRuntimeSeedBundleForAsset(rows[0], {
        observedAt,
        compareReadyForceFalse: false,
      }),
    );
    // Second (if any) → forced false so catalog has mixed compareReady
    if (rows[1]) {
      bundles.push(
        buildRuntimeSeedBundleForAsset(rows[1], {
          observedAt,
          compareReadyForceFalse: true,
        }),
      );
    }
  }

  const p0 = DAY1_LEG_PAIRS.find((p) => p.priority === "P0_auto");
  return {
    fx: day1FxSnapshot(observedAt),
    assets,
    bundles,
    day1LegPair: {
      buy: p0?.buy || "ebay_us",
      sell: p0?.sell || "ebay_gb",
    },
    /** Explicit 0 — builders never emit these */
    forbiddenInsertAttempts: [],
  };
}

/**
 * Normalize ingest listing payloads for PG persist (ebay|admin only).
 * amazon/yahoo → throw (시도 카운트는 호출부에서 집계).
 * @param {unknown[]} rawListings
 * @param {string} adapterId
 */
function normalizeIngestListingsForPersist(rawListings, adapterId) {
  const aid = String(adapterId || "");
  if (FORBIDDEN_INGEST_ADAPTERS.includes(aid) || isForbiddenAdapterId(aid)) {
    throw new Error(`Day-1 FORBIDDEN adapter INSERT: ${aid}`);
  }
  if (aid !== "ebay" && aid !== "admin") {
    throw new Error(`persist listings adapter must be ebay|admin got ${aid}`);
  }
  const out = [];
  for (const raw of Array.isArray(rawListings) ? rawListings : []) {
    if (!raw || typeof raw !== "object") continue;
    const L = /** @type {Record<string, unknown>} */ (raw);
    const marketId = String(L.marketId ?? "");
    assertDay1ListingLeg({
      adapterId: String(L.adapterId ?? aid),
      marketId,
    });
    const assetId = String(L.assetId ?? "");
    if (!assetId || assetId.startsWith("query:")) {
      // Safety guard only — AdaptersAdminService must resolve via
      // resolveEbayIngestListings first; unresolved query: never reaches PG.
      continue;
    }
    const price = L.priceUsdt != null ? String(L.priceUsdt) : null;
    if (price == null) continue;
    const observedAt =
      typeof L.observedAt === "string"
        ? L.observedAt
        : new Date().toISOString();
    const staleAt =
      typeof L.staleAt === "string"
        ? L.staleAt
        : new Date(Date.now() + LISTING_STALE_SEC * 1000).toISOString();
    out.push({
      assetId,
      marketId,
      adapterId: String(L.adapterId ?? aid),
      marketplaceId:
        L.marketplaceId != null ? String(L.marketplaceId) : null,
      externalItemId:
        L.externalItemId != null
          ? String(L.externalItemId)
          : typeof L.id === "string"
            ? String(L.id)
            : null,
      title: L.title != null ? String(L.title) : null,
      priceUsdt: assertAmount(price, "priceUsdt"),
      currency: L.currency != null ? String(L.currency) : "USDT",
      url: L.url != null ? String(L.url) : null,
      imageUrl: L.imageUrl != null ? String(L.imageUrl) : null,
      observedAt,
      staleAt,
      raw: L,
    });
  }
  return out;
}

module.exports = {
  DAY1_FX_SNAPSHOT_ID,
  DAY1_USDT_KRW,
  LISTING_STALE_SEC,
  FORBIDDEN_INGEST_ADAPTERS,
  MARKETPLACE_BY_MARKET,
  day1FxSnapshot,
  listDay1AssetMasters,
  assertDay1ListingLeg,
  buildEbayIngestListing,
  buildRuntimeSeedBundleForAsset,
  buildMinCatalogRuntimeSeed,
  normalizeIngestListingsForPersist,
};

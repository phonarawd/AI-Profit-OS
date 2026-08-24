/**
 * Engine §0.9 Phase A — live listing → opportunity promotion (pure).
 * INSERT only when compareReady + image guard pass · no seed overwrite.
 */

const { assertAmount } = require("./money.cjs");
const { computeOpportunityPricing } = require("./pricing-formula.cjs");
const { approxKrwFromSnapshot } = require("./fx-snapshot-formula.cjs");
const {
  canAutoPublishAvailable,
  assertPublishImageGuard,
} = require("./asset-image.cjs");
const { isImageMissing } = require("./asset-master.cjs");
const { projectOpportunityScanFields } = require("./opportunity-scan.cjs");
const { resolveStoredLegListingPrices } = require("./pipeline.cjs");

const DEFAULT_BUY_MARKET = "ebay_us";
const DEFAULT_SELL_MARKET = "ebay_gb";

/**
 * Both legs must have staleAt strictly after `now` when provided.
 * @param {{
 *   listings: Array<{ marketId?: string, staleAt?: string | null }>,
 *   buyMarketId: string,
 *   sellMarketId: string,
 *   nowMs?: number,
 * }} input
 */
function areListingLegsFresh(input) {
  const nowMs = input.nowMs ?? Date.now();
  const buyMarketId = String(input.buyMarketId ?? "");
  const sellMarketId = String(input.sellMarketId ?? "");
  const listings = Array.isArray(input.listings) ? input.listings : [];
  for (const marketId of [buyMarketId, sellMarketId]) {
    const leg = listings.find((L) => String(L.marketId ?? "") === marketId);
    if (!leg) return false;
    const staleAt = leg.staleAt != null ? String(leg.staleAt) : "";
    if (!staleAt) return false;
    const staleMs = Date.parse(staleAt);
    if (!Number.isFinite(staleMs) || staleMs <= nowMs) return false;
  }
  return true;
}

/**
 * Build opportunity INSERT payload from Asset Master + persisted listings.
 * Fail-closed when legs unresolved, stale, or publish guards fail.
 * @param {{
 *   asset: {
 *     assetId: string,
 *     category: string,
 *     assetLabel: string,
 *     imageUrl?: string | null,
 *     imageSource?: string,
 *     imageAltKo?: string,
 *     meta?: { requiredCapitalUsdt?: string },
 *   },
 *   listings: Array<{ marketId: string, priceUsdt: string, staleAt?: string | null, observedAt?: string | null }>,
 *   buyMarketId?: string,
 *   sellMarketId?: string,
 *   fxSnapshotId: string,
 *   usdtKrw: string,
 *   nowMs?: number,
 *   gradeMismatch?: boolean,
 * }} input
 * @returns {{ ok: true, opportunity: object, publishGuard: object } | { ok: false, reason: string, pricing?: object, publishGuard?: object }}
 */
function buildOpportunityPromotionFromLiveListings(input) {
  const buyMarketId = String(input.buyMarketId ?? DEFAULT_BUY_MARKET);
  const sellMarketId = String(input.sellMarketId ?? DEFAULT_SELL_MARKET);
  const asset = input.asset;
  if (!asset?.assetId) return { ok: false, reason: "asset_required" };

  const resolved = resolveStoredLegListingPrices({
    listings: input.listings,
    buyMarketId,
    sellMarketId,
  });
  if (!resolved.ok) return { ok: false, reason: "leg_resolve_failed" };

  const nowMs = input.nowMs ?? Date.now();
  const legsFresh = areListingLegsFresh({
    listings: input.listings,
    buyMarketId,
    sellMarketId,
    nowMs,
  });

  const capitalDefault = resolved.buyPriceUsdt;
  const capital = assertAmount(
    String(asset.meta?.requiredCapitalUsdt ?? capitalDefault),
    "requiredCapitalUsdt",
  );
  const imageMissing = isImageMissing({ imageUrl: asset.imageUrl });
  const gradeMismatch = Boolean(input.gradeMismatch);

  const pricing = computeOpportunityPricing({
    buyMarketId,
    buyPriceUsdt: resolved.buyPriceUsdt,
    sellMarketId,
    sellPriceUsdt: resolved.sellPriceUsdt,
    requiredCapitalUsdt: capital,
    gradeMismatch,
    imageMissing,
    legsFresh,
    pricingSource: "adapter",
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

  const publishGuard = { canPublish, imageGuard };
  if (!canPublish || !imageGuard.ok || pricing.compareReady !== true) {
    return {
      ok: false,
      reason: "publish_guard",
      pricing,
      publishGuard,
    };
  }

  const asOf = new Date(nowMs).toISOString();
  const buyLeg = input.listings.find(
    (L) => String(L.marketId ?? "") === buyMarketId,
  );
  const staleAt = buyLeg?.observedAt || asOf;
  const scan = projectOpportunityScanFields({
    arbitrageType: "price",
    staleAt: String(buyLeg?.staleAt ?? asOf),
    now: nowMs,
  });
  const expectedProfitKrw = approxKrwFromSnapshot(pricing.expectedProfitUsdt, {
    usdtKrw: String(input.usdtKrw ?? "0"),
  });

  return {
    ok: true,
    publishGuard,
    opportunity: {
      assetId: asset.assetId,
      pricingVersion: 1,
      pricedAt: asOf,
      expectedProfitUsdt: pricing.expectedProfitUsdt,
      expectedProfitKrwApprox: expectedProfitKrw,
      fxSnapshotId: input.fxSnapshotId,
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
      staleAt: asOf,
      status: "available",
      gradeMismatch: pricing.gradeMismatch,
      imageMissing: pricing.imageMissing,
      capitalBand: pricing.capitalBand,
      sellSuccessRate: scan.sellSuccessRate ?? null,
      sellSuccessWindowDays: scan.sellSuccessWindowDays ?? null,
      sellSuccessAsOf: scan.sellSuccessAsOf ?? null,
      riskScore: 2,
    },
  };
}

module.exports = {
  DEFAULT_BUY_MARKET,
  DEFAULT_SELL_MARKET,
  areListingLegsFresh,
  buildOpportunityPromotionFromLiveListings,
};

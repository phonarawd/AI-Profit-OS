/**
 * Engine §0.0.3 — market intel pipeline stages (errors0).
 * Adapters deploy = Phase1+ · formula/contract Owns = this package.
 */

const PIPELINE_STAGES = Object.freeze([
  "asset_master_seed",
  "catalog_hydrate",
  "listing_observe",
  "asset_image_resolve",
  "fx_snapshot",
  "spread_compute",
  "opportunity_publish",
  "cache_push",
]);

/** Auto-publish guards (Opportunity status=available) */
const PUBLISH_GUARDS = Object.freeze({
  minPricingLegs: 1,
  listingLegsOnly: ["ebay", "admin"],
  catalogAloneForbidden: ["pokemontcg", "ygoprodeck"],
  requireFreshLegs: true,
  requireAssetImageUrl: true,
  requireExpectedProfitPositive: true,
  /** Day-1 auto-publish 0 for yahoo/amazon · Phase1+ partner adapters exist (§0.0.1c) */
  yahooJpForbidden: true,
  amazonAutoPublishForbidden: true,
  /** Engine §4.2a — available 공개 시 arbitrageTypeKo 필수 */
  requireArbitrageTypeKo: true,
});

/**
 * Day-1 recommended leg pairs (ebay multi | ebay×admin).
 * @type {ReadonlyArray<{ buy: string, sell: string, priority: string }>}
 */
const DAY1_LEG_PAIRS = Object.freeze([
  { buy: "ebay_us", sell: "ebay_gb", priority: "P0_auto" },
  { buy: "ebay_us", sell: "ebay_de", priority: "P0_auto" },
  { buy: "ebay_us", sell: "ebay_au", priority: "P0_auto" },
  { buy: "ebay_us", sell: "admin", priority: "P0_semiauto" },
  { buy: "admin", sell: "ebay_us", priority: "P0_semiauto" },
  { buy: "admin", sell: "ebay_gb", priority: "P0_semiauto" },
]);

/**
 * @param {{ buyMarketId: string, sellMarketId: string }} legs
 * @returns {boolean}
 */
function isAllowedLegPair(legs) {
  const { isMarketId } = require("./markets.cjs");
  const { isForbiddenMarketId } = require("./forbidden.cjs");
  if (!isMarketId(legs.buyMarketId) || !isMarketId(legs.sellMarketId)) {
    return false;
  }
  if (
    isForbiddenMarketId(legs.buyMarketId) ||
    isForbiddenMarketId(legs.sellMarketId)
  ) {
    return false;
  }
  if (legs.buyMarketId === legs.sellMarketId) return false;
  return true;
}

/**
 * Stored listing pair → buy/sell USDT. Fail-closed unless each market has
 * exactly one listing. Does not pick "cheapest" or last-write-wins.
 * @param {{
 *   listings: Array<{ marketId?: string, priceUsdt?: string }>,
 *   buyMarketId: string,
 *   sellMarketId: string,
 * }} input
 * @returns {{ ok: true, buyPriceUsdt: string, sellPriceUsdt: string } | { ok: false }}
 */
function resolveStoredLegListingPrices(input) {
  const { assertAmount } = require("./money.cjs");
  if (!input || !Array.isArray(input.listings)) return { ok: false };
  const buyMarketId = String(input.buyMarketId ?? "");
  const sellMarketId = String(input.sellMarketId ?? "");
  if (!buyMarketId || !sellMarketId || buyMarketId === sellMarketId) {
    return { ok: false };
  }
  const buyLegs = input.listings.filter(
    (L) => String(L?.marketId ?? "") === buyMarketId,
  );
  const sellLegs = input.listings.filter(
    (L) => String(L?.marketId ?? "") === sellMarketId,
  );
  if (buyLegs.length !== 1 || sellLegs.length !== 1) return { ok: false };
  try {
    return {
      ok: true,
      buyPriceUsdt: assertAmount(String(buyLegs[0].priceUsdt), "buyPriceUsdt"),
      sellPriceUsdt: assertAmount(
        String(sellLegs[0].priceUsdt),
        "sellPriceUsdt",
      ),
    };
  } catch {
    return { ok: false };
  }
}

module.exports = {
  PIPELINE_STAGES,
  PUBLISH_GUARDS,
  DAY1_LEG_PAIRS,
  isAllowedLegPair,
  resolveStoredLegListingPrices,
};

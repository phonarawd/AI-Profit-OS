/**
 * Engine §0.0.2 — FORBIDDEN market sources (v1 code path 0).
 * v7.22.41: yahoo_jp / amazon_* = official partners (Phase1+ adapters) — NOT forbidden.
 * Day-1 auto-publish still ebay|admin only (pipeline PUBLISH_GUARDS).
 */

const FORBIDDEN_ADAPTER_IDS = Object.freeze([
  "yahoo_auction", // legacy scrape alias — use yahoo_jp official adapter
  "tcgplayer",
  "justtcg",
  "pricecharting",
  "chrono24",
  "cardmarket",
  "scryfall",
  "rolex-adapter",
  "bunjang",
  "joonggonara",
  "daangn",
  "cream",
  "feelway",
]);

/** Day-1 KR C2C / non-partner markets — yahoo_jp removed (v7.22.41 partner restore) */
const FORBIDDEN_MARKET_IDS = Object.freeze([
  "bunjang",
  "joonggonara",
  "daangn",
  "chrono24",
]);

/** Scraping / non-partner env prefixes (official YAHOO_AUCTION_* partner keys allowed) */
const FORBIDDEN_ENV_PREFIXES = Object.freeze([
  "CHRONO24_",
  "TCGPLAYER_",
  "BUNJANG_",
]);

/**
 * @param {string | null | undefined} id
 * @returns {boolean}
 */
function isForbiddenAdapterId(id) {
  if (id == null || id === "") return false;
  const n = String(id).trim().toLowerCase().replace(/_/g, "-");
  // official partner adapters are never forbidden
  if (n === "yahoo-jp" || n === "yahoo-jp-adapter" || n === "amazon" || n === "amazon-adapter") {
    return false;
  }
  return FORBIDDEN_ADAPTER_IDS.some((f) => {
    const fn = f.toLowerCase().replace(/_/g, "-");
    return n === fn || n.includes(fn);
  });
}

/**
 * @param {string | null | undefined} marketId
 * @returns {boolean}
 */
function isForbiddenMarketId(marketId) {
  if (marketId == null || marketId === "") return false;
  return FORBIDDEN_MARKET_IDS.includes(String(marketId).trim());
}

/**
 * Throws if marketId or adapterId is FORBIDDEN.
 * @param {{ marketId?: string, adapterId?: string, source?: string }} input
 */
function assertNotForbidden(input) {
  const ids = [input.marketId, input.adapterId, input.source].filter(Boolean);
  for (const id of ids) {
    if (isForbiddenMarketId(id) || isForbiddenAdapterId(id)) {
      throw new Error(`FORBIDDEN market source: ${id}`);
    }
  }
}

module.exports = {
  FORBIDDEN_ADAPTER_IDS,
  FORBIDDEN_MARKET_IDS,
  FORBIDDEN_ENV_PREFIXES,
  isForbiddenAdapterId,
  isForbiddenMarketId,
  assertNotForbidden,
};

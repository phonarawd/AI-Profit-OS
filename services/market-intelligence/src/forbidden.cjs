/**
 * Engine §0.0.2 — market source policy (2026-09-08 unlock).
 * SSOT: governance/global-product/global-source-unlock-authorization.v1.md
 *
 * Web-parser / KR domestic / global observation sources = AUTHORIZED.
 * Only legacy scrape aliases remain blocked (use official adapters).
 * Day-1 money settlement auto-publish = pipeline PUBLISH_GUARDS.listingLegsOnly.
 */

/** Legacy Yahoo scrape alias — use yahoo_jp official partner adapter instead */
const FORBIDDEN_ADAPTER_IDS = Object.freeze(["yahoo_auction"]);

const FORBIDDEN_MARKET_IDS = Object.freeze([]);

const FORBIDDEN_ENV_PREFIXES = Object.freeze([]);

/**
 * @param {string | null | undefined} id
 * @returns {boolean}
 */
function isForbiddenAdapterId(id) {
  if (id == null || id === "") return false;
  const n = String(id).trim().toLowerCase().replace(/_/g, "-");
  if (
    n === "yahoo-jp" ||
    n === "yahoo-jp-adapter" ||
    n === "amazon" ||
    n === "amazon-adapter"
  ) {
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

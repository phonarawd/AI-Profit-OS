/**
 * Engine §0.0.1a — marketId enum + ko labels.
 * Day-1 pricing/auto-publish = ebay_*|admin.
 * Phase1+ partner markets = amazon_*|yahoo_jp (registry §0.0.1c).
 */

const DAY1_MARKET_IDS = Object.freeze([
  "ebay_us",
  "ebay_gb",
  "ebay_de",
  "ebay_au",
  "admin",
]);

/** Alias — Day-1 pricing MARKET_IDS (opportunity-pricing enum) */
const MARKET_IDS = DAY1_MARKET_IDS;

const PARTNER_MARKET_IDS = Object.freeze([
  "amazon_us",
  "amazon_jp",
  "amazon_de",
  "yahoo_jp",
]);

/** @type {Readonly<Record<string, string>>} */
const MARKET_LABEL_KO = Object.freeze({
  ebay_us: "이베이(미국)",
  ebay_gb: "이베이(영국)",
  ebay_de: "이베이(독일)",
  ebay_au: "이베이(호주)",
  admin: "운영자 기준가",
  amazon_us: "아마존(미국)",
  amazon_jp: "아마존(일본)",
  amazon_de: "아마존(독일)",
  yahoo_jp: "Yahoo! JAPAN オークション",
});

/** ebay_* → shared fee bucket · admin → 0 · amazon/yahoo Phase1+ fee buckets */
function feeBucket(marketId) {
  if (marketId === "admin") return "admin";
  if (typeof marketId === "string" && marketId.startsWith("ebay_")) return "ebay";
  if (typeof marketId === "string" && marketId.startsWith("amazon_")) return "amazon";
  if (marketId === "yahoo_jp") return "yahoo_jp";
  throw new Error(`unknown marketId: ${marketId}`);
}

function isDay1MarketId(id) {
  return DAY1_MARKET_IDS.includes(id);
}

function isPartnerMarketId(id) {
  return PARTNER_MARKET_IDS.includes(id);
}

/** Day-1 pricing marketId check */
function isMarketId(id) {
  return isDay1MarketId(id);
}

function isKnownMarketId(id) {
  return isDay1MarketId(id) || isPartnerMarketId(id);
}

function marketLabelKo(marketId) {
  if (!isKnownMarketId(marketId)) {
    throw new Error(`unknown marketId: ${marketId}`);
  }
  return MARKET_LABEL_KO[marketId];
}

/** Day-1 PriceObservation.source + Phase1+ partner listing sources */
const PRICE_OBSERVATION_SOURCES = Object.freeze([
  "ebay",
  "admin",
  "pokemontcg",
  "ygoprodeck",
  "coingecko",
  "frankfurter",
  "amazon",
  "yahoo_jp",
]);

const ACTIVE_ADAPTER_IDS = Object.freeze([
  "ebay",
  "pokemontcg",
  "ygoprodeck",
  "coingecko",
  "frankfurter",
  "admin",
  "amazon",
  "yahoo_jp",
]);

module.exports = {
  MARKET_IDS,
  DAY1_MARKET_IDS,
  PARTNER_MARKET_IDS,
  MARKET_LABEL_KO,
  PRICE_OBSERVATION_SOURCES,
  ACTIVE_ADAPTER_IDS,
  feeBucket,
  isMarketId,
  isDay1MarketId,
  isPartnerMarketId,
  isKnownMarketId,
  marketLabelKo,
};

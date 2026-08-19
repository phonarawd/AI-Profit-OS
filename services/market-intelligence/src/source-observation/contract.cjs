/**
 * SourceObservation 계약 상수 · listing-leg / Opportunity / Asset 과 분리.
 */

const PARSER_VERSION = "source-observation.v1";
const FASHIONPHILE_PARSER_VERSION = "fashionphile.public-json.1";
const CHRONO24_PARSER_VERSION = "chrono24.structured-data.1";
const EBAY_PARSER_VERSION = "ebay.browse-api.1";
const TCGPLAYER_PARSER_VERSION = "tcgplayer.public-page.1";

const INVARIANTS = Object.freeze([
  "PARTNER_LABEL != DATA_SOURCE",
  "SOURCE_OBSERVATION != LISTING_LEG",
  "SOURCE_OBSERVATION != OPPORTUNITY_TRUTH",
  "SOURCE_ITEM != ASSET",
  "DISCOVERY_OBSERVATION != CONFIRMED_MARKET_TRUTH",
  "DISCOVERY_PRICE != OPPORTUNITY_PRICE",
  "OBSERVED_IMAGE != DISPLAY_AUTHORIZED",
  "SOURCE_NATIVE_LISTING_PRICE != LOCALIZED_VIEWER_DISPLAY_PRICE",
]);

const OBSERVATION_PURPOSES = Object.freeze(["DISCOVERY", "CONFIRMATION"]);
const SOURCE_STATUSES = Object.freeze([
  "SUCCESS",
  "NOT_FOUND",
  "UNAVAILABLE",
  "OUT_OF_STOCK",
  "PARSE_FAILED",
  "AMBIGUOUS",
  "ACCESS_BLOCKED",
  "TEMPORARY_ERROR",
]);

const EXTRACTION_METHODS = Object.freeze([
  "PUBLIC_JSON",
  "STRUCTURED_DATA",
  "EMBEDDED_STATE",
  "DOM",
  "URL_PATTERN",
  "BROWSER_RENDERED",
  "EXISTING_API",
]);

const PRICE_KINDS = Object.freeze(["listing_sale", "buy_now", "lowest_ask"]);

const OBSERVATION_SOURCES = Object.freeze([
  "ebay",
  "fashionphile",
  "chrono24",
  "tcgplayer",
  "mercari_jp",
  "kream",
  "stockx",
  "goat",
  "bunjang",
  "vestiaire",
]);

const FORBIDDEN_OBSERVATION_SOURCES = Object.freeze(["yahoo_jp"]);

const IMPLEMENTED_PARSERS = Object.freeze(["fashionphile", "chrono24", "ebay", "tcgplayer"]);

const NATIVE_CURRENCIES = Object.freeze([
  "USD",
  "GBP",
  "EUR",
  "AUD",
  "USDT",
  "JPY",
  "KRW",
  "SGD",
]);

const PERSISTENCE_VERDICT = Object.freeze({
  OBSERVATION_REPOSITORY_CONTRACT: "PASS",
  OBSERVATION_MEMORY_RUNTIME: "PASS",
  OBSERVATION_SQL_CONTRACT: "PASS",
  OBSERVATION_DB_RUNTIME: "PASS",
  DURABLE_DB_RUNTIME_VERIFIED_ENVIRONMENT: "CURSOR_CREATED_LOCAL_TEST_POSTGRES",
  PRODUCTION_OBSERVATION_PERSISTENCE: "NOT_IMPLEMENTED",
  REMOTE_SUPABASE_RUNTIME_VERIFICATION: "NOT_VERIFIED",
});

/**
 * 향후 Identity Matching용 시그니처만. 구현 0.
 * @param {unknown} _identityQuery
 * @returns {never}
 */
function discoverCandidates(_identityQuery) {
  throw new Error("discoverCandidates NOT_IMPLEMENTED — Identity Matching is a later task");
}

module.exports = {
  PARSER_VERSION,
  FASHIONPHILE_PARSER_VERSION,
  CHRONO24_PARSER_VERSION,
  EBAY_PARSER_VERSION,
  TCGPLAYER_PARSER_VERSION,
  INVARIANTS,
  OBSERVATION_PURPOSES,
  SOURCE_STATUSES,
  EXTRACTION_METHODS,
  PRICE_KINDS,
  OBSERVATION_SOURCES,
  FORBIDDEN_OBSERVATION_SOURCES,
  IMPLEMENTED_PARSERS,
  NATIVE_CURRENCIES,
  PERSISTENCE_VERDICT,
  discoverCandidates,
};

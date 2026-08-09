/**
 * Engine §0.0 — Signup-Ready adapter registry (Day-1 ACTIVE).
 * Workers deploy = Phase1 · partner listing (amazon/yahoo_jp) = §0.0.1c Phase1+.
 */

const { PARTNER_LISTING_ADAPTERS, PARTNER_LISTING_ADAPTER_IDS, PARTNER_LISTING_WORKER_NAMES } =
  require("./market-partners.cjs");

const SIGNUP_READY_ADAPTER_IDS = Object.freeze([
  "ebay",
  "pokemontcg",
  "ygoprodeck",
  "coingecko",
  "frankfurter",
]);

/** Worker folder names under workers/ — Phase1 CF deploy (Day-1 signup-ready) */
const SIGNUP_READY_WORKER_NAMES = Object.freeze([
  "ebay-adapter",
  "pokemontcg-adapter",
  "ygoprodeck-adapter",
  "coingecko-adapter",
  "frankfurter-adapter",
]);

const EBAY_MARKETPLACE_IDS = Object.freeze([
  "EBAY_US",
  "EBAY_GB",
  "EBAY_DE",
  "EBAY_AU",
]);

/** @type {Readonly<Record<string, string>>} */
const EBAY_MARKETPLACE_TO_MARKET_ID = Object.freeze({
  EBAY_US: "ebay_us",
  EBAY_GB: "ebay_gb",
  EBAY_DE: "ebay_de",
  EBAY_AU: "ebay_au",
});

/**
 * @typedef {'listing'|'catalog_ref'|'fx'} AdapterRole
 */

/** @type {ReadonlyArray<{ adapterId: string, worker: string, role: AdapterRole, verticals: string[], cacheHintSec: number }>} */
const SIGNUP_READY_ADAPTERS = Object.freeze([
  {
    adapterId: "ebay",
    worker: "ebay-adapter",
    role: "listing",
    verticals: ["watch", "trading_card", "luxury_bag"],
    cacheHintSec: 300,
  },
  {
    adapterId: "pokemontcg",
    worker: "pokemontcg-adapter",
    role: "catalog_ref",
    verticals: ["trading_card"],
    cacheHintSec: 3600,
  },
  {
    adapterId: "ygoprodeck",
    worker: "ygoprodeck-adapter",
    role: "catalog_ref",
    verticals: ["trading_card"],
    cacheHintSec: 3600,
  },
  {
    adapterId: "coingecko",
    worker: "coingecko-adapter",
    role: "fx",
    verticals: ["fx"],
    cacheHintSec: 60,
  },
  {
    adapterId: "frankfurter",
    worker: "frankfurter-adapter",
    role: "fx",
    verticals: ["fx"],
    cacheHintSec: 3600,
  },
]);

/**
 * @param {string} marketplaceId
 * @returns {string}
 */
function marketIdFromEbayMarketplace(marketplaceId) {
  const id = EBAY_MARKETPLACE_TO_MARKET_ID[marketplaceId];
  if (!id) throw new Error(`unknown ebay marketplaceId: ${marketplaceId}`);
  return id;
}

/**
 * @param {string} adapterId
 * @returns {boolean}
 */
function isSignupReadyAdapterId(adapterId) {
  return SIGNUP_READY_ADAPTER_IDS.includes(adapterId);
}

/**
 * Signup-ready + Phase1+ partner listing adapters (Nest ingest allow-list).
 * @param {string} adapterId
 * @returns {boolean}
 */
function isIngestableAdapterId(adapterId) {
  return (
    isSignupReadyAdapterId(adapterId) ||
    PARTNER_LISTING_ADAPTER_IDS.includes(adapterId)
  );
}

/** @returns {ReadonlyArray<{ adapterId: string, worker: string, role: string, verticals: string[], cacheHintSec: number }>} */
function allDeployAdapters() {
  return Object.freeze([...SIGNUP_READY_ADAPTERS, ...PARTNER_LISTING_ADAPTERS]);
}

module.exports = {
  SIGNUP_READY_ADAPTER_IDS,
  SIGNUP_READY_WORKER_NAMES,
  SIGNUP_READY_ADAPTERS,
  PARTNER_LISTING_ADAPTERS,
  PARTNER_LISTING_ADAPTER_IDS,
  PARTNER_LISTING_WORKER_NAMES,
  EBAY_MARKETPLACE_IDS,
  EBAY_MARKETPLACE_TO_MARKET_ID,
  marketIdFromEbayMarketplace,
  isSignupReadyAdapterId,
  isIngestableAdapterId,
  allDeployAdapters,
};

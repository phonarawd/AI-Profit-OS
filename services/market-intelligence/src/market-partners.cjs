/**
 * Engine §0.0.1c — Market Partner Registry (v7.22.41 Founder lock).
 * Schema: schemas/market-partner.v1.json · instance: schemas/market-partner.registry.json
 * UI trust strip pointer = §38.10 (Owns=UI).
 */

const fs = require("fs");
const path = require("path");

const REGISTRY_PATH = path.join(
  __dirname,
  "../../../schemas/market-partner.registry.json",
);

/** @type {{ version: number, partners: ReadonlyArray<MarketPartner> }} */
const REGISTRY = Object.freeze(JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8")));

/**
 * @typedef {object} MarketPartner
 * @property {string} partnerId
 * @property {string} adapterId
 * @property {string} labelKo
 * @property {'A'|'B'|'C'} tier
 * @property {true} officialPartner
 * @property {'always'|'edu'|'wallet'} uiTrustStrip
 * @property {'Day-1'|'Phase1+'|'catalog'|'fx'} listingLegPhase
 * @property {string} logoAsset
 * @property {string[]} [marketIds]
 * @property {string} [worker]
 */

/** @type {ReadonlyArray<MarketPartner>} */
const MARKET_PARTNERS = Object.freeze(REGISTRY.partners.map((p) => Object.freeze({ ...p })));

const PARTNER_LISTING_ADAPTER_IDS = Object.freeze(["amazon", "yahoo_jp"]);

const PARTNER_LISTING_WORKER_NAMES = Object.freeze([
  "amazon-adapter",
  "yahoo-jp-adapter",
]);

/** Phase1+ listing marketIds (not Day-1 auto-publish) */
const PARTNER_MARKET_IDS = Object.freeze([
  "amazon_us",
  "amazon_jp",
  "amazon_de",
  "yahoo_jp",
]);

/** @type {Readonly<Record<string, string>>} */
const PARTNER_MARKET_LABEL_KO = Object.freeze({
  amazon_us: "아마존(미국)",
  amazon_jp: "아마존(일본)",
  amazon_de: "아마존(독일)",
  yahoo_jp: "Yahoo! JAPAN オークション",
});

/** @type {ReadonlyArray<{ adapterId: string, worker: string, role: 'listing', verticals: string[], cacheHintSec: number, listingLegPhase: 'Phase1+' }>} */
const PARTNER_LISTING_ADAPTERS = Object.freeze([
  {
    adapterId: "amazon",
    worker: "amazon-adapter",
    role: "listing",
    verticals: ["watch", "trading_card", "luxury_bag"],
    cacheHintSec: 600,
    listingLegPhase: "Phase1+",
  },
  {
    adapterId: "yahoo_jp",
    worker: "yahoo-jp-adapter",
    role: "listing",
    verticals: ["watch", "trading_card", "luxury_bag"],
    cacheHintSec: 600,
    listingLegPhase: "Phase1+",
  },
]);

/**
 * @param {string} partnerId
 * @returns {MarketPartner | undefined}
 */
function getPartner(partnerId) {
  return MARKET_PARTNERS.find((p) => p.partnerId === partnerId);
}

/**
 * @param {string} adapterId
 * @returns {boolean}
 */
function isPartnerListingAdapterId(adapterId) {
  return PARTNER_LISTING_ADAPTER_IDS.includes(adapterId);
}

/**
 * @param {string} marketId
 * @returns {boolean}
 */
function isPartnerMarketId(marketId) {
  return PARTNER_MARKET_IDS.includes(marketId);
}

/**
 * Tier-A partners with uiTrustStrip=always (UI §38.10 strip).
 * @returns {ReadonlyArray<MarketPartner>}
 */
function tierATrustStripPartners() {
  return MARKET_PARTNERS.filter(
    (p) => p.tier === "A" && p.uiTrustStrip === "always" && p.officialPartner,
  );
}

module.exports = {
  MARKET_PARTNER_REGISTRY_VERSION: REGISTRY.version,
  MARKET_PARTNERS,
  PARTNER_LISTING_ADAPTER_IDS,
  PARTNER_LISTING_WORKER_NAMES,
  PARTNER_MARKET_IDS,
  PARTNER_MARKET_LABEL_KO,
  PARTNER_LISTING_ADAPTERS,
  getPartner,
  isPartnerListingAdapterId,
  isPartnerMarketId,
  tierATrustStripPartners,
};

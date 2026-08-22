/**
 * Identity Matching V1 — SourceObservation pairwise same-product authority.
 * MATCH != Opportunity truth. MATCH_RESULT != LISTING_PROMOTION.
 */

const MATCHER_VERSION = "identity-matching.v1";

const INVARIANTS = Object.freeze([
  "SOURCE_ITEM != ASSET",
  "SOURCE_OBSERVATION != LISTING_LEG",
  "SOURCE_OBSERVATION != OPPORTUNITY_TRUTH",
  "MATCH_RESULT != LISTING_PROMOTION",
  "MATCH_RESULT != OPPORTUNITY_PUBLICATION",
  "DISCOVERY_OBSERVATION != CONFIRMED_MARKET_TRUTH",
  "raw meta.modelNumber equality alone != strong identity match",
]);

const DECISIONS = Object.freeze([
  "MATCH",
  "NO_MATCH",
  "INSUFFICIENT_EVIDENCE",
  "CONFLICT",
]);

const EVIDENCE_STRENGTHS = Object.freeze([
  "STRONG",
  "CORROBORATING",
  "WEAK",
  "CONFLICTING",
]);

const IDENTIFIER_TYPES = Object.freeze(["GTIN", "MPN", "WATCH_REFERENCE"]);

const IDENTITY_PROFILES = Object.freeze([
  "fashion",
  "luxury_bag",
  "watch",
  "unknown",
]);

const SOURCE_LOCAL_FIELDS = Object.freeze([
  "externalItemId",
  "fashionphile.sku",
  "ebay.epid",
  "chrono24.productID",
]);

module.exports = {
  MATCHER_VERSION,
  INVARIANTS,
  DECISIONS,
  EVIDENCE_STRENGTHS,
  IDENTIFIER_TYPES,
  IDENTITY_PROFILES,
  SOURCE_LOCAL_FIELDS,
};

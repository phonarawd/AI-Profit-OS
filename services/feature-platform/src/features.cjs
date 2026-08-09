/**
 * Feature extraction — user / market / opportunity
 * FORBIDDEN inputs for AI PICK: sellSuccessRate · successRatePercent · Math.random
 * Twin money cache fields FORBIDDEN
 */

"use strict";

/** Never enter AI PICK / Rule scoring */
const FORBIDDEN_PICK_KEYS = Object.freeze([
  "sellSuccessRate",
  "successRatePercent",
  "adminOverride",
]);

/** Twin / user feature bag — money Fact cache FORBIDDEN (§47.3) */
const FORBIDDEN_TWIN_MONEY_KEYS = Object.freeze([
  "balanceUsdt",
  "expectedProfitUsdt",
  "liveQuote",
]);

const FORBIDDEN_FEATURE_KEYS = Object.freeze([
  ...FORBIDDEN_PICK_KEYS,
  ...FORBIDDEN_TWIN_MONEY_KEYS,
]);

const CAPITAL_BANDS = Object.freeze([
  "micro",
  "small",
  "mid",
  "high",
  "whale",
]);

/**
 * @param {Record<string, unknown>|null|undefined} obj
 * @param {readonly string[]} keys
 * @returns {string[]}
 */
function findKeys(obj, keys) {
  if (!obj || typeof obj !== "object") return [];
  return keys.filter((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

/**
 * @param {Record<string, unknown>|null|undefined} obj
 * @returns {string[]}
 */
function findForbiddenKeys(obj) {
  return findKeys(obj, FORBIDDEN_FEATURE_KEYS);
}

/**
 * @param {object} input
 * @param {string} [input.userId]
 * @param {string} [input.preferredCapitalBand]
 * @param {string[]} [input.categoryInterest]
 * @param {string} [input.membershipTier]
 * @param {string[]} [input.aiPerkFlags]
 * @param {string} [input.toneBand]
 */
function extractUserFeatures(input = {}) {
  const forbidden = [
    ...findKeys(input, FORBIDDEN_PICK_KEYS),
    ...findKeys(input, FORBIDDEN_TWIN_MONEY_KEYS),
  ];
  if (forbidden.length) {
    throw new Error(
      `user features FORBIDDEN keys: ${forbidden.join(",")}`,
    );
  }
  const preferredCapitalBand = CAPITAL_BANDS.includes(
    input.preferredCapitalBand,
  )
    ? input.preferredCapitalBand
    : null;
  const categoryInterest = Array.isArray(input.categoryInterest)
    ? input.categoryInterest.filter((c) => typeof c === "string")
    : [];
  const aiPerkFlags = Array.isArray(input.aiPerkFlags)
    ? input.aiPerkFlags.filter((f) => typeof f === "string")
    : [];
  return Object.freeze({
    kind: "user",
    userId: input.userId != null ? String(input.userId) : null,
    preferredCapitalBand,
    categoryInterest: Object.freeze([...categoryInterest]),
    membershipTier:
      input.membershipTier != null ? String(input.membershipTier) : null,
    aiPerkFlags: Object.freeze([...aiPerkFlags]),
    hasAiPickBoost: aiPerkFlags.includes("ai_pick_boost"),
    toneBand: input.toneBand != null ? String(input.toneBand) : null,
  });
}

/**
 * @param {object} input
 * @param {boolean} [input.compareReady]
 * @param {string|Date|number} [input.staleAt]
 * @param {string|Date|number} [input.now]
 * @param {string} [input.capitalBand]
 * @param {string} [input.arbitrageType]
 * @param {string} [input.category]
 * @param {number} [input.adapterFreshness01] 0..1
 */
function extractMarketFeatures(input = {}) {
  const forbidden = [
    ...findKeys(input, FORBIDDEN_PICK_KEYS),
    ...findKeys(input, FORBIDDEN_TWIN_MONEY_KEYS),
  ];
  if (forbidden.length) {
    throw new Error(
      `market features FORBIDDEN keys: ${forbidden.join(",")}`,
    );
  }
  const nowMs = toEpochMs(input.now ?? Date.now());
  const staleMs = toEpochMs(input.staleAt);
  let freshness01 = 0;
  if (Number.isFinite(staleMs) && Number.isFinite(nowMs)) {
    const remainSec = (staleMs - nowMs) / 1000;
    if (remainSec <= 0) freshness01 = 0;
    else if (remainSec >= 3600) freshness01 = 1;
    else freshness01 = Math.min(1, remainSec / 3600);
  }
  const adapterFreshness01 = clamp01(
    typeof input.adapterFreshness01 === "number"
      ? input.adapterFreshness01
      : freshness01,
  );
  return Object.freeze({
    kind: "market",
    compareReady: input.compareReady === true,
    capitalBand: CAPITAL_BANDS.includes(input.capitalBand)
      ? input.capitalBand
      : null,
    arbitrageType:
      input.arbitrageType != null ? String(input.arbitrageType) : null,
    category: input.category != null ? String(input.category) : null,
    freshness01,
    adapterFreshness01,
    staleAt:
      input.staleAt != null
        ? new Date(toEpochMs(input.staleAt)).toISOString()
        : null,
  });
}

/**
 * Opportunity features for scoring — numeric profit as *scoring input only*
 * (not Twin cache). sellSuccessRate FORBIDDEN.
 *
 * @param {object} input
 * @param {string} [input.opportunityId]
 * @param {string|number} [input.expectedProfitUsdt]
 * @param {string|number} [input.minProfitUsdt]
 * @param {string} [input.capitalBand]
 * @param {boolean} [input.compareReady]
 * @param {number} [input.pricingVersion]
 */
function extractOpportunityFeatures(input = {}) {
  // sellSuccessRate / successRatePercent / adminOverride must never enter AI PICK
  // expectedProfitUsdt IS allowed here as scoring scalar (≠ Twin money cache)
  const forbidden = findKeys(input, FORBIDDEN_PICK_KEYS);
  if (forbidden.length) {
    throw new Error(
      `opportunity features FORBIDDEN keys: ${forbidden.join(",")}`,
    );
  }
  const expected = toNum(input.expectedProfitUsdt);
  const minProfit = toNum(input.minProfitUsdt ?? 0);
  let profitHeadroom01 = 0;
  if (Number.isFinite(expected) && Number.isFinite(minProfit)) {
    if (expected <= 0) profitHeadroom01 = 0;
    else if (expected >= minProfit * 3 && minProfit > 0) {
      profitHeadroom01 = 1;
    } else if (minProfit <= 0) {
      profitHeadroom01 = Math.min(1, expected / 50);
    } else {
      profitHeadroom01 = clamp01(expected / (minProfit * 3));
    }
  }
  return Object.freeze({
    kind: "opportunity",
    opportunityId:
      input.opportunityId != null ? String(input.opportunityId) : null,
    expectedProfitUsdt: Number.isFinite(expected) ? expected : null,
    minProfitUsdt: Number.isFinite(minProfit) ? minProfit : 0,
    profitHeadroom01,
    capitalBand: CAPITAL_BANDS.includes(input.capitalBand)
      ? input.capitalBand
      : null,
    compareReady: input.compareReady === true,
    pricingVersion:
      typeof input.pricingVersion === "number"
        ? input.pricingVersion
        : null,
  });
}

function toEpochMs(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const ms = Date.parse(String(value ?? ""));
  return Number.isFinite(ms) ? ms : NaN;
}

function toNum(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value == null || value === "") return NaN;
  const n = Number(String(value));
  return Number.isFinite(n) ? n : NaN;
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Band fit 0..1 — preferred vs opportunity capitalBand
 * @param {string|null} preferred
 * @param {string|null} oppBand
 */
function capitalBandFit01(preferred, oppBand) {
  if (!preferred || !oppBand) return 0.5;
  const a = CAPITAL_BANDS.indexOf(preferred);
  const b = CAPITAL_BANDS.indexOf(oppBand);
  if (a < 0 || b < 0) return 0.5;
  const dist = Math.abs(a - b);
  if (dist === 0) return 1;
  if (dist === 1) return 0.7;
  if (dist === 2) return 0.4;
  return 0.15;
}

/**
 * Category interest fit
 * @param {string[]} interests
 * @param {string|null} category
 */
function categoryFit01(interests, category) {
  if (!category) return 0.5;
  if (!Array.isArray(interests) || interests.length === 0) return 0.5;
  return interests.includes(category) ? 1 : 0.25;
}

module.exports = {
  FORBIDDEN_FEATURE_KEYS,
  FORBIDDEN_PICK_KEYS,
  FORBIDDEN_TWIN_MONEY_KEYS,
  CAPITAL_BANDS,
  findForbiddenKeys,
  findKeys,
  extractUserFeatures,
  extractMarketFeatures,
  extractOpportunityFeatures,
  capitalBandFit01,
  categoryFit01,
  clamp01,
};

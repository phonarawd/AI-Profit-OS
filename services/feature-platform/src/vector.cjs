/**
 * FeatureVector builder — versioned · hashable · AI PICK input SSOT
 */

"use strict";

const crypto = require("crypto");
const {
  extractUserFeatures,
  extractMarketFeatures,
  extractOpportunityFeatures,
  capitalBandFit01,
  categoryFit01,
  FORBIDDEN_PICK_KEYS,
} = require("./features.cjs");

/** Locked formula id — bump only with golden + shadow-replay */
const FEATURE_FORMULA_ID = "feat_ai_pick_v1";

/**
 * @param {object} input
 * @param {object} [input.user]
 * @param {object} [input.market]
 * @param {object} [input.opportunity]
 * @param {string|Date|number} [input.now]
 */
function buildFeatureVector(input = {}) {
  const user = extractUserFeatures(input.user || {});
  const market = extractMarketFeatures({
    ...(input.market || {}),
    now: input.now,
  });
  const opportunity = extractOpportunityFeatures(input.opportunity || {});

  const bandFit = capitalBandFit01(
    user.preferredCapitalBand,
    opportunity.capitalBand || market.capitalBand,
  );
  const catFit = categoryFit01(user.categoryInterest, market.category);

  const scalars = Object.freeze({
    freshness01: market.freshness01,
    adapterFreshness01: market.adapterFreshness01,
    compareReady01: market.compareReady || opportunity.compareReady ? 1 : 0,
    profitHeadroom01: opportunity.profitHeadroom01,
    capitalBandFit01: bandFit,
    categoryFit01: catFit,
    aiPickBoost01: user.hasAiPickBoost ? 1 : 0,
  });

  // Guard: scalar bag must not smuggle pick-forbidden keys
  for (const k of FORBIDDEN_PICK_KEYS) {
    if (Object.prototype.hasOwnProperty.call(scalars, k)) {
      throw new Error(`FeatureVector FORBIDDEN scalar: ${k}`);
    }
  }

  const vector = {
    schema: "feature-vector.v1",
    formulaId: FEATURE_FORMULA_ID,
    opportunityId: opportunity.opportunityId,
    userId: user.userId,
    scalars,
    user,
    market,
    opportunity,
    capturedAt: new Date(
      Number.isFinite(Date.parse(String(input.now ?? "")))
        ? Date.parse(String(input.now))
        : Date.now(),
    ).toISOString(),
  };

  const hash = hashFeatureVector(vector);
  return Object.freeze({
    ...vector,
    hash,
  });
}

/**
 * Stable hash over scoring scalars + ids (not full nested dumps of dates)
 * @param {object} vector
 */
function hashFeatureVector(vector) {
  const payload = JSON.stringify({
    formulaId: vector.formulaId,
    opportunityId: vector.opportunityId,
    userId: vector.userId,
    scalars: vector.scalars,
  });
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

module.exports = {
  FEATURE_FORMULA_ID,
  buildFeatureVector,
  hashFeatureVector,
};

/**
 * @aipo/feature-platform — Engine feature vectors for AI PICK
 * CI: verify:ai-feature-platform · verify:no-success-rate-as-rule
 */

"use strict";

const {
  FORBIDDEN_FEATURE_KEYS,
  FORBIDDEN_PICK_KEYS,
  FORBIDDEN_TWIN_MONEY_KEYS,
  CAPITAL_BANDS,
  findForbiddenKeys,
  extractUserFeatures,
  extractMarketFeatures,
  extractOpportunityFeatures,
  capitalBandFit01,
  categoryFit01,
  clamp01,
} = require("./features.cjs");
const {
  FEATURE_FORMULA_ID,
  buildFeatureVector,
  hashFeatureVector,
} = require("./vector.cjs");

module.exports = {
  FORBIDDEN_FEATURE_KEYS,
  FORBIDDEN_PICK_KEYS,
  FORBIDDEN_TWIN_MONEY_KEYS,
  CAPITAL_BANDS,
  FEATURE_FORMULA_ID,
  findForbiddenKeys,
  extractUserFeatures,
  extractMarketFeatures,
  extractOpportunityFeatures,
  capitalBandFit01,
  categoryFit01,
  clamp01,
  buildFeatureVector,
  hashFeatureVector,
};

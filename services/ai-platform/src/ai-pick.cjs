/**
 * AI PICK score — L2 only · deterministic · feature-platform scalars
 * FORBIDDEN: Math.random · sellSuccessRate · successRatePercent · Admin override
 * CI: verify:ai-feature-platform · verify:no-success-rate-as-rule
 */

"use strict";

const {
  buildFeatureVector,
  FEATURE_FORMULA_ID,
} = require("@aipo/feature-platform");
const { assertNoL3Money } = require("./levels.cjs");

/** Locked scoring formula — shadow-replay goldens pin this */
const AI_PICK_FORMULA_ID = "ai_pick_score_v1";

/** Tag `ai_pick` when score ≥ threshold */
const AI_PICK_THRESHOLD = 75;

/**
 * Weights sum to 100 (points toward aiConfidenceScore 0..100)
 * Order locked for explainability components.
 */
const SCORE_WEIGHTS = Object.freeze({
  freshness01: 20,
  adapterFreshness01: 5,
  compareReady01: 20,
  profitHeadroom01: 25,
  capitalBandFit01: 12,
  categoryFit01: 8,
  aiPickBoost01: 10,
});

/**
 * @param {object} input — same shape as buildFeatureVector OR { featureVector }
 * @returns {object} AiPickScoreV1
 */
function scoreAiPick(input = {}) {
  assertNoL3Money("ai_pick_score", "L2");

  const vector =
    input.featureVector && input.featureVector.scalars
      ? input.featureVector
      : buildFeatureVector(input);

  // Hard reject smuggled forbidden fields on raw input
  for (const k of ["sellSuccessRate", "successRatePercent", "adminOverride"]) {
    if (
      input &&
      typeof input === "object" &&
      Object.prototype.hasOwnProperty.call(input, k)
    ) {
      throw new Error(`AI_PICK_FORBIDDEN_INPUT:${k}`);
    }
    if (
      input.opportunity &&
      Object.prototype.hasOwnProperty.call(input.opportunity, k)
    ) {
      throw new Error(`AI_PICK_FORBIDDEN_INPUT:${k}`);
    }
  }

  const s = vector.scalars;
  const components = {};
  let total = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    const v = clamp01(Number(s[key] ?? 0));
    const points = round2(v * weight);
    components[key] = Object.freeze({ value01: v, weight, points });
    total += points;
  }

  const aiConfidenceScore = clampScore(round2(total));
  const isAiPick = aiConfidenceScore >= AI_PICK_THRESHOLD;
  const rankingScore = round6(aiConfidenceScore / 100);

  const tags = [];
  if (isAiPick) tags.push("ai_pick");

  return Object.freeze({
    schema: "ai-pick-score.v1",
    level: "L2",
    formulaId: AI_PICK_FORMULA_ID,
    featureFormulaId: vector.formulaId || FEATURE_FORMULA_ID,
    featureVectorHash: vector.hash,
    opportunityId: vector.opportunityId,
    userId: vector.userId,
    aiConfidenceScore,
    rankingScore,
    isAiPick,
    threshold: AI_PICK_THRESHOLD,
    tags: Object.freeze(tags),
    components: Object.freeze(components),
    weights: SCORE_WEIGHTS,
    scoredAt: new Date().toISOString(),
  });
}

/**
 * Apply AI PICK onto opportunity card projection fields (immutable merge)
 * @param {object} card
 * @param {object} pick — scoreAiPick result
 */
function applyAiPickToCard(card, pick) {
  const tags = Array.isArray(card?.tags) ? [...card.tags] : [];
  if (pick.isAiPick && !tags.includes("ai_pick")) tags.push("ai_pick");
  if (!pick.isAiPick) {
    const i = tags.indexOf("ai_pick");
    if (i >= 0) tags.splice(i, 1);
  }
  return Object.freeze({
    ...card,
    aiConfidenceScore: pick.aiConfidenceScore,
    tags: Object.freeze(tags),
  });
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function clampScore(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

module.exports = {
  AI_PICK_FORMULA_ID,
  AI_PICK_THRESHOLD,
  SCORE_WEIGHTS,
  scoreAiPick,
  applyAiPickToCard,
};

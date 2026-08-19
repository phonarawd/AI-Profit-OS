/**
 * createMultiSourceOpportunity — EXECUTABLE 교차 소스 쌍을 in-process Opportunity row로 발행.
 * evaluateExecutableEconomics · computeOpportunityPricing만 재사용한다.
 * public.opportunities INSERT / Asset Master 매핑 / 새 formula 금지.
 */

const {
  EVALUATOR_VERSION,
  DECISIONS,
  REASONS,
  BOUNDARIES,
  FORMULA_OWNERS,
  EXECUTABLE_IS_NOT_OPPORTUNITY,
  DOES_NOT_INSERT_PRODUCTION_OPPORTUNITY,
} = require("./contract.cjs");
const { evaluateExecutableEconomics } = require("../executable-economics/index.cjs");
const { extractEconomics } = require("../executable-economics/extract.cjs");
const { computeOpportunityPricing } = require("../pricing-formula.cjs");

function opportunityIdOf(canonicalProductId, buyListingId, sellListingId) {
  return `opp_${canonicalProductId}__${buyListingId}__${sellListingId}`;
}

function listingSources(leftInput, rightInput) {
  const left = extractEconomics(leftInput);
  const right = extractEconomics(rightInput);
  return {
    leftSource: left.source,
    rightSource: right.source,
    byListingId: {
      ...(left.listingId ? { [left.listingId]: left.source } : {}),
      ...(right.listingId ? { [right.listingId]: right.source } : {}),
    },
  };
}

function mapEconomicsDecision(econ) {
  if (econ.decision === "EXECUTABLE") return null;
  if (econ.decision === "INSUFFICIENT") {
    return { decision: DECISIONS.INSUFFICIENT, reason: econ.reason };
  }
  if (econ.decision === "CONFLICT") {
    return { decision: DECISIONS.CONFLICT, reason: econ.reason };
  }
  if (econ.decision === "BLOCKED") {
    return { decision: DECISIONS.BLOCKED, reason: econ.reason };
  }
  return {
    decision: DECISIONS.NOT_ISSUED,
    reason: econ.reason || REASONS.NOT_EXECUTABLE,
  };
}

function finish(base) {
  const issued = base.decision === DECISIONS.ISSUED;
  return {
    ...base,
    issued,
    opportunity: issued ? base.opportunity : null,
    observedPriceUsedAsExecutable: false,
    samePhysicalItem: false,
    executableIsNotOpportunity: EXECUTABLE_IS_NOT_OPPORTUNITY,
    doesNotInsertProductionOpportunity: DOES_NOT_INSERT_PRODUCTION_OPPORTUNITY,
    productionPersisted: false,
    evaluatorVersion: EVALUATOR_VERSION,
    formulaOwners: FORMULA_OWNERS,
    boundaries: BOUNDARIES,
  };
}

function empty(econ, extra) {
  return finish({
    decision: extra.decision,
    reason: extra.reason,
    economicsDecision: econ.decision,
    economicsReason: econ.reason,
    listingPromotion: econ.listingPromotion === true,
    promotionDecision: econ.promotionDecision,
    leftListingId: econ.leftListingId,
    rightListingId: econ.rightListingId,
    leftSource: econ.leftSource,
    rightSource: econ.rightSource,
    categoryProfile: econ.categoryProfile,
    canonicalProductId: econ.canonicalProductId,
    evaluatedAt: econ.evaluatedAt,
    opportunity: null,
  });
}

/**
 * @param {object} leftInput
 * @param {object} rightInput
 * @param {{
 *   now?: string,
 *   fxSnapshot?: object,
 *   buyListingId?: string,
 *   sellListingId?: string,
 * }} [opts]
 */
function createMultiSourceOpportunity(leftInput, rightInput, opts) {
  const econ = evaluateExecutableEconomics(leftInput, rightInput, opts);
  const mapped = mapEconomicsDecision(econ);
  if (mapped) return empty(econ, mapped);

  const sources = listingSources(leftInput, rightInput);
  if (!sources.leftSource || !sources.rightSource) {
    return empty(econ, {
      decision: DECISIONS.INSUFFICIENT,
      reason: REASONS.SOURCE_UNPROVEN,
    });
  }
  if (sources.leftSource === sources.rightSource) {
    return empty(econ, {
      decision: DECISIONS.NOT_ISSUED,
      reason: REASONS.SAME_SOURCE_NOT_MULTI,
    });
  }

  const buyListingId = econ.observedPrice && econ.observedPrice.buy
    ? econ.observedPrice.buy.listingId
    : null;
  const sellListingId = econ.observedPrice && econ.observedPrice.sell
    ? econ.observedPrice.sell.listingId
    : null;
  if (!buyListingId || !sellListingId || !econ.canonicalProductId) {
    return empty(econ, {
      decision: DECISIONS.INSUFFICIENT,
      reason: REASONS.SOURCE_UNPROVEN,
    });
  }

  const pricing = computeOpportunityPricing({
    buyMarketId: econ.feesFx.buyMarketId,
    sellMarketId: econ.feesFx.sellMarketId,
    buyPriceUsdt: econ.executablePrice.buyUsdt,
    sellPriceUsdt: econ.executablePrice.sellUsdt,
    legsFresh: true,
  });
  if (
    pricing.feesUsdt !== econ.feesFx.feesUsdt ||
    pricing.expectedProfitUsdt !== econ.feesFx.expectedProfitUsdt
  ) {
    return empty(econ, {
      decision: DECISIONS.CONFLICT,
      reason: REASONS.PRICING_REUSE_MISMATCH,
    });
  }

  const pricedAt = econ.evaluatedAt;
  const opportunity = {
    opportunityId: opportunityIdOf(econ.canonicalProductId, buyListingId, sellListingId),
    canonicalProductId: econ.canonicalProductId,
    assetId: null,
    categoryProfile: econ.categoryProfile,
    buyListingId,
    sellListingId,
    buySource: sources.byListingId[buyListingId] || null,
    sellSource: sources.byListingId[sellListingId] || null,
    leftSource: sources.leftSource,
    rightSource: sources.rightSource,
    pricingVersion: 1,
    pricedAt,
    staleAt: pricedAt,
    expectedProfitUsdt: pricing.expectedProfitUsdt,
    expectedProfitKrwApprox: econ.feesFx.expectedProfitKrwApprox,
    fxSnapshotId: econ.executablePrice.fxSnapshotId,
    requiredCapitalUsdt: pricing.requiredCapitalUsdt
      ? pricing.requiredCapitalUsdt
      : pricing.buyPriceUsdt,
    capitalBand: pricing.capitalBand,
    status: pricing.compareReady ? "available" : "paused",
    pricing,
    observedPrice: econ.observedPrice,
    executablePrice: econ.executablePrice,
    availability: econ.availability,
    freshness: econ.freshness,
    feesFx: econ.feesFx,
    productionPersisted: false,
  };

  return finish({
    decision: DECISIONS.ISSUED,
    reason: REASONS.MULTI_SOURCE_EXECUTABLE,
    economicsDecision: econ.decision,
    economicsReason: econ.reason,
    listingPromotion: true,
    promotionDecision: econ.promotionDecision,
    leftListingId: econ.leftListingId,
    rightListingId: econ.rightListingId,
    leftSource: sources.leftSource,
    rightSource: sources.rightSource,
    categoryProfile: econ.categoryProfile,
    canonicalProductId: econ.canonicalProductId,
    evaluatedAt: econ.evaluatedAt,
    opportunity,
  });
}

module.exports = { createMultiSourceOpportunity, opportunityIdOf };

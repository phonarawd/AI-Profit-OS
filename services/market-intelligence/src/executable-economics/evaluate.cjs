/**
 * evaluateExecutableEconomics — PROMOTABLE 쌍의 실행 가격/가용/수수료/FX wiring.
 * computeOpportunityPricing · normalizeNativeToUsdt · LISTING_STALE_SEC만 재사용한다.
 * Opportunity row를 만들지 않는다. 최저가=매수 추정 금지.
 */

const {
  EVALUATOR_VERSION,
  DECISIONS,
  REASONS,
  BOUNDARIES,
  FORMULA_OWNERS,
  EXECUTABLE_IS_NOT_OPPORTUNITY,
  DOES_NOT_CREATE_OPPORTUNITY,
} = require("./contract.cjs");
const { evaluateListingPromotion } = require("../listing-promotion/index.cjs");
const { computeOpportunityPricing } = require("../pricing-formula.cjs");
const {
  normalizeNativeToUsdt,
  approxKrwFromSnapshot,
} = require("../fx-snapshot-formula.cjs");
const { isAllowedLegPair } = require("../pipeline.cjs");
const { evaluateStaleListings } = require("../adapter-matching-kpi.cjs");
const { LISTING_STALE_SEC } = require("../catalog-runtime-seed.cjs");
const {
  extractEconomics,
  listingIdOf,
  resolveDay1MarketId,
  resolveStaleAt,
  availabilityDecision,
} = require("./extract.cjs");

function observedSide(econ) {
  if (!econ.nativeAmount || !econ.nativeCurrency) return null;
  return {
    listingId: econ.listingId,
    amount: econ.nativeAmount,
    currency: econ.nativeCurrency,
  };
}

function fxFailReason(err) {
  const msg = err && err.message ? String(err.message) : "";
  if (msg.startsWith("FX_UNSUPPORTED_CURRENCY")) {
    return { decision: DECISIONS.BLOCKED, reason: REASONS.FX_UNSUPPORTED_CURRENCY };
  }
  if (msg.startsWith("FX_MISSING")) {
    return { decision: DECISIONS.INSUFFICIENT, reason: REASONS.FX_MISSING };
  }
  if (msg.startsWith("FX_INVALID")) {
    return { decision: DECISIONS.INSUFFICIENT, reason: REASONS.FX_INVALID };
  }
  return { decision: DECISIONS.INSUFFICIENT, reason: REASONS.FX_NORMALIZE_FAILED };
}

function finish(base) {
  const executable = base.decision === DECISIONS.EXECUTABLE;
  return {
    ...base,
    executable,
    opportunity: false,
    observedPriceUsedAsExecutable: false,
    samePhysicalItem: false,
    executableIsNotOpportunity: EXECUTABLE_IS_NOT_OPPORTUNITY,
    doesNotCreateOpportunity: DOES_NOT_CREATE_OPPORTUNITY,
    evaluatorVersion: EVALUATOR_VERSION,
    formulaOwners: FORMULA_OWNERS,
    boundaries: BOUNDARIES,
    staleAllowanceSec: LISTING_STALE_SEC,
  };
}

function emptyEconomics(promotion, evaluatedAt, extra) {
  return finish({
    decision: extra.decision,
    reason: extra.reason,
    promotionDecision: promotion.decision,
    promotionReason: promotion.reason,
    listingPromotion: promotion.listingPromotion === true,
    leftListingId: promotion.leftListingId,
    rightListingId: promotion.rightListingId,
    leftSource: promotion.leftSource,
    rightSource: promotion.rightSource,
    categoryProfile: promotion.categoryProfile,
    canonicalProductId: promotion.canonicalProductId,
    observedPrice: extra.observedPrice || null,
    executablePrice: null,
    availability: extra.availability || null,
    feesFx: null,
    freshness: extra.freshness || null,
    evaluatedAt,
  });
}

function assignLegs(leftInput, rightInput, opts) {
  const buyListingId = opts && opts.buyListingId ? String(opts.buyListingId) : "";
  const sellListingId = opts && opts.sellListingId ? String(opts.sellListingId) : "";
  if (!buyListingId || !sellListingId) {
    return { ok: false, reason: REASONS.LEG_ASSIGNMENT_REQUIRED };
  }
  if (buyListingId === sellListingId) {
    return { ok: false, reason: REASONS.LEG_ASSIGNMENT_UNKNOWN };
  }
  const leftId = listingIdOf(leftInput);
  const rightId = listingIdOf(rightInput);
  const leftEcon = extractEconomics(leftInput);
  const rightEcon = extractEconomics(rightInput);
  let buy;
  let sell;
  if (leftId === buyListingId) buy = leftEcon;
  if (rightId === buyListingId) buy = rightEcon;
  if (leftId === sellListingId) sell = leftEcon;
  if (rightId === sellListingId) sell = rightEcon;
  if (!buy || !sell) {
    return { ok: false, reason: REASONS.LEG_ASSIGNMENT_UNKNOWN };
  }
  return { ok: true, buy, sell };
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
function evaluateExecutableEconomics(leftInput, rightInput, opts) {
  const evaluatedAt =
    opts && opts.now ? String(opts.now) : new Date().toISOString();
  const promotion = evaluateListingPromotion(leftInput, rightInput, {
    now: evaluatedAt,
  });

  if (promotion.decision !== "PROMOTABLE" || promotion.listingPromotion !== true) {
    return emptyEconomics(promotion, evaluatedAt, {
      decision: DECISIONS.NOT_EXECUTABLE,
      reason: promotion.reason || REASONS.NOT_PROMOTABLE,
    });
  }

  const legs = assignLegs(leftInput, rightInput, opts || {});
  if (!legs.ok) {
    return emptyEconomics(promotion, evaluatedAt, {
      decision: DECISIONS.INSUFFICIENT,
      reason: legs.reason,
    });
  }

  const { buy, sell } = legs;
  const observedPrice = {
    buy: observedSide(buy),
    sell: observedSide(sell),
  };
  const availability = {
    buy: buy.availability || null,
    sell: sell.availability || null,
  };

  if (!buy.nativeProven || !sell.nativeProven) {
    return emptyEconomics(promotion, evaluatedAt, {
      decision: DECISIONS.INSUFFICIENT,
      reason: REASONS.NATIVE_PRICE_UNPROVEN,
      observedPrice,
      availability,
    });
  }
  if (!buy.nativeAmount || !buy.nativeCurrency || !sell.nativeAmount || !sell.nativeCurrency) {
    return emptyEconomics(promotion, evaluatedAt, {
      decision: DECISIONS.INSUFFICIENT,
      reason: REASONS.NATIVE_PRICE_MISSING,
      observedPrice,
      availability,
    });
  }

  const buyAvail = availabilityDecision(buy);
  if (!buyAvail.ok) {
    return emptyEconomics(promotion, evaluatedAt, {
      decision: buyAvail.decision,
      reason: buyAvail.reason,
      observedPrice,
      availability,
    });
  }
  const sellAvail = availabilityDecision(sell);
  if (!sellAvail.ok) {
    return emptyEconomics(promotion, evaluatedAt, {
      decision: sellAvail.decision,
      reason: sellAvail.reason,
      observedPrice,
      availability,
    });
  }

  const buyStaleAt = resolveStaleAt(buy);
  const sellStaleAt = resolveStaleAt(sell);
  if (!buyStaleAt.ok || !sellStaleAt.ok) {
    return emptyEconomics(promotion, evaluatedAt, {
      decision: DECISIONS.INSUFFICIENT,
      reason: REASONS.FRESHNESS_UNPROVEN,
      observedPrice,
      availability,
    });
  }

  const stale = evaluateStaleListings(
    [
      { id: buy.listingId, staleAt: buyStaleAt.staleAt },
      { id: sell.listingId, staleAt: sellStaleAt.staleAt },
    ],
    { now: evaluatedAt },
  );
  const freshness = {
    buy: stale.staleListingIds.includes(buy.listingId) ? "stale" : "current",
    sell: stale.staleListingIds.includes(sell.listingId) ? "stale" : "current",
    staleAllowanceSec: LISTING_STALE_SEC,
  };
  if (stale.staleCount > 0) {
    return emptyEconomics(promotion, evaluatedAt, {
      decision: DECISIONS.NOT_EXECUTABLE,
      reason: REASONS.PRICE_STALE,
      observedPrice,
      availability,
      freshness,
    });
  }

  const snapshot = opts && opts.fxSnapshot;
  if (!snapshot || typeof snapshot !== "object" || !snapshot.fxSnapshotId) {
    return emptyEconomics(promotion, evaluatedAt, {
      decision: DECISIONS.INSUFFICIENT,
      reason: REASONS.FX_SNAPSHOT_REQUIRED,
      observedPrice,
      availability,
      freshness,
    });
  }

  let buyFx;
  let sellFx;
  try {
    buyFx = normalizeNativeToUsdt({
      nativeAmount: buy.nativeAmount,
      nativeCurrency: buy.nativeCurrency,
      snapshot,
    });
    sellFx = normalizeNativeToUsdt({
      nativeAmount: sell.nativeAmount,
      nativeCurrency: sell.nativeCurrency,
      snapshot,
    });
  } catch (err) {
    const mapped = fxFailReason(err);
    return emptyEconomics(promotion, evaluatedAt, {
      decision: mapped.decision,
      reason: mapped.reason,
      observedPrice,
      availability,
      freshness,
    });
  }

  const buyMarket = resolveDay1MarketId(buy);
  const sellMarket = resolveDay1MarketId(sell);
  if (!buyMarket.ok) {
    return emptyEconomics(promotion, evaluatedAt, {
      decision: DECISIONS.INSUFFICIENT,
      reason: buyMarket.reason,
      observedPrice,
      availability,
      freshness,
    });
  }
  if (!sellMarket.ok) {
    return emptyEconomics(promotion, evaluatedAt, {
      decision: DECISIONS.INSUFFICIENT,
      reason: sellMarket.reason,
      observedPrice,
      availability,
      freshness,
    });
  }

  if (
    !isAllowedLegPair({
      buyMarketId: buyMarket.marketId,
      sellMarketId: sellMarket.marketId,
    })
  ) {
    return emptyEconomics(promotion, evaluatedAt, {
      decision: DECISIONS.NOT_EXECUTABLE,
      reason: REASONS.ILLEGAL_LEG_PAIR,
      observedPrice,
      availability,
      freshness,
    });
  }

  const pricing = computeOpportunityPricing({
    buyMarketId: buyMarket.marketId,
    sellMarketId: sellMarket.marketId,
    buyPriceUsdt: buyFx.normalizedUsdt,
    sellPriceUsdt: sellFx.normalizedUsdt,
    legsFresh: true,
  });

  let expectedProfitKrwApprox = null;
  if (snapshot.usdtKrw != null) {
    expectedProfitKrwApprox = approxKrwFromSnapshot(
      pricing.expectedProfitUsdt,
      { usdtKrw: String(snapshot.usdtKrw) },
    );
  }

  return finish({
    decision: DECISIONS.EXECUTABLE,
    reason: REASONS.WIRED_DAY1_ECONOMICS,
    promotionDecision: promotion.decision,
    promotionReason: promotion.reason,
    listingPromotion: true,
    leftListingId: promotion.leftListingId,
    rightListingId: promotion.rightListingId,
    leftSource: promotion.leftSource,
    rightSource: promotion.rightSource,
    categoryProfile: promotion.categoryProfile,
    canonicalProductId: promotion.canonicalProductId,
    observedPrice,
    executablePrice: {
      buyUsdt: buyFx.normalizedUsdt,
      sellUsdt: sellFx.normalizedUsdt,
      buyChain: buyFx.chain,
      sellChain: sellFx.chain,
      fxSnapshotId: String(snapshot.fxSnapshotId),
    },
    availability: {
      ...availability,
      executable: true,
    },
    feesFx: {
      buyMarketId: pricing.buyMarketId,
      sellMarketId: pricing.sellMarketId,
      buyLegFeeUsdt: pricing.buyLegFeeUsdt,
      sellLegFeeUsdt: pricing.sellLegFeeUsdt,
      feesUsdt: pricing.feesUsdt,
      riskBufferUsdt: pricing.riskBufferUsdt,
      costBufferUsdt: pricing.costBufferUsdt,
      platformMarginUsdt: pricing.platformMarginUsdt,
      expectedProfitUsdt: pricing.expectedProfitUsdt,
      expectedProfitKrwApprox,
      compareReady: pricing.compareReady,
      capitalBand: pricing.capitalBand,
    },
    freshness,
    evaluatedAt,
  });
}

module.exports = { evaluateExecutableEconomics };

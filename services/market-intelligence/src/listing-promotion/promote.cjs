/**
 * evaluateListingPromotion — 호환 리스팅 쌍의 Opportunity 승격 계약.
 * 변형 호환 게이트를 재사용한다. Opportunity/executable price/fees/FX를 만들지 않는다.
 */

const {
  PROMOTER_VERSION,
  DECISIONS,
  REASONS,
  BOUNDARIES,
  LISTING_PROMOTION_IS_NOT_OPPORTUNITY,
  LISTING_PROMOTION_DOES_NOT_COMPUTE_EXECUTABLE_PRICE,
} = require("./contract.cjs");
const {
  evaluateListingVariantCompatibility,
  DECISIONS: COMPAT_DECISIONS,
} = require("../listing-variant-compatibility/index.cjs");
const { extractListingView } = require("../listing-variant-compatibility/extract.cjs");

function mapCompatibilityDecision(compat) {
  if (compat.decision === COMPAT_DECISIONS.BLOCKED) {
    return { decision: DECISIONS.BLOCKED, reason: compat.reason };
  }
  if (compat.decision === COMPAT_DECISIONS.CONFLICT) {
    return { decision: DECISIONS.CONFLICT, reason: compat.reason };
  }
  if (compat.decision === COMPAT_DECISIONS.INSUFFICIENT) {
    return { decision: DECISIONS.INSUFFICIENT, reason: compat.reason };
  }
  if (compat.decision !== COMPAT_DECISIONS.COMPATIBLE || compat.tradableEquivalent !== true) {
    return {
      decision: DECISIONS.NOT_PROMOTABLE,
      reason: compat.reason || REASONS.NOT_TRADABLE_EQUIVALENT,
    };
  }
  return null;
}

function finish(base) {
  const listingPromotion = base.decision === DECISIONS.PROMOTABLE;
  return {
    ...base,
    listingPromotion,
    opportunity: false,
    executablePrice: null,
    availability: null,
    feesFx: null,
    observedPriceUsedAsExecutable: false,
    samePhysicalItem: false,
    listingPromotionIsNotOpportunity: LISTING_PROMOTION_IS_NOT_OPPORTUNITY,
    doesNotComputeExecutablePrice: LISTING_PROMOTION_DOES_NOT_COMPUTE_EXECUTABLE_PRICE,
    promoterVersion: PROMOTER_VERSION,
    boundaries: BOUNDARIES,
  };
}

/**
 * @param {object} leftInput
 * @param {object} rightInput
 * @param {{ now?: string }} [opts]
 */
function evaluateListingPromotion(leftInput, rightInput, opts) {
  const evaluatedAt =
    opts && opts.now ? String(opts.now) : new Date().toISOString();
  const compatibility = evaluateListingVariantCompatibility(leftInput, rightInput, {
    now: evaluatedAt,
  });
  const left = extractListingView(leftInput);
  const right = extractListingView(rightInput);

  const base = {
    leftListingId: compatibility.leftListingId,
    rightListingId: compatibility.rightListingId,
    leftSource: compatibility.leftSource,
    rightSource: compatibility.rightSource,
    categoryProfile: compatibility.categoryProfile,
    canonicalProductId: null,
    compatibilityDecision: compatibility.decision,
    compatibilityReason: compatibility.reason,
    sameCanonicalProduct: compatibility.sameCanonicalProduct,
    sameVariant: compatibility.sameVariant,
    tradableEquivalent: compatibility.tradableEquivalent,
    evaluatedAt,
  };

  const blocked = mapCompatibilityDecision(compatibility);
  if (blocked) {
    return finish({
      ...base,
      decision: blocked.decision,
      reason: blocked.reason,
    });
  }

  if (!left.listingId || !right.listingId) {
    return finish({
      ...base,
      decision: DECISIONS.INSUFFICIENT,
      reason: REASONS.LISTING_IDENTITY_INCOMPLETE,
    });
  }

  if (!left.canonicalProductId || !right.canonicalProductId) {
    return finish({
      ...base,
      decision: DECISIONS.INSUFFICIENT,
      reason: REASONS.CANONICAL_PRODUCT_REQUIRED,
    });
  }
  if (left.canonicalProductId !== right.canonicalProductId) {
    return finish({
      ...base,
      decision: DECISIONS.CONFLICT,
      reason: REASONS.CANONICAL_PRODUCT_MISMATCH,
    });
  }

  return finish({
    ...base,
    canonicalProductId: left.canonicalProductId,
    decision: DECISIONS.PROMOTABLE,
    reason: REASONS.COMPATIBLE_CANONICAL_LISTING_PAIR,
  });
}

module.exports = { evaluateListingPromotion };

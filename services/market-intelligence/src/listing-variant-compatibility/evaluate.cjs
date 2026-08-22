/**
 * evaluateListingVariantCompatibility — Opportunity 전 변형 호환 게이트.
 * matcher를 호출하지 않는다. Listing/Opportunity를 승격·생성하지 않는다.
 */

const {
  EVALUATOR_VERSION,
  DECISIONS,
  REASONS,
  BOUNDARIES,
} = require("./contract.cjs");
const {
  extractListingView,
  pairProfile,
  profilesConflict,
  identityKeyToken,
} = require("./extract.cjs");

function comparisonOf(leftHit, rightHit) {
  if (!leftHit && !rightHit) return "missing_both";
  if (!leftHit) return "missing_left";
  if (!rightHit) return "missing_right";
  if (leftHit.normalizedValue === rightHit.normalizedValue) return "exact";
  return "mismatch";
}

function fieldRow(field, role, leftHit, rightHit) {
  return {
    field,
    role,
    left: leftHit ? leftHit.normalizedValue : null,
    right: rightHit ? rightHit.normalizedValue : null,
    comparison: comparisonOf(leftHit, rightHit),
    leftOwner: leftHit ? leftHit.evidenceOwner : null,
    rightOwner: rightHit ? rightHit.evidenceOwner : null,
  };
}

function sameCanonicalProduct(left, right) {
  if (left.canonicalProductId && right.canonicalProductId) {
    if (left.canonicalProductId === right.canonicalProductId) {
      return { value: true, reason: null };
    }
    return { value: false, reason: REASONS.CANONICAL_PRODUCT_MISMATCH };
  }

  const leftKey = identityKeyToken(left);
  const rightKey = identityKeyToken(right);
  if (leftKey && rightKey) {
    if (leftKey === rightKey) return { value: true, reason: null };
    return { value: false, reason: REASONS.IDENTITY_KEY_MISMATCH };
  }
  return { value: null, reason: REASONS.IDENTITY_KEY_INCOMPLETE };
}

function compareVariants(left, right) {
  const fields = left.variantFields.length ? left.variantFields : right.variantFields;
  const compared = [];
  if (!fields || fields.length === 0) {
    return { sameVariant: true, reason: null, compared, missingField: null };
  }

  for (const field of fields) {
    const row = fieldRow(field, "VARIANT", left.variants[field], right.variants[field]);
    compared.push(row);
    if (row.comparison === "mismatch") {
      return {
        sameVariant: false,
        reason: REASONS.NOT_SAME_VARIANT,
        compared,
        missingField: null,
      };
    }
    if (row.comparison !== "exact") {
      return {
        sameVariant: null,
        reason: REASONS.VARIANT_FIELD_MISSING,
        compared,
        missingField: field,
      };
    }
  }

  return {
    sameVariant: true,
    reason: null,
    compared,
    missingField: null,
  };
}

function identityCompared(left, right) {
  const fields = new Set([...(left.identityFields || []), ...(right.identityFields || [])]);
  return [...fields]
    .sort()
    .map((field) => fieldRow(field, "IDENTITY_KEY", left.identity[field], right.identity[field]));
}

function finish(base) {
  const tradableEquivalent = base.decision === DECISIONS.COMPATIBLE;
  return {
    ...base,
    tradableEquivalent,
    samePhysicalItem: false,
    listingPromotion: false,
    opportunity: false,
    evaluatorVersion: EVALUATOR_VERSION,
    boundaries: BOUNDARIES,
  };
}

/**
 * @param {object} leftInput
 * @param {object} rightInput
 * @param {{ now?: string }} [opts]
 */
function evaluateListingVariantCompatibility(leftInput, rightInput, opts) {
  const evaluatedAt =
    opts && opts.now ? String(opts.now) : new Date().toISOString();
  const left = extractListingView(leftInput);
  const right = extractListingView(rightInput);
  const categoryProfile = pairProfile(left, right);
  const comparedFields = [];

  const base = {
    leftListingId: left.listingId,
    rightListingId: right.listingId,
    leftSource: left.source,
    rightSource: right.source,
    categoryProfile,
    sameCanonicalProduct: null,
    sameVariant: null,
    comparedFields,
    evaluatedAt,
  };

  if (left.deferred || right.deferred) {
    return finish({
      ...base,
      decision: DECISIONS.BLOCKED,
      reason: REASONS.PROFILE_DEFERRED,
    });
  }
  if (left.unsupported || right.unsupported || !left.pluginOk || !right.pluginOk) {
    return finish({
      ...base,
      decision: DECISIONS.BLOCKED,
      reason: REASONS.PROFILE_UNSUPPORTED,
    });
  }
  if (profilesConflict(left, right)) {
    return finish({
      ...base,
      decision: DECISIONS.CONFLICT,
      reason: REASONS.PROFILE_CONFLICT,
    });
  }
  if (!left.eligible || !right.eligible) {
    return finish({
      ...base,
      decision: DECISIONS.INSUFFICIENT,
      reason: REASONS.INELIGIBLE_OBSERVATION,
    });
  }
  if (
    left.listingId &&
    left.listingId === right.listingId &&
    (!left.source || !right.source || left.source === right.source)
  ) {
    return finish({
      ...base,
      decision: DECISIONS.INCOMPATIBLE,
      reason: REASONS.SAME_LISTING,
    });
  }
  if (left.source && right.source && left.source === right.source) {
    return finish({
      ...base,
      decision: DECISIONS.INCOMPATIBLE,
      reason: REASONS.SAME_SOURCE,
    });
  }

  const sameCp = sameCanonicalProduct(left, right);
  base.sameCanonicalProduct = sameCp.value;
  comparedFields.push(...identityCompared(left, right));

  if (sameCp.value === false) {
    return finish({
      ...base,
      decision: DECISIONS.CONFLICT,
      reason: sameCp.reason,
      comparedFields,
    });
  }
  if (sameCp.value == null) {
    return finish({
      ...base,
      decision: DECISIONS.INSUFFICIENT,
      reason: REASONS.IDENTITY_KEY_INCOMPLETE,
      comparedFields,
    });
  }

  const variant = compareVariants(left, right);
  comparedFields.push(...variant.compared);
  comparedFields.sort((a, b) => {
    const fa = `${a.role}|${a.field}`;
    const fb = `${b.role}|${b.field}`;
    return fa < fb ? -1 : fa > fb ? 1 : 0;
  });
  base.sameVariant = variant.sameVariant;
  base.comparedFields = comparedFields;

  if (variant.sameVariant === false) {
    return finish({
      ...base,
      decision: DECISIONS.INCOMPATIBLE,
      reason: REASONS.NOT_SAME_VARIANT,
    });
  }
  if (variant.sameVariant == null) {
    return finish({
      ...base,
      decision: DECISIONS.INSUFFICIENT,
      reason: REASONS.VARIANT_FIELD_MISSING,
      missingField: variant.missingField,
    });
  }

  return finish({
    ...base,
    decision: DECISIONS.COMPATIBLE,
    reason: REASONS.SAME_VARIANT_EXACT,
  });
}

module.exports = { evaluateListingVariantCompatibility };

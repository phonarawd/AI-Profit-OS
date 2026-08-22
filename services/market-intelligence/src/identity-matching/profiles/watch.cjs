/**
 * watch corroborating rules.
 * MATCH의 기본 owner는 brand + typed WATCH_REFERENCE (matcher strong path).
 * year/dial은 corroborating only. title에서 reference 추출 금지.
 */

function row(field, left, right, strength, comparison, leftProv, rightProv) {
  return {
    field,
    leftValue: left || null,
    rightValue: right || null,
    evidenceStrength: strength,
    leftProvenance: leftProv,
    rightProvenance: rightProv,
    comparison,
  };
}

function corroboratingMatch(left, right) {
  const matched = [];
  const missing = [];
  const negatives = [];

  if (left.brand && right.brand && left.brand === right.brand) {
    matched.push(
      row("brand", left.brandRaw, right.brandRaw, "CORROBORATING", "exact", left.brandProvenance, right.brandProvenance),
    );
  } else if (left.brand && right.brand && left.brand !== right.brand) {
    negatives.push(
      row("brand", left.brandRaw, right.brandRaw, "CONFLICTING", "mismatch", left.brandProvenance, right.brandProvenance),
    );
  } else {
    missing.push(
      row("brand", left.brandRaw, right.brandRaw, "CORROBORATING", "missing", left.brandProvenance, right.brandProvenance),
    );
  }

  if (left.model && right.model) {
    if (left.model === right.model) {
      matched.push(
        row("model", left.modelRaw, right.modelRaw, "CORROBORATING", "exact", `${left.source}.meta.model`, `${right.source}.meta.model`),
      );
    } else {
      negatives.push(
        row("model", left.modelRaw, right.modelRaw, "CONFLICTING", "mismatch", `${left.source}.meta.model`, `${right.source}.meta.model`),
      );
    }
  }

  return {
    ok: false,
    variantMismatch: false,
    matched,
    missing,
    negatives,
  };
}

module.exports = { PROFILE: "watch", corroboratingMatch };

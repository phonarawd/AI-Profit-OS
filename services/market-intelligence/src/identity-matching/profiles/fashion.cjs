/**
 * fashion / luxury_bag corroborating rules.
 * brand + model 필수. size/color가 양쪽 있으면 identity-critical.
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

  if (!left.brand || !right.brand) {
    missing.push(
      row("brand", left.brandRaw, right.brandRaw, "CORROBORATING", "missing", left.brandProvenance, right.brandProvenance),
    );
  } else if (left.brand !== right.brand) {
    negatives.push(
      row("brand", left.brandRaw, right.brandRaw, "CONFLICTING", "mismatch", left.brandProvenance, right.brandProvenance),
    );
  } else {
    matched.push(
      row("brand", left.brandRaw, right.brandRaw, "CORROBORATING", "exact", left.brandProvenance, right.brandProvenance),
    );
  }

  if (!left.model || !right.model) {
    missing.push(
      row("model", left.modelRaw, right.modelRaw, "CORROBORATING", "missing", `${left.source}.meta.model`, `${right.source}.meta.model`),
    );
  } else if (left.model !== right.model) {
    negatives.push(
      row("model", left.modelRaw, right.modelRaw, "CONFLICTING", "mismatch", `${left.source}.meta.model`, `${right.source}.meta.model`),
    );
  } else {
    matched.push(
      row("model", left.modelRaw, right.modelRaw, "CORROBORATING", "exact", `${left.source}.meta.model`, `${right.source}.meta.model`),
    );
  }

  for (const field of ["size", "color"]) {
    const lv = left[field];
    const rv = right[field];
    if (!lv || !rv) continue;
    const leftRaw = field === "size" ? left.sizeRaw : left.colorRaw;
    const rightRaw = field === "size" ? right.sizeRaw : right.colorRaw;
    const leftProv = field === "size" ? `${left.source}.meta.size` : `${left.source}.identityHints.color`;
    const rightProv = field === "size" ? `${right.source}.meta.size` : `${right.source}.identityHints.color`;
    if (lv !== rv) {
      negatives.push(row(field, leftRaw, rightRaw, "CONFLICTING", "mismatch", leftProv, rightProv));
    } else {
      matched.push(row(field, leftRaw, rightRaw, "CORROBORATING", "exact", leftProv, rightProv));
    }
  }

  const coreOk =
    left.brand &&
    right.brand &&
    left.brand === right.brand &&
    left.model &&
    right.model &&
    left.model === right.model;

  return {
    ok: Boolean(coreOk && negatives.length === 0),
    variantMismatch: Boolean(coreOk && negatives.some((n) => n.field === "size" || n.field === "color")),
    matched,
    missing,
    negatives,
  };
}

module.exports = { PROFILE: "luxury_bag", corroboratingMatch };

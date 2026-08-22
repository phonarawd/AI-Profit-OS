/**
 * matchSourceObservations — pairwise deterministic same-product decision.
 * LLM / random / fake confidence 0.
 */

const { MATCHER_VERSION } = require("./contract.cjs");
const {
  extractNormalized,
  matchingDecisionEligible,
  resolvePairProfile,
} = require("./normalize.cjs");
const fashionProfile = require("./profiles/fashion.cjs");
const watchProfile = require("./profiles/watch.cjs");
const unknownProfile = require("./profiles/unknown.cjs");

function evidenceRow(partial) {
  return {
    field: partial.field,
    leftValue: partial.leftValue == null ? null : String(partial.leftValue),
    rightValue: partial.rightValue == null ? null : String(partial.rightValue),
    evidenceStrength: partial.evidenceStrength,
    leftProvenance: partial.leftProvenance || null,
    rightProvenance: partial.rightProvenance || null,
    comparison: partial.comparison,
  };
}

function sortEvidence(rows) {
  return rows.slice().sort((a, b) => {
    const fa = `${a.field}|${a.leftProvenance}|${a.rightProvenance}`;
    const fb = `${b.field}|${b.leftProvenance}|${b.rightProvenance}`;
    return fa < fb ? -1 : fa > fb ? 1 : 0;
  });
}

function compareTypedIdentifiers(left, right) {
  const positives = [];
  const negatives = [];
  const skipped = [];
  const types = ["GTIN", "MPN", "WATCH_REFERENCE"];

  for (const type of types) {
    const l = left.identifiers.find((id) => id.type === type);
    const r = right.identifiers.find((id) => id.type === type);
    if (!l || !r) continue;

    if (type === "GTIN") {
      const row = evidenceRow({
        field: "GTIN",
        leftValue: l.value,
        rightValue: r.value,
        evidenceStrength: l.value === r.value ? "STRONG" : "CONFLICTING",
        leftProvenance: l.provenance,
        rightProvenance: r.provenance,
        comparison: l.value === r.value ? "exact" : "mismatch",
      });
      if (l.value === r.value) positives.push(row);
      else negatives.push(row);
      continue;
    }

    if (!l.brand || !r.brand) {
      skipped.push(
        evidenceRow({
          field: type,
          leftValue: l.value,
          rightValue: r.value,
          evidenceStrength: "WEAK",
          leftProvenance: l.provenance,
          rightProvenance: r.provenance,
          comparison: "missing",
        }),
      );
      continue;
    }
    if (l.brand !== r.brand) {
      skipped.push(
        evidenceRow({
          field: type,
          leftValue: l.value,
          rightValue: r.value,
          evidenceStrength: "WEAK",
          leftProvenance: l.provenance,
          rightProvenance: r.provenance,
          comparison: "missing",
        }),
      );
      continue;
    }

    const row = evidenceRow({
      field: type,
      leftValue: l.value,
      rightValue: r.value,
      evidenceStrength: l.value === r.value ? "STRONG" : "CONFLICTING",
      leftProvenance: `${l.provenance}+${l.brand}`,
      rightProvenance: `${r.provenance}+${r.brand}`,
      comparison: l.value === r.value ? "exact" : "mismatch",
    });
    if (l.value === r.value) positives.push(row);
    else negatives.push(row);
  }

  return { positives, negatives, skipped };
}

function profileEngine(profile) {
  if (profile === "luxury_bag" || profile === "fashion") return fashionProfile;
  if (profile === "watch") return watchProfile;
  return unknownProfile;
}

function decide(input) {
  const {
    eligible,
    strongPositives,
    strongNegatives,
    profileMatch,
    identityProfile,
  } = input;

  if (strongPositives.length > 0 && strongNegatives.length > 0) return "CONFLICT";
  if (strongPositives.length > 0 && strongNegatives.length === 0) {
    return eligible ? "MATCH" : "INSUFFICIENT_EVIDENCE";
  }
  if (strongNegatives.length > 0) return "NO_MATCH";

  if (identityProfile !== "unknown" && profileMatch.variantMismatch) return "NO_MATCH";
  if (identityProfile !== "unknown" && profileMatch.ok && profileMatch.negatives.length === 0) {
    return eligible ? "MATCH" : "INSUFFICIENT_EVIDENCE";
  }
  if (identityProfile !== "unknown" && profileMatch.negatives && profileMatch.negatives.length > 0) {
    const hasCore =
      profileMatch.matched &&
      profileMatch.matched.some((r) => r.field === "brand") &&
      profileMatch.matched.some((r) => r.field === "model");
    if (hasCore && profileMatch.variantMismatch) return "NO_MATCH";
  }

  return "INSUFFICIENT_EVIDENCE";
}

/**
 * @param {object} leftObservation
 * @param {object} rightObservation
 * @param {{ now?: string }} [opts]
 */
function matchSourceObservations(leftObservation, rightObservation, opts) {
  const evaluatedAt = opts && opts.now ? String(opts.now) : new Date().toISOString();
  const left = extractNormalized(leftObservation);
  const right = extractNormalized(rightObservation);
  const eligible = matchingDecisionEligible(leftObservation, rightObservation);
  const identityProfile = resolvePairProfile(
    leftObservation,
    rightObservation,
    left.identifiers,
    right.identifiers,
  );

  const typed = compareTypedIdentifiers(left, right);
  const engine = profileEngine(identityProfile);
  const profileMatch = engine.corroboratingMatch(left, right);

  const matchedEvidence = [];
  const conflictingEvidence = [];
  const missingEvidence = [];

  for (const row of typed.positives) matchedEvidence.push(row);
  for (const row of typed.negatives) conflictingEvidence.push(row);
  for (const row of typed.skipped) missingEvidence.push(row);
  if (profileMatch.matched) {
    for (const row of profileMatch.matched) matchedEvidence.push(row);
  }
  if (profileMatch.negatives) {
    for (const row of profileMatch.negatives) conflictingEvidence.push(row);
  }
  if (profileMatch.missing) {
    for (const row of profileMatch.missing) missingEvidence.push(row);
  }

  if (!left.identifiers.length && !right.identifiers.length) {
    missingEvidence.push(
      evidenceRow({
        field: "typedIdentifier",
        leftValue: null,
        rightValue: null,
        evidenceStrength: "WEAK",
        leftProvenance: left.source,
        rightProvenance: right.source,
        comparison: "missing",
      }),
    );
  }

  if (!eligible) {
    missingEvidence.push(
      evidenceRow({
        field: "matchingDecisionEligible",
        leftValue: `${left.observationPurpose}/${left.sourceStatus}`,
        rightValue: `${right.observationPurpose}/${right.sourceStatus}`,
        evidenceStrength: "WEAK",
        leftProvenance: "observationPurpose+sourceStatus",
        rightProvenance: "observationPurpose+sourceStatus",
        comparison: "missing",
      }),
    );
  }

  const decision = decide({
    eligible,
    strongPositives: typed.positives,
    strongNegatives: typed.negatives,
    profileMatch,
    identityProfile,
  });

  return {
    leftObservationId: left.id,
    rightObservationId: right.id,
    leftSource: left.source,
    rightSource: right.source,
    decision,
    identityProfile,
    matchingDecisionEligible: eligible,
    matchedEvidence: sortEvidence(matchedEvidence),
    conflictingEvidence: sortEvidence(conflictingEvidence),
    missingEvidence: sortEvidence(missingEvidence),
    evaluatedAt,
    matcherVersion: MATCHER_VERSION,
  };
}

module.exports = { matchSourceObservations };

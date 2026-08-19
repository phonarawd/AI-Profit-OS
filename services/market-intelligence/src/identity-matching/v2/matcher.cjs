/**
 * matchSourceObservationsV2 — pairwise category-aware identity decision.
 * V1 decide()를 호출하지 않는다. LLM / random / fake confidence 0.
 * MATCH != CanonicalProduct / Listing / Opportunity.
 */

const {
  OWNER_BACKED_STRUCTURED,
  DERIVED_STRUCTURED,
  PRESENTATION_ONLY,
  assemblePairEvidence,
  pairField,
  bothPresentDiffer,
  bothOwnerExact,
  evidenceRow,
} = require("./evidence.cjs");
const { evaluateProfile } = require("./profiles.cjs");

const MATCHER_VERSION = "identity-matching.v2";

const DECISIONS = Object.freeze([
  "MATCH",
  "NO_MATCH",
  "INSUFFICIENT_EVIDENCE",
  "CONFLICT",
]);

const EVIDENCE_OWNERS = Object.freeze([
  OWNER_BACKED_STRUCTURED,
  DERIVED_STRUCTURED,
  PRESENTATION_ONLY,
]);

const EVIDENCE_STRENGTHS = Object.freeze([
  "AUTHORITATIVE_STRONG",
  "STRONG",
  "COMPOSITE_STRONG",
  "CORROBORATING",
  "CONFLICTING",
  "NOT_COMPARABLE",
  "PRESENTATION_ONLY",
]);

const PIPELINE_STATUS = Object.freeze({
  CANONICAL_PRODUCT_CREATION: "NOT_IMPLEMENTED",
  CANDIDATE_GENERATION: "NOT_IMPLEMENTED",
  TCGPLAYER_AUTOMATED_SOURCE_OBSERVATION: "NOT_IMPLEMENTED",
  REAL_AUTOMATED_CROSS_SOURCE_MATCH: "BLOCKED_UNTIL_SOURCE_RUNTIME",
});

function sortEvidence(rows) {
  return rows.slice().sort((a, b) => {
    const fa = `${a.field}|${(a.left && a.left.provenanceFamily) || ""}|${
      (a.right && a.right.provenanceFamily) || ""
    }`;
    const fb = `${b.field}|${(b.left && b.left.provenanceFamily) || ""}|${
      (b.right && b.right.provenanceFamily) || ""
    }`;
    return fa < fb ? -1 : fa > fb ? 1 : 0;
  });
}

function typedPair(leftSide, rightSide, type) {
  return {
    field: type,
    left: leftSide.typed[type] || null,
    right: rightSide.typed[type] || null,
  };
}

function compareTyped(assembled) {
  const rows = [];
  const conflicts = [];
  const positives = [];

  const gtin = typedPair(assembled.left, assembled.right, "GTIN");
  if (gtin.left && gtin.right) {
    const row = evidenceRow(gtin, {
      strength: bothOwnerExact(gtin) ? "AUTHORITATIVE_STRONG" : "CORROBORATING",
    });
    if (bothPresentDiffer(gtin)) {
      row.strength = "CONFLICTING";
      row.comparison = "mismatch";
      conflicts.push(row);
    } else if (bothOwnerExact(gtin)) {
      positives.push(row);
    }
    rows.push(row);
  }

  for (const type of ["MPN", "WATCH_REFERENCE"]) {
    const pair = typedPair(assembled.left, assembled.right, type);
    if (!pair.left || !pair.right) continue;
    const leftBrand = pair.left.brand || "";
    const rightBrand = pair.right.brand || "";
    if (!leftBrand || !rightBrand || leftBrand !== rightBrand) {
      rows.push(
        evidenceRow(pair, {
          comparison: "missing",
          strength: "NOT_COMPARABLE",
        }),
      );
      continue;
    }
    const row = evidenceRow(pair, {
      strength: bothOwnerExact(pair) ? "STRONG" : "CORROBORATING",
    });
    if (bothPresentDiffer(pair)) {
      row.strength = "CONFLICTING";
      row.comparison = "mismatch";
      conflicts.push(row);
    } else if (bothOwnerExact(pair)) {
      positives.push(row);
    }
    rows.push(row);
  }

  return { rows, conflicts, positives };
}

function compareSourceLocal(assembled) {
  const rows = [];
  const leftSku = assembled.left.sourceLocal.fashionphileSku;
  const rightMpn = assembled.right.typed.MPN;
  const rightSku = assembled.right.sourceLocal.fashionphileSku;
  const leftMpn = assembled.left.typed.MPN;

  function notComparable(field, leftValue, rightValue, leftProv, rightProv) {
    rows.push({
      field,
      left: {
        value: leftValue,
        normalizedValue: leftValue ? String(leftValue) : null,
        evidenceOwner: null,
        derivedFrom: null,
        extractor: null,
        provenanceFamily: "source_local",
        source: assembled.left.source,
        observationId: assembled.left.id,
      },
      right: {
        value: rightValue,
        normalizedValue: rightValue ? String(rightValue) : null,
        evidenceOwner: OWNER_BACKED_STRUCTURED,
        derivedFrom: null,
        extractor: null,
        provenanceFamily: rightProv,
        source: assembled.right.source,
        observationId: assembled.right.id,
      },
      comparison: "not_comparable",
      strength: "NOT_COMPARABLE",
    });
    void leftProv;
  }

  if (leftSku && rightMpn) {
    notComparable(
      "sourceLocalSkuVsMpn",
      leftSku,
      rightMpn.value,
      "source_local",
      "structured:MPN",
    );
  }
  if (rightSku && leftMpn) {
    rows.push({
      field: "sourceLocalSkuVsMpn",
      left: {
        value: leftMpn.value,
        normalizedValue: leftMpn.value,
        evidenceOwner: OWNER_BACKED_STRUCTURED,
        derivedFrom: null,
        extractor: null,
        provenanceFamily: "structured:MPN",
        source: assembled.left.source,
        observationId: assembled.left.id,
      },
      right: {
        value: rightSku,
        normalizedValue: String(rightSku),
        evidenceOwner: null,
        derivedFrom: null,
        extractor: null,
        provenanceFamily: "source_local",
        source: assembled.right.source,
        observationId: assembled.right.id,
      },
      comparison: "not_comparable",
      strength: "NOT_COMPARABLE",
    });
  }

  return rows;
}

function identityMismatchConflicts(assembled, profileResult) {
  const conflicts = profileResult.conflicts.slice();

  if (assembled.categoryConflict) {
    conflicts.push(
      evidenceRow(
        {
          field: "categoryProfile",
          left: {
            value: assembled.resolvedLeftProfile,
            normalizedValue: assembled.resolvedLeftProfile,
            evidenceOwner: OWNER_BACKED_STRUCTURED,
            derivedFrom: null,
            extractor: null,
            provenanceFamily: "structured:category",
            source: assembled.left.source,
            observationId: assembled.left.id,
          },
          right: {
            value: assembled.resolvedRightProfile,
            normalizedValue: assembled.resolvedRightProfile,
            evidenceOwner: OWNER_BACKED_STRUCTURED,
            derivedFrom: null,
            extractor: null,
            provenanceFamily: "structured:category",
            source: assembled.right.source,
            observationId: assembled.right.id,
          },
        },
        { comparison: "mismatch", strength: "CONFLICTING" },
      ),
    );
  }

  if (assembled.brandConflict) {
    const brand = pairField(assembled.left, assembled.right, "brand");
    conflicts.push(
      evidenceRow(brand, { comparison: "mismatch", strength: "CONFLICTING" }),
    );
  }

  const style = pairField(
    assembled.left,
    assembled.right,
    "manufacturerStyleCode",
  );
  if (assembled.pairProfile !== "sneakers" && bothPresentDiffer(style)) {
    conflicts.push(
      evidenceRow(style, { comparison: "mismatch", strength: "CONFLICTING" }),
    );
  }

  return conflicts;
}

function decide(input) {
  const { eligible, conflicts, typed, profileResult, assembled } = input;

  if (conflicts.length > 0) {
    return { decision: "CONFLICT", matchPath: null };
  }

  if (!eligible) {
    return { decision: "INSUFFICIENT_EVIDENCE", matchPath: null };
  }

  const gtin = typed.positives.find((row) => row.field === "GTIN");
  if (gtin && gtin.strength === "AUTHORITATIVE_STRONG") {
    return { decision: "MATCH", matchPath: "AUTHORITATIVE_STRONG" };
  }

  const typedStrong = typed.positives.find(
    (row) => row.field === "MPN" || row.field === "WATCH_REFERENCE",
  );
  if (typedStrong) {
    return { decision: "MATCH", matchPath: "STRONG" };
  }

  if (profileResult.strong) {
    return { decision: "MATCH", matchPath: "STRONG" };
  }

  if (profileResult.composite) {
    return { decision: "MATCH", matchPath: "COMPOSITE_STRONG" };
  }

  return { decision: "INSUFFICIENT_EVIDENCE", matchPath: null };
}

/**
 * @param {object} leftObservation
 * @param {object} rightObservation
 * @param {{ now?: string, imageCorroboration?: boolean, allowSyntheticImageEvidence?: boolean }} [opts]
 */
function matchSourceObservationsV2(leftObservation, rightObservation, opts) {
  const evaluatedAt = opts && opts.now ? String(opts.now) : new Date().toISOString();
  const assembled = assemblePairEvidence(leftObservation, rightObservation, opts || {});
  const profileResult = evaluateProfile(assembled);
  const typed = compareTyped(assembled);
  const sourceLocalRows = compareSourceLocal(assembled);

  const conflicts = [];
  for (const row of typed.conflicts) conflicts.push(row);
  for (const row of identityMismatchConflicts(assembled, profileResult)) {
    conflicts.push(row);
  }

  const evidence = [];
  for (const row of typed.rows) evidence.push(row);
  for (const row of profileResult.rows) evidence.push(row);
  for (const row of sourceLocalRows) evidence.push(row);

  if (assembled.allowSyntheticImageEvidence && assembled.syntheticImageCorroboration) {
    evidence.push({
      field: "imageCorroboration",
      left: {
        value: "synthetic",
        normalizedValue: "true",
        evidenceOwner: PRESENTATION_ONLY,
        derivedFrom: null,
        extractor: "fixture_synthetic",
        provenanceFamily: "image",
        source: assembled.left.source,
        observationId: assembled.left.id,
      },
      right: {
        value: "synthetic",
        normalizedValue: "true",
        evidenceOwner: PRESENTATION_ONLY,
        derivedFrom: null,
        extractor: "fixture_synthetic",
        provenanceFamily: "image",
        source: assembled.right.source,
        observationId: assembled.right.id,
      },
      comparison: "exact",
      strength: "CORROBORATING",
    });
  }

  if (!assembled.eligible) {
    evidence.push({
      field: "matchingDecisionEligible",
      left: {
        value: `${assembled.left.observationPurpose}/${assembled.left.sourceStatus}`,
        normalizedValue: `${assembled.left.observationPurpose}/${assembled.left.sourceStatus}`,
        evidenceOwner: null,
        derivedFrom: null,
        extractor: null,
        provenanceFamily: "observation",
        source: assembled.left.source,
        observationId: assembled.left.id,
      },
      right: {
        value: `${assembled.right.observationPurpose}/${assembled.right.sourceStatus}`,
        normalizedValue: `${assembled.right.observationPurpose}/${assembled.right.sourceStatus}`,
        evidenceOwner: null,
        derivedFrom: null,
        extractor: null,
        provenanceFamily: "observation",
        source: assembled.right.source,
        observationId: assembled.right.id,
      },
      comparison: "missing",
      strength: "NOT_COMPARABLE",
    });
  }

  const decided = decide({
    eligible: assembled.eligible,
    conflicts,
    typed,
    profileResult,
    assembled,
  });

  return {
    leftObservationId: assembled.left.id,
    rightObservationId: assembled.right.id,
    leftSource: assembled.left.source,
    rightSource: assembled.right.source,
    decision: decided.decision,
    matcherVersion: MATCHER_VERSION,
    categoryProfile: assembled.pairProfile,
    evidence: sortEvidence(evidence),
    matchingDecisionEligible: assembled.eligible,
    finalTruthEligible: false,
    conflicts: sortEvidence(conflicts),
    matchPath: decided.matchPath,
    evaluatedAt,
  };
}

module.exports = {
  matchSourceObservationsV2,
  MATCHER_VERSION,
  DECISIONS,
  EVIDENCE_OWNERS,
  EVIDENCE_STRENGTHS,
  PIPELINE_STATUS,
};

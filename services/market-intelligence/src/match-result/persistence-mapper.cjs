/**
 * V2 MatchResult ↔ durable row mapper.
 * Domain owner = Identity V2 runtime object. DB row ≠ domain object.
 */

const crypto = require("node:crypto");
const {
  DECISIONS,
  MATCH_PATHS,
  MATCHER_VERSION_V2,
  MATCH_RESULT_ID_PREFIX,
  CATEGORY_PROFILES,
  UNSUPPORTED_CATEGORY_PROFILES,
  PERSIST_BLOCKED,
  FORBIDDEN_IDENTITY_FIELDS,
  FORBIDDEN_EVIDENCE_FIELDS,
} = require("./contract.cjs");

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sameText(left, right) {
  return String(left ?? "") === String(right ?? "");
}

function normalizeForFingerprint(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) {
    return value.map((item) => {
      const next = normalizeForFingerprint(item);
      return next === undefined ? null : next;
    });
  }
  if (isPlainObject(value)) {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const next = normalizeForFingerprint(value[key]);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }
  return String(value);
}

function stableJson(value) {
  return JSON.stringify(normalizeForFingerprint(value));
}

function parseJsonb(value, label, failures) {
  if (value == null) {
    failures.push(`${label}_missing`);
    return null;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      failures.push(`${label}_json_invalid`);
      return null;
    }
  }
  if (!isPlainObject(value) && !Array.isArray(value)) {
    failures.push(`${label}_not_json`);
    return null;
  }
  return value;
}

function allocateMatchResultId() {
  return `${MATCH_RESULT_ID_PREFIX}${crypto.randomUUID()}`;
}

function normalizePair(leftId, rightId) {
  const left = String(leftId || "");
  const right = String(rightId || "");
  return left <= right
    ? { pairLo: left, pairHi: right }
    : { pairLo: right, pairHi: left };
}

function swapEvidenceRow(row) {
  if (!row || typeof row !== "object") return row;
  return {
    ...row,
    left: row.right,
    right: row.left,
  };
}

function directionNormalizedRows(leftId, rightId, rows) {
  const swapped = String(leftId) > String(rightId);
  const list = Array.isArray(rows) ? rows.map((row) => (swapped ? swapEvidenceRow(row) : row)) : [];
  return list.slice().sort((a, b) => {
    const fa = `${(a && a.field) || ""}|${(a && a.left && a.left.observationId) || ""}|${
      (a && a.right && a.right.observationId) || ""
    }`;
    const fb = `${(b && b.field) || ""}|${(b && b.left && b.left.observationId) || ""}|${
      (b && b.right && b.right.observationId) || ""
    }`;
    return fa < fb ? -1 : fa > fb ? 1 : 0;
  });
}

function semanticsFingerprint(matchResult) {
  const leftId = String(matchResult.leftObservationId);
  const rightId = String(matchResult.rightObservationId);
  return crypto
    .createHash("sha256")
    .update(
      stableJson({
        matcherVersion: matchResult.matcherVersion,
        categoryProfile: matchResult.categoryProfile,
        decision: matchResult.decision,
        matchPath: matchResult.matchPath,
        matchingDecisionEligible: matchResult.matchingDecisionEligible,
        finalTruthEligible: matchResult.finalTruthEligible,
        evidence: directionNormalizedRows(leftId, rightId, matchResult.evidence),
        conflicts: directionNormalizedRows(leftId, rightId, matchResult.conflicts),
      }),
    )
    .digest("hex");
}

function pickDomainMatchResult(matchResult) {
  return {
    matchResultId: matchResult.matchResultId,
    leftObservationId: matchResult.leftObservationId,
    rightObservationId: matchResult.rightObservationId,
    leftSource: matchResult.leftSource,
    rightSource: matchResult.rightSource,
    decision: matchResult.decision,
    matcherVersion: matchResult.matcherVersion,
    categoryProfile: matchResult.categoryProfile,
    evidence: Array.isArray(matchResult.evidence) ? matchResult.evidence.slice() : [],
    matchingDecisionEligible: matchResult.matchingDecisionEligible,
    finalTruthEligible: matchResult.finalTruthEligible,
    conflicts: Array.isArray(matchResult.conflicts) ? matchResult.conflicts.slice() : [],
    matchPath: matchResult.matchPath == null ? null : matchResult.matchPath,
    evaluatedAt: matchResult.evaluatedAt,
    createdAt: matchResult.createdAt || null,
  };
}

function blocked(reason, failures) {
  return { ok: false, reason, failures: failures || [reason] };
}

function validatePersistableMatchResult(matchResult) {
  if (!isPlainObject(matchResult)) {
    return blocked(PERSIST_BLOCKED.MALFORMED, ["match_result_not_object"]);
  }

  const failures = [];
  for (const field of FORBIDDEN_IDENTITY_FIELDS) {
    if (matchResult[field] != null) failures.push(`forbidden_field:${field}`);
  }
  if (failures.some((item) => item.startsWith("forbidden_field:putduk") || item.includes("canonicalProductId"))) {
    return blocked(PERSIST_BLOCKED.PD_AS_EVIDENCE, failures);
  }
  if (failures.some((item) => /price|nativeAmount|nativeCurrency|nativePrice/i.test(item))) {
    return blocked(PERSIST_BLOCKED.PRICE_AS_IDENTITY, failures);
  }

  const leftId = String(matchResult.leftObservationId || "").trim();
  const rightId = String(matchResult.rightObservationId || "").trim();
  if (!leftId || !rightId) {
    return blocked(PERSIST_BLOCKED.MALFORMED, ["observation_ref_required"]);
  }
  if (leftId === rightId) return blocked(PERSIST_BLOCKED.SELF_PAIR, ["self_pair"]);

  if (matchResult.matcherVersion !== MATCHER_VERSION_V2) {
    return blocked(PERSIST_BLOCKED.MALFORMED, ["matcher_version"]);
  }
  if (!DECISIONS.includes(matchResult.decision)) {
    return blocked(PERSIST_BLOCKED.MALFORMED_DECISION, ["decision"]);
  }
  if (matchResult.decision === "MATCH") {
    if (!MATCH_PATHS.includes(matchResult.matchPath)) {
      return blocked(PERSIST_BLOCKED.MALFORMED_DECISION, ["match_path_required_for_match"]);
    }
  } else if (matchResult.matchPath != null) {
    return blocked(PERSIST_BLOCKED.MALFORMED_DECISION, ["match_path_must_be_null_for_non_match"]);
  }

  const profile = String(matchResult.categoryProfile || "");
  if (UNSUPPORTED_CATEGORY_PROFILES.includes(profile) || !CATEGORY_PROFILES.includes(profile)) {
    return blocked(PERSIST_BLOCKED.UNSUPPORTED_CATEGORY, ["category_profile"]);
  }

  if (typeof matchResult.leftSource !== "string" || !matchResult.leftSource.trim()) {
    failures.push("left_source");
  }
  if (typeof matchResult.rightSource !== "string" || !matchResult.rightSource.trim()) {
    failures.push("right_source");
  }
  if (!Array.isArray(matchResult.evidence)) failures.push("evidence_not_array");
  if (!Array.isArray(matchResult.conflicts)) failures.push("conflicts_not_array");
  if (typeof matchResult.matchingDecisionEligible !== "boolean") {
    failures.push("matching_decision_eligible");
  }
  if (matchResult.finalTruthEligible !== false) {
    failures.push("final_truth_eligible_must_be_false");
  }
  if (typeof matchResult.evaluatedAt !== "string" || !matchResult.evaluatedAt.trim()) {
    failures.push("evaluated_at");
  }

  const evidenceRows = Array.isArray(matchResult.evidence) ? matchResult.evidence : [];
  const conflictRows = Array.isArray(matchResult.conflicts) ? matchResult.conflicts : [];
  for (const row of evidenceRows.concat(conflictRows)) {
    if (!row || typeof row !== "object") continue;
    if (FORBIDDEN_EVIDENCE_FIELDS.includes(row.field)) {
      return blocked(
        row.field === "putdukProductCode" || row.field === "canonicalProductId"
          ? PERSIST_BLOCKED.PD_AS_EVIDENCE
          : PERSIST_BLOCKED.PRICE_AS_IDENTITY,
        [`evidence_field:${row.field}`],
      );
    }
  }

  if (failures.length) return blocked(PERSIST_BLOCKED.MALFORMED, failures);

  const domain = pickDomainMatchResult({
    ...matchResult,
    matchResultId: matchResult.matchResultId || allocateMatchResultId(),
    leftObservationId: leftId,
    rightObservationId: rightId,
  });
  return {
    ok: true,
    matchResult: domain,
    pair: normalizePair(leftId, rightId),
    semanticsFingerprint: semanticsFingerprint(domain),
  };
}

function toPersistenceRecord(matchResult) {
  const checked = validatePersistableMatchResult(matchResult);
  if (!checked.ok) return checked;
  const domain = checked.matchResult;
  return {
    ok: true,
    pair: checked.pair,
    semanticsFingerprint: checked.semanticsFingerprint,
    record: {
      match_result_id: domain.matchResultId,
      pair_lo: checked.pair.pairLo,
      pair_hi: checked.pair.pairHi,
      left_observation_id: domain.leftObservationId,
      right_observation_id: domain.rightObservationId,
      left_source: domain.leftSource,
      right_source: domain.rightSource,
      matcher_version: domain.matcherVersion,
      category_profile: domain.categoryProfile,
      decision: domain.decision,
      match_path: domain.matchPath,
      matching_decision_eligible: domain.matchingDecisionEligible,
      final_truth_eligible: domain.finalTruthEligible,
      evidence: domain.evidence,
      conflicts: domain.conflicts,
      semantics_fingerprint: checked.semanticsFingerprint,
      payload: pickDomainMatchResult(domain),
      evaluated_at: domain.evaluatedAt,
      created_at: domain.createdAt,
    },
  };
}

function fromPersistenceRecord(record) {
  if (!record || !isPlainObject(record)) {
    return blocked(PERSIST_BLOCKED.PAYLOAD_CONFLICT, ["record_not_object"]);
  }
  const failures = [];
  const payload = parseJsonb(record.payload, "payload", failures);
  const evidence = parseJsonb(record.evidence, "evidence", failures);
  const conflicts = parseJsonb(record.conflicts, "conflicts", failures);
  if (failures.length) return blocked(PERSIST_BLOCKED.PAYLOAD_CONFLICT, failures);
  if (!isPlainObject(payload)) return blocked(PERSIST_BLOCKED.PAYLOAD_CONFLICT, ["payload_not_object"]);
  if (!Array.isArray(evidence) || !Array.isArray(conflicts)) {
    return blocked(PERSIST_BLOCKED.PAYLOAD_CONFLICT, ["evidence_or_conflicts_not_array"]);
  }

  if (!sameText(record.match_result_id, payload.matchResultId)) failures.push("id_mismatch");
  if (!sameText(record.left_observation_id, payload.leftObservationId)) {
    failures.push("left_ref_mismatch");
  }
  if (!sameText(record.right_observation_id, payload.rightObservationId)) {
    failures.push("right_ref_mismatch");
  }
  if (!sameText(record.decision, payload.decision)) failures.push("decision_mismatch");
  if (!sameText(record.matcher_version, payload.matcherVersion)) {
    failures.push("matcher_version_mismatch");
  }
  if (!sameText(record.category_profile, payload.categoryProfile)) {
    failures.push("category_profile_mismatch");
  }
  if (stableJson(evidence) !== stableJson(payload.evidence)) failures.push("evidence_mismatch");
  if (stableJson(conflicts) !== stableJson(payload.conflicts)) failures.push("conflicts_mismatch");

  const rebuilt = validatePersistableMatchResult({
    ...payload,
    evidence,
    conflicts,
    matchResultId: record.match_result_id,
    createdAt: record.created_at ? new Date(record.created_at).toISOString() : payload.createdAt,
  });
  if (!rebuilt.ok) return rebuilt;
  if (rebuilt.semanticsFingerprint !== String(record.semantics_fingerprint)) {
    failures.push("semantics_fingerprint_mismatch");
  }
  if (rebuilt.pair.pairLo !== String(record.pair_lo) || rebuilt.pair.pairHi !== String(record.pair_hi)) {
    failures.push("pair_normalization_mismatch");
  }
  if (failures.length) return blocked(PERSIST_BLOCKED.PAYLOAD_CONFLICT, failures);

  return {
    ok: true,
    matchResult: rebuilt.matchResult,
    pair: rebuilt.pair,
    semanticsFingerprint: rebuilt.semanticsFingerprint,
  };
}

module.exports = {
  allocateMatchResultId,
  normalizePair,
  semanticsFingerprint,
  pickDomainMatchResult,
  validatePersistableMatchResult,
  toPersistenceRecord,
  fromPersistenceRecord,
};

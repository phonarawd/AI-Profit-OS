/**
 * QA7 trace artifact — schema validate + provenance envelope
 * Core body aligns with schemas/ai-answer-trace.v1.json via buildAiLogRecord
 */
"use strict";

const crypto = require("node:crypto");
const {
  GRADER_VERSION,
  SUITE_ID,
  TRACE_SCHEMA_ID,
  TRACE_REQUIRED,
  TRACE_LANES,
  TRACE_PROVIDERS,
  TRACE_ANSWER_PATHS,
  TRACE_GUARD_STATUSES,
} = require("./qa7-constants.cjs");

/**
 * Structural validate of answer-trace body (no ajv dependency)
 * @param {object} trace
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateAnswerTrace(trace) {
  /** @type {string[]} */
  const errors = [];
  if (!trace || typeof trace !== "object") {
    return { ok: false, errors: ["trace must be object"] };
  }
  for (const k of TRACE_REQUIRED) {
    if (trace[k] === undefined || trace[k] === null) {
      errors.push(`missing required: ${k}`);
    }
  }
  if (trace.lane != null && !TRACE_LANES.includes(String(trace.lane))) {
    errors.push(`invalid lane: ${trace.lane}`);
  }
  if (
    trace.provider_id != null &&
    !TRACE_PROVIDERS.includes(String(trace.provider_id))
  ) {
    errors.push(`invalid provider_id: ${trace.provider_id}`);
  }
  if (
    trace.answer_path != null &&
    !TRACE_ANSWER_PATHS.includes(String(trace.answer_path))
  ) {
    errors.push(`invalid answer_path: ${trace.answer_path}`);
  }
  if (!Array.isArray(trace.facts_used)) errors.push("facts_used must be array");
  if (!Array.isArray(trace.tools_called)) {
    errors.push("tools_called must be array");
  }
  if (!trace.guard_result || typeof trace.guard_result !== "object") {
    errors.push("guard_result must be object");
  } else if (!TRACE_GUARD_STATUSES.includes(String(trace.guard_result.status))) {
    errors.push(`invalid guard_result.status: ${trace.guard_result.status}`);
  }
  if (trace.schema != null && trace.schema !== TRACE_SCHEMA_ID) {
    errors.push(`schema id must be ${TRACE_SCHEMA_ID}`);
  }
  return { ok: errors.length === 0, errors };
}

/**
 * @param {object} opts
 */
function buildQa7TraceArtifact(opts) {
  const {
    run_id,
    baseline_id,
    case_id,
    dataset_file,
    eval_dataset_hash,
    prompt_hash,
    provider_id,
    model_identity,
    intent,
    lane,
    facts_used,
    tools_called,
    answer_path,
    guard_result,
    answer_text,
    createdAt,
    ai_log,
    model_executed,
    invocation_seam,
  } = opts;

  const canonical_trace = opts.canonical_trace === true;
  const fixture_only = opts.fixture_only === true;
  const trace_id_provenance =
    opts.trace_id_provenance ||
    (canonical_trace ? "RUNTIME" : "TOOLING");

  const body = ai_log || {
    schema: TRACE_SCHEMA_ID,
    intent,
    lane,
    facts_used: facts_used || [],
    tools_called: tools_called || [],
    provider_id,
    answer_path,
    guard_result,
    createdAt: createdAt || new Date().toISOString(),
  };

  const v = validateAnswerTrace(body);
  if (!v.ok) {
    const err = new Error(`TRACE_SCHEMA_REJECT: ${v.errors.join("; ")}`);
    err.code = "TRACE_SCHEMA_REJECT";
    err.errors = v.errors;
    throw err;
  }

  let trace_id = opts.trace_id || null;
  if (canonical_trace) {
    if (!trace_id || typeof trace_id !== "string") {
      const err = new Error(
        "BLOCKED_MISSING_RUNTIME_FIELD: canonical trace requires runtime trace_id",
      );
      err.code = "BLOCKED_MISSING_RUNTIME_FIELD";
      err.missing = ["trace_id"];
      throw err;
    }
    if (String(trace_id).startsWith("qa7:")) {
      const err = new Error(
        "TRACE_ID_PROVENANCE_REJECT: tooling-generated qa7: id forbidden for canonical",
      );
      err.code = "TRACE_ID_PROVENANCE_REJECT";
      throw err;
    }
    if (trace_id_provenance !== "RUNTIME") {
      const err = new Error(
        `TRACE_ID_PROVENANCE_REJECT: expected RUNTIME got ${trace_id_provenance}`,
      );
      err.code = "TRACE_ID_PROVENANCE_REJECT";
      throw err;
    }
    if (fixture_only) {
      const err = new Error(
        "CANONICAL_FIXTURE_REJECT: fixture_only cannot be canonical",
      );
      err.code = "CANONICAL_FIXTURE_REJECT";
      throw err;
    }
  } else if (!trace_id) {
    // Library / diagnostic only — tooling id never promoted to canonical
    trace_id = `qa7:${case_id}:${crypto
      .createHash("sha256")
      .update(`${run_id}|${case_id}|${body.createdAt || ""}`)
      .digest("hex")
      .slice(0, 16)}`;
  }

  return Object.freeze({
    schema: "qa7-recorded-trace.v1",
    local_validation_only: true,
    formal_actions_evidence: false,
    canonical_trace,
    fixture_only,
    trace_id_provenance,
    suite_id: SUITE_ID,
    run_id,
    baseline_id,
    case_id,
    dataset_file,
    eval_dataset_hash,
    prompt_hash,
    provider_id: body.provider_id,
    model_identity: model_identity || null,
    trace_id,
    intent: body.intent,
    lane: body.lane,
    facts_used: body.facts_used,
    tools_called: body.tools_called,
    answer_path: body.answer_path,
    guard_result: body.guard_result,
    answer_text: answer_text != null ? String(answer_text) : null,
    createdAt: body.createdAt || new Date().toISOString(),
    grader_version: GRADER_VERSION,
    model_executed: Boolean(model_executed),
    invocation_seam:
      invocation_seam ||
      (canonical_trace
        ? "http_post_me_peotteok_chat"
        : "ai_platform_coach_path"),
    trace: body,
  });
}

/**
 * Index + validate a set of artifacts for a planned case list
 * @param {string[]} caseIds
 * @param {object[]} artifacts
 * @param {{ requireCanonical?: boolean }} [opts]
 */
function indexAndValidateTraces(caseIds, artifacts, opts = {}) {
  /** @type {string[]} */
  const errors = [];
  /** @type {Map<string, object>} */
  const byCase = new Map();
  /** @type {Set<string>} */
  const seenTraceIds = new Set();

  for (const a of artifacts) {
    if (!a || typeof a !== "object") {
      errors.push("malformed artifact: not object");
      continue;
    }
    const id = a.case_id;
    if (!id) {
      errors.push("malformed artifact: missing case_id");
      continue;
    }
    if (byCase.has(id)) {
      errors.push(`duplicate trace for case_id=${id}`);
      continue;
    }
    if (a.trace_id != null) {
      const tid = String(a.trace_id);
      if (seenTraceIds.has(tid)) {
        errors.push(`duplicate trace_id=${tid}`);
        continue;
      }
      seenTraceIds.add(tid);
    }
    const v = validateAnswerTrace(a.trace || a);
    if (!v.ok) {
      errors.push(`case ${id}: ${v.errors.join("; ")}`);
      continue;
    }
    if (opts.requireCanonical === true) {
      if (a.canonical_trace !== true) {
        errors.push(`case ${id}: canonical_trace required`);
        continue;
      }
      if (a.fixture_only === true) {
        errors.push(`case ${id}: fixture_only cannot be canonical`);
        continue;
      }
      if (a.trace_id_provenance !== "RUNTIME") {
        errors.push(`case ${id}: trace_id_provenance must be RUNTIME`);
        continue;
      }
      if (String(a.trace_id || "").startsWith("qa7:")) {
        errors.push(`case ${id}: tooling qa7: trace_id forbidden`);
        continue;
      }
    }
    byCase.set(id, a);
  }

  /** @type {string[]} */
  const missing = [];
  for (const id of caseIds) {
    if (!byCase.has(id)) missing.push(id);
  }
  for (const id of byCase.keys()) {
    if (!caseIds.includes(id)) {
      errors.push(`mismatched extra case_id=${id}`);
    }
  }

  return {
    ok: errors.length === 0 && missing.length === 0,
    errors,
    missing,
    byCase,
  };
}

module.exports = {
  validateAnswerTrace,
  buildQa7TraceArtifact,
  indexAndValidateTraces,
};

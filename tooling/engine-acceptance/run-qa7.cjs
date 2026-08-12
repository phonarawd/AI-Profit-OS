/**
 * QA7 AI Eval local harness
 *
 * PRECHECK → EXECUTION (HTTP canonical default) → VALIDATION → GRADING → AGGREGATION
 *
 * Formal GitHub Actions evidence / qa7-result.v1.json / workflow mutation = NOT this slice.
 * Raw traces → OS temp · LOCAL_VALIDATION_ONLY · never staged.
 *
 * Usage:
 *   QA7_LOCAL_HTTP=1 node tooling/engine-acceptance/run-qa7.cjs --mode smoke
 *   node tooling/engine-acceptance/run-qa7.cjs --mode smoke --library   # diagnostic only
 *   node tooling/engine-acceptance/run-qa7.cjs --mode full
 */
"use strict";

const crypto = require("node:crypto");
const { assertKillSwitch } = require("./kill-switch.cjs");
const { runQa7Precheck } = require("./lib/qa7-precheck.cjs");
const { loadEvalDataset, smokeCaseIds } = require("./lib/qa7-dataset.cjs");
const { executeEvalCase } = require("./lib/qa7-coach-executor.cjs");
const { indexAndValidateTraces } = require("./lib/qa7-trace.cjs");
const { gradeDataset } = require("./lib/qa7-grader.cjs");
const { aggregateQa7 } = require("./lib/qa7-aggregate.cjs");
const {
  createQa7TraceDir,
  writeTraceArtifact,
  writeRunSummary,
} = require("./lib/qa7-store.cjs");
const {
  describeHttpCanonicalPrecheck,
} = require("./lib/qa7-env.cjs");
const {
  auditExecutorExpectationIsolation,
} = require("./lib/qa7-expectation-isolation.cjs");
const { ensureQa7SyntheticUser } = require("./lib/qa7-synth-persona.cjs");

function getArg(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  return argv[i + 1] || null;
}

function hasFlag(argv, name) {
  return argv.includes(name);
}

async function runQa7(opts = {}) {
  const mode = opts.mode || "smoke";
  const skipLlm = opts.skipLlm === true;
  const forceLibrary = opts.forceLibrary === true;
  const measuredAt = new Date().toISOString();
  const runId = `qa7-local-${mode}-${measuredAt.slice(0, 10).replace(/-/g, "")}-${crypto
    .randomBytes(3)
    .toString("hex")}`;

  assertKillSwitch({
    target_env: opts.target_env || process.env.AIPO_QA_TARGET_ENV || "local",
    hostname: opts.hostname || process.env.AIPO_QA_HOSTNAME || "localhost",
    synthetic_account_namespace:
      opts.synthetic_account_namespace ||
      process.env.AIPO_QA_SYNTHETIC_NS ||
      "qa-synth-qa7-local",
  });

  const isolation = auditExecutorExpectationIsolation();
  if (!isolation.ok) {
    return {
      suite_status: "BLOCKED",
      block_code: "EXPECTATION_LEAKAGE",
      run_id: runId,
      findings: isolation.hits,
      executor_expectation_isolation: isolation,
      formal_actions_evidence: false,
      local_validation_only: true,
    };
  }

  const pre = runQa7Precheck();
  if (!pre.ok) {
    return {
      suite_status: "BLOCKED",
      block_code: "BLOCKED_PRECHECK",
      run_id: runId,
      findings: pre.findings,
      hashes: pre.hashes,
      provider_prereq: pre.provider_prereq,
      http_precheck: describeHttpCanonicalPrecheck(pre.env),
      executor_expectation_isolation: isolation,
      formal_actions_evidence: false,
      local_validation_only: true,
    };
  }

  const httpPre = describeHttpCanonicalPrecheck(pre.env);
  if (!forceLibrary && !httpPre.canonical_ready) {
    return {
      suite_status: "BLOCKED",
      block_code: "BLOCKED_NO_HTTP_CANONICAL",
      run_id: runId,
      findings: [
        "Canonical QA7 requires HTTP chat seam + DATABASE_URL ai_logs read",
        `QA7_CHAT_URL=${httpPre.QA7_CHAT_URL}`,
        `QA7_BEARER=${httpPre.QA7_BEARER}`,
        `database_url_configured: ${httpPre.ai_log_read_available}`,
        "Set QA7_LOCAL_HTTP=1 (local default URL) or QA7_CHAT_URL+QA7_BEARER",
        "Use --library only for non-canonical diagnostic",
      ],
      hashes: pre.hashes,
      provider_prereq: pre.provider_prereq,
      http_precheck: httpPre,
      executor_expectation_isolation: isolation,
      formal_actions_evidence: false,
      local_validation_only: true,
    };
  }

  /** @type {{ created: boolean, user_id: string } | null} */
  let synthPersona = null;
  if (!forceLibrary) {
    try {
      synthPersona = await ensureQa7SyntheticUser(
        pre.env.databaseUrl,
        pre.env.synthUserId,
      );
    } catch (e) {
      return {
        suite_status: "BLOCKED",
        block_code: "BLOCKED_NO_SYNTHETIC_PERSONA",
        run_id: runId,
        findings: [e instanceof Error ? e.message : String(e)],
        hashes: pre.hashes,
        http_precheck: httpPre,
        executor_expectation_isolation: isolation,
        formal_actions_evidence: false,
        local_validation_only: true,
      };
    }
  }

  const datasetOpts =
    mode === "smoke"
      ? { ids: smokeCaseIds() }
      : mode === "full"
        ? {}
        : { ids: smokeCaseIds() };

  const dataset = loadEvalDataset(datasetOpts);
  const traceDir = createQa7TraceDir(runId);

  const ctx = {
    run_id: runId,
    baseline_id: pre.baseline_id,
    eval_dataset_hash: pre.hashes.pinned.eval_dataset_hash,
    prompt_hash: pre.hashes.pinned.prompt_hash,
    env: pre.env,
    allowLlm: !skipLlm,
    forceLibrary,
    seam: forceLibrary ? "library" : "http",
  };

  /** @type {object[]} */
  const artifacts = [];
  /** @type {any[]} */
  const execBlocked = [];
  /** @type {any[]} */
  const caseDiagnostics = [];
  let modelExecutionCount = 0;
  let invocationSeam = forceLibrary
    ? "ai_platform_coach_path"
    : "http_post_me_peotteok_chat";
  let canonicalCount = 0;

  for (const row of dataset.rows) {
    const out = await executeEvalCase(row, ctx);
    if (out.status !== "OK") {
      execBlocked.push({
        case_id: row.id,
        status: "BLOCKED",
        block_code: out.blockCode || "BLOCKED_EXECUTION",
        fails: [out.reason || out.blockCode || "execution blocked"],
        notes: [],
        flags: {
          moneyHallucination: false,
          piiLeak: false,
          l3MoneyAction: false,
        },
      });
      caseDiagnostics.push({
        case_id: row.id,
        http_executed: !forceLibrary,
        model_called: Boolean(out.modelExecuted),
        runtime_trace_id: out.runtime_trace_id || null,
        trace_captured: false,
        schema_valid: false,
        grade: "BLOCKED",
        block_code: out.blockCode || null,
        missing: out.missing || null,
        reason: out.reason || null,
      });
      continue;
    }
    if (out.modelExecuted) modelExecutionCount += 1;
    if (out.canonical_trace) canonicalCount += 1;
    invocationSeam = out.invocation_seam || invocationSeam;
    writeTraceArtifact(traceDir, row.id, out.artifact);
    artifacts.push(out.artifact);
    caseDiagnostics.push({
      case_id: row.id,
      http_executed: !forceLibrary,
      model_called: Boolean(out.modelExecuted),
      runtime_trace_id: out.artifact.trace_id,
      trace_captured: true,
      schema_valid: true,
      canonical_trace: out.artifact.canonical_trace,
      trace_id_provenance: out.artifact.trace_id_provenance,
      actual_lane: out.artifact.lane,
      actual_path: out.artifact.answer_path,
      expected_lane: row.expectLane || null,
      expected_path: row.expectPath || row.expectAnswerPath || null,
    });
  }

  const caseIds = dataset.rows.map((r) => r.id);
  const indexed = indexAndValidateTraces(
    caseIds.filter((id) => !execBlocked.some((b) => b.case_id === id)),
    artifacts,
    { requireCanonical: !forceLibrary },
  );

  if (!indexed.ok && artifacts.length) {
    for (const err of indexed.errors) {
      execBlocked.push({
        case_id: "trace_index",
        status: "BLOCKED",
        block_code: "TRACE_VALIDATION",
        fails: [err],
        notes: [],
        flags: {
          moneyHallucination: false,
          piiLeak: false,
          l3MoneyAction: false,
        },
      });
    }
  }

  const gradeableRows = dataset.rows.filter(
    (r) => !execBlocked.some((b) => b.case_id === r.id),
  );
  const grades = gradeDataset(gradeableRows, indexed.byCase);
  const allGrades = [
    ...grades,
    ...execBlocked.filter((b) => b.case_id !== "trace_index"),
  ];

  for (const id of indexed.missing || []) {
    if (!allGrades.some((g) => g.case_id === id)) {
      allGrades.push({
        case_id: id,
        status: "BLOCKED",
        block_code: "MISSING_TRACE",
        fails: ["missing recorded trace"],
        notes: [],
        flags: {
          moneyHallucination: false,
          piiLeak: false,
          l3MoneyAction: false,
        },
      });
    }
  }

  // Attach grade onto diagnostics
  for (const d of caseDiagnostics) {
    const g = allGrades.find((x) => x.case_id === d.case_id);
    if (g) {
      d.grade = g.status;
      d.fails = g.fails || [];
    }
  }

  const aggregate = aggregateQa7(allGrades, {
    run_id: runId,
    baseline_id: pre.baseline_id,
    mode,
    model_execution_count: modelExecutionCount,
    invocation_seam: invocationSeam,
  });

  const summary = {
    ...aggregate,
    measured_at: measuredAt,
    hashes: pre.hashes,
    provider_prereq: {
      ok: pre.provider_prereq.ok,
      seam: pre.provider_prereq.seam,
      provider: pre.provider_prereq.provider,
      reason: pre.provider_prereq.reason,
    },
    http_precheck: httpPre,
    executor_expectation_isolation: isolation,
    case_diagnostics: caseDiagnostics,
    trace_dir: traceDir,
    dataset_count: dataset.count,
    real_model_execution: modelExecutionCount > 0,
    real_trace_capture: artifacts.length > 0,
    canonical_http_execution: !forceLibrary && canonicalCount > 0,
    canonical_trace_count: canonicalCount,
    trace_id_provenance:
      !forceLibrary && canonicalCount > 0 ? "RUNTIME" : "TOOLING",
    no_expectation_leakage: isolation.ok,
    no_fake_trace: !forceLibrary
      ? canonicalCount === artifacts.length &&
        artifacts.every(
          (a) =>
            a.canonical_trace === true &&
            a.fixture_only !== true &&
            a.trace_id_provenance === "RUNTIME" &&
            !String(a.trace_id).startsWith("qa7:"),
        )
      : false,
    trace_source_status: artifacts.length
      ? forceLibrary
        ? "LOCAL_LIBRARY_NONCANONICAL"
        : "LOCAL_RECORDED_CANONICAL"
      : "MISSING",
    qa7_completion_status: "NOT_STARTED_OR_RUNNING",
    formal_actions_evidence: false,
    force_library: forceLibrary,
    synthetic_persona: synthPersona
      ? { user_id: synthPersona.user_id, created: synthPersona.created }
      : null,
  };

  const summaryPath = writeRunSummary(traceDir, summary);

  return {
    ...summary,
    summary_path: summaryPath,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const mode = getArg(argv, "--mode") || "smoke";
  const skipLlm = hasFlag(argv, "--skip-llm");
  const forceLibrary = hasFlag(argv, "--library");
  // --http kept as explicit alias (canonical is already default)
  const synthetic_ns =
    getArg(argv, "--synthetic-ns") ||
    process.env.AIPO_QA_SYNTHETIC_NS ||
    "qa-synth-qa7-local";

  const result = await runQa7({
    mode,
    skipLlm,
    forceLibrary,
    target_env:
      getArg(argv, "--target-env") || process.env.AIPO_QA_TARGET_ENV || "local",
    hostname:
      getArg(argv, "--hostname") || process.env.AIPO_QA_HOSTNAME || "localhost",
    synthetic_account_namespace: synthetic_ns,
  });

  console.log(
    JSON.stringify(
      {
        suite_status: result.suite_status,
        run_id: result.run_id,
        baseline_id: result.baseline_id,
        mode: result.mode,
        counts: result.counts,
        hashes: result.hashes,
        real_model_execution: result.real_model_execution,
        real_trace_capture: result.real_trace_capture,
        canonical_http_execution: result.canonical_http_execution,
        trace_id_provenance: result.trace_id_provenance,
        no_expectation_leakage: result.no_expectation_leakage,
        no_fake_trace: result.no_fake_trace,
        trace_source_status: result.trace_source_status,
        invocation_seam: result.invocation_seam,
        deterministic_grader: result.deterministic_grader,
        quality_grader: result.quality_grader,
        eval_gate_pass: result.eval_gate?.pass ?? null,
        case_diagnostics: result.case_diagnostics || null,
        http_precheck: result.http_precheck || null,
        executor_expectation_isolation:
          result.executor_expectation_isolation || null,
        trace_dir: result.trace_dir,
        summary_path: result.summary_path,
        formal_actions_evidence: false,
        local_validation_only: true,
        findings: result.findings || null,
      },
      null,
      2,
    ),
  );

  if (result.suite_status === "FAIL") process.exitCode = 1;
  if (
    result.suite_status === "BLOCKED" &&
    (result.block_code === "BLOCKED_PRECHECK" ||
      result.block_code === "BLOCKED_NO_HTTP_CANONICAL" ||
      result.block_code === "EXPECTATION_LEAKAGE")
  ) {
    process.exitCode = 2;
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error("[run-qa7] ERROR", e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

module.exports = { runQa7 };

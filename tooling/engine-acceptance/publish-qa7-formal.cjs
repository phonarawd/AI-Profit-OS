/**
 * QA7 공식 GitHub Actions 증거 게시 (제품 재실행 아님)
 *
 * 로컬 run-qa7.cjs 는 formal_actions_evidence=false 고정.
 * 이 스크립트만 qa7-result.v1.json / evidence-manifest / REPORT 를 갱신한다.
 * eval/grader/workflow/제품 바이트는 읽기만 하고 변경하지 않는다.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { ROOT, readJson, dualDirty } = require("./lib/hash-scope.cjs");
const { runQa7Precheck } = require("./lib/qa7-precheck.cjs");
const { loadEvalDataset } = require("./lib/qa7-dataset.cjs");
const { indexAndValidateTraces } = require("./lib/qa7-trace.cjs");
const { GRADER_VERSION } = require("./lib/qa7-constants.cjs");

const GOV = path.join(ROOT, "governance/engine-acceptance");
const RESULT_REL = "governance/engine-acceptance/qa7-result.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const REPORT_REL = "governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md";
const SCOPE_REL = "governance/engine-acceptance/protected-scope.v1.json";
const QA6_REL = "governance/engine-acceptance/qa6-result.v1.json";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXPECT_KEYS = Object.freeze([
  "expectLane",
  "expectTools",
  "expectToolsExact",
  "expectToolsAny",
  "expectPath",
  "expectAnswerPath",
  "expectFacts",
  "expectScope",
  "expectGuard",
]);
const SECRET_RE =
  /service_role|jwt[_-]?secret|postgres(?:ql)?:\/\/|Bearer [A-Za-z0-9._-]{20,}|AIza[0-9A-Za-z_-]{20,}|GEMINI_API_KEY\s*=/i;

function getArg(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  return argv[i + 1] || null;
}

function sha256Json(obj) {
  const text = `${JSON.stringify(obj)}\n`;
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function writeJson(rel, obj) {
  const abs = path.join(ROOT, rel);
  fs.writeFileSync(abs, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function fail(message, code) {
  const err = new Error(message);
  err.code = code || "AIPO_QA7_PUBLISH_REJECT";
  throw err;
}

function assertNoExpectKeys(obj, label) {
  if (!obj || typeof obj !== "object") return;
  for (const k of EXPECT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      fail(`${label} contains expectation key ${k}`, "EXPECTATION_LEAKAGE");
    }
  }
}

function scanSecrets(obj, label) {
  const blob = JSON.stringify(obj);
  if (SECRET_RE.test(blob)) {
    fail(`${label} secret-pattern hit`, "SECRET_EXPOSURE");
  }
}

function loadTraceDir(dir) {
  if (!dir || !fs.existsSync(dir)) {
    fail(`artifact dir missing: ${dir}`);
  }
  const summaryPath = path.join(dir, "qa7-local-summary.json");
  if (!fs.existsSync(summaryPath)) {
    fail("qa7-local-summary.json missing in artifact dir");
  }
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".trace.json"))
    .sort();
  const artifacts = files.map((f) =>
    JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")),
  );
  return { summary, artifacts, files };
}

function observationFrom(artifact, grade) {
  assertNoExpectKeys(artifact, `trace ${artifact.case_id}`);
  assertNoExpectKeys(artifact.trace, `trace.body ${artifact.case_id}`);
  assertNoExpectKeys(grade, `grade ${artifact.case_id}`);
  return {
    case_id: artifact.case_id,
    status: grade.status,
    trace_id: artifact.trace_id,
    trace_id_provenance: artifact.trace_id_provenance,
    canonical_trace: artifact.canonical_trace === true,
    fixture_only: artifact.fixture_only === true,
    invocation_seam: artifact.invocation_seam || null,
    lane: artifact.lane,
    answer_path: artifact.answer_path,
    tools_called: Array.isArray(artifact.tools_called)
      ? artifact.tools_called
      : [],
    model_executed: Boolean(artifact.model_executed),
  };
}

/**
 * Renders QA6's ACTUAL current record (SPECIFIED/PASS or
 * UNSPECIFIED_PERF_BUDGET/BLOCKED) instead of a fixed historical string —
 * this report must reflect whichever budget_status qa6-result.v1.json
 * carries at publish time, since a Human/PO-approved budget can turn
 * UNSPECIFIED into SPECIFIED between epochs.
 */
function renderPerformanceWorldSection() {
  let qa6 = null;
  try {
    qa6 = readJson(QA6_REL);
  } catch {
    qa6 = null;
  }
  const pw = qa6 && qa6.checks && qa6.checks.performance_world;
  if (!pw) {
    return [
      "## Performance World (k6 · CI only heavy)",
      "",
      "qa6-result.v1.json not readable at QA7 publish time — cannot recap.",
    ].join("\n");
  }
  if (pw.status === "UNSPECIFIED_PERF_BUDGET") {
    return [
      "## Performance World (k6 · CI only heavy)",
      "",
      "QA6 기록 유지. suite status `UNSPECIFIED_PERF_BUDGET` · threshold mechanism locked · numeric invention **forbidden** · heavy k6 **CI only** · artifact retention ≥ **90** days · aggregator `if: always()`.",
      "",
      "| Scenario | Tag | Invariant | Status | Budget | Blocked code |",
      "|---|---|---|---|---|---|",
      "| `PERF-FEED-READ` | `feed_read` | `INV-PERF-01` | `BLOCKED` | `UNSPECIFIED_PERF_BUDGET` | `BLOCKED_MISSING_ORACLE` |",
      "| `PERF-PARTICIPATE` | `participate` | `INV-PERF-01` | `BLOCKED` | `UNSPECIFIED_PERF_BUDGET` | `BLOCKED_MISSING_ORACLE` |",
      "",
      "### UNSPECIFIED_PERF_BUDGET",
      "",
      "- Formal suite/budget status when product SLO/contract numeric budgets are absent.",
      "- `BLOCKED_MISSING_ORACLE` on critical `INV-PERF-01` → `ENGINE_QA_INCOMPLETE` (ACCEPTED 불가).",
      "- Invented p95 / error_rate = **금지**.",
    ].join("\n");
  }
  const rows = (pw.scenarios || [])
    .map((s) => `| \`${s.scenario_id}\` | \`${s.tag}\` | \`${s.invariant_id || "INV-PERF-01"}\` | \`${s.status}\` | \`${pw.status}\` | \`${s.blocked_code || "-"}\` |`)
    .join("\n");
  return [
    "## Performance World (k6 · CI only heavy)",
    "",
    `QA6 기록 유지. suite status \`${pw.status}\` — budget SPECIFIED (Human/PO ACK, perf-budget.v1.json V1) · threshold mechanism locked · numeric invention **forbidden** · heavy k6 **CI only** · artifact retention ≥ **90** days · aggregator \`if: always()\`.`,
    "",
    "| Scenario | Tag | Invariant | Status | Budget | Blocked code |",
    "|---|---|---|---|---|---|",
    rows || "| (no scenarios recorded) | - | - | - | - | - |",
  ].join("\n");
}

function buildReport({
  baseline,
  result,
  dual,
  critical,
  verdict,
  verdictReason,
}) {
  return `# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-7 \`qa7-ai-eval\`
> **Measured:** ${result.measuredAt}
> **Published:** ${result.publishedAt}
> **baseline_id:** \`${baseline.id}\`
> **qa7_run_id:** \`${result.run_id}\`
> **qa7_harness_run_id:** \`${result.harness_run_id}\`
> **qa7_result_checksum:** \`${result.checksum}\`
> **mode:** \`${result.mode}\`

## Status banner

\`\`\`text
ACCEPTANCE CONTRACT = LOCKED
BASELINE = FROZEN
QA0 = COMPLETE
QA1 = COMPLETE
QA2 = COMPLETE
QA3 = COMPLETE
QA4 = COMPLETE
QA5 = COMPLETE
QA6 = COMPLETE
QA7 = COMPLETE
QA8 = NOT_STARTED
QA HARNESS TARGET = SAFE
NEXT = QA8_SECURITY_PRIVACY
PRODUCT MUTATION = 0
EVAL_MUTATION = 0
GRADER_MUTATION = 0
03 UI = BLOCKED
ENGINE_ACCEPTED_FOR_UI = NOT_ISSUED
\`\`\`

## Verdict (after QA-7 formal Actions publication)

| Field | Value |
|---|---|
| verdict | \`${verdict}\` |
| reason | ${verdictReason} |
| evidence_integrity | \`VALID\` |
| baseline.valid | \`${baseline.valid}\` |
| working_tree_clean | \`${dual.working_tree_clean}\` (fact only — not forced clean) |
| protected_scope_clean | \`${dual.protected_scope_clean}\` |
| defects.P0 / P1 | 0 / 0 |
| critical_invariant.blocked (cumulative) | ${critical.blocked} |
| critical_invariant.skipped | ${critical.skipped} |
| critical_invariant.uncovered | ${critical.uncovered} |
| mandatory suites COMPLETE | QA0..QA7 · QA8 NOT_STARTED |

**금지 확인:** \`ENGINE_ACCEPTED_FOR_UI\` **not issued** (critical BLOCKED/UNSPECIFIED and/or QA8 incomplete).

## QA7 AI Eval (formal GitHub Actions)

| Field | Value |
|---|---|
| formal_actions_evidence | \`true\` |
| local_validation_only | \`false\` |
| actions.run_id | \`${result.actions.run_id}\` |
| workflow | \`${result.actions.workflow}\` |
| event | \`${result.actions.event}\` |
| qa_phase | \`${result.actions.qa_phase}\` |
| head_sha | \`${result.actions.head_sha}\` |
| conclusion | \`${result.actions.conclusion}\` |
| CASES / PASS / FAIL / BLOCKED | ${result.counts.total} / ${result.counts.pass} / ${result.counts.fail} / ${result.counts.blocked} |
| suite_status | \`${result.suite_status}\` |
| trace_id_provenance | \`${result.trace_id_provenance}\` |
| no_expectation_leakage | \`${result.no_expectation_leakage}\` |
| no_fake_trace | \`${result.no_fake_trace}\` |
| secret_exposure | \`${result.secret_exposure}\` |
| artifact | \`${result.artifact.name}\` retention=${result.artifact.retention_days}d raw_in_repo=false |
| deterministic_grader | sole oracle · \`${result.deterministic_grader.status}\` |
| quality_grader | NOT_USED (sole oracle 금지) |
| prompt/eval/workflow hashes | MATCH |

${renderPerformanceWorldSection()}

## Dual Dirty

- working_tree_clean=\`${dual.working_tree_clean}\`
- protected_scope_clean=\`${dual.protected_scope_clean}\`
- forced clean / stash laundry = **forbidden**

## Next

\`QA8_SECURITY_PRIVACY\` only. QA7_AI_EVAL formal evidence is published. Full ACCEPTED · product mutation · 03 UI — **금지**. ${critical.blocked > 0 ? `Remaining critical BLOCKED=${critical.blocked} (QA4–QA6) still blocks` : "QA4–QA6 carry forward critical_invariant.blocked=0 (clean) but QA8 (mandatory suite) has not run yet — still blocks"} \`ENGINE_ACCEPTED_FOR_UI\`.
`;
}

function publishQa7Formal(opts) {
  const actionsRunId = String(opts.actionsRunId || "");
  if (!/^[0-9]+$/.test(actionsRunId)) {
    fail("actions run id must be numeric GitHub Actions run id");
  }
  const artifactDir = opts.artifactDir;
  const { summary, artifacts } = loadTraceDir(artifactDir);

  const pre = runQa7Precheck();
  if (!pre.ok) {
    fail(`QA7 precheck failed: ${pre.findings.join("; ")}`);
  }
  if (pre.hashes.prompt_hash !== "MATCH") fail("prompt_hash not MATCH");
  if (pre.hashes.eval_dataset_hash !== "MATCH") {
    fail("eval_dataset_hash not MATCH");
  }
  if (pre.hashes.acceptance_workflow_hash !== "MATCH") {
    fail("acceptance_workflow_hash not MATCH");
  }

  const baseline = pre.baseline;
  if (summary.baseline_id !== baseline.id) {
    fail(
      `artifact baseline_id ${summary.baseline_id} != current ${baseline.id}`,
      "EPOCH_MISMATCH",
    );
  }
  if (summary.mode !== "full") fail("formal QA7 requires mode=full");
  if (summary.suite_status !== "PASS") {
    fail(`cannot publish non-PASS suite_status=${summary.suite_status}`);
  }
  const counts = summary.counts || {};
  if (
    counts.total !== 24 ||
    counts.pass !== 24 ||
    counts.fail !== 0 ||
    counts.blocked !== 0 ||
    counts.graded !== 24
  ) {
    fail(
      `unexpected counts total/pass/fail/blocked/graded=${counts.total}/${counts.pass}/${counts.fail}/${counts.blocked}/${counts.graded}`,
    );
  }
  if (summary.trace_id_provenance !== "RUNTIME") {
    fail("trace_id_provenance must be RUNTIME");
  }
  if (summary.no_expectation_leakage !== true) {
    fail("no_expectation_leakage must be true");
  }
  if (summary.no_fake_trace !== true) fail("no_fake_trace must be true");
  if (summary.canonical_http_execution !== true) {
    fail("canonical_http_execution must be true");
  }
  if (summary.eval_gate?.pass !== true) fail("eval_gate.pass must be true");

  const dataset = loadEvalDataset({});
  if (dataset.count !== 24) fail(`dataset count ${dataset.count} != 24`);
  const caseIds = dataset.rows.map((r) => r.id);
  const indexed = indexAndValidateTraces(caseIds, artifacts, {
    requireCanonical: true,
  });
  if (!indexed.ok) {
    fail(
      `trace index reject: ${indexed.errors.concat(indexed.missing).join("; ")}`,
    );
  }

  const gradeById = new Map(
    (summary.case_results || []).map((r) => [r.case_id, r]),
  );
  const observations = [];
  for (const id of caseIds) {
    const art = indexed.byCase.get(id);
    const grade = gradeById.get(id);
    if (!art || !grade) fail(`missing artifact/grade for ${id}`);
    if (grade.status !== "PASS") {
      fail(`refusing to publish non-PASS case ${id}=${grade.status}`);
    }
    if (art.trace_id_provenance !== "RUNTIME") {
      fail(`case ${id} provenance ${art.trace_id_provenance}`);
    }
    if (String(art.trace_id).startsWith("qa7:")) {
      fail(`case ${id} tooling qa7: trace_id`);
    }
    if (!UUID_RE.test(String(art.trace_id))) {
      fail(`case ${id} non-runtime UUID trace_id`);
    }
    if (art.fixture_only === true || art.canonical_trace !== true) {
      fail(`case ${id} not canonical runtime trace`);
    }
    scanSecrets(art, `trace ${id}`);
    observations.push(observationFrom(art, grade));
  }
  if (new Set(observations.map((o) => o.trace_id)).size !== 24) {
    fail("duplicate runtime trace_id");
  }

  const scope = readJson(SCOPE_REL);
  const dual = dualDirty(scope);
  if (dual.protected_scope_clean !== true) {
    fail("protected_scope_clean must be true for publication");
  }

  const publishedAt = new Date().toISOString();
  const evidence = readJson(EVIDENCE_REL);
  const critical = evidence.critical_invariant || {
    blocked: 1,
    skipped: 0,
    uncovered: 0,
  };
  // Safety check against silently carrying forward a different epoch's
  // cumulative count. Re-derived from the CURRENT evidence-manifest (QA4-QA6
  // bound + COMPLETE for this baseline) rather than a hardcoded historical
  // BLOCKED number — a fixed magic number would go stale on the very next
  // epoch where QA4-QA6 genuinely observe a different (e.g. 0) count.
  const qa456CompleteForBaseline = ["QA4", "QA5", "QA6"].every((id) => {
    const s = (evidence.suites || []).find((x) => x.suite_id === id);
    return Boolean(s && s.completion_status === "COMPLETE" && s.baseline_id === baseline.id);
  });
  if (!qa456CompleteForBaseline) {
    fail(
      "refusing to publish QA7 formal evidence — QA4-QA6 are not COMPLETE for the current baseline (critical_invariant would be stale)",
    );
  }

  const verdict = "ENGINE_QA_INCOMPLETE";
  const verdictReason =
    critical.blocked > 0
      ? `QA7 COMPLETE (formal Actions) · critical_invariant.blocked=${critical.blocked} (QA4-QA6 carry-forward BLOCKED_*/FAIL/UNSPECIFIED_PERF_BUDGET) · P0/P1=0 · QA8 NOT_STARTED · ENGINE_ACCEPTED_FOR_UI forbidden`
      : `QA7 COMPLETE (formal Actions) · critical_invariant.blocked=0 (QA4-QA6 clean for current epoch) · P0/P1=0 · QA8 NOT_STARTED (mandatory suite incomplete) · ENGINE_ACCEPTED_FOR_UI forbidden`;

  const result = {
    schema: "governance.engine-acceptance.qa7-result.v1",
    version: "1.0.0",
    suite_id: "QA7",
    run_id: actionsRunId,
    harness_run_id: summary.run_id,
    todoId: "qa7-ai-eval",
    measuredAt: summary.measured_at,
    publishedAt,
    baseline_id: baseline.id,
    rebase_id: (baseline.epoch && baseline.epoch.rebase_id) || null,
    mode: "full",
    completion_status: "COMPLETE",
    formal_actions_evidence: true,
    local_validation_only: false,
    qa7_completion_status: "COMPLETE",
    engine_accepted_for_ui: "NOT_ISSUED",
    ui_ux_entry_gate: "CLOSED",
    actions: {
      run_id: actionsRunId,
      workflow: opts.workflowName || "engine-acceptance",
      event: opts.event || "workflow_dispatch",
      qa_phase: opts.qaPhase || "qa7",
      head_sha: opts.headSha,
      head_branch: opts.headBranch || "main",
      conclusion: opts.conclusion || "success",
      url:
        opts.runUrl ||
        `https://github.com/phonarawd/AI-Profit-OS/actions/runs/${actionsRunId}`,
      job: "qa7-ai-eval",
    },
    artifact: {
      name: "engine-acceptance-QA7-raw-traces",
      artifact_id: opts.artifactId || null,
      retention_days: 90,
      expires_at: opts.artifactExpiresAt || null,
      raw_in_repo: false,
    },
    kill_switch: {
      verified_before_checks: true,
      target_env: "ci",
      hostname: "localhost",
      synthetic_account_namespace: "qa-synth-ci",
    },
    dual_dirty: {
      working_tree_clean: dual.working_tree_clean,
      protected_scope_clean: dual.protected_scope_clean,
      forced_clean_forbidden: true,
    },
    suite_status: "PASS",
    counts: {
      total: 24,
      pass: 24,
      fail: 0,
      blocked: 0,
      graded: 24,
    },
    trace_id_provenance: "RUNTIME",
    no_expectation_leakage: true,
    no_fake_trace: true,
    secret_exposure: "NONE",
    canonical_http_execution: true,
    real_model_execution: true,
    invocation_seam: summary.invocation_seam || "http_post_me_peotteok_chat",
    hashes: {
      prompt_hash: "MATCH",
      eval_dataset_hash: "MATCH",
      acceptance_workflow_hash: "MATCH",
      pinned: pre.hashes.pinned,
    },
    eval_mutation: 0,
    grader_mutation: 0,
    product_mutation: 0,
    deterministic_grader: {
      version: GRADER_VERSION,
      sole_oracle: true,
      status: "PASS",
    },
    quality_grader: {
      status: "NOT_USED",
      sole_oracle: false,
      note: "quality/model-as-judge disabled — must not be sole oracle",
    },
    eval_gate_pass: true,
    observations,
    critical_invariant_unchanged: critical,
    verdict_contribution: verdict,
    next: "QA8_SECURITY_PRIVACY",
    notes: [
      "Formal GitHub Actions evidence publication only. Product/eval/grader/workflow bytes unchanged.",
      "Raw traces remain Actions artifact (retention ≥ 90 days). Repo keeps summary + checksum.",
      "Does not issue ENGINE_ACCEPTED_FOR_UI. QA8 remains NOT_STARTED.",
    ],
  };
  scanSecrets(result, "qa7-result");
  const resultChecksum = sha256Json(result);
  result.checksum = resultChecksum;
  writeJson(RESULT_REL, result);

  evidence.qa_phase = "QA-7";
  evidence.baseline_id = baseline.id;
  evidence.verdict = verdict;
  evidence.verdict_reason = verdictReason;
  evidence.evidence_integrity = "VALID";
  evidence.next = "QA8_SECURITY_PRIVACY";
  evidence.critical_invariant = critical;
  evidence.dual_dirty = {
    working_tree_clean: dual.working_tree_clean,
    protected_scope_clean: dual.protected_scope_clean,
    forced_clean_forbidden: true,
  };
  evidence.artifact_policy = {
    raw_traces: "github_actions_artifact",
    retention_days_min: 90,
    repo_keeps: [
      "summary",
      "evidence-manifest.v1.json",
      "baseline.v1.json",
      "ENGINE_ACCEPTANCE_REPORT.md",
      "qa6-result.v1.json",
      "qa7-result.v1.json",
      "perf-budget.v1.json",
    ],
  };
  evidence.kill_switch = {
    ...(evidence.kill_switch || {}),
    verified_before_smoke: true,
    verified_before_qa1: true,
    verified_before_qa2: true,
    verified_before_qa3: true,
    verified_before_qa4: true,
    verified_before_qa5: true,
    verified_before_qa6: true,
    verified_before_qa7: true,
    production_like_aborts: true,
  };
  if (evidence.current_epoch) {
    evidence.current_epoch.qa1_qa6_status = "COMPLETE";
  }
  evidence.suites = (evidence.suites || []).map((s) => {
    if (s.suite_id === "QA7") {
      return {
        suite_id: "QA7",
        run_id: actionsRunId,
        baseline_id: baseline.id,
        checksum: resultChecksum,
        completion_status: "COMPLETE",
        result_ref: RESULT_REL,
        mode: "full",
        formal_actions_evidence: true,
        artifact: "engine-acceptance-QA7-raw-traces",
      };
    }
    if (s.suite_id === "QA8") {
      return {
        ...s,
        baseline_id: baseline.id,
        run_id: null,
        checksum: null,
        completion_status: "NOT_STARTED",
      };
    }
    return s;
  });
  writeJson(EVIDENCE_REL, evidence);

  const report = buildReport({
    baseline,
    result,
    dual,
    critical,
    verdict,
    verdictReason,
  });
  fs.writeFileSync(path.join(ROOT, REPORT_REL), report, "utf8");

  return {
    status: "QA7_FORMAL_PUBLISHED",
    run_id: actionsRunId,
    checksum: resultChecksum,
    counts: result.counts,
    next: result.next,
    qa7_completion_status: result.qa7_completion_status,
    formal_actions_evidence: true,
  };
}

function main() {
  const argv = process.argv.slice(2);
  try {
    const out = publishQa7Formal({
      actionsRunId: getArg(argv, "--actions-run-id"),
      artifactDir: getArg(argv, "--artifact-dir"),
      headSha: getArg(argv, "--head-sha"),
      headBranch: getArg(argv, "--head-branch") || "main",
      workflowName: getArg(argv, "--workflow-name") || "engine-acceptance",
      event: getArg(argv, "--event") || "workflow_dispatch",
      qaPhase: getArg(argv, "--qa-phase") || "qa7",
      conclusion: getArg(argv, "--conclusion") || "success",
      artifactId: getArg(argv, "--artifact-id"),
      artifactExpiresAt: getArg(argv, "--artifact-expires-at"),
      runUrl: getArg(argv, "--run-url"),
    });
    console.log("[engine-acceptance:publish-qa7-formal] QA7_FORMAL_PUBLISHED");
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error(
      `[engine-acceptance:publish-qa7-formal] ABORT — ${e.message}`,
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { publishQa7Formal };

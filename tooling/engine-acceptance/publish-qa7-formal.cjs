/**
 * QA7 공식 GitHub Actions 증거 게시 (제품 재실행 아님)
 *
 * 로컬 run-qa7.cjs 는 formal_actions_evidence=false 고정.
 * 이 스크립트만 qa7-result.v1.json / evidence-manifest / REPORT 를 갱신한다.
 * CLI 값은 expected only. 진실은 공식 GitHub metadata + zip digest.
 * 쓰기는 검증 전부 PASS 후 atomic multi-file replace. dry-run은 저장 0.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { ROOT, readJson, dualDirty, git } = require("./lib/hash-scope.cjs");
const {
  evaluatePublicationInheritance,
  isInheritanceAllowed,
} = require("./lib/publication-sha-inheritance.cjs");
const {
  OFFICIAL_QA7_ARTIFACT,
  OFFICIAL_QA7_JOB,
  OFFICIAL_QA7_WORKFLOW_NAME,
  defaultGithubClient,
  evaluateQa7Provenance,
  sha256File,
} = require("./lib/qa7-github-provenance.cjs");
const { atomicReplace } = require("./lib/atomic-publication.cjs");
const { runQa7Precheck } = require("./lib/qa7-precheck.cjs");
const { loadEvalDataset } = require("./lib/qa7-dataset.cjs");
const { indexAndValidateTraces } = require("./lib/qa7-trace.cjs");
const { GRADER_VERSION } = require("./lib/qa7-constants.cjs");

const RESULT_REL = "governance/engine-acceptance/qa7-result.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const REPORT_REL = "governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md";
const SCOPE_REL = "governance/engine-acceptance/protected-scope.v1.json";
const QA6_REL = "governance/engine-acceptance/qa6-result.v1.json";
const OFFICIAL_RELS = Object.freeze([RESULT_REL, EVIDENCE_REL, REPORT_REL]);
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

function readJsonRoot(root, rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
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
function renderPerformanceWorldSection(root) {
  let qa6 = null;
  try {
    qa6 = readJsonRoot(root, QA6_REL);
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
  root,
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

${renderPerformanceWorldSection(root)}

## Dual Dirty

- working_tree_clean=\`${dual.working_tree_clean}\`
- protected_scope_clean=\`${dual.protected_scope_clean}\`
- forced clean / stash laundry = **forbidden**

## Next

\`QA8_SECURITY_PRIVACY\` only. QA7_AI_EVAL formal evidence is published. Full ACCEPTED · product mutation · 03 UI — **금지**. ${critical.blocked > 0 ? `Remaining critical BLOCKED=${critical.blocked} (QA4–QA6) still blocks` : "QA4–QA6 carry forward critical_invariant.blocked=0 (clean) but QA8 (mandatory suite) has not run yet — still blocks"} \`ENGINE_ACCEPTED_FOR_UI\`.
`;
}

function assertRawBinding(summary, artifacts, baseline, run) {
  if (summary.baseline_id !== baseline.id) {
    fail(
      `artifact baseline_id ${summary.baseline_id} != current ${baseline.id}`,
      "EPOCH_MISMATCH",
    );
  }
  const pinned = (summary.hashes && summary.hashes.pinned) || {};
  if (pinned.acceptance_workflow_hash && pinned.acceptance_workflow_hash !== baseline.acceptance_workflow_hash) {
    fail("raw result workflow hash does not match current baseline", "RAW_BINDING");
  }
  if (pinned.prompt_hash && pinned.prompt_hash !== baseline.prompt_hash) {
    fail("raw result prompt hash does not match current baseline", "RAW_BINDING");
  }
  if (pinned.eval_dataset_hash && pinned.eval_dataset_hash !== baseline.eval_dataset_hash) {
    fail("raw result eval hash does not match current baseline", "RAW_BINDING");
  }
  const summarySha =
    summary.head_sha ||
    summary.commit_sha ||
    (summary.actions && summary.actions.head_sha) ||
    null;
  if (summarySha && String(summarySha).toLowerCase() !== String(run.head_sha).toLowerCase()) {
    fail("raw result head SHA does not match official run", "RAW_BINDING");
  }
  const summaryRun =
    summary.github_run_id ||
    summary.actions_run_id ||
    (summary.actions && summary.actions.run_id) ||
    null;
  if (summaryRun && String(summaryRun) !== String(run.id)) {
    fail("raw result run id does not match official run", "RAW_BINDING");
  }
  for (const art of artifacts) {
    if (art.baseline_id && art.baseline_id !== baseline.id) {
      fail(`trace ${art.case_id} baseline_id mismatch`, "RAW_BINDING");
    }
    if (art.head_sha && String(art.head_sha).toLowerCase() !== String(run.head_sha).toLowerCase()) {
      fail(`trace ${art.case_id} head SHA mismatch`, "RAW_BINDING");
    }
  }
}

function resolveDownloadedZipSha256(opts) {
  if (opts.downloadedZipSha256) return opts.downloadedZipSha256;
  if (opts.artifactZipPath) {
    if (!fs.existsSync(opts.artifactZipPath)) {
      fail("official artifact zip missing", "ARTIFACT_DIGEST_MISSING");
    }
    return sha256File(opts.artifactZipPath);
  }
  fail("downloaded official zip digest missing", "ARTIFACT_DIGEST_MISSING");
}

function publishQa7Formal(opts) {
  const root = opts.root || ROOT;
  const dryRun = opts.dryRun === true || opts.validateOnly === true;
  const expected = {
    actionsRunId: opts.actionsRunId,
    artifactId: opts.artifactId,
    headSha: opts.headSha,
    headBranch: opts.headBranch,
    workflowName: opts.workflowName || null,
    workflowPath: opts.workflowPath || null,
    event: opts.event || null,
    conclusion: opts.conclusion || null,
    artifactName: opts.artifactName || null,
    artifactDigest: opts.artifactDigest || null,
    artifactExpiresAt: opts.artifactExpiresAt || null,
  };

  const githubClient = opts.githubClient || defaultGithubClient();
  const { run, artifact } = evaluateQa7Provenance({
    expected,
    githubClient,
    downloadedZipSha256: resolveDownloadedZipSha256(opts),
    nowMs: Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now(),
  });

  const artifactDir = opts.artifactDir;
  const { summary, artifacts } = loadTraceDir(artifactDir);

  const pre = opts.precheck || runQa7Precheck();
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
  assertRawBinding(summary, artifacts, baseline, run);
  if (summary.mode !== "full") fail("formal QA7 requires mode=full");
  if (summary.suite_status !== "PASS") {
    fail(`cannot publish non-PASS suite_status=${summary.suite_status}`);
  }
  const dataset = opts.dataset || loadEvalDataset({});
  const expectedCount = dataset.count;
  if (!Number.isInteger(expectedCount) || expectedCount < 1) {
    fail(`dataset count invalid: ${expectedCount}`);
  }
  const counts = summary.counts || {};
  if (
    counts.total !== expectedCount ||
    counts.pass !== expectedCount ||
    counts.fail !== 0 ||
    counts.blocked !== 0 ||
    counts.graded !== expectedCount
  ) {
    fail(
      `unexpected counts total/pass/fail/blocked/graded=${counts.total}/${counts.pass}/${counts.fail}/${counts.blocked}/${counts.graded} (dataset=${expectedCount})`,
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
  if (new Set(observations.map((o) => o.trace_id)).size !== expectedCount) {
    fail("duplicate runtime trace_id");
  }

  const dual = opts.dual || dualDirty(readJson(SCOPE_REL));
  if (dual.protected_scope_clean !== true) {
    fail("protected_scope_clean must be true for publication");
  }

  const publishedAt = opts.publishedAt || new Date().toISOString();
  const evidence = readJsonRoot(root, EVIDENCE_REL);
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
  const qa8 = (evidence.suites || []).find((s) => s.suite_id === "QA8");
  const qa9 = (evidence.suites || []).find((s) => s.suite_id === "QA9");
  if (qa8 && qa8.completion_status === "COMPLETE") {
    fail("publisher must not promote QA8 to COMPLETE", "QA8_EARLY");
  }
  if (qa9 && qa9.completion_status === "COMPLETE") {
    fail("publisher must not promote QA9 to COMPLETE", "QA9_EARLY");
  }
  const subjectSha =
    evidence.publication && evidence.publication.qa1_qa6_subject_sha
      ? evidence.publication.qa1_qa6_subject_sha
      : null;
  if (subjectSha) {
    let currentHead = run.head_sha;
    if (!currentHead) {
      try {
        currentHead = git("git rev-parse HEAD");
      } catch {
        currentHead = null;
      }
    }
    const inherit = evaluatePublicationInheritance({
      subjectSha,
      currentHead,
      baselineId: evidence.baseline_id,
      liveBaselineId: baseline.id,
      promptHash: baseline.prompt_hash,
      livePromptHash: baseline.prompt_hash,
      evalHash: baseline.eval_dataset_hash,
      liveEvalHash: baseline.eval_dataset_hash,
      workflowHash: baseline.acceptance_workflow_hash,
      liveWorkflowHash: baseline.acceptance_workflow_hash,
      isAncestor: opts.inheritanceIsAncestor,
    });
    if (!isInheritanceAllowed(inherit)) {
      fail(
        `QA1-QA6 subject SHA cannot be inherited onto this HEAD: ${inherit.reasons.join("; ")}`,
        "PUBLICATION_SHA_INHERITANCE",
      );
    }
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
    run_id: String(run.id),
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
      run_id: String(run.id),
      workflow: run.name || OFFICIAL_QA7_WORKFLOW_NAME,
      workflow_path: run.path,
      event: run.event,
      qa_phase: "qa7",
      head_sha: run.head_sha,
      head_branch: run.head_branch,
      conclusion: run.conclusion,
      url:
        run.html_url ||
        `https://github.com/phonarawd/AI-Profit-OS/actions/runs/${run.id}`,
      job: OFFICIAL_QA7_JOB,
    },
    artifact: {
      name: artifact.name || OFFICIAL_QA7_ARTIFACT,
      artifact_id: String(artifact.id),
      digest: String(artifact.digest || "").replace(/^sha256:/i, "").toLowerCase(),
      retention_days: 90,
      expires_at: artifact.expires_at,
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
      total: expectedCount,
      pass: expectedCount,
      fail: 0,
      blocked: 0,
      graded: expectedCount,
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

  const nextEvidence = JSON.parse(JSON.stringify(evidence));
  nextEvidence.qa_phase = "QA-7";
  nextEvidence.baseline_id = baseline.id;
  nextEvidence.verdict = verdict;
  nextEvidence.verdict_reason = verdictReason;
  nextEvidence.evidence_integrity = "VALID";
  nextEvidence.next = "QA8_SECURITY_PRIVACY";
  nextEvidence.critical_invariant = critical;
  nextEvidence.dual_dirty = {
    working_tree_clean: dual.working_tree_clean,
    protected_scope_clean: dual.protected_scope_clean,
    forced_clean_forbidden: true,
  };
  nextEvidence.artifact_policy = {
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
  nextEvidence.kill_switch = {
    ...(nextEvidence.kill_switch || {}),
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
  // evidence.current_epoch is a rebase-time snapshot, not live suite authority.
  // QA7 publication advances evidence.suites only; preserve the snapshot bytes.
  nextEvidence.suites = (nextEvidence.suites || []).map((s) => {
    if (s.suite_id === "QA7") {
      return {
        suite_id: "QA7",
        run_id: String(run.id),
        baseline_id: baseline.id,
        checksum: resultChecksum,
        completion_status: "COMPLETE",
        result_ref: RESULT_REL,
        mode: "full",
        formal_actions_evidence: true,
        artifact: OFFICIAL_QA7_ARTIFACT,
        artifact_id: String(artifact.id),
        head_sha: run.head_sha,
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

  const report = buildReport({
    root,
    baseline,
    result,
    dual,
    critical,
    verdict,
    verdictReason,
  });

  const writes = {
    [RESULT_REL]: Buffer.from(`${JSON.stringify(result, null, 2)}\n`, "utf8"),
    [EVIDENCE_REL]: Buffer.from(`${JSON.stringify(nextEvidence, null, 2)}\n`, "utf8"),
    [REPORT_REL]: Buffer.from(report, "utf8"),
  };

  if (opts.failBeforeStaging === true) {
    fail("injected failBeforeStaging — destination files must stay unchanged", "INJECTED_FAIL");
  }

  const out = {
    status: dryRun ? "QA7_FORMAL_VALIDATED" : "QA7_FORMAL_PUBLISHED",
    dry_run: dryRun,
    run_id: String(run.id),
    artifact_id: String(artifact.id),
    head_sha: run.head_sha,
    checksum: resultChecksum,
    counts: result.counts,
    next: result.next,
    qa7_completion_status: result.qa7_completion_status,
    formal_actions_evidence: true,
    engine_accepted_for_ui: "NOT_ISSUED",
  };

  if (dryRun) return out;

  atomicReplace(root, writes, {
    failBeforeReplace: opts.failBeforeReplace === true,
    failDuringReplace: opts.failDuringReplace === true,
    failDuringReplaceAfter: opts.failDuringReplaceAfter,
    verifyStaged(staged) {
      const byRel = new Map(staged.map((s) => [s.rel, s]));
      for (const rel of OFFICIAL_RELS) {
        if (!byRel.has(rel)) fail(`staged official file missing: ${rel}`, "ATOMIC");
      }
      const stagedResult = JSON.parse(fs.readFileSync(byRel.get(RESULT_REL).tmp, "utf8"));
      const stagedEvidence = JSON.parse(fs.readFileSync(byRel.get(EVIDENCE_REL).tmp, "utf8"));
      const stagedReport = fs.readFileSync(byRel.get(REPORT_REL).tmp, "utf8");
      if (stagedResult.run_id !== String(run.id) || stagedResult.actions.head_sha !== run.head_sha) {
        fail("staged QA7 result binding mismatch", "ATOMIC");
      }
      if (String(stagedResult.artifact.artifact_id) !== String(artifact.id)) {
        fail("staged QA7 artifact binding mismatch", "ATOMIC");
      }
      const qa7 = (stagedEvidence.suites || []).find((s) => s.suite_id === "QA7");
      if (!qa7 || qa7.run_id !== String(run.id) || qa7.checksum !== resultChecksum) {
        fail("staged evidence QA7 binding mismatch", "ATOMIC");
      }
      if (qa7.artifact_id !== String(artifact.id) || qa7.head_sha !== run.head_sha) {
        fail("staged evidence subject/run/artifact binding mismatch", "ATOMIC");
      }
      if (!stagedReport.includes(String(run.id)) || !stagedReport.includes(resultChecksum)) {
        fail("staged report binding mismatch", "ATOMIC");
      }
    },
  });

  return out;
}

function main() {
  const argv = process.argv.slice(2);
  try {
    const out = publishQa7Formal({
      actionsRunId: getArg(argv, "--actions-run-id"),
      artifactDir: getArg(argv, "--artifact-dir"),
      artifactZipPath: getArg(argv, "--artifact-zip"),
      artifactId: getArg(argv, "--artifact-id"),
      artifactDigest: getArg(argv, "--artifact-digest"),
      artifactName: getArg(argv, "--artifact-name"),
      artifactExpiresAt: getArg(argv, "--artifact-expires-at"),
      headSha: getArg(argv, "--head-sha"),
      headBranch: getArg(argv, "--head-branch"),
      workflowName: getArg(argv, "--workflow-name"),
      workflowPath: getArg(argv, "--workflow-path"),
      event: getArg(argv, "--event"),
      conclusion: getArg(argv, "--conclusion"),
      dryRun: argv.includes("--dry-run") || argv.includes("--validate-only"),
      validateOnly: argv.includes("--validate-only"),
    });
    console.log("[engine-acceptance:publish-qa7-formal] " + out.status);
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

module.exports = { publishQa7Formal, OFFICIAL_RELS };

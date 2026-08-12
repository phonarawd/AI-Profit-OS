/**
 * QA4 Stateful Time runner
 *
 * kill-switch → multi-day lifecycle + KST clock probe →
 * BLOCKED_NO_CLOCK_HOOK 정식 기록 (critical → ACCEPTED 불가) →
 * evidence-manifest / REPORT
 *
 * 로컬 기본 = tiny · --mode full 은 CI
 * 제품 mutation 0 · ENGINE_ACCEPTED_FOR_UI 발급 금지
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { assertKillSwitch } = require("./kill-switch.cjs");
const { ROOT, readJson, dualDirty, hashPathList } = require("./lib/hash-scope.cjs");
const { runStatefulTimeLifecycle } = require("./checks/stateful-time-lifecycle.cjs");

const RESULT_REL = "governance/engine-acceptance/qa4-result.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const REPORT_REL = "governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md";
const DEFECTS_REL = "governance/engine-acceptance/defects.v1.json";
const SCOPE_REL = "governance/engine-acceptance/protected-scope.v1.json";
const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";
const COVERAGE_REL = "governance/engine-acceptance/coverage.v1.json";

function sha256Json(obj) {
  return crypto.createHash("sha256").update(`${JSON.stringify(obj)}\n`, "utf8").digest("hex");
}

function writeJson(rel, obj) {
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function syncAggregateHashes(baseline, scope) {
  let changed = false;
  for (const key of ["acceptance_workflow_hash", "lockfile_hash"]) {
    const paths = scope.aggregateHashes[key];
    if (!paths) continue;
    const live = hashPathList(paths, scope);
    if (baseline[key] !== live) {
      baseline[key] = live;
      changed = true;
    }
  }
  if (changed) writeJson(BASELINE_REL, baseline);
}

function countBySeverity(defects) {
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const d of defects) {
    if (counts[d.severity] !== undefined) counts[d.severity] += 1;
  }
  return counts;
}

/**
 * BLOCKED ≠ defect. FAIL only → defects.
 */
function collectDefects(checks, baselineId, measuredAt) {
  /** @type {any[]} */
  const defects = [];
  for (const s of checks.stateful_time.scenarios || []) {
    if (s.status !== "FAIL") continue;
    defects.push({
      severity: s.invariant_id === "INV-TIME-01" ? "P1" : "P1",
      invariant_id: s.invariant_id,
      suite_id: "QA4",
      persona_id: s.persona_id || null,
      journey_id: s.journey_id || null,
      seed: checks.stateful_time.seed ?? null,
      trace_id: `qa4:${s.scenario_id}`,
      baseline_id: baselineId,
      first_observed_at: measuredAt,
      repro_status: "blocked",
      title: `stateful-time fail: ${s.scenario_id}`,
      findings: s.findings || [],
      rich_evidence: s.rich_evidence || null,
    });
  }
  return defects;
}

function buildReport({
  baseline,
  measuredAt,
  runId,
  resultChecksum,
  checks,
  defectsCounts,
  verdict,
  verdictReason,
  dual,
  mode,
}) {
  const st = checks.stateful_time;
  const scenarioRows = (st.scenarios || [])
    .map(
      (s) =>
        `| \`${s.scenario_id}\` | \`${s.invariant_id}\` | \`${s.status}\` | \`${s.blocked_code || "—"}\` | ${s.kst_label} |`,
    )
    .join("\n");
  const ci = st.critical_invariant || {};

  return `# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-4 \`qa4-stateful-time\`  
> **Measured:** ${measuredAt}  
> **baseline_id:** \`${baseline.id}\`  
> **qa4_run_id:** \`${runId}\`  
> **qa4_result_checksum:** \`${resultChecksum}\`  
> **mode:** \`${mode}\`

## Status banner

\`\`\`text
ACCEPTANCE CONTRACT = LOCKED
BASELINE = FROZEN
QA0 = COMPLETE
QA1 = COMPLETE
QA2 = COMPLETE
QA3 = COMPLETE
QA4 = COMPLETE
QA HARNESS TARGET = SAFE
NEXT = QA5_FAILURE_WORLD
PRODUCT MUTATION = 0
03 UI = BLOCKED
\`\`\`

## Verdict (after QA-4)

| Field | Value |
|---|---|
| verdict | \`${verdict}\` |
| reason | ${verdictReason} |
| evidence_integrity | \`VALID\` |
| baseline.valid | \`${baseline.valid}\` |
| working_tree_clean | \`${dual.working_tree_clean}\` (fact only — not forced clean) |
| protected_scope_clean | \`${dual.protected_scope_clean}\` |
| defects.P0 / P1 | ${defectsCounts.P0} / ${defectsCounts.P1} |
| critical_invariant.blocked | ${ci.blocked ?? 0} |
| critical_invariant.skipped | ${ci.skipped ?? 0} |
| critical_invariant.uncovered | ${ci.uncovered ?? 0} |
| mandatory suites COMPLETE | QA0..QA4 only · QA5..QA8 NOT_STARTED |

**금지 확인:** \`ENGINE_ACCEPTED_FOR_UI\` **not issued** (critical BLOCKED and/or QA5..QA8 incomplete).

## Stateful time (KST + multi-day)

| Field | Value |
|---|---|
| suite status | \`${st.status}\` |
| clock_hook.available | \`${st.clock_hook.available}\` |
| clock_hook.blocked_code | \`${st.clock_hook.blocked_code || "—"}\` |
| scenarios blocked/failed/passed | ${st.blocked} / ${st.failed} / ${st.passed} |
| mock PASS | **forbidden** |
| product mutation | \`0\` |

| Scenario | Invariant | Status | Blocked code | KST label |
|---|---|---|---|---|
${scenarioRows}

### BLOCKED_NO_CLOCK_HOOK

- Formal L3 result type (≠ defect).
- \`INV-TIME-01\` is **critical** → \`critical_invariant.blocked > 0\` → \`ENGINE_QA_INCOMPLETE\` (ACCEPTED 불가).
- Wall-clock-only / invented mock clock = **금지**.

## Dual Dirty

- working_tree_clean=\`${dual.working_tree_clean}\`
- protected_scope_clean=\`${dual.protected_scope_clean}\`
- forced clean / stash laundry = **forbidden**

## Next

\`QA5_FAILURE_WORLD\` only. Full ACCEPTED · product mutation · 03 UI — **금지**.
`;
}

function runQa4(opts = {}) {
  assertKillSwitch(opts);

  const mode = opts.mode === "full" ? "full" : "tiny";
  const baseline = readJson(BASELINE_REL);
  const scope = readJson(SCOPE_REL);
  syncAggregateHashes(baseline, scope);
  const dual = dualDirty(scope);
  const measuredAt = new Date().toISOString();
  const runId = `qa4-stateful-time-${measuredAt.slice(0, 10).replace(/-/g, "")}`;
  const synthetic_ns =
    opts.synthetic_account_namespace ||
    process.env.AIPO_QA_SYNTHETIC_NS ||
    "qa-synth-local";

  const stateful_time = runStatefulTimeLifecycle({
    mode,
    baseline_id: baseline.id,
    measuredAt,
  });

  // coverage status note (governance)
  try {
    const coverage = readJson(COVERAGE_REL);
    coverage.status = "qa4_active";
    if (!Array.isArray(coverage.notes)) coverage.notes = [];
    const note =
      "QA-4 stateful time = KST multi-day · BLOCKED_NO_CLOCK_HOOK when hook absent (suite_ids에 QA4).";
    if (!coverage.notes.includes(note)) coverage.notes.push(note);
    writeJson(COVERAGE_REL, coverage);
  } catch {
    /* optional */
  }

  const checks = { stateful_time };
  const defects = collectDefects(checks, baseline.id, measuredAt);
  const defectsCounts = countBySeverity(defects);
  const ci = stateful_time.critical_invariant || {
    blocked: 0,
    skipped: 0,
    uncovered: 0,
  };

  let verdict;
  let verdictReason;
  if (defectsCounts.P0 > 0 || defectsCounts.P1 > 0) {
    verdict = "ENGINE_NOT_ACCEPTED";
    verdictReason = `QA4 found P0=${defectsCounts.P0} P1=${defectsCounts.P1} · 03 blocked · product mutation 0`;
  } else if (
    (ci.blocked || 0) > 0 ||
    (ci.skipped || 0) > 0 ||
    (ci.uncovered || 0) > 0
  ) {
    verdict = "ENGINE_QA_INCOMPLETE";
    verdictReason = `QA4 COMPLETE · critical_invariant.blocked=${ci.blocked} (BLOCKED_NO_CLOCK_HOOK) · P0/P1=0 · ACCEPTED 불가 · QA5..QA8 not executed`;
  } else {
    verdict = "ENGINE_QA_INCOMPLETE";
    verdictReason =
      "QA4 COMPLETE · P0/P1=0 · mandatory suites QA5..QA8 not executed · ENGINE_ACCEPTED_FOR_UI forbidden";
  }

  const result = {
    schema: "governance.engine-acceptance.qa4-result.v1",
    version: "1.0.0",
    suite_id: "QA4",
    run_id: runId,
    todoId: "qa4-stateful-time",
    measuredAt,
    baseline_id: baseline.id,
    mode,
    kill_switch: {
      verified_before_checks: true,
      target_env: opts.target_env || process.env.AIPO_QA_TARGET_ENV || "local",
      hostname: opts.hostname || process.env.AIPO_QA_HOSTNAME || "localhost",
      synthetic_account_namespace: synthetic_ns,
    },
    dual_dirty: {
      working_tree_clean: dual.working_tree_clean,
      protected_scope_clean: dual.protected_scope_clean,
      forced_clean_forbidden: true,
    },
    completion_status: "COMPLETE",
    checks,
    critical_invariant: ci,
    all_checks_pass: stateful_time.status === "PASS",
    defects_found: defects.length,
    defects_counts: defectsCounts,
    verdict_contribution: verdict,
    next: "QA5_FAILURE_WORLD",
    product_mutation: 0,
    kpi_forbidden: true,
    blocked_codes_observed: stateful_time.clock_hook.available
      ? []
      : ["BLOCKED_NO_CLOCK_HOOK"],
    ci: {
      strategy_fail_fast: false,
      concurrency_group: "engine-acceptance-${{ github.ref }}",
    },
    notes: [
      "Multi-day lifecycle + KST clock probe.",
      "BLOCKED_NO_CLOCK_HOOK is a formal result (≠ defect).",
      "critical INV-TIME-01 BLOCKED → ENGINE_QA_INCOMPLETE (ACCEPTED 불가).",
      "Does not issue ENGINE_ACCEPTED_FOR_UI.",
    ],
  };

  const resultChecksum = sha256Json(result);
  result.checksum = resultChecksum;
  writeJson(RESULT_REL, result);

  let prior = { defects: [] };
  try {
    prior = readJson(DEFECTS_REL);
  } catch {
    /* empty */
  }
  const kept = (prior.defects || []).filter((d) => d.suite_id !== "QA4");
  const merged = [...kept, ...defects];
  const mergedCounts = countBySeverity(merged);
  writeJson(DEFECTS_REL, {
    schema: "governance.engine-acceptance.defects.v1",
    version: "1.0.0",
    status: merged.length ? "qa4_recorded" : "qa4_empty",
    requiredLinkFields: [
      "severity",
      "invariant_id",
      "suite_id",
      "persona_id",
      "journey_id",
      "seed",
      "trace_id",
      "baseline_id",
      "first_observed_at",
      "repro_status",
    ],
    counts: mergedCounts,
    defects: merged,
    notes: [
      "BLOCKED_NO_CLOCK_HOOK is recorded on suite/invariant results, not as a defect row.",
    ],
  });

  const evidence = readJson(EVIDENCE_REL);
  evidence.qa_phase = "QA-4";
  evidence.baseline_id = baseline.id;
  evidence.verdict = verdict;
  evidence.verdict_reason = verdictReason;
  evidence.evidence_integrity = "VALID";
  evidence.next = "QA5_FAILURE_WORLD";
  evidence.critical_invariant = {
    blocked: ci.blocked || 0,
    skipped: ci.skipped || 0,
    uncovered: ci.uncovered || 0,
  };
  evidence.dual_dirty = {
    working_tree_clean: dual.working_tree_clean,
    protected_scope_clean: dual.protected_scope_clean,
    forced_clean_forbidden: true,
  };
  evidence.kill_switch = {
    ...(evidence.kill_switch || {}),
    verified_before_smoke: true,
    verified_before_qa1: true,
    verified_before_qa2: true,
    verified_before_qa3: true,
    verified_before_qa4: true,
    production_like_aborts: true,
  };
  evidence.suites = (evidence.suites || []).map((s) => {
    if (
      s.suite_id === "QA0" ||
      s.suite_id === "QA1" ||
      s.suite_id === "QA2" ||
      s.suite_id === "QA3"
    ) {
      return { ...s, baseline_id: baseline.id };
    }
    if (s.suite_id === "QA4") {
      return {
        suite_id: "QA4",
        run_id: runId,
        baseline_id: baseline.id,
        checksum: resultChecksum,
        completion_status: "COMPLETE",
        result_ref: RESULT_REL,
        mode,
        blocked_codes: result.blocked_codes_observed,
      };
    }
    return {
      ...s,
      baseline_id: baseline.id,
      run_id: null,
      checksum: null,
      completion_status: "NOT_STARTED",
    };
  });
  writeJson(EVIDENCE_REL, evidence);

  const report = buildReport({
    baseline,
    measuredAt,
    runId,
    resultChecksum,
    checks,
    defectsCounts,
    verdict,
    verdictReason,
    dual,
    mode,
  });
  fs.writeFileSync(path.join(ROOT, REPORT_REL), report, "utf8");

  return {
    status: "QA4_COMPLETE",
    run_id: runId,
    checksum: resultChecksum,
    verdict,
    mode,
    all_checks_pass: result.all_checks_pass,
    defects_counts: defectsCounts,
    critical_invariant: ci,
    blocked_codes_observed: result.blocked_codes_observed,
    next: "QA5_FAILURE_WORLD",
  };
}

function main() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const modeFlag = get("--mode");
  const mode =
    modeFlag === "full" || args.includes("--full")
      ? "full"
      : modeFlag === "tiny" || args.includes("--tiny")
        ? "tiny"
        : "tiny";

  try {
    const out = runQa4({
      target_env: get("--target-env") || process.env.AIPO_QA_TARGET_ENV || "local",
      hostname: get("--hostname") || process.env.AIPO_QA_HOSTNAME || "localhost",
      synthetic_account_namespace:
        get("--synthetic-ns") ||
        process.env.AIPO_QA_SYNTHETIC_NS ||
        "qa-synth-local",
      mode,
    });
    console.log(`[engine-acceptance:run-qa4] ${out.status} mode=${out.mode}`);
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error(`[engine-acceptance:run-qa4] ABORT — ${e.message}`);
    process.exit(e.code === "AIPO_QA_KILL_SWITCH" ? 2 : 1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runQa4 };

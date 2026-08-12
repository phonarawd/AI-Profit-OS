/**
 * QA5 Failure World runner
 *
 * kill-switch → 축1 degradation/fallback + 축2 post-recovery →
 * BLOCKED_NO_FAULT_HOOK 정식 기록 (critical → ACCEPTED 불가) →
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
const {
  assertAcceptanceWorkflowHashMatch,
  syncLockfileHashOnly,
} = require("./lib/workflow-amendment.cjs");
const { runFailureWorld } = require("./checks/failure-world.cjs");

const RESULT_REL = "governance/engine-acceptance/qa5-result.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const REPORT_REL = "governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md";
const DEFECTS_REL = "governance/engine-acceptance/defects.v1.json";
const SCOPE_REL = "governance/engine-acceptance/protected-scope.v1.json";
const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";
const COVERAGE_REL = "governance/engine-acceptance/coverage.v1.json";
const QA4_REL = "governance/engine-acceptance/qa4-result.v1.json";

function sha256Json(obj) {
  return crypto.createHash("sha256").update(`${JSON.stringify(obj)}\n`, "utf8").digest("hex");
}

function writeJson(rel, obj) {
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function syncAggregateHashes(baseline, scope) {
  // POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1 — workflow hash auto-sync forbidden
  assertAcceptanceWorkflowHashMatch(baseline, scope);
  syncLockfileHashOnly(baseline, scope, (b) => writeJson(BASELINE_REL, b));
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
  for (const s of checks.failure_world.scenarios || []) {
    if (s.status !== "FAIL") continue;
    defects.push({
      severity: "P1",
      invariant_id: s.invariant_id,
      suite_id: "QA5",
      persona_id: s.persona_id || null,
      journey_id: s.journey_id || null,
      seed: checks.failure_world.seed ?? null,
      trace_id: `qa5:${s.scenario_id}`,
      baseline_id: baselineId,
      first_observed_at: measuredAt,
      repro_status: "blocked",
      title: `failure-world fail: ${s.scenario_id}`,
      findings: s.findings || [],
      rich_evidence: s.rich_evidence || null,
      axis: s.axis,
    });
  }
  return defects;
}

function mergeCriticalInvariant(prior, current) {
  const p = prior || { blocked: 0, skipped: 0, uncovered: 0 };
  const c = current || { blocked: 0, skipped: 0, uncovered: 0 };
  return {
    blocked: (p.blocked || 0) + (c.blocked || 0),
    skipped: (p.skipped || 0) + (c.skipped || 0),
    uncovered: (p.uncovered || 0) + (c.uncovered || 0),
    sources: {
      QA4: {
        blocked: p.blocked || 0,
        skipped: p.skipped || 0,
        uncovered: p.uncovered || 0,
      },
      QA5: {
        blocked: c.blocked || 0,
        skipped: c.skipped || 0,
        uncovered: c.uncovered || 0,
      },
    },
  };
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
  criticalMerged,
}) {
  const fw = checks.failure_world;
  const scenarioRows = (fw.scenarios || [])
    .map(
      (s) =>
        `| \`${s.scenario_id}\` | axis${s.axis} | \`${s.invariant_id}\` | \`${s.status}\` | \`${s.blocked_code || "—"}\` |`,
    )
    .join("\n");
  const ci = criticalMerged || fw.critical_invariant || {};
  const a1 = fw.axes?.axis1_expected_degradation_fallback || {};
  const a2 = fw.axes?.axis2_post_recovery_invariant || {};

  return `# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-5 \`qa5-failure-world\`  
> **Measured:** ${measuredAt}  
> **baseline_id:** \`${baseline.id}\`  
> **qa5_run_id:** \`${runId}\`  
> **qa5_result_checksum:** \`${resultChecksum}\`  
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
QA5 = COMPLETE
QA HARNESS TARGET = SAFE
NEXT = QA6_PERFORMANCE
PRODUCT MUTATION = 0
03 UI = BLOCKED
\`\`\`

## Verdict (after QA-5)

| Field | Value |
|---|---|
| verdict | \`${verdict}\` |
| reason | ${verdictReason} |
| evidence_integrity | \`VALID\` |
| baseline.valid | \`${baseline.valid}\` |
| working_tree_clean | \`${dual.working_tree_clean}\` (fact only — not forced clean) |
| protected_scope_clean | \`${dual.protected_scope_clean}\` |
| defects.P0 / P1 | ${defectsCounts.P0} / ${defectsCounts.P1} |
| critical_invariant.blocked (cumulative QA4+QA5) | ${ci.blocked ?? 0} |
| critical_invariant.skipped | ${ci.skipped ?? 0} |
| critical_invariant.uncovered | ${ci.uncovered ?? 0} |
| mandatory suites COMPLETE | QA0..QA5 only · QA6..QA8 NOT_STARTED |

**금지 확인:** \`ENGINE_ACCEPTED_FOR_UI\` **not issued** (critical BLOCKED and/or QA6..QA8 incomplete).

## Failure World (CI fault · two axes)

| Field | Value |
|---|---|
| suite status | \`${fw.status}\` |
| fault_hook.available | \`${fw.fault_hook.available}\` |
| fault_hook.blocked_code | \`${fw.fault_hook.blocked_code || "—"}\` |
| scenarios blocked/failed/passed | ${fw.blocked} / ${fw.failed} / ${fw.passed} |
| axis1 (degradation/fallback) | \`${a1.status || "—"}\` · n=${a1.scenario_count ?? 0} |
| axis2 (post-recovery invariant) | \`${a2.status || "—"}\` · n=${a2.scenario_count ?? 0} |
| mock PASS | **forbidden** |
| product mutation | \`0\` |
| artifact retention | acceptance evidence ≥ **90** days (Actions artifact) |
| aggregator | \`if: always()\` (선행 job 실패 후에도 집계) |

| Scenario | Axis | Invariant | Status | Blocked code |
|---|---|---|---|---|
${scenarioRows}

### BLOCKED_NO_FAULT_HOOK

- Formal L3 result type (≠ defect).
- \`INV-FEED-AI-01\` / \`INV-LEDGER-01\` are **critical** → \`critical_invariant.blocked > 0\` → \`ENGINE_QA_INCOMPLETE\` (ACCEPTED 불가).
- Invented mock fault = **금지**.

## Dual Dirty

- working_tree_clean=\`${dual.working_tree_clean}\`
- protected_scope_clean=\`${dual.protected_scope_clean}\`
- forced clean / stash laundry = **forbidden**

## Next

\`QA6_PERFORMANCE\` only. Full ACCEPTED · product mutation · 03 UI — **금지**.
`;
}

function runQa5(opts = {}) {
  assertKillSwitch(opts);

  const mode = opts.mode === "full" ? "full" : "tiny";
  const baseline = readJson(BASELINE_REL);
  const scope = readJson(SCOPE_REL);
  syncAggregateHashes(baseline, scope);
  const dual = dualDirty(scope);
  const measuredAt = new Date().toISOString();
  const runId = `qa5-failure-world-${measuredAt.slice(0, 10).replace(/-/g, "")}`;
  const synthetic_ns =
    opts.synthetic_account_namespace ||
    process.env.AIPO_QA_SYNTHETIC_NS ||
    "qa-synth-local";

  const failure_world = runFailureWorld({
    mode,
    baseline_id: baseline.id,
    measuredAt,
  });

  try {
    const coverage = readJson(COVERAGE_REL);
    coverage.status = "qa5_active";
    if (!Array.isArray(coverage.notes)) coverage.notes = [];
    const note =
      "QA-5 Failure World = axis1 degradation/fallback · axis2 post-recovery · BLOCKED_NO_FAULT_HOOK when hook absent (suite_ids에 QA5).";
    if (!coverage.notes.includes(note)) coverage.notes.push(note);
    writeJson(COVERAGE_REL, coverage);
  } catch {
    /* optional */
  }

  const checks = { failure_world };
  const defects = collectDefects(checks, baseline.id, measuredAt);
  const defectsCounts = countBySeverity(defects);
  const ciQa5 = failure_world.critical_invariant || {
    blocked: 0,
    skipped: 0,
    uncovered: 0,
  };

  let priorCi = { blocked: 0, skipped: 0, uncovered: 0 };
  try {
    const qa4 = readJson(QA4_REL);
    priorCi = qa4.critical_invariant || priorCi;
  } catch {
    /* optional */
  }
  const criticalMerged = mergeCriticalInvariant(priorCi, ciQa5);

  let verdict;
  let verdictReason;
  if (defectsCounts.P0 > 0 || defectsCounts.P1 > 0) {
    verdict = "ENGINE_NOT_ACCEPTED";
    verdictReason = `QA5 found P0=${defectsCounts.P0} P1=${defectsCounts.P1} · 03 blocked · product mutation 0`;
  } else if (
    (criticalMerged.blocked || 0) > 0 ||
    (criticalMerged.skipped || 0) > 0 ||
    (criticalMerged.uncovered || 0) > 0
  ) {
    verdict = "ENGINE_QA_INCOMPLETE";
    verdictReason = `QA5 COMPLETE · critical_invariant.blocked=${criticalMerged.blocked} (incl. BLOCKED_NO_FAULT_HOOK / prior BLOCKED_NO_CLOCK_HOOK) · P0/P1=0 · ACCEPTED 불가 · QA6..QA8 not executed`;
  } else {
    verdict = "ENGINE_QA_INCOMPLETE";
    verdictReason =
      "QA5 COMPLETE · P0/P1=0 · mandatory suites QA6..QA8 not executed · ENGINE_ACCEPTED_FOR_UI forbidden";
  }

  const result = {
    schema: "governance.engine-acceptance.qa5-result.v1",
    version: "1.0.0",
    suite_id: "QA5",
    run_id: runId,
    todoId: "qa5-failure-world",
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
    critical_invariant: ciQa5,
    critical_invariant_cumulative: criticalMerged,
    all_checks_pass: failure_world.status === "PASS",
    defects_found: defects.length,
    defects_counts: defectsCounts,
    verdict_contribution: verdict,
    next: "QA6_PERFORMANCE",
    product_mutation: 0,
    kpi_forbidden: true,
    blocked_codes_observed: failure_world.fault_hook.available
      ? []
      : ["BLOCKED_NO_FAULT_HOOK"],
    ci: {
      strategy_fail_fast: false,
      concurrency_group: "engine-acceptance-${{ github.ref }}",
      aggregator_if_always: true,
      artifact_retention_days: 90,
    },
    notes: [
      "Axis1 expected degradation/fallback + Axis2 post-recovery invariant.",
      "BLOCKED_NO_FAULT_HOOK is a formal result (≠ defect).",
      "critical INV-FEED-AI-01 / INV-LEDGER-01 BLOCKED → ENGINE_QA_INCOMPLETE (ACCEPTED 불가).",
      "Does not issue ENGINE_ACCEPTED_FOR_UI.",
      "CI aggregator uses if: always(); artifact retention ≥ 90 days.",
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
  const kept = (prior.defects || []).filter((d) => d.suite_id !== "QA5");
  const merged = [...kept, ...defects];
  const mergedCounts = countBySeverity(merged);
  writeJson(DEFECTS_REL, {
    schema: "governance.engine-acceptance.defects.v1",
    version: "1.0.0",
    status: merged.length ? "qa5_recorded" : "qa5_empty",
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
      "BLOCKED_NO_FAULT_HOOK is recorded on suite/invariant results, not as a defect row.",
    ],
  });

  const evidence = readJson(EVIDENCE_REL);
  evidence.qa_phase = "QA-5";
  evidence.baseline_id = baseline.id;
  evidence.verdict = verdict;
  evidence.verdict_reason = verdictReason;
  evidence.evidence_integrity = "VALID";
  evidence.next = "QA6_PERFORMANCE";
  evidence.critical_invariant = {
    blocked: criticalMerged.blocked || 0,
    skipped: criticalMerged.skipped || 0,
    uncovered: criticalMerged.uncovered || 0,
  };
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
      "qa5-result.v1.json",
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
    production_like_aborts: true,
  };
  evidence.suites = (evidence.suites || []).map((s) => {
    if (
      s.suite_id === "QA0" ||
      s.suite_id === "QA1" ||
      s.suite_id === "QA2" ||
      s.suite_id === "QA3" ||
      s.suite_id === "QA4"
    ) {
      return { ...s, baseline_id: baseline.id };
    }
    if (s.suite_id === "QA5") {
      return {
        suite_id: "QA5",
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
    criticalMerged,
  });
  fs.writeFileSync(path.join(ROOT, REPORT_REL), report, "utf8");

  return {
    status: "QA5_COMPLETE",
    run_id: runId,
    checksum: resultChecksum,
    verdict,
    mode,
    all_checks_pass: result.all_checks_pass,
    defects_counts: defectsCounts,
    critical_invariant: ciQa5,
    critical_invariant_cumulative: criticalMerged,
    blocked_codes_observed: result.blocked_codes_observed,
    next: "QA6_PERFORMANCE",
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
    const out = runQa5({
      target_env: get("--target-env") || process.env.AIPO_QA_TARGET_ENV || "local",
      hostname: get("--hostname") || process.env.AIPO_QA_HOSTNAME || "localhost",
      synthetic_account_namespace:
        get("--synthetic-ns") ||
        process.env.AIPO_QA_SYNTHETIC_NS ||
        "qa-synth-local",
      mode,
    });
    console.log(`[engine-acceptance:run-qa5] ${out.status} mode=${out.mode}`);
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error(`[engine-acceptance:run-qa5] ABORT — ${e.message}`);
    process.exit(e.code === "AIPO_QA_KILL_SWITCH" ? 2 : 1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runQa5 };

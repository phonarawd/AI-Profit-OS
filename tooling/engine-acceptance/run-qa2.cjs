/**
 * QA2 Synthetic Personas runner
 *
 * kill-switch → coverage mapping → dirty bias → isolation surfaces
 * → seed/RNG/clock/request_sequence evidence → evidence-manifest / REPORT
 *
 * 로컬 기본 = tiny smoke · --mode full 은 CI
 * 제품 mutation 0 · ENGINE_ACCEPTED_FOR_UI 발급 금지 · KPI 숫자 금지
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { assertKillSwitch } = require("./kill-switch.cjs");
const { ROOT, readJson, dualDirty, hashPathList } = require("./lib/hash-scope.cjs");
const { buildResultProvenance } = require("./lib/qa1-qa2-artifact-contract.cjs");
const {
  assertAcceptanceWorkflowHashMatch,
  syncLockfileHashOnly,
} = require("./lib/workflow-amendment.cjs");
const { runCoverageMapping } = require("./checks/coverage-mapping.cjs");
const { runDirtyPathBias } = require("./checks/dirty-path-bias.cjs");
const { runUserIsolationSurfaces } = require("./checks/user-isolation-surfaces.cjs");
const { runSyntheticJourneyEvidence } = require("./checks/synthetic-journey-evidence.cjs");

const GOV = path.join(ROOT, "governance/engine-acceptance");
const RESULT_REL = "governance/engine-acceptance/qa2-result.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const REPORT_REL = "governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md";
const DEFECTS_REL = "governance/engine-acceptance/defects.v1.json";
const SCOPE_REL = "governance/engine-acceptance/protected-scope.v1.json";
const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";

function sha256Json(obj) {
  return crypto.createHash("sha256").update(`${JSON.stringify(obj)}\n`, "utf8").digest("hex");
}

function writeJson(rel, obj) {
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function syncWorkflowHash(baseline, scope) {
  // POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1 — silent baseline mutation forbidden
  return assertAcceptanceWorkflowHashMatch(baseline, scope);
}

function collectDefects(checks, baselineId, measuredAt) {
  /** @type {any[]} */
  const defects = [];
  const push = (partial) => {
    defects.push({
      severity: partial.severity,
      invariant_id: partial.invariant_id,
      suite_id: "QA2",
      persona_id: partial.persona_id || null,
      journey_id: partial.journey_id || null,
      seed: partial.seed ?? null,
      trace_id: partial.trace_id,
      baseline_id: baselineId,
      first_observed_at: measuredAt,
      repro_status: "static_repro",
      title: partial.title,
      findings: partial.findings || [],
    });
  };

  if (checks.coverage_mapping.status === "FAIL") {
    push({
      severity: "P1",
      invariant_id: "INV-LIFECYCLE-01",
      trace_id: "qa2:QA2_COVERAGE_MAPPING",
      title: "coverage mapping resolve fail",
      findings: checks.coverage_mapping.findings,
    });
  }
  if (checks.dirty_path_bias.status === "FAIL") {
    push({
      severity: "P2",
      invariant_id: "INV-ISOLATION-01",
      trace_id: "qa2:QA2_DIRTY_PATH_BIAS",
      title: "dirty path bias fail",
      findings: checks.dirty_path_bias.findings,
    });
  }
  for (const face of checks.user_isolation.faces || []) {
    if (face.status === "FAIL") {
      push({
        severity: "P1",
        invariant_id: "INV-ISOLATION-01",
        persona_id: "KR-11",
        journey_id: "J-DIRTY-ISOLATION-01",
        trace_id: `qa2:isolation:${face.attack_face}`,
        title: `user isolation face fail: ${face.attack_face}`,
        findings: face.findings,
      });
    }
  }
  if (checks.synthetic_evidence.status === "FAIL") {
    push({
      severity: "P1",
      invariant_id: "INV-LIFECYCLE-01",
      trace_id: "qa2:QA2_SYNTHETIC_JOURNEY_EVIDENCE",
      title: "synthetic journey evidence incomplete",
      findings: checks.synthetic_evidence.findings,
    });
  }
  return defects;
}

function countBySeverity(defects) {
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const d of defects) {
    if (counts[d.severity] !== undefined) counts[d.severity] += 1;
  }
  return counts;
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
  const cov = checks.coverage_mapping;
  const dirty = checks.dirty_path_bias;
  const iso = checks.user_isolation;
  const syn = checks.synthetic_evidence;
  const faceLine = (name) => {
    const f = (iso.faces || []).find((x) => x.attack_face === name);
    return f ? f.status : "UNKNOWN";
  };

  return `# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-2 \`qa2-synthetic-personas\`  
> **Measured:** ${measuredAt}  
> **baseline_id:** \`${baseline.id}\`  
> **qa2_run_id:** \`${runId}\`  
> **qa2_result_checksum:** \`${resultChecksum}\`  
> **mode:** \`${mode}\`

## Status banner

\`\`\`text
ACCEPTANCE CONTRACT = LOCKED
BASELINE = FROZEN
QA0 = COMPLETE
QA1 = COMPLETE
QA2 = COMPLETE
QA HARNESS TARGET = SAFE
NEXT = QA3_GENERATIVE_FUZZ
PRODUCT MUTATION = 0
03 UI = BLOCKED
\`\`\`

## Verdict (after QA-2)

| Field | Value |
|---|---|
| verdict | \`${verdict}\` |
| reason | ${verdictReason} |
| evidence_integrity | \`VALID\` |
| baseline.valid | \`${baseline.valid}\` |
| working_tree_clean | \`${dual.working_tree_clean}\` (fact only — not forced clean) |
| protected_scope_clean | \`${dual.protected_scope_clean}\` |
| defects.P0 / P1 | ${defectsCounts.P0} / ${defectsCounts.P1} |
| mandatory suites COMPLETE | QA0+QA1+QA2 only · QA3..QA8 NOT_STARTED |

**금지 확인:** \`ENGINE_ACCEPTED_FOR_UI\` **not issued** (QA3..QA8 incomplete).

## Personas × Journeys × Coverage

| Check | Status | Notes |
|---|---|---|
| coverage mapping (\`QA2_COVERAGE_MAPPING\`) | \`${cov.status}\` | resolved=${cov.mappingCount} · kpi_forbidden=${cov.kpi_forbidden} |
| dirty path bias (\`QA2_DIRTY_PATH_BIAS\`) | \`${dirty.status}\` | dirty=${dirty.dirty} > happy=${dirty.happy} |
| KPI case-count SLA | \`FORBIDDEN\` | 맵/시퀀스 개수 ≠ 합격 KPI |

## User isolation (INV-ISOLATION-01)

| Attack face | Status |
|---|---|
| interleave | \`${faceLine("interleave")}\` |
| token_cross | \`${faceLine("token_cross")}\` |
| object_id_swap (IDOR) | \`${faceLine("object_id_swap")}\` |

Isolation aggregate: \`${iso.status}\`.

## Synthetic evidence (seed ≠ alone)

| Field | Status |
|---|---|
| seed + rng_version + clock_as_of + request_sequence | \`${syn.status}\` |
| mode | \`${syn.mode}\` (tiny=local smoke) |
| live_http | \`false\` |
| selectedCount | ${syn.selectedCount} (observational · not KPI) |

## Dual Dirty

- working_tree_clean=\`${dual.working_tree_clean}\`
- protected_scope_clean=\`${dual.protected_scope_clean}\`
- forced clean / stash laundry = **forbidden**

## Next

\`QA3_GENERATIVE_FUZZ\` only. Full ACCEPTED · product mutation · 03 UI — **금지**.
`;
}

function runQa2(opts = {}) {
  assertKillSwitch(opts);

  const mode = opts.mode === "full" ? "full" : "tiny";
  const baseline = readJson(BASELINE_REL);
  const scope = readJson(SCOPE_REL);
  syncWorkflowHash(baseline, scope);
  const dual = dualDirty(scope);
  const measuredAt = new Date().toISOString();
  const runId = `qa2-synthetic-personas-${measuredAt.slice(0, 10).replace(/-/g, "")}`;
  const synthetic_ns =
    opts.synthetic_account_namespace ||
    process.env.AIPO_QA_SYNTHETIC_NS ||
    "qa-synth-local";

  const coverage_mapping = runCoverageMapping("QA2");
  const dirty_path_bias = runDirtyPathBias(coverage_mapping.resolved);
  const user_isolation = runUserIsolationSurfaces();
  const synthetic_evidence = runSyntheticJourneyEvidence(coverage_mapping.resolved, {
    baseline_id: baseline.id,
    mode,
    measuredAt,
    synthetic_ns,
  });

  const checks = {
    coverage_mapping,
    dirty_path_bias,
    user_isolation,
    synthetic_evidence,
  };
  const allPass = [
    coverage_mapping.status,
    dirty_path_bias.status,
    user_isolation.status,
    synthetic_evidence.status,
  ].every((s) => s === "PASS");

  const defects = collectDefects(checks, baseline.id, measuredAt);
  const defectsCounts = countBySeverity(defects);

  let verdict;
  let verdictReason;
  if (defectsCounts.P0 > 0 || defectsCounts.P1 > 0) {
    verdict = "ENGINE_NOT_ACCEPTED";
    verdictReason = `QA2 found P0=${defectsCounts.P0} P1=${defectsCounts.P1} · 03 blocked`;
  } else {
    verdict = "ENGINE_QA_INCOMPLETE";
    verdictReason =
      "QA2 COMPLETE · P0/P1=0 · mandatory suites QA3..QA8 not executed · ENGINE_ACCEPTED_FOR_UI forbidden";
  }

  const result = {
    schema: "governance.engine-acceptance.qa2-result.v1",
    version: "1.0.0",
    suite_id: "QA2",
    run_id: runId,
    todoId: "qa2-synthetic-personas",
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
    all_checks_pass: allPass,
    defects_found: defects.length,
    defects_counts: defectsCounts,
    verdict_contribution: verdict,
    next: "QA3_GENERATIVE_FUZZ",
    product_mutation: 0,
    kpi_forbidden: true,
    notes: [
      "Personas×journeys×coverage mapping runner.",
      "Dirty Path bias > Happy Path.",
      "Isolation faces: interleave · token_cross · object_id_swap.",
      "Evidence requires seed+rng_version+clock_as_of+request_sequence.",
      "Local default mode=tiny smoke. Case counts are not KPIs.",
      "Does not issue ENGINE_ACCEPTED_FOR_UI.",
    ],
  };

  result.provenance = buildResultProvenance("QA2", process.env, measuredAt);
  const resultChecksum = sha256Json(result);
  result.checksum = resultChecksum;
  writeJson(RESULT_REL, result);

  // merge defects: keep prior non-QA2, replace QA2
  let prior = { defects: [] };
  try {
    prior = readJson(DEFECTS_REL);
  } catch {
    /* empty */
  }
  const kept = (prior.defects || []).filter((d) => d.suite_id !== "QA2");
  const merged = [...kept, ...defects];
  const mergedCounts = countBySeverity(merged);
  writeJson(DEFECTS_REL, {
    schema: "governance.engine-acceptance.defects.v1",
    version: "1.0.0",
    status: merged.length ? "qa2_recorded" : "qa2_empty",
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
  });

  const evidence = readJson(EVIDENCE_REL);
  evidence.qa_phase = "QA-2";
  evidence.baseline_id = baseline.id;
  evidence.verdict = verdict;
  evidence.verdict_reason = verdictReason;
  evidence.evidence_integrity = "VALID";
  evidence.next = "QA3_GENERATIVE_FUZZ";
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
    production_like_aborts: true,
  };
  evidence.suites = (evidence.suites || []).map((s) => {
    if (s.suite_id === "QA0" || s.suite_id === "QA1") {
      return { ...s, baseline_id: baseline.id };
    }
    if (s.suite_id === "QA2") {
      return {
        suite_id: "QA2",
        run_id: runId,
        baseline_id: baseline.id,
        checksum: resultChecksum,
        completion_status: "COMPLETE",
        result_ref: RESULT_REL,
        mode,
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
    status: "QA2_COMPLETE",
    run_id: runId,
    checksum: resultChecksum,
    verdict,
    mode,
    all_checks_pass: allPass,
    defects_counts: defectsCounts,
    next: "QA3_GENERATIVE_FUZZ",
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
    const out = runQa2({
      target_env: get("--target-env") || process.env.AIPO_QA_TARGET_ENV || "local",
      hostname: get("--hostname") || process.env.AIPO_QA_HOSTNAME || "localhost",
      synthetic_account_namespace:
        get("--synthetic-ns") ||
        process.env.AIPO_QA_SYNTHETIC_NS ||
        "qa-synth-local",
      mode,
    });
    console.log(`[engine-acceptance:run-qa2] ${out.status} mode=${out.mode}`);
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error(`[engine-acceptance:run-qa2] ABORT — ${e.message}`);
    process.exit(e.code === "AIPO_QA_KILL_SWITCH" ? 2 : 1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runQa2 };

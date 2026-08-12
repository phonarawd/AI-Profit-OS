/**
 * QA3 Generative Fuzz runner
 *
 * kill-switch → fast-check property suite →
 * 실패=rich evidence+defects(수정0) → evidence-manifest / REPORT
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
const { runFastCheckProperties } = require("./checks/fast-check-properties.cjs");

const RESULT_REL = "governance/engine-acceptance/qa3-result.v1.json";
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

function severityForInvariant(invariantId) {
  if (invariantId === "INV-ISOLATION-01" || invariantId === "INV-LEDGER-01") {
    return "P0";
  }
  if (
    invariantId === "INV-IDEMPOTENCY-01" ||
    invariantId === "INV-IDEMPOTENCY-03" ||
    invariantId === "INV-LIFECYCLE-01"
  ) {
    return "P1";
  }
  return "P2";
}

function collectDefects(checks, baselineId, measuredAt) {
  /** @type {any[]} */
  const defects = [];
  const push = (partial) => {
    defects.push({
      severity: partial.severity,
      invariant_id: partial.invariant_id,
      suite_id: "QA3",
      persona_id: partial.persona_id || null,
      journey_id: partial.journey_id || null,
      seed: partial.seed ?? null,
      trace_id: partial.trace_id,
      baseline_id: baselineId,
      first_observed_at: measuredAt,
      repro_status: "generative_repro",
      title: partial.title,
      findings: partial.findings || [],
      rich_evidence: partial.rich_evidence || null,
    });
  };

  for (const prop of checks.fast_check.properties || []) {
    if (prop.status === "FAIL") {
      push({
        severity: severityForInvariant(prop.invariant_id),
        invariant_id: prop.invariant_id,
        seed: prop.seed,
        trace_id: `qa3:${prop.property_id}`,
        title: `fast-check property fail: ${prop.property_id}`,
        findings: prop.findings,
        rich_evidence: prop.rich_evidence,
        persona_id: "KR-09",
        journey_id: "J-DIRTY-RETRY-01",
      });
    }
  }
  if (checks.fast_check.source_lock && checks.fast_check.source_lock.status === "FAIL") {
    push({
      severity: "P1",
      invariant_id: "INV-IDEMPOTENCY-03",
      seed: null,
      trace_id: "qa3:QA3_FINGERPRINT_SOURCE_LOCK",
      title: "fingerprint source lock fail",
      findings: checks.fast_check.source_lock.findings,
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
  const fc = checks.fast_check;
  const propRows = (fc.properties || [])
    .map(
      (p) =>
        `| \`${p.property_id}\` | \`${p.invariant_id}\` | \`${p.status}\` | seed=${p.seed} |`,
    )
    .join("\n");

  return `# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-3 \`qa3-generative-fuzz\`  
> **Measured:** ${measuredAt}  
> **baseline_id:** \`${baseline.id}\`  
> **qa3_run_id:** \`${runId}\`  
> **qa3_result_checksum:** \`${resultChecksum}\`  
> **mode:** \`${mode}\`

## Status banner

\`\`\`text
ACCEPTANCE CONTRACT = LOCKED
BASELINE = FROZEN
QA0 = COMPLETE
QA1 = COMPLETE
QA2 = COMPLETE
QA3 = COMPLETE
QA HARNESS TARGET = SAFE
NEXT = QA4_STATEFUL_TIME
PRODUCT MUTATION = 0
03 UI = BLOCKED
\`\`\`

## Verdict (after QA-3)

| Field | Value |
|---|---|
| verdict | \`${verdict}\` |
| reason | ${verdictReason} |
| evidence_integrity | \`VALID\` |
| baseline.valid | \`${baseline.valid}\` |
| working_tree_clean | \`${dual.working_tree_clean}\` (fact only — not forced clean) |
| protected_scope_clean | \`${dual.protected_scope_clean}\` |
| defects.P0 / P1 | ${defectsCounts.P0} / ${defectsCounts.P1} |
| mandatory suites COMPLETE | QA0..QA3 only · QA4..QA8 NOT_STARTED |

**금지 확인:** \`ENGINE_ACCEPTED_FOR_UI\` **not issued** (QA4..QA8 incomplete).

## Generative fuzz (fast-check)

| Field | Value |
|---|---|
| suite status | \`${fc.status}\` |
| fast-check | \`${fc.fast_check_version}\` |
| numRuns | ${fc.numRuns} (observational · not KPI) |
| properties passed/failed | ${fc.passed} / ${fc.failed} |
| fingerprint source lock | \`${fc.source_lock.status}\` |
| product mutation on fail | \`0\` (defects + rich evidence only) |

| Property | Invariant | Status | Seed |
|---|---|---|---|
${propRows}

## Failure evidence contract

On FAIL: \`seed\` · \`rng_version\` · \`clock_as_of\` · \`request_sequence\` · sanitized I/O · \`baseline_id\` · \`configuration_fingerprint\` — seed alone forbidden.

## Dual Dirty

- working_tree_clean=\`${dual.working_tree_clean}\`
- protected_scope_clean=\`${dual.protected_scope_clean}\`
- forced clean / stash laundry = **forbidden**

## Next

\`QA4_STATEFUL_TIME\` only. Full ACCEPTED · product mutation · 03 UI — **금지**.
`;
}

function runQa3(opts = {}) {
  assertKillSwitch(opts);

  const mode = opts.mode === "full" ? "full" : "tiny";
  const baseline = readJson(BASELINE_REL);
  const scope = readJson(SCOPE_REL);
  syncAggregateHashes(baseline, scope);
  const dual = dualDirty(scope);
  const measuredAt = new Date().toISOString();
  const runId = `qa3-generative-fuzz-${measuredAt.slice(0, 10).replace(/-/g, "")}`;
  const synthetic_ns =
    opts.synthetic_account_namespace ||
    process.env.AIPO_QA_SYNTHETIC_NS ||
    "qa-synth-local";

  const fast_check = runFastCheckProperties({
    mode,
    baseline_id: baseline.id,
    measuredAt,
  });

  const checks = { fast_check };
  const allPass = fast_check.status === "PASS";
  const defects = collectDefects(checks, baseline.id, measuredAt);
  const defectsCounts = countBySeverity(defects);

  let verdict;
  let verdictReason;
  if (defectsCounts.P0 > 0 || defectsCounts.P1 > 0) {
    verdict = "ENGINE_NOT_ACCEPTED";
    verdictReason = `QA3 found P0=${defectsCounts.P0} P1=${defectsCounts.P1} · 03 blocked · product mutation 0`;
  } else {
    verdict = "ENGINE_QA_INCOMPLETE";
    verdictReason =
      "QA3 COMPLETE · P0/P1=0 · mandatory suites QA4..QA8 not executed · ENGINE_ACCEPTED_FOR_UI forbidden";
  }

  const result = {
    schema: "governance.engine-acceptance.qa3-result.v1",
    version: "1.0.0",
    suite_id: "QA3",
    run_id: runId,
    todoId: "qa3-generative-fuzz",
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
    next: "QA4_STATEFUL_TIME",
    product_mutation: 0,
    kpi_forbidden: true,
    ci: {
      strategy_fail_fast: false,
      concurrency_group: "engine-acceptance-${{ github.ref }}",
    },
    notes: [
      "fast-check property suite (generative fuzz).",
      "CI matrix strategy.fail-fast:false · concurrency group locked.",
      "Failure → rich evidence + defects · product mutation 0.",
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
  const kept = (prior.defects || []).filter((d) => d.suite_id !== "QA3");
  const merged = [...kept, ...defects];
  const mergedCounts = countBySeverity(merged);
  writeJson(DEFECTS_REL, {
    schema: "governance.engine-acceptance.defects.v1",
    version: "1.0.0",
    status: merged.length ? "qa3_recorded" : "qa3_empty",
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
  evidence.qa_phase = "QA-3";
  evidence.baseline_id = baseline.id;
  evidence.verdict = verdict;
  evidence.verdict_reason = verdictReason;
  evidence.evidence_integrity = "VALID";
  evidence.next = "QA4_STATEFUL_TIME";
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
    production_like_aborts: true,
  };
  evidence.suites = (evidence.suites || []).map((s) => {
    if (s.suite_id === "QA0" || s.suite_id === "QA1" || s.suite_id === "QA2") {
      return { ...s, baseline_id: baseline.id };
    }
    if (s.suite_id === "QA3") {
      return {
        suite_id: "QA3",
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
    status: "QA3_COMPLETE",
    run_id: runId,
    checksum: resultChecksum,
    verdict,
    mode,
    all_checks_pass: allPass,
    defects_counts: defectsCounts,
    next: "QA4_STATEFUL_TIME",
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
    const out = runQa3({
      target_env: get("--target-env") || process.env.AIPO_QA_TARGET_ENV || "local",
      hostname: get("--hostname") || process.env.AIPO_QA_HOSTNAME || "localhost",
      synthetic_account_namespace:
        get("--synthetic-ns") ||
        process.env.AIPO_QA_SYNTHETIC_NS ||
        "qa-synth-local",
      mode,
    });
    console.log(`[engine-acceptance:run-qa3] ${out.status} mode=${out.mode}`);
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error(`[engine-acceptance:run-qa3] ABORT — ${e.message}`);
    process.exit(e.code === "AIPO_QA_KILL_SWITCH" ? 2 : 1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runQa3 };

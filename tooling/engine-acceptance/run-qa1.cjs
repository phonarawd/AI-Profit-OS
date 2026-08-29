/**
 * QA1 Deterministic Truth runner
 *
 * 순서: kill-switch(allowlist) → schemas+routes → DB consistency → idempotency split
 * → evidence-manifest / REPORT / qa1-result 기록
 *
 * 제품 mutation 0 · ENGINE_ACCEPTED_FOR_UI 발급 금지
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { assertKillSwitch } = require("./kill-switch.cjs");
const { ROOT, readJson, dualDirty } = require("./lib/hash-scope.cjs");
const { buildResultProvenance } = require("./lib/qa1-qa2-artifact-contract.cjs");
const { runSchemasRoutesContract } = require("./checks/schemas-routes-contract.cjs");
const { runDbConsistency } = require("./checks/db-consistency.cjs");
const { runIdempotencySplit } = require("./checks/idempotency-split.cjs");

const GOV = path.join(ROOT, "governance/engine-acceptance");
const RESULT_REL = "governance/engine-acceptance/qa1-result.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const REPORT_REL = "governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md";
const DEFECTS_REL = "governance/engine-acceptance/defects.v1.json";
const SCOPE_REL = "governance/engine-acceptance/protected-scope.v1.json";

function sha256Json(obj) {
  const text = `${JSON.stringify(obj)}\n`;
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function writeJson(rel, obj) {
  const abs = path.join(ROOT, rel);
  fs.writeFileSync(abs, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function collectDefects(checks, baselineId, measuredAt) {
  /** @type {any[]} */
  const defects = [];
  const push = (partial) => {
    defects.push({
      severity: partial.severity,
      invariant_id: partial.invariant_id,
      suite_id: "QA1",
      persona_id: null,
      journey_id: null,
      seed: null,
      trace_id: partial.trace_id,
      baseline_id: baselineId,
      first_observed_at: measuredAt,
      repro_status: "static_repro",
      title: partial.title,
      findings: partial.findings || [],
    });
  };

  for (const item of checks.schemas_routes.items || []) {
    if (item.status === "FAIL") {
      push({
        severity: "P1",
        invariant_id: item.invariant_id || "INV-LIFECYCLE-01",
        trace_id: `qa1:${item.id}`,
        title: `schemas+routes contract fail: ${item.id}`,
        findings: item.findings,
      });
    }
  }
  if (checks.db_consistency.status === "FAIL") {
    push({
      severity: "P1",
      invariant_id: "INV-LEDGER-01",
      trace_id: "qa1:QA1_DB_CONSISTENCY",
      title: "DB consistency static fail",
      findings: checks.db_consistency.findings,
    });
  }
  for (const axis of checks.idempotency_split.axes || []) {
    if (axis.status === "FAIL") {
      push({
        severity: "P1",
        invariant_id: axis.invariant_id,
        trace_id: `qa1:${axis.invariant_id}`,
        title: `idempotency axis fail: ${axis.title}`,
        findings: axis.findings,
      });
    }
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
}) {
  const sr = checks.schemas_routes;
  const db = checks.db_consistency;
  const idemp = checks.idempotency_split;

  return `# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-1 \`qa1-deterministic-truth\`  
> **Measured:** ${measuredAt}  
> **baseline_id:** \`${baseline.id}\`  
> **qa1_run_id:** \`${runId}\`  
> **qa1_result_checksum:** \`${resultChecksum}\`

## Status banner

\`\`\`text
ACCEPTANCE CONTRACT = LOCKED
BASELINE = FROZEN
QA0 = COMPLETE
QA1 = COMPLETE
QA HARNESS TARGET = SAFE
NEXT = QA2_SYNTHETIC_PERSONAS
PRODUCT MUTATION = 0
03 UI = BLOCKED
\`\`\`

## Verdict (after QA-1)

| Field | Value |
|---|---|
| verdict | \`${verdict}\` |
| reason | ${verdictReason} |
| evidence_integrity | \`VALID\` |
| baseline.valid | \`${baseline.valid}\` |
| working_tree_clean | \`${dual.working_tree_clean}\` (fact only — not forced clean) |
| protected_scope_clean | \`${dual.protected_scope_clean}\` |
| defects.P0 / P1 | ${defectsCounts.P0} / ${defectsCounts.P1} |
| mandatory suites COMPLETE | QA0+QA1 only · QA2..QA8 NOT_STARTED |

**금지 확인:** \`ENGINE_ACCEPTED_FOR_UI\` **not issued** (QA2..QA8 incomplete).

## Contract

| Check | Status | Notes |
|---|---|---|
| schemas+routes (\`QA1_SCHEMAS_ROUTES_CONTRACT\`) | \`${sr.status}\` | pass=${sr.passCount} fail=${sr.failCount} · manifest + engine route needles |
| DB consistency (\`QA1_DB_CONSISTENCY\`) | \`${db.status}\` | migrations=${db.migrationCount} · live_probe=${db.live_db_probe.status} · bucket-invariant child |
| kill-switch allowlist | \`PASS\` | evaluated before any QA1 check |

Contract surface = \`schemas/*.v1.json\` + Nest \`*.routes.ts\` · OpenAPI/Schemathesis **0**.

## Functional

| Check | Status | Invariants |
|---|---|---|
| idempotency same-key/same (\`INV-IDEMPOTENCY-01\`) | \`${(idemp.axes || [])[0]?.status || "UNKNOWN"}\` | reuse · 중복 side-effect 0 |
| idempotency same-key/conflict (\`INV-IDEMPOTENCY-03\`) | \`${(idemp.axes || [])[1]?.status || "UNKNOWN"}\` | 명시적 거부 · \`verify:idempotency-conflict-detection\` |
| idempotency axes separated | \`${idemp.status}\` | 01≠03 · 세탁/혼동 금지 |
| ledger/bucket (\`INV-LEDGER-01\`) | \`${db.status}\` | static mig + \`verify:bucket-invariant\` |
| lifecycle wiring (\`INV-LIFECYCLE-01\`) | \`${sr.status}\` | home-read · participate · execute-tick route contracts |

Functional = 상태 진실(불변조건) · HTTP 200 단독 합격 금지.

## Dual Dirty

- working_tree_clean=\`${dual.working_tree_clean}\`
- protected_scope_clean=\`${dual.protected_scope_clean}\`
- forced clean / stash laundry = **forbidden**

## Next

\`QA2_SYNTHETIC_PERSONAS\` only. Full ACCEPTED · product mutation · 03 UI — **금지**.
`;
}

function runQa1(opts = {}) {
  // L6: kill-switch before any check
  assertKillSwitch(opts);

  const baseline = readJson("governance/engine-acceptance/baseline.v1.json");
  const scope = readJson(SCOPE_REL);
  const dual = dualDirty(scope);
  const measuredAt = new Date().toISOString();
  const runId = `qa1-deterministic-truth-${measuredAt.slice(0, 10).replace(/-/g, "")}`;

  const schemas_routes = runSchemasRoutesContract();
  const db_consistency = runDbConsistency();
  const idempotency_split = runIdempotencySplit();

  const checks = { schemas_routes, db_consistency, idempotency_split };
  const checkStatuses = [
    schemas_routes.status,
    db_consistency.status,
    idempotency_split.status,
  ];
  const allPass = checkStatuses.every((s) => s === "PASS");

  const defects = collectDefects(checks, baseline.id, measuredAt);
  const defectsCounts = countBySeverity(defects);

  let verdict;
  let verdictReason;
  if (defectsCounts.P0 > 0 || defectsCounts.P1 > 0) {
    verdict = "ENGINE_NOT_ACCEPTED";
    verdictReason = `QA1 found P0=${defectsCounts.P0} P1=${defectsCounts.P1} · 03 blocked`;
  } else {
    verdict = "ENGINE_QA_INCOMPLETE";
    verdictReason =
      "QA1 COMPLETE · P0/P1=0 · mandatory suites QA2..QA8 not executed · ENGINE_ACCEPTED_FOR_UI forbidden";
  }

  const result = {
    schema: "governance.engine-acceptance.qa1-result.v1",
    version: "1.0.0",
    suite_id: "QA1",
    run_id: runId,
    todoId: "qa1-deterministic-truth",
    measuredAt,
    baseline_id: baseline.id,
    kill_switch: {
      verified_before_checks: true,
      target_env: opts.target_env || process.env.AIPO_QA_TARGET_ENV || "local",
      hostname: opts.hostname || process.env.AIPO_QA_HOSTNAME || "localhost",
      synthetic_account_namespace:
        opts.synthetic_account_namespace ||
        process.env.AIPO_QA_SYNTHETIC_NS ||
        "qa-synth-local",
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
    next: "QA2_SYNTHETIC_PERSONAS",
    product_mutation: 0,
    notes: [
      "Deterministic static + child verify oracles only.",
      "Does not issue ENGINE_ACCEPTED_FOR_UI.",
      "Idempotency INV-01 and INV-03 kept separate.",
    ],
    provenance: buildResultProvenance("QA1", process.env, measuredAt),
  };

  const resultChecksum = sha256Json(result);
  result.checksum = resultChecksum;
  writeJson(RESULT_REL, result);

  // defects registry
  const defectsDoc = {
    schema: "governance.engine-acceptance.defects.v1",
    version: "1.0.0",
    status: defects.length ? "qa1_recorded" : "qa1_empty",
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
    counts: defectsCounts,
    defects,
  };
  writeJson(DEFECTS_REL, defectsDoc);

  // evidence-manifest
  const evidence = readJson(EVIDENCE_REL);
  evidence.qa_phase = "QA-1";
  evidence.baseline_id = baseline.id;
  evidence.verdict = verdict;
  evidence.verdict_reason = verdictReason;
  evidence.evidence_integrity = "VALID";
  evidence.next = "QA2_SYNTHETIC_PERSONAS";
  evidence.dual_dirty = {
    working_tree_clean: dual.working_tree_clean,
    protected_scope_clean: dual.protected_scope_clean,
    forced_clean_forbidden: true,
  };
  evidence.kill_switch = {
    verified_before_smoke: true,
    verified_before_qa1: true,
    production_like_aborts: true,
  };
  evidence.suites = (evidence.suites || []).map((s) => {
    if (s.suite_id === "QA0") {
      return { ...s, baseline_id: baseline.id, completion_status: "COMPLETE" };
    }
    if (s.suite_id === "QA1") {
      return {
        suite_id: "QA1",
        run_id: runId,
        baseline_id: baseline.id,
        checksum: resultChecksum,
        completion_status: "COMPLETE",
        result_ref: RESULT_REL,
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
  });
  fs.writeFileSync(path.join(ROOT, REPORT_REL), report, "utf8");

  return {
    status: "QA1_COMPLETE",
    run_id: runId,
    checksum: resultChecksum,
    verdict,
    all_checks_pass: allPass,
    defects_counts: defectsCounts,
    next: "QA2_SYNTHETIC_PERSONAS",
  };
}

function main() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };

  try {
    const out = runQa1({
      target_env: get("--target-env") || process.env.AIPO_QA_TARGET_ENV || "local",
      hostname: get("--hostname") || process.env.AIPO_QA_HOSTNAME || "localhost",
      synthetic_account_namespace:
        get("--synthetic-ns") ||
        process.env.AIPO_QA_SYNTHETIC_NS ||
        "qa-synth-local",
    });
    console.log(`[engine-acceptance:run-qa1] ${out.status}`);
    console.log(JSON.stringify(out, null, 2));
    // suite COMPLETE even if checks FAIL (truth recorded) — exit 0 when evidence written
    // exit 1 only on harness abort
  } catch (e) {
    console.error(`[engine-acceptance:run-qa1] ABORT — ${e.message}`);
    process.exit(e.code === "AIPO_QA_KILL_SWITCH" ? 2 : 1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runQa1 };

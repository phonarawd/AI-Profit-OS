/**
 * verify:engine-acceptance — QA-0..QA-5 scope (full ACCEPTED 판정 금지)
 *
 * 검증:
 * 1) Acceptance Contract L1~L6 산출물 실재
 * 2) severity-policy 선고정 문서
 * 3) protected-scope hash 규칙 deterministic
 * 4) baseline Dual Dirty + required fields · valid↔protected_scope_clean
 * 5) kill-switch가 tiny smoke / QA1..QA5보다 먼저 작동
 * 6) evidence-manifest · REPORT · verdict ≠ ENGINE_ACCEPTED_FOR_UI
 * 7) QA-1..QA-4 COMPLETE 유지
 * 8) QA-3: fast-check properties · CI fail-fast:false · concurrency
 * 9) QA-4: multi-day + KST · BLOCKED_NO_CLOCK_HOOK 정식 · critical → ACCEPTED 불가
 * 10) QA-5: Failure World 축1/축2 · BLOCKED_NO_FAULT_HOOK · always() aggregator ·
 *     artifact retention ≥90 · next=QA6 · product mutation 0
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  evaluateKillSwitch,
} = require("../engine-acceptance/kill-switch.cjs");
const { runTinySmoke } = require("../engine-acceptance/tiny-smoke.cjs");
const {
  ROOT,
  readJson,
  buildManifest,
  dualDirty,
  hashPathList,
} = require("../engine-acceptance/lib/hash-scope.cjs");

const fails = [];
function fail(msg) {
  fails.push(msg);
}

const GOV = "governance/engine-acceptance";
const REQUIRED_FILES = [
  `${GOV}/acceptance-contract.v1.md`,
  `${GOV}/severity-policy.v1.md`,
  `${GOV}/invariants.v1.md`,
  `${GOV}/protected-scope.v1.json`,
  `${GOV}/baseline.v1.json`,
  `${GOV}/personas.v1.json`,
  `${GOV}/journeys.v1.json`,
  `${GOV}/coverage.v1.json`,
  `${GOV}/defects.v1.json`,
  `${GOV}/evidence-manifest.v1.json`,
  `${GOV}/ENGINE_ACCEPTANCE_REPORT.md`,
  `${GOV}/qa1-result.v1.json`,
  `${GOV}/qa2-result.v1.json`,
  `${GOV}/qa3-result.v1.json`,
  `${GOV}/qa4-result.v1.json`,
  `${GOV}/qa5-result.v1.json`,
  "tooling/engine-acceptance/kill-switch.cjs",
  "tooling/engine-acceptance/tiny-smoke.cjs",
  "tooling/engine-acceptance/freeze-baseline.cjs",
  "tooling/engine-acceptance/run-qa1.cjs",
  "tooling/engine-acceptance/run-qa2.cjs",
  "tooling/engine-acceptance/run-qa3.cjs",
  "tooling/engine-acceptance/run-qa4.cjs",
  "tooling/engine-acceptance/run-qa5.cjs",
  "tooling/engine-acceptance/checks/schemas-routes-contract.cjs",
  "tooling/engine-acceptance/checks/db-consistency.cjs",
  "tooling/engine-acceptance/checks/idempotency-split.cjs",
  "tooling/engine-acceptance/checks/coverage-mapping.cjs",
  "tooling/engine-acceptance/checks/dirty-path-bias.cjs",
  "tooling/engine-acceptance/checks/user-isolation-surfaces.cjs",
  "tooling/engine-acceptance/checks/synthetic-journey-evidence.cjs",
  "tooling/engine-acceptance/checks/fast-check-properties.cjs",
  "tooling/engine-acceptance/checks/stateful-time-lifecycle.cjs",
  "tooling/engine-acceptance/checks/failure-world.cjs",
  "tooling/engine-acceptance/lib/seeded-rng.cjs",
  "tooling/engine-acceptance/lib/fingerprint-oracle.cjs",
  "tooling/engine-acceptance/lib/rich-failure-evidence.cjs",
  "tooling/engine-acceptance/lib/clock-hook.cjs",
  "tooling/engine-acceptance/lib/fault-hook.cjs",
  ".github/workflows/engine-acceptance.yml",
];

for (const rel of REQUIRED_FILES) {
  if (!fs.existsSync(path.join(ROOT, rel))) fail(`missing ${rel}`);
}

// --- severity / contract text locks ---
const sev = fs.readFileSync(path.join(ROOT, `${GOV}/severity-policy.v1.md`), "utf8");
for (const token of ["**P0**", "**P1**", "**P2**", "**P3**", "재조정 금지"]) {
  if (!sev.includes(token)) fail(`severity-policy missing lock token: ${token}`);
}

const contract = fs.readFileSync(
  path.join(ROOT, `${GOV}/acceptance-contract.v1.md`),
  "utf8",
);
for (const token of [
  "ENGINE_ACCEPTED_FOR_UI",
  "ENGINE_NOT_ACCEPTED",
  "ENGINE_QA_INCOMPLETE",
  "working_tree_clean",
  "protected_scope_clean",
  "BLOCKED_NO_CLOCK_HOOK",
  "BLOCKED_NO_FAULT_HOOK",
  "fail-fast: false",
  "kill-switch",
]) {
  if (!contract.includes(token)) fail(`acceptance-contract missing: ${token}`);
}

// --- fast-check dependency present ---
try {
  require.resolve("fast-check");
} catch {
  fail("fast-check must be installed (QA3 generative fuzz)");
}

// --- protected scope ---
let scope;
try {
  scope = readJson(`${GOV}/protected-scope.v1.json`);
} catch {
  fail("protected-scope.v1.json invalid JSON");
}

if (scope) {
  if (scope.schema !== "governance.engine-acceptance.protected-scope.v1") {
    fail("protected-scope.schema mismatch");
  }
  if (scope.hashAlgorithm !== "sha256") fail("hashAlgorithm must be sha256");
  if (scope.pathSeparator !== "/") fail("pathSeparator must be /");
  if (!Array.isArray(scope.roots) || scope.roots.length < 1) fail("roots required");
  if (!scope.normalization || scope.normalization.lineEndings !== "lf") {
    fail("normalization.lineEndings must be lf");
  }
}

// --- baseline (frozen at QA-0 — do not advance qa_phase) ---
let baseline;
try {
  baseline = readJson(`${GOV}/baseline.v1.json`);
} catch {
  fail("baseline.v1.json invalid JSON");
}

if (baseline && scope) {
  const required = [
    "id",
    "commit_sha",
    "tree_sha",
    "working_tree_clean",
    "protected_scope_clean",
    "lockfile_hash",
    "schema_migration_hash",
    "prompt_hash",
    "eval_dataset_hash",
    "acceptance_workflow_hash",
    "node_version",
    "package_manager_version",
    "protected_scope_manifest",
    "valid",
    "qa_phase",
    "next",
  ];
  for (const k of required) {
    if (baseline[k] === undefined || baseline[k] === null) fail(`baseline missing ${k}`);
  }
  if (!/^[0-9a-f]{40}$/i.test(baseline.commit_sha || "")) {
    fail("baseline.commit_sha must be 40-char hex");
  }
  if (!/^[0-9a-f]{40}$/i.test(baseline.tree_sha || "")) {
    fail("baseline.tree_sha must be 40-char hex");
  }
  if (baseline.qa_phase !== "QA-0") {
    fail("baseline.qa_phase must remain QA-0 (freeze point)");
  }
  if (typeof baseline.working_tree_clean !== "boolean") {
    fail("working_tree_clean must be boolean");
  }
  if (typeof baseline.protected_scope_clean !== "boolean") {
    fail("protected_scope_clean must be boolean");
  }
  if (baseline.valid !== true && baseline.valid !== false) {
    fail("baseline.valid must be boolean");
  }
  if (baseline.valid !== baseline.protected_scope_clean) {
    fail("baseline.valid must equal protected_scope_clean (no laundry via working_tree)");
  }
  if (
    baseline.working_tree_clean === false &&
    baseline.protected_scope_clean === true &&
    baseline.valid !== true
  ) {
    fail("unrelated dirty must not invalidate protected-clean baseline");
  }

  const liveDirty = dualDirty(scope);
  if (baseline.protected_scope_clean !== liveDirty.protected_scope_clean) {
    fail(
      `baseline.protected_scope_clean stale (baseline=${baseline.protected_scope_clean} live=${liveDirty.protected_scope_clean})`,
    );
  }
  const liveManifest = buildManifest(scope);
  if (
    !baseline.protected_scope_manifest ||
    baseline.protected_scope_manifest.aggregate !== liveManifest.aggregate
  ) {
    fail("protected_scope_manifest.aggregate drift vs live hash");
  }
  if (baseline.protected_scope_manifest.pathCount !== liveManifest.pathCount) {
    fail("protected_scope_manifest.pathCount drift");
  }

  for (const [key, paths] of Object.entries(scope.aggregateHashes || {})) {
    const live = hashPathList(paths, scope);
    if (baseline[key] !== live) {
      fail(`baseline.${key} drift`);
    }
  }

  if (!String(baseline.package_manager_version || "").startsWith("pnpm@10.14")) {
    fail(`package_manager_version must be pnpm@10.14.x (got ${baseline.package_manager_version})`);
  }
  if (!String(baseline.node_version || "").startsWith("v22.")) {
    fail(`node_version must be v22.x (got ${baseline.node_version})`);
  }

  if (baseline.valid !== true) {
    fail("requires baseline.valid=true (protected scope must be clean)");
  }
}

// --- personas / journeys / coverage governance ---
let personas;
let journeys;
let coverage;
try {
  personas = readJson(`${GOV}/personas.v1.json`);
  journeys = readJson(`${GOV}/journeys.v1.json`);
  coverage = readJson(`${GOV}/coverage.v1.json`);
} catch {
  fail("personas/journeys/coverage JSON invalid");
}
if (personas && !(personas.personas || []).some((p) => p.id === "KR-11")) {
  fail("personas must include KR-11 (concurrency/isolation)");
}
if (journeys) {
  const kinds = (journeys.journeys || []).map((j) => j.kind);
  if (!kinds.includes("dirty") || !kinds.includes("happy")) {
    fail("journeys must include dirty and happy kinds");
  }
}
if (coverage) {
  if (coverage.kpi_forbidden !== true) {
    fail("coverage.kpi_forbidden must be true");
  }
  for (const k of ["kpi_case_count", "case_count_sla", "target_cases", "kpi_target"]) {
    if (coverage[k] !== undefined) fail(`coverage KPI field forbidden: ${k}`);
  }
  const qa2Maps = (coverage.mappings || []).filter((m) =>
    (m.suite_ids || []).includes("QA2"),
  );
  const faces = new Set(
    qa2Maps
      .filter((m) => m.invariant_id === "INV-ISOLATION-01")
      .map((m) => m.attack_face)
      .filter(Boolean),
  );
  for (const f of ["interleave", "token_cross", "object_id_swap"]) {
    if (!faces.has(f)) fail(`coverage QA2 isolation missing attack_face: ${f}`);
  }
  const qa3Maps = (coverage.mappings || []).filter((m) =>
    (m.suite_ids || []).includes("QA3"),
  );
  if (qa3Maps.length < 1) fail("coverage must include at least one QA3 mapping");
  const qa3Invs = new Set(qa3Maps.map((m) => m.invariant_id));
  for (const inv of [
    "INV-IDEMPOTENCY-01",
    "INV-IDEMPOTENCY-03",
    "INV-LIFECYCLE-01",
    "INV-ISOLATION-01",
  ]) {
    if (!qa3Invs.has(inv)) fail(`coverage QA3 missing invariant mapping: ${inv}`);
  }
  const qa4Maps = (coverage.mappings || []).filter((m) =>
    (m.suite_ids || []).includes("QA4"),
  );
  if (qa4Maps.length < 1) fail("coverage must include at least one QA4 mapping");
  const qa4Invs = new Set(qa4Maps.map((m) => m.invariant_id));
  if (!qa4Invs.has("INV-TIME-01")) {
    fail("coverage QA4 missing INV-TIME-01 mapping");
  }
  const timeMap = qa4Maps.find((m) => m.invariant_id === "INV-TIME-01");
  if (!timeMap || timeMap.critical !== true) {
    fail("coverage INV-TIME-01 must be critical for QA4");
  }
  if (timeMap.blocked_code_if_no_hook !== "BLOCKED_NO_CLOCK_HOOK") {
    fail("coverage INV-TIME-01 must declare blocked_code_if_no_hook=BLOCKED_NO_CLOCK_HOOK");
  }
}
if (journeys && !(journeys.journeys || []).some((j) => j.id === "J-TIME-MULTIDAY-01")) {
  fail("journeys must include J-TIME-MULTIDAY-01 for QA4");
}
if (journeys && !(journeys.journeys || []).some((j) => j.id === "J-FAULT-DEGRADE-01")) {
  fail("journeys must include J-FAULT-DEGRADE-01 for QA5 axis1");
}
if (journeys && !(journeys.journeys || []).some((j) => j.id === "J-FAULT-RECOVERY-01")) {
  fail("journeys must include J-FAULT-RECOVERY-01 for QA5 axis2");
}

// --- defects schema ---
let defects;
try {
  defects = readJson(`${GOV}/defects.v1.json`);
} catch {
  fail("defects.v1.json invalid JSON");
}
if (defects) {
  for (const f of [
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
  ]) {
    if (!(defects.requiredLinkFields || []).includes(f)) {
      fail(`defects.requiredLinkFields missing ${f}`);
    }
  }
}

// --- evidence + report ---
let evidence;
try {
  evidence = readJson(`${GOV}/evidence-manifest.v1.json`);
} catch {
  fail("evidence-manifest.v1.json invalid JSON");
}
if (evidence) {
  if (evidence.schema !== "governance.engine-acceptance.evidence-manifest.v1") {
    fail("evidence-manifest.schema mismatch");
  }
  if (evidence.qa_phase !== "QA-5") {
    fail("evidence-manifest.qa_phase must be QA-5 after qa5-failure-world");
  }
  if (!evidence.baseline_id) fail("evidence-manifest.baseline_id required");
  if (baseline && evidence.baseline_id !== baseline.id) {
    fail("evidence-manifest.baseline_id must match baseline.id");
  }
  if (evidence.verdict === "ENGINE_ACCEPTED_FOR_UI") {
    fail("must not issue ENGINE_ACCEPTED_FOR_UI before QA1..QA8 complete");
  }
  if (evidence.next !== "QA6_PERFORMANCE") {
    fail("evidence-manifest.next must be QA6_PERFORMANCE");
  }
  if (evidence.evidence_integrity !== "VALID") {
    fail("evidence_integrity must be VALID");
  }
  if (!evidence.kill_switch || evidence.kill_switch.verified_before_qa3 !== true) {
    fail("evidence.kill_switch.verified_before_qa3 must be true");
  }
  if (!evidence.kill_switch || evidence.kill_switch.verified_before_qa4 !== true) {
    fail("evidence.kill_switch.verified_before_qa4 must be true");
  }
  if (!evidence.kill_switch || evidence.kill_switch.verified_before_qa5 !== true) {
    fail("evidence.kill_switch.verified_before_qa5 must be true");
  }
  if (
    !evidence.artifact_policy ||
    !(evidence.artifact_policy.retention_days_min >= 90)
  ) {
    fail("evidence.artifact_policy.retention_days_min must be ≥90");
  }

  const qa0 = (evidence.suites || []).find((s) => s.suite_id === "QA0");
  const qa1 = (evidence.suites || []).find((s) => s.suite_id === "QA1");
  const qa2 = (evidence.suites || []).find((s) => s.suite_id === "QA2");
  const qa3 = (evidence.suites || []).find((s) => s.suite_id === "QA3");
  const qa4 = (evidence.suites || []).find((s) => s.suite_id === "QA4");
  const qa5 = (evidence.suites || []).find((s) => s.suite_id === "QA5");
  if (!qa0 || qa0.completion_status !== "COMPLETE") {
    fail("QA0 suite must remain COMPLETE");
  }
  if (!qa1 || qa1.completion_status !== "COMPLETE") {
    fail("QA1 suite must remain COMPLETE");
  }
  if (!qa1.run_id || !qa1.checksum) {
    fail("QA1 suite must have run_id + checksum");
  }
  if (!qa2 || qa2.completion_status !== "COMPLETE") {
    fail("QA2 suite must remain COMPLETE");
  }
  if (!qa2.run_id || !qa2.checksum) {
    fail("QA2 suite must have run_id + checksum");
  }
  if (!qa3 || qa3.completion_status !== "COMPLETE") {
    fail("QA3 suite must remain COMPLETE");
  }
  if (!qa3.run_id || !qa3.checksum) {
    fail("QA3 suite must have run_id + checksum");
  }
  if (!qa4 || qa4.completion_status !== "COMPLETE") {
    fail("QA4 suite must remain COMPLETE");
  }
  if (!qa4.run_id || !qa4.checksum) {
    fail("QA4 suite must have run_id + checksum");
  }
  if (!qa5 || qa5.completion_status !== "COMPLETE") {
    fail("QA5 suite must be COMPLETE");
  }
  if (!qa5.run_id || !qa5.checksum) {
    fail("QA5 suite must have run_id + checksum");
  }
}

let qa1Result;
try {
  qa1Result = readJson(`${GOV}/qa1-result.v1.json`);
} catch {
  fail("qa1-result.v1.json invalid JSON");
}
if (qa1Result) {
  if (qa1Result.completion_status !== "COMPLETE") {
    fail("qa1-result.completion_status must be COMPLETE");
  }
  if (qa1Result.suite_id !== "QA1") fail("qa1-result.suite_id must be QA1");
}

let qa2Result;
try {
  qa2Result = readJson(`${GOV}/qa2-result.v1.json`);
} catch {
  fail("qa2-result.v1.json invalid JSON");
}
if (qa2Result) {
  if (qa2Result.completion_status !== "COMPLETE") {
    fail("qa2-result.completion_status must be COMPLETE");
  }
  if (qa2Result.suite_id !== "QA2") fail("qa2-result.suite_id must be QA2");
}

let qa3Result;
try {
  qa3Result = readJson(`${GOV}/qa3-result.v1.json`);
} catch {
  fail("qa3-result.v1.json invalid JSON");
}
if (qa3Result) {
  if (qa3Result.schema !== "governance.engine-acceptance.qa3-result.v1") {
    fail("qa3-result.schema mismatch");
  }
  if (qa3Result.completion_status !== "COMPLETE") {
    fail("qa3-result.completion_status must be COMPLETE");
  }
  if (qa3Result.suite_id !== "QA3") fail("qa3-result.suite_id must be QA3");
  if (baseline && qa3Result.baseline_id !== baseline.id) {
    fail("qa3-result.baseline_id must match baseline.id");
  }
  if (!qa3Result.kill_switch || qa3Result.kill_switch.verified_before_checks !== true) {
    fail("qa3-result must record kill_switch.verified_before_checks");
  }
  if (qa3Result.kpi_forbidden !== true) {
    fail("qa3-result.kpi_forbidden must be true");
  }
  if (qa3Result.product_mutation !== 0) {
    fail("qa3-result.product_mutation must be 0");
  }
  if (!["tiny", "full"].includes(qa3Result.mode)) {
    fail("qa3-result.mode must be tiny|full");
  }
  const checks = qa3Result.checks || {};
  if (!checks.fast_check) fail("qa3-result.checks.fast_check required");
  if (checks.fast_check) {
    const props = checks.fast_check.properties || [];
    if (props.length < 5) fail("qa3 fast-check must record ≥5 properties");
    for (const p of props) {
      if (!p.property_id || !p.invariant_id || !p.status) {
        fail("qa3 property result missing property_id/invariant_id/status");
      }
      if (p.status === "FAIL") {
        const ev = p.rich_evidence;
        if (!ev) fail(`qa3 FAIL ${p.property_id} missing rich_evidence`);
        else {
          for (const k of ["seed", "rng_version", "clock_as_of", "request_sequence", "baseline_id"]) {
            if (ev[k] === undefined || ev[k] === null) {
              fail(`qa3 rich_evidence missing ${k} for ${p.property_id}`);
            }
          }
          if (!Array.isArray(ev.request_sequence) || ev.request_sequence.length < 1) {
            fail(`qa3 rich_evidence.request_sequence empty for ${p.property_id}`);
          }
        }
        // defects must include this failure (수정0 · 기록만)
        const linked = (defects.defects || []).some(
          (d) => d.suite_id === "QA3" && d.trace_id === `qa3:${p.property_id}`,
        );
        if (!linked) {
          fail(`qa3 FAIL ${p.property_id} must be recorded in defects.v1.json`);
        }
      }
    }
  }
  if (qa3Result.ci) {
    if (qa3Result.ci.strategy_fail_fast !== false) {
      fail("qa3-result.ci.strategy_fail_fast must be false");
    }
    if (!String(qa3Result.ci.concurrency_group || "").includes("engine-acceptance")) {
      fail("qa3-result.ci.concurrency_group must reference engine-acceptance");
    }
  } else {
    fail("qa3-result.ci lock required");
  }
  if (evidence) {
    const qa3 = (evidence.suites || []).find((s) => s.suite_id === "QA3");
    if (qa3 && qa3.checksum !== qa3Result.checksum) {
      fail("evidence QA3.checksum must match qa3-result.checksum");
    }
  }
}

let qa4Result;
try {
  qa4Result = readJson(`${GOV}/qa4-result.v1.json`);
} catch {
  fail("qa4-result.v1.json invalid JSON");
}
if (qa4Result) {
  if (qa4Result.schema !== "governance.engine-acceptance.qa4-result.v1") {
    fail("qa4-result.schema mismatch");
  }
  if (qa4Result.completion_status !== "COMPLETE") {
    fail("qa4-result.completion_status must be COMPLETE");
  }
  if (qa4Result.suite_id !== "QA4") fail("qa4-result.suite_id must be QA4");
  if (baseline && qa4Result.baseline_id !== baseline.id) {
    fail("qa4-result.baseline_id must match baseline.id");
  }
  if (!qa4Result.kill_switch || qa4Result.kill_switch.verified_before_checks !== true) {
    fail("qa4-result must record kill_switch.verified_before_checks");
  }
  if (qa4Result.kpi_forbidden !== true) {
    fail("qa4-result.kpi_forbidden must be true");
  }
  if (qa4Result.product_mutation !== 0) {
    fail("qa4-result.product_mutation must be 0");
  }
  if (!["tiny", "full"].includes(qa4Result.mode)) {
    fail("qa4-result.mode must be tiny|full");
  }
  if (qa4Result.next !== "QA5_FAILURE_WORLD") {
    fail("qa4-result.next must be QA5_FAILURE_WORLD");
  }
  const checks4 = qa4Result.checks || {};
  if (!checks4.stateful_time) fail("qa4-result.checks.stateful_time required");
  if (checks4.stateful_time) {
    const st = checks4.stateful_time;
    if (!st.clock_hook) fail("qa4 stateful_time.clock_hook required");
    if (!Array.isArray(st.scenarios) || st.scenarios.length < 1) {
      fail("qa4 stateful_time.scenarios must be non-empty");
    }
    const kinds = new Set(st.scenarios.map((s) => s.kind));
    // tiny may omit some; require at least day boundary or plus_30d representation
    if (
      !kinds.has("kst_day_boundary") &&
      !kinds.has("plus_30d") &&
      !kinds.has("multi_day_lifecycle")
    ) {
      fail("qa4 scenarios must include KST/multi-day kinds");
    }
    if (st.clock_hook.available !== true) {
      if (st.clock_hook.blocked_code !== "BLOCKED_NO_CLOCK_HOOK") {
        fail("absent clock hook must set blocked_code=BLOCKED_NO_CLOCK_HOOK");
      }
      if (st.status !== "BLOCKED") {
        fail("absent clock hook must yield stateful_time.status=BLOCKED (no mock PASS)");
      }
      const blockedScenarios = st.scenarios.filter((s) => s.status === "BLOCKED");
      if (blockedScenarios.length < 1) {
        fail("absent clock hook must BLOCK at least one scenario");
      }
      for (const s of blockedScenarios) {
        if (s.blocked_code !== "BLOCKED_NO_CLOCK_HOOK") {
          fail(`scenario ${s.scenario_id} missing BLOCKED_NO_CLOCK_HOOK`);
        }
      }
      if (
        !qa4Result.critical_invariant ||
        !(qa4Result.critical_invariant.blocked > 0)
      ) {
        fail("critical INV-TIME-01 BLOCKED must set critical_invariant.blocked > 0");
      }
      if (qa4Result.verdict_contribution === "ENGINE_ACCEPTED_FOR_UI") {
        fail("critical BLOCKED must not contribute ENGINE_ACCEPTED_FOR_UI");
      }
      if (evidence && evidence.verdict === "ENGINE_ACCEPTED_FOR_UI") {
        fail("evidence verdict must not be ACCEPTED when critical clock hook BLOCKED");
      }
      if (
        !Array.isArray(qa4Result.blocked_codes_observed) ||
        !qa4Result.blocked_codes_observed.includes("BLOCKED_NO_CLOCK_HOOK")
      ) {
        fail("qa4-result.blocked_codes_observed must include BLOCKED_NO_CLOCK_HOOK");
      }
      // BLOCKED ≠ defect
      const bogus = (defects.defects || []).filter(
        (d) =>
          d.suite_id === "QA4" &&
          String(d.title || "").includes("BLOCKED_NO_CLOCK_HOOK") &&
          d.repro_status !== "blocked",
      );
      if (bogus.length) {
        fail("BLOCKED_NO_CLOCK_HOOK must not be laundered as ordinary defect FAIL");
      }
    }
  }
  if (qa4Result.ci) {
    if (qa4Result.ci.strategy_fail_fast !== false) {
      fail("qa4-result.ci.strategy_fail_fast must be false");
    }
    if (!String(qa4Result.ci.concurrency_group || "").includes("engine-acceptance")) {
      fail("qa4-result.ci.concurrency_group must reference engine-acceptance");
    }
  } else {
    fail("qa4-result.ci lock required");
  }
  if (evidence) {
    const qa4 = (evidence.suites || []).find((s) => s.suite_id === "QA4");
    if (qa4 && qa4.checksum !== qa4Result.checksum) {
      fail("evidence QA4.checksum must match qa4-result.checksum");
    }
  }
}

let qa5Result;
try {
  qa5Result = readJson(`${GOV}/qa5-result.v1.json`);
} catch {
  fail("qa5-result.v1.json invalid JSON");
}
if (qa5Result) {
  if (qa5Result.schema !== "governance.engine-acceptance.qa5-result.v1") {
    fail("qa5-result.schema mismatch");
  }
  if (qa5Result.completion_status !== "COMPLETE") {
    fail("qa5-result.completion_status must be COMPLETE");
  }
  if (qa5Result.suite_id !== "QA5") fail("qa5-result.suite_id must be QA5");
  if (baseline && qa5Result.baseline_id !== baseline.id) {
    fail("qa5-result.baseline_id must match baseline.id");
  }
  if (!qa5Result.kill_switch || qa5Result.kill_switch.verified_before_checks !== true) {
    fail("qa5-result must record kill_switch.verified_before_checks");
  }
  if (qa5Result.kpi_forbidden !== true) {
    fail("qa5-result.kpi_forbidden must be true");
  }
  if (qa5Result.product_mutation !== 0) {
    fail("qa5-result.product_mutation must be 0");
  }
  if (!["tiny", "full"].includes(qa5Result.mode)) {
    fail("qa5-result.mode must be tiny|full");
  }
  if (qa5Result.next !== "QA6_PERFORMANCE") {
    fail("qa5-result.next must be QA6_PERFORMANCE");
  }
  const checks5 = qa5Result.checks || {};
  if (!checks5.failure_world) fail("qa5-result.checks.failure_world required");
  if (checks5.failure_world) {
    const fw = checks5.failure_world;
    if (!fw.fault_hook) fail("qa5 failure_world.fault_hook required");
    if (!fw.axes) fail("qa5 failure_world.axes required");
    if (!fw.axes.axis1_expected_degradation_fallback) {
      fail("qa5 must record axis1_expected_degradation_fallback");
    }
    if (!fw.axes.axis2_post_recovery_invariant) {
      fail("qa5 must record axis2_post_recovery_invariant");
    }
    if (!Array.isArray(fw.scenarios) || fw.scenarios.length < 1) {
      fail("qa5 failure_world.scenarios must be non-empty");
    }
    const axesPresent = new Set(fw.scenarios.map((s) => s.axis));
    if (!axesPresent.has(1) || !axesPresent.has(2)) {
      fail("qa5 scenarios must cover both axis1 and axis2");
    }
    if (fw.fault_hook.available !== true) {
      if (fw.fault_hook.blocked_code !== "BLOCKED_NO_FAULT_HOOK") {
        fail("absent fault hook must set blocked_code=BLOCKED_NO_FAULT_HOOK");
      }
      if (fw.status !== "BLOCKED") {
        fail("absent fault hook must yield failure_world.status=BLOCKED (no mock PASS)");
      }
      const blockedScenarios = fw.scenarios.filter((s) => s.status === "BLOCKED");
      if (blockedScenarios.length < 1) {
        fail("absent fault hook must BLOCK at least one scenario");
      }
      for (const s of blockedScenarios) {
        if (s.blocked_code !== "BLOCKED_NO_FAULT_HOOK") {
          fail(`scenario ${s.scenario_id} missing BLOCKED_NO_FAULT_HOOK`);
        }
      }
      if (
        !qa5Result.critical_invariant ||
        !(qa5Result.critical_invariant.blocked > 0)
      ) {
        fail("critical fault-axis BLOCKED must set critical_invariant.blocked > 0");
      }
      if (qa5Result.verdict_contribution === "ENGINE_ACCEPTED_FOR_UI") {
        fail("critical BLOCKED must not contribute ENGINE_ACCEPTED_FOR_UI");
      }
      if (evidence && evidence.verdict === "ENGINE_ACCEPTED_FOR_UI") {
        fail("evidence verdict must not be ACCEPTED when critical fault hook BLOCKED");
      }
      if (
        !Array.isArray(qa5Result.blocked_codes_observed) ||
        !qa5Result.blocked_codes_observed.includes("BLOCKED_NO_FAULT_HOOK")
      ) {
        fail("qa5-result.blocked_codes_observed must include BLOCKED_NO_FAULT_HOOK");
      }
      const bogus = (defects.defects || []).filter(
        (d) =>
          d.suite_id === "QA5" &&
          String(d.title || "").includes("BLOCKED_NO_FAULT_HOOK") &&
          d.repro_status !== "blocked",
      );
      if (bogus.length) {
        fail("BLOCKED_NO_FAULT_HOOK must not be laundered as ordinary defect FAIL");
      }
    }
  }
  if (qa5Result.ci) {
    if (qa5Result.ci.strategy_fail_fast !== false) {
      fail("qa5-result.ci.strategy_fail_fast must be false");
    }
    if (!String(qa5Result.ci.concurrency_group || "").includes("engine-acceptance")) {
      fail("qa5-result.ci.concurrency_group must reference engine-acceptance");
    }
    if (qa5Result.ci.aggregator_if_always !== true) {
      fail("qa5-result.ci.aggregator_if_always must be true");
    }
    if (!(qa5Result.ci.artifact_retention_days >= 90)) {
      fail("qa5-result.ci.artifact_retention_days must be ≥90");
    }
  } else {
    fail("qa5-result.ci lock required");
  }
  if (evidence) {
    const qa5 = (evidence.suites || []).find((s) => s.suite_id === "QA5");
    if (qa5 && qa5.checksum !== qa5Result.checksum) {
      fail("evidence QA5.checksum must match qa5-result.checksum");
    }
    if (
      !evidence.critical_invariant ||
      typeof evidence.critical_invariant.blocked !== "number"
    ) {
      fail("evidence-manifest.critical_invariant.blocked required after QA5");
    }
  }
}

const report = fs.existsSync(path.join(ROOT, `${GOV}/ENGINE_ACCEPTANCE_REPORT.md`))
  ? fs.readFileSync(path.join(ROOT, `${GOV}/ENGINE_ACCEPTANCE_REPORT.md`), "utf8")
  : "";
if (report) {
  if (/verdict\s*[:=]\s*`?ENGINE_ACCEPTED_FOR_UI/i.test(report)) {
    fail("REPORT must not claim ENGINE_ACCEPTED_FOR_UI before full suites");
  }
  if (!report.includes("QA6_PERFORMANCE")) {
    fail("REPORT must declare NEXT=QA6_PERFORMANCE");
  }
  if (!report.includes("QA5 = COMPLETE")) {
    fail("REPORT banner must include QA5 = COMPLETE");
  }
  if (!report.includes("BLOCKED_NO_FAULT_HOOK")) {
    fail("REPORT must mention BLOCKED_NO_FAULT_HOOK");
  }
  if (!report.includes("axis1") && !report.includes("Axis1") && !report.includes("degradation")) {
    fail("REPORT must mention Failure World axis1 degradation");
  }
  if (!report.includes("post-recovery") && !report.includes("post_recovery")) {
    fail("REPORT must mention post-recovery axis");
  }
  if (!report.includes("retention") && !report.includes("90")) {
    fail("REPORT must mention artifact retention ≥90");
  }
  if (!report.includes("always()")) {
    fail("REPORT must mention aggregator if: always()");
  }
  if (!report.includes("PRODUCT MUTATION = 0") && !report.includes("product mutation")) {
    fail("REPORT must state product mutation 0");
  }
}

// --- workflow L5 ---
const wfPath = path.join(ROOT, ".github/workflows/engine-acceptance.yml");
if (fs.existsSync(wfPath)) {
  const wf = fs.readFileSync(wfPath, "utf8");
  if (!/fail-fast:\s*false/.test(wf)) fail("workflow must set strategy.fail-fast: false");
  if (!/concurrency:/.test(wf)) fail("workflow must define concurrency group");
  if (!/group:\s*engine-acceptance-/.test(wf)) {
    fail("workflow concurrency.group must be engine-acceptance-*");
  }
  if (!/workflow_dispatch:/.test(wf)) fail("workflow must allow workflow_dispatch");
  if (!/if:\s*(\$\{\{\s*always\(\)\s*\}\}|always\(\))/.test(wf)) {
    fail("workflow aggregator must use if: always()");
  }
  if (!/retention-days:\s*90/.test(wf)) fail("workflow artifact retention-days must be ≥90");
  if (!/run-qa1\.cjs/.test(wf)) fail("workflow must invoke run-qa1.cjs for QA1");
  if (!/run-qa2\.cjs/.test(wf)) fail("workflow must invoke run-qa2.cjs for QA2");
  if (!/run-qa3\.cjs/.test(wf)) fail("workflow must invoke run-qa3.cjs for QA3");
  if (!/run-qa4\.cjs/.test(wf)) fail("workflow must invoke run-qa4.cjs for QA4");
  if (!/run-qa5\.cjs/.test(wf)) fail("workflow must invoke run-qa5.cjs for QA5");
  if (!/qa-matrix:/.test(wf) && !/matrix:/.test(wf)) {
    fail("workflow must define CI matrix for generative suites");
  }
  // aggregator always() already checked; retention ≥90 already checked
  const alwaysCount = (wf.match(/if:\s*\$\{\{\s*always\(\)\s*\}\}/g) || []).length;
  if (alwaysCount < 2) {
    fail("workflow must use if: always() on aggregator and artifact upload steps");
  }
}

// --- L6 kill-switch before smoke ---
const denyProd = evaluateKillSwitch({
  target_env: "production",
  hostname: "localhost",
  synthetic_account_namespace: "qa-synth-x",
});
if (denyProd.ok) fail("kill-switch must reject target_env=production");

const denyHost = evaluateKillSwitch({
  target_env: "local",
  hostname: "www.peotteok.com",
  synthetic_account_namespace: "qa-synth-x",
});
if (denyHost.ok) fail("kill-switch must reject production-like hostname");

const denyNs = evaluateKillSwitch({
  target_env: "local",
  hostname: "localhost",
  synthetic_account_namespace: "prod-users",
});
if (denyNs.ok) fail("kill-switch must reject non-synthetic namespace");

let smokeBlocked = false;
try {
  runTinySmoke({
    target_env: "production",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-x",
  });
} catch (e) {
  smokeBlocked = e && e.code === "AIPO_QA_KILL_SWITCH";
}
if (!smokeBlocked) {
  fail("tiny-smoke must abort via kill-switch before running when unsafe");
}

let smokeOk = false;
try {
  const r = runTinySmoke({
    target_env: "local",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-local",
  });
  smokeOk = r && r.status === "SMOKE_OK";
} catch (e) {
  fail(`tiny-smoke safe path failed: ${e.message}`);
}
if (!smokeOk) fail("tiny-smoke safe path must return SMOKE_OK after kill-switch");

const { runQa1 } = require("../engine-acceptance/run-qa1.cjs");
let qa1Blocked = false;
try {
  runQa1({
    target_env: "production",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-x",
  });
} catch (e) {
  qa1Blocked = e && e.code === "AIPO_QA_KILL_SWITCH";
}
if (!qa1Blocked) {
  fail("run-qa1 must abort via kill-switch before checks when unsafe");
}

const { runQa2 } = require("../engine-acceptance/run-qa2.cjs");
let qa2Blocked = false;
try {
  runQa2({
    target_env: "production",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-x",
    mode: "tiny",
  });
} catch (e) {
  qa2Blocked = e && e.code === "AIPO_QA_KILL_SWITCH";
}
if (!qa2Blocked) {
  fail("run-qa2 must abort via kill-switch before checks when unsafe");
}

const { runQa3 } = require("../engine-acceptance/run-qa3.cjs");
let qa3Blocked = false;
try {
  runQa3({
    target_env: "production",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-x",
    mode: "tiny",
  });
} catch (e) {
  qa3Blocked = e && e.code === "AIPO_QA_KILL_SWITCH";
}
if (!qa3Blocked) {
  fail("run-qa3 must abort via kill-switch before checks when unsafe");
}

const { runQa4 } = require("../engine-acceptance/run-qa4.cjs");
let qa4Blocked = false;
try {
  runQa4({
    target_env: "production",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-x",
    mode: "tiny",
  });
} catch (e) {
  qa4Blocked = e && e.code === "AIPO_QA_KILL_SWITCH";
}
if (!qa4Blocked) {
  fail("run-qa4 must abort via kill-switch before checks when unsafe");
}

const { runQa5 } = require("../engine-acceptance/run-qa5.cjs");
let qa5Blocked = false;
try {
  runQa5({
    target_env: "production",
    hostname: "localhost",
    synthetic_account_namespace: "qa-synth-x",
    mode: "tiny",
  });
} catch (e) {
  qa5Blocked = e && e.code === "AIPO_QA_KILL_SWITCH";
}
if (!qa5Blocked) {
  fail("run-qa5 must abort via kill-switch before checks when unsafe");
}

// workflow hash in baseline matches file
if (baseline && fs.existsSync(wfPath) && scope) {
  const live = hashPathList(scope.aggregateHashes.acceptance_workflow_hash, scope);
  if (baseline.acceptance_workflow_hash !== live) {
    fail("acceptance_workflow_hash drift");
  }
}

if (fails.length) {
  console.error("[verify:engine-acceptance] FAIL (QA-0..QA-5)");
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("[verify:engine-acceptance] PASS (QA-0..QA-5 scope)");
console.log("  ACCEPTANCE CONTRACT = LOCKED");
console.log("  BASELINE = FROZEN");
console.log("  QA1 = COMPLETE");
console.log("  QA2 = COMPLETE");
console.log("  QA3 = COMPLETE");
console.log("  QA4 = COMPLETE");
console.log("  QA5 = COMPLETE");
console.log("  QA HARNESS TARGET = SAFE");
console.log("  NEXT = QA6_PERFORMANCE");

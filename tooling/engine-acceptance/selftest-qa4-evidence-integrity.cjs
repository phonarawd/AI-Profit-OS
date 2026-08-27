/**
 * QA4 full-set / cumulative evidence integrity selftest.
 * 제품 DB mutation 0 · 생성 evidence 를 governance 에 쓰지 않는다.
 */
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { ROOT } = require("./lib/hash-scope.cjs");
const {
  FULL_QA4_SCENARIO_IDS,
  evaluateQa4FullScenarioSet,
  hasDynamicRealExecution,
} = require("./lib/qa4-scenario-set.cjs");
const {
  mergeCriticalInvariant,
  buildCumulativeAcceptanceMessaging,
} = require("./lib/critical-invariant.cjs");
const { runStatefulTimeLifecycle } = require("./checks/stateful-time-lifecycle.cjs");
const { buildRichFailureEvidence } = require("./lib/rich-failure-evidence.cjs");
const { probeQa4ClockHarness } = require("./lib/qa4-clock-evidence.cjs");
const { inspectCurrentEpochPersistPass } = require("../verify/lib/rel-502-persist-pass.cjs");
const clockControl = require("./harness/clock-control.cjs");

function kstYmd(core, ms) {
  const [y, m, d] = core.kstDayKey(ms).split("-").map(Number);
  return { y, m, d };
}
function kstLocalToUtcMs(y, m, d) {
  return Date.UTC(y, m - 1, d, 0, 0, 0, 0) - 9 * 60 * 60 * 1000;
}
function nextKstDayBoundaryMs(core, nowMs) {
  let t = core.kstDayStartMs(nowMs) + core.DAY_MS;
  for (let i = 0; i < 40; i += 1) {
    if (kstYmd(core, t).d !== 1) return t;
    t += core.DAY_MS;
  }
  throw new Error("no day boundary");
}
function nextKstMonthEndBoundaryMs(core, nowMs) {
  const { y, m } = kstYmd(core, nowMs);
  let ny = y;
  let nm = m + 1;
  if (nm > 12) {
    ny += 1;
    nm = 1;
  }
  let candidate = kstLocalToUtcMs(ny, nm, 1);
  if (candidate <= nowMs) {
    nm += 1;
    if (nm > 12) {
      ny += 1;
      nm = 1;
    }
    candidate = kstLocalToUtcMs(ny, nm, 1);
  }
  if (nm === 1) candidate = kstLocalToUtcMs(ny, 2, 1);
  return candidate;
}
function nextKstYearEndBoundaryMs(core, nowMs) {
  const { y } = kstYmd(core, nowMs);
  let jan1 = kstLocalToUtcMs(y, 1, 1);
  if (jan1 <= nowMs) jan1 = kstLocalToUtcMs(y + 1, 1, 1);
  return jan1;
}

const fails = [];
function check(id, cond, detail) {
  if (cond) {
    console.log("  PASS " + id);
  } else {
    fails.push(id + (detail ? " — " + detail : ""));
    console.error("  FAIL " + id + (detail ? " — " + detail : ""));
  }
}

function writeJson(abs, obj) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function realScenario(id, status) {
  return {
    scenario_id: id,
    status,
    real_execution: true,
    clock_injected: true,
    source: "run-qa4-clock.cjs",
    findings: status === "FAIL" ? ["fixture fail"] : [],
  };
}

function sixRealPass() {
  return FULL_QA4_SCENARIO_IDS.map((id) => realScenario(id, "PASS"));
}

function makeSuiteResult(id, opts) {
  const allPass = opts.all_checks_pass !== false;
  return {
    schema: "governance.engine-acceptance." + id.toLowerCase() + "-result.v1",
    suite_id: id,
    completion_status: opts.completion_status || "COMPLETE",
    baseline_id: opts.baseline_id || "ea-baseline-cc627efc3ee2-defdfa5b6ac4",
    mode: opts.mode,
    all_checks_pass: allPass,
    product_mutation: 0,
    critical_invariant: opts.critical_invariant || { blocked: 0, skipped: 0, uncovered: 0, failed: 0 },
    critical_invariant_cumulative: opts.critical_invariant_cumulative,
    defects_counts: opts.defects_counts || { P0: 0, P1: 0, P2: 0, P3: 0 },
  };
}

function makeEvidence(slots) {
  return {
    qa_phase: "QA-6",
    next: "QA7_AI_EVAL",
    verdict: "ENGINE_QA_INCOMPLETE",
    verdict_reason: slots.verdict_reason || "QA6 COMPLETE · P0/P1=0 · mandatory suites QA7..QA8 not executed",
    suites: ["QA1", "QA2", "QA3", "QA4", "QA5", "QA6"].map((id) => ({
      suite_id: id,
      completion_status: "COMPLETE",
      baseline_id: "ea-baseline-cc627efc3ee2-defdfa5b6ac4",
      mode: id === "QA5" ? "tiny" : "full",
    })),
    critical_invariant: slots.critical_invariant || { blocked: 0, skipped: 0, uncovered: 0, failed: 0 },
  };
}

function run() {
  console.log("[selftest-qa4-evidence-integrity] start");

  check("full_set_has_exactly_six", FULL_QA4_SCENARIO_IDS.length === 6, String(FULL_QA4_SCENARIO_IDS.length));

  const six = evaluateQa4FullScenarioSet(sixRealPass());
  check("case_e_set_ok", six.ok && six.all_real && six.missing.length === 0);

  const missing365 = sixRealPass().filter((s) => s.scenario_id !== "TIME-PLUS-365D");
  const caseB = evaluateQa4FullScenarioSet(missing365);
  check("case_b_missing_id", caseB.ok === false && caseB.missing.includes("TIME-PLUS-365D"));

  const dup = [...sixRealPass(), realScenario("TIME-KST-DAY-BOUNDARY", "PASS")];
  const caseDup = evaluateQa4FullScenarioSet(dup);
  check("no_duplicate_id", caseDup.ok === false && caseDup.duplicates.includes("TIME-KST-DAY-BOUNDARY"));

  const swapped = sixRealPass().map((s) =>
    s.scenario_id === "TIME-KST-MONTH-END" ? { ...s, scenario_id: "TIME-KST-FAKE-MONTH" } : s,
  );
  const caseSwap = evaluateQa4FullScenarioSet(swapped);
  check(
    "no_unexpected_replacement",
    caseSwap.ok === false &&
      caseSwap.missing.includes("TIME-KST-MONTH-END") &&
      caseSwap.unexpected.includes("TIME-KST-FAKE-MONTH"),
  );

  const stubPass = FULL_QA4_SCENARIO_IDS.map((id) => ({ scenario_id: id, status: "PASS" }));
  const stubSet = evaluateQa4FullScenarioSet(stubPass);
  check("no_static_pass_without_real_execution", stubSet.all_real === false && stubSet.missing_real_execution.length === 6);
  check("hasDynamicRealExecution_requires_flags", hasDynamicRealExecution({ scenario_id: "TIME-KST-MONTH-END", status: "PASS" }) === false);

  const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipo-qa4-stub-"));
  writeJson(path.join(stubDir, "qa4-clock-harness.v1.json"), {
    schema: "harness.qa4-clock.v1",
    non_canonical: true,
    does_not_replace_qa4_result: true,
    harness_status: "PASS",
    measuredAt: new Date().toISOString(),
    security_gate: { ok: true },
    scenarios: stubPass,
  });
  const probeStub = probeQa4ClockHarness({ dir: stubDir });
  check(
    "no_stub_ids_without_real_execution",
    probeStub.available === false && /real_execution/.test(probeStub.reason || ""),
    probeStub.reason,
  );

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aipo-qa4-set-"));
  writeJson(path.join(tmp, "qa4-clock-harness.v1.json"), {
    schema: "harness.qa4-clock.v1",
    non_canonical: true,
    does_not_replace_qa4_result: true,
    harness_status: "PASS",
    measuredAt: new Date().toISOString(),
    security_gate: { ok: true },
    scenarios: missing365,
  });
  const prevOut = process.env.AIPO_QA_HARNESS_OUT;
  process.env.AIPO_QA_HARNESS_OUT = tmp;
  const probeB = probeQa4ClockHarness({ dir: tmp });
  check("case_b_probe_rejects_incomplete_set", probeB.available === false && /harness_scenario_set_mismatch/.test(probeB.reason || ""));
  if (prevOut === undefined) delete process.env.AIPO_QA_HARNESS_OUT;
  else process.env.AIPO_QA_HARNESS_OUT = prevOut;

  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipo-qa4-empty-"));
  process.env.AIPO_QA_HARNESS_OUT = emptyDir;
  const scored = runStatefulTimeLifecycle({
    mode: "full",
    baseline_id: "ea-baseline-cc627efc3ee2-defdfa5b6ac4",
    measuredAt: "2026-08-28T00:00:00.000Z",
    seed: 20260812,
  });
  const notWired = (scored.scenarios || []).filter((s) =>
    (s.findings || []).some((f) => String(f).includes("not wired")),
  );
  const richIds = notWired.map((s) => s.rich_evidence && s.rich_evidence.suite_id);
  check("case_f_not_wired_exists", notWired.length >= 1, "count=" + notWired.length);
  check(
    "case_f_suite_id_qa4",
    richIds.length > 0 && richIds.every((id) => id === "QA4"),
    "ids=" + richIds.join(","),
  );
  check(
    "case_f_never_default_qa3",
    richIds.every((id) => id !== "QA3"),
  );
  const directRich = buildRichFailureEvidence({
    seed: 1,
    suite_id: "QA4",
    invariant_id: "INV-TIME-01",
    clock_as_of: "2026-01-31T14:59:59.000Z",
    baseline_id: "ea-baseline-cc627efc3ee2-defdfa5b6ac4",
  });
  check("case_f_explicit_suite_id", directRich.suite_id === "QA4");
  if (prevOut === undefined) delete process.env.AIPO_QA_HARNESS_OUT;
  else process.env.AIPO_QA_HARNESS_OUT = prevOut;

  const merged = mergeCriticalInvariant(
    { blocked: 0, skipped: 0, uncovered: 0, failed: 1 },
    { blocked: 0, skipped: 0, uncovered: 0, failed: 0 },
    { priorLabel: "QA4", currentLabel: "QA5" },
  );
  check("case_d_failed_propagates", merged.failed === 1);
  check("case_d_source_qa4_failed", merged.sources.QA4 && merged.sources.QA4.failed === 1);
  check("case_d_source_qa5_failed_zero", merged.sources.QA5 && merged.sources.QA5.failed === 0);

  const qa6merged = mergeCriticalInvariant(merged, { blocked: 0, skipped: 0, uncovered: 0, failed: 0 }, {
    priorLabel: "QA5_cumulative",
    currentLabel: "QA6",
  });
  check("case_d_qa6_still_failed_1", qa6merged.failed === 1);
  check("case_d_qa6_keeps_qa4_source", qa6merged.sources.QA4 && qa6merged.sources.QA4.failed === 1);

  const msg = buildCumulativeAcceptanceMessaging({
    suiteLabel: "QA6",
    mergedCounts: { P0: 0, P1: 3 },
    criticalMerged: { blocked: 0, skipped: 0, uncovered: 0, failed: 1 },
    remainingSuitesNote: "QA7..QA8 not executed",
  });
  check("case_c_verdict_not_accepted", msg.verdict === "ENGINE_NOT_ACCEPTED");
  check("case_c_reason_p1_3", /P1=3/.test(msg.verdictReason));
  check("case_c_reason_not_p1_0", !/P0\/P1=0/.test(msg.verdictReason));

  const localZero = buildCumulativeAcceptanceMessaging({
    suiteLabel: "QA6",
    mergedCounts: { P0: 0, P1: 0 },
    criticalMerged: { blocked: 0, skipped: 0, uncovered: 0, failed: 0 },
    remainingSuitesNote: "QA7..QA8 not executed",
  });
  check("clean_reason_may_say_p0p1_0", /P0\/P1=0/.test(localZero.verdictReason));

  const baselineId = "ea-baseline-cc627efc3ee2-defdfa5b6ac4";
  const required = [
    { id: "QA1" },
    { id: "QA2", mode: "full" },
    { id: "QA3", mode: "full" },
    { id: "QA4", mode: "full" },
    { id: "QA5", mode: "tiny" },
    { id: "QA6", mode: "full" },
  ];
  const badResults = {
    QA1: makeSuiteResult("QA1", { baseline_id: baselineId }),
    QA2: makeSuiteResult("QA2", { baseline_id: baselineId, mode: "full" }),
    QA3: makeSuiteResult("QA3", { baseline_id: baselineId, mode: "full" }),
    QA4: makeSuiteResult("QA4", {
      baseline_id: baselineId,
      mode: "full",
      all_checks_pass: false,
      critical_invariant: { blocked: 0, skipped: 0, uncovered: 0, failed: 1 },
      defects_counts: { P0: 0, P1: 3, P2: 0, P3: 0 },
    }),
    QA5: makeSuiteResult("QA5", { baseline_id: baselineId, mode: "tiny" }),
    QA6: makeSuiteResult("QA6", { baseline_id: baselineId, mode: "full" }),
  };
  const caseA = inspectCurrentEpochPersistPass({
    required,
    results: badResults,
    evidence: makeEvidence({
      verdict_reason: "QA6 COMPLETE · P0/P1=0 · mandatory suites QA7..QA8 not executed",
      critical_invariant: { blocked: 0, skipped: 0, uncovered: 0 },
    }),
    defects: { counts: { P0: 0, P1: 3, P2: 0, P3: 0 }, defects: [{ suite_id: "QA4", severity: "P1" }] },
    reportText: "| defects.P0 / P1 | 0 / 0 |",
    baselineId,
  });
  check(
    "case_a_persist_fails",
    caseA.some((m) => /QA4 all_checks_pass/.test(m)) &&
      caseA.some((m) => /QA4 critical_invariant dirty/.test(m) && /failed=1/.test(m)) &&
      caseA.some((m) => /registry P1 must be 0/.test(m)),
    caseA.join(" | "),
  );
  check("case_a_reason_contradiction", caseA.some((m) => /P0\/P1=0/.test(m)), caseA.join(" | "));

  const liveQa4 = JSON.parse(
    fs.readFileSync(path.join(ROOT, "governance/engine-acceptance/qa4-result.v1.json"), "utf8"),
  );
  const liveDefects = JSON.parse(
    fs.readFileSync(path.join(ROOT, "governance/engine-acceptance/defects.v1.json"), "utf8"),
  );
  const liveMatchesBad =
    liveQa4.completion_status === "COMPLETE" &&
    liveQa4.all_checks_pass === false &&
    (liveQa4.critical_invariant && liveQa4.critical_invariant.failed === 1) &&
    liveDefects.counts &&
    liveDefects.counts.P1 === 3;
  if (liveMatchesBad) {
    const spawned = spawnSync(process.execPath, [path.join(ROOT, "tooling/verify/rel-502-current-epoch-once.cjs"), "--persist-safety"], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 60_000,
    });
    check("case_a_live_persist_safety_exit", spawned.status !== 0, "status=" + spawned.status);
    const err = String(spawned.stderr || "") + String(spawned.stdout || "");
    check("case_a_live_mentions_all_checks_pass", /all_checks_pass/.test(err));
    check("case_a_live_mentions_p1", /P1/.test(err));
  } else {
    console.log("  SKIP case_a_live (tree no longer matches historical bad QA4 shape)");
  }

  const greenResults = {
    QA1: makeSuiteResult("QA1", { baseline_id: baselineId }),
    QA2: makeSuiteResult("QA2", { baseline_id: baselineId, mode: "full" }),
    QA3: makeSuiteResult("QA3", { baseline_id: baselineId, mode: "full" }),
    QA4: makeSuiteResult("QA4", { baseline_id: baselineId, mode: "full" }),
    QA5: makeSuiteResult("QA5", { baseline_id: baselineId, mode: "tiny" }),
    QA6: makeSuiteResult("QA6", { baseline_id: baselineId, mode: "full" }),
  };
  const caseE = inspectCurrentEpochPersistPass({
    required,
    results: greenResults,
    evidence: makeEvidence({
      verdict_reason: "QA6 COMPLETE · P0/P1=0 · mandatory suites QA7..QA8 not executed · ENGINE_ACCEPTED_FOR_UI forbidden",
      critical_invariant: { blocked: 0, skipped: 0, uncovered: 0, failed: 0 },
    }),
    defects: { counts: { P0: 0, P1: 0, P2: 0, P3: 0 }, defects: [] },
    reportText: "| defects.P0 / P1 | 0 / 0 |",
    baselineId,
  });
  check("case_e_persist_pass", caseE.length === 0, caseE.join(" | "));

  const core = clockControl.loadClockCore();
  const nowMs = Date.parse("2026-08-28T01:00:00.000Z");
  const dayMs = nextKstDayBoundaryMs(core, nowMs);
  const monthMs = nextKstMonthEndBoundaryMs(core, nowMs);
  const yearMs = nextKstYearEndBoundaryMs(core, nowMs);
  const dayYmd = core.kstDayKey(dayMs);
  const monthYmd = core.kstDayKey(monthMs);
  const yearYmd = core.kstDayKey(yearMs);
  check("boundaries_are_distinct", new Set([dayMs, monthMs, yearMs]).size === 3, `${dayMs},${monthMs},${yearMs}`);
  check("day_boundary_not_first", !dayYmd.endsWith("-01"), dayYmd);
  check("month_boundary_is_first_not_jan", /-\d{2}-01$/.test(monthYmd) && !monthYmd.endsWith("-01-01"), monthYmd);
  check("year_boundary_is_jan1", yearYmd.endsWith("-01-01"), yearYmd);

  try {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(emptyDir, { recursive: true, force: true });
    fs.rmSync(stubDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  if (fails.length) {
    console.error("[selftest-qa4-evidence-integrity] FAIL");
    for (const f of fails) console.error("  - " + f);
    process.exit(1);
  }
  console.log("[selftest-qa4-evidence-integrity] PASS");
}

if (require.main === module) {
  run();
}

module.exports = { run };

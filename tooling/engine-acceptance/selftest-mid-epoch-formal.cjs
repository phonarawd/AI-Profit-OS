/**
 * Fixture selftest — mid-epoch formal pending.
 * live baseline / QA 결과 파일을 쓰지 않는다.
 */
"use strict";

const {
  isMidEpochFormalPending,
  isPredecessorPreservedResult,
  assertNoCurrentEpochFormalWashing,
} = require("./lib/mid-epoch-formal.cjs");

const CURRENT = "ea-baseline-current";
const PRED = "ea-baseline-pred";

function rebuildSuites() {
  return ["QA1", "QA2", "QA3", "QA4", "QA5", "QA6"].map((id) => ({
    suite_id: id,
    completion_status: "COMPLETE",
    baseline_id: CURRENT,
  }));
}

function honestEvidence(over = {}) {
  return {
    verdict: "ENGINE_QA_INCOMPLETE",
    qa_phase: "QA-6",
    next: "QA7_AI_EVAL",
    suites: [
      ...rebuildSuites(),
      {
        suite_id: "QA7",
        completion_status: "NOT_STARTED",
        baseline_id: CURRENT,
        predecessor_baseline_id: PRED,
      },
      {
        suite_id: "QA8",
        completion_status: "NOT_STARTED",
        epoch_status: "STALE_FOR_CURRENT_EPOCH",
        predecessor_result_preserved: true,
      },
      {
        suite_id: "QA9",
        completion_status: "NOT_STARTED",
        epoch_status: "STALE_AGGREGATION_FOR_CURRENT_EPOCH",
        predecessor_result_preserved: true,
      },
    ],
    ...over,
  };
}

function run() {
  const fails = [];
  const baseline = { id: CURRENT };
  const evidence = honestEvidence();

  if (!isMidEpochFormalPending(baseline, evidence)) {
    fails.push("honest QA1-6 COMPLETE + QA7-9 not current must be mid-epoch");
  }
  if (isMidEpochFormalPending(baseline, honestEvidence({ verdict: "ENGINE_ACCEPTED_FOR_UI" }))) {
    fails.push("ENGINE_ACCEPTED_FOR_UI must never be mid-epoch");
  }
  if (isMidEpochFormalPending(baseline, honestEvidence({ qa_phase: "QA-9" }))) {
    fails.push("qa_phase=QA-9 must not be mid-epoch");
  }
  if (isMidEpochFormalPending(baseline, honestEvidence({ next: "03_ui_entry_unlocked" }))) {
    fails.push("post-QA9 next must not be mid-epoch");
  }

  const qa7Current = honestEvidence();
  const qa7Suite = qa7Current.suites.find((s) => s.suite_id === "QA7");
  qa7Suite.completion_status = "COMPLETE";
  qa7Suite.baseline_id = CURRENT;
  if (isMidEpochFormalPending(baseline, qa7Current)) {
    fails.push("current-epoch QA7 COMPLETE must exit mid-epoch (formal path)");
  }

  const qa4Stale = honestEvidence();
  qa4Stale.suites.find((s) => s.suite_id === "QA4").completion_status = "STALE";
  if (isMidEpochFormalPending(baseline, qa4Stale)) {
    fails.push("QA4 STALE must keep pending-rebuild, not mid-epoch");
  }

  const predResult = { baseline_id: PRED, completion_status: "COMPLETE" };
  const qa7NotStarted = evidence.suites.find((s) => s.suite_id === "QA7");
  if (!isPredecessorPreservedResult(predResult, baseline, qa7NotStarted)) {
    fails.push("predecessor qa7-result must be preserved, not current-bound");
  }
  if (isPredecessorPreservedResult({ baseline_id: CURRENT }, baseline, qa7NotStarted)) {
    fails.push("current-baseline qa7-result must not count as predecessor-preserved");
  }

  const wash = [];
  assertNoCurrentEpochFormalWashing(
    baseline,
    evidence,
    { QA7: { baseline_id: CURRENT } },
    (m) => wash.push(m),
  );
  if (!wash.some((m) => /QA7/.test(m) && /washing/.test(m))) {
    fails.push("current-epoch qa7-result during mid-epoch must FAIL as washing");
  }

  const clean = [];
  assertNoCurrentEpochFormalWashing(
    baseline,
    evidence,
    { QA7: predResult, QA8: { baseline_id: PRED }, QA9: { baseline_id: PRED } },
    (m) => clean.push(m),
  );
  if (clean.length) {
    fails.push(`predecessor results during mid-epoch must not wash: ${clean.join(" | ")}`);
  }

  if (fails.length) {
    const err = new Error(fails.join("; "));
    err.fails = fails;
    throw err;
  }
  return { ok: true, cases: 9 };
}

if (require.main === module) {
  try {
    const out = run();
    console.log(`[selftest-mid-epoch-formal] PASS cases=${out.cases}`);
    process.exit(0);
  } catch (e) {
    console.error("[selftest-mid-epoch-formal] FAIL");
    for (const f of e.fails || [e.message || e]) console.error(`  - ${f}`);
    process.exit(1);
  }
}

module.exports = { run };

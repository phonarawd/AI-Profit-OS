/**
 * Mid-epoch formal pending — QA1–QA6 current COMPLETE, QA7–QA9 not yet current.
 *
 * 기존 evidence-manifest 필드(predecessor_result_preserved · NOT_STARTED ·
 * STALE_*)를 Honour한다. pending_rebuild(QA1–QA6)가 끝난 뒤에도
 * predecessor QA7/QA8/QA9 파일을 현재 epoch 정식 증거로 강제하지 않는다.
 *
 * 약화 금지:
 * - ENGINE_ACCEPTED_FOR_UI 발급 0
 * - 현재 epoch QA7 COMPLETE 주장 + 비정식 결과 = washing FAIL
 * - T0 always(stack-lock/secrets/plans-ssot/brand) 의미 변경 0
 */
"use strict";

const REBUILD_IDS = Object.freeze(["QA1", "QA2", "QA3", "QA4", "QA5", "QA6"]);
const FORMAL_PENDING_IDS = Object.freeze(["QA7", "QA8", "QA9"]);
const MID_EPOCH_PHASES = Object.freeze([
  "QA-1",
  "QA-2",
  "QA-3",
  "QA-4",
  "QA-5",
  "QA-6",
]);

function suiteById(evidence, id) {
  return ((evidence && evidence.suites) || []).find((s) => s.suite_id === id) || null;
}

function isCurrentComplete(suite, baseline) {
  return Boolean(
    suite &&
      baseline &&
      suite.completion_status === "COMPLETE" &&
      suite.baseline_id === baseline.id,
  );
}

function isFormalNotCurrent(suite, baseline) {
  if (!suite) return true;
  if (isCurrentComplete(suite, baseline)) return false;
  return (
    suite.completion_status === "NOT_STARTED" ||
    suite.completion_status === "STALE" ||
    suite.epoch_status === "STALE_FOR_CURRENT_EPOCH" ||
    suite.epoch_status === "STALE_AGGREGATION_FOR_CURRENT_EPOCH" ||
    suite.predecessor_result_preserved === true
  );
}

function isPredecessorPreservedResult(result, baseline, suite) {
  if (!result || !baseline) return false;
  if (result.baseline_id === baseline.id) return false;
  if (isCurrentComplete(suite, baseline)) return false;
  return true;
}

function isMidEpochFormalPending(baseline, evidence) {
  if (!baseline || !evidence) return false;
  if (evidence.verdict === "ENGINE_ACCEPTED_FOR_UI") return false;
  if (evidence.verdict !== "ENGINE_QA_INCOMPLETE") return false;
  if (!MID_EPOCH_PHASES.includes(evidence.qa_phase)) return false;
  if (evidence.next !== "QA7_AI_EVAL") return false;
  for (const id of REBUILD_IDS) {
    if (!isCurrentComplete(suiteById(evidence, id), baseline)) return false;
  }
  for (const id of FORMAL_PENDING_IDS) {
    if (!isFormalNotCurrent(suiteById(evidence, id), baseline)) return false;
  }
  return true;
}

function assertNoCurrentEpochFormalWashing(baseline, evidence, results, fail) {
  if (typeof fail !== "function") return;
  if (!isMidEpochFormalPending(baseline, evidence)) return;
  const bag = results && typeof results === "object" ? results : {};
  for (const id of FORMAL_PENDING_IDS) {
    const result = bag[id];
    if (result && baseline && result.baseline_id === baseline.id) {
      fail(
        `${id} on-disk result bound to current baseline while suite is not current COMPLETE (formal washing)`,
      );
    }
  }
}

module.exports = {
  REBUILD_IDS,
  FORMAL_PENDING_IDS,
  MID_EPOCH_PHASES,
  suiteById,
  isCurrentComplete,
  isFormalNotCurrent,
  isPredecessorPreservedResult,
  isMidEpochFormalPending,
  assertNoCurrentEpochFormalWashing,
};

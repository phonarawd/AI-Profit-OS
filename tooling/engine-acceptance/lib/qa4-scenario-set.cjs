/**
 * QA4 full scenario-set contract.
 *
 * full = 정확히 이 6개 ID. 존재만으로 PASS가 아니며, 교체·중복·누락은 세트 불일치다.
 */
"use strict";

const FULL_QA4_SCENARIO_IDS = Object.freeze([
  "TIME-KST-DAY-BOUNDARY",
  "TIME-KST-MONTH-END",
  "TIME-KST-YEAR-END",
  "TIME-PLUS-30D",
  "TIME-PLUS-365D",
  "TIME-MULTI-DAY-LIFECYCLE",
]);

const TINY_QA4_SCENARIO_IDS = Object.freeze([
  "TIME-KST-DAY-BOUNDARY",
  "TIME-PLUS-30D",
  "TIME-MULTI-DAY-LIFECYCLE",
]);

function expectedIdsForMode(mode) {
  return mode === "full" ? FULL_QA4_SCENARIO_IDS : TINY_QA4_SCENARIO_IDS;
}

function evaluateScenarioSet(scenarios, expectedIds) {
  const expected = [...expectedIds];
  const actual = (scenarios || []).map((s) => s && s.scenario_id).filter(Boolean);
  const seen = new Set();
  const duplicates = [];
  for (const id of actual) {
    if (seen.has(id)) duplicates.push(id);
    seen.add(id);
  }
  const expectedSet = new Set(expected);
  const missing = expected.filter((id) => !seen.has(id));
  const unexpected = actual.filter((id) => !expectedSet.has(id));
  const ok =
    missing.length === 0 &&
    unexpected.length === 0 &&
    duplicates.length === 0 &&
    actual.length === expected.length;
  return {
    ok,
    expected,
    actual,
    missing,
    unexpected,
    duplicates,
  };
}

function hasDynamicRealExecution(scenario) {
  if (!scenario) return false;
  if (scenario.status !== "PASS" && scenario.status !== "FAIL") return false;
  if (scenario.real_execution !== true) return false;
  if (scenario.clock_injected !== true) return false;
  return true;
}

function evaluateQa4FullScenarioSet(scenarios) {
  const set = evaluateScenarioSet(scenarios, FULL_QA4_SCENARIO_IDS);
  const missing_real_execution = (scenarios || [])
    .filter((s) => s && FULL_QA4_SCENARIO_IDS.includes(s.scenario_id) && !hasDynamicRealExecution(s))
    .map((s) => s.scenario_id);
  return {
    ...set,
    missing_real_execution,
    all_real: set.ok && missing_real_execution.length === 0,
  };
}

module.exports = {
  FULL_QA4_SCENARIO_IDS,
  TINY_QA4_SCENARIO_IDS,
  expectedIdsForMode,
  evaluateScenarioSet,
  evaluateQa4FullScenarioSet,
  hasDynamicRealExecution,
};

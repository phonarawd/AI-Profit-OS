/**
 * QA9 현재 epoch 세탁 거절. 공식 POLICY_V2 / verify:engine-acceptance 기존 규칙만.
 * 현재 증거 필수 검사를 skip 해서 합격시키지 않는다.
 * 디스크 옛 qa9-result 는 보존이며, 현재 COMPLETE/ISSUED 가 아니다.
 */
"use strict";

function isQa9StaleAggregation(evidenceObj) {
  const qa9 = ((evidenceObj && evidenceObj.suites) || []).find((x) => x.suite_id === "QA9");
  if (!qa9) return false;
  return qa9.current_epoch_authoritative === false;
}

function collectHistoricalBaselineIds(baseline, rebaseLedger) {
  const ids = new Set();
  if (baseline && baseline.epoch && baseline.epoch.predecessor_baseline_id) {
    ids.add(baseline.epoch.predecessor_baseline_id);
  }
  const rebases = (rebaseLedger && rebaseLedger.rebases) || [];
  for (const r of rebases) {
    if (r && r.predecessor_baseline_id) ids.add(r.predecessor_baseline_id);
    if (r && r.new_baseline_id) ids.add(r.new_baseline_id);
  }
  if (baseline && baseline.id) ids.delete(baseline.id);
  return ids;
}

function isPreservedHistoricalQa9(qa9Result, baseline, rebaseLedger) {
  if (!qa9Result || !qa9Result.baseline_id || !baseline) return false;
  if (qa9Result.baseline_id === baseline.id) return false;
  return collectHistoricalBaselineIds(baseline, rebaseLedger).has(qa9Result.baseline_id);
}

function liveQa9EpochBindingOk(input) {
  const evidence = input && input.evidence;
  const qa9Result = input && input.qa9Result;
  const baseline = input && input.baseline;
  const rebaseLedger = input && input.rebaseLedger;
  if (!qa9Result || !baseline) return false;
  if (isQa9StaleAggregation(evidence)) {
    return isPreservedHistoricalQa9(qa9Result, baseline, rebaseLedger);
  }
  return qa9Result.baseline_id === baseline.id;
}

/**
 * @returns {{ stale: boolean, fails: string[] }}
 */
function rejectQa9Laundry(input) {
  const evidence = input && input.evidence;
  const qa9Result = input && input.qa9Result;
  const baseline = input && input.baseline;
  const fails = [];
  const stale = isQa9StaleAggregation(evidence);
  const qa9Suite = ((evidence && evidence.suites) || []).find((s) => s.suite_id === "QA9");
  const currentId = baseline && baseline.id;

  if (stale) {
    if (qa9Result && currentId && qa9Result.baseline_id === currentId) {
      fails.push("predecessor qa9-result.baseline_id rewritten onto current baseline (aggregation washing)");
    }
    if (evidence && evidence.verdict === "ENGINE_ACCEPTED_FOR_UI") {
      fails.push("predecessor QA9 must not make current-epoch evidence.verdict ENGINE_ACCEPTED_FOR_UI");
    }
    if (qa9Suite && qa9Suite.completion_status === "COMPLETE") {
      fails.push("stale QA9 must not be current-epoch COMPLETE");
    }
    if (
      qa9Result &&
      qa9Result.engine_accepted_for_ui === "ISSUED" &&
      evidence &&
      evidence.verdict === "ENGINE_ACCEPTED_FOR_UI"
    ) {
      fails.push("predecessor ISSUED must not be current certification");
    }
  } else {
    if (qa9Result && evidence && evidence.verdict && qa9Result.verdict && evidence.verdict !== qa9Result.verdict) {
      fails.push("evidence-manifest.verdict must match qa9-result.verdict");
    }
    if (evidence && evidence.verdict === "ENGINE_ACCEPTED_FOR_UI") {
      if (!qa9Result) {
        fails.push("must not accept without current qa9-result evidence");
      } else if (currentId && qa9Result.baseline_id !== currentId) {
        fails.push("must not accept without current-epoch qa9-result");
      } else if (!qa9Suite || !qa9Suite.run_id || !qa9Suite.checksum) {
        fails.push("must not accept without current QA9 suite run_id+checksum");
      }
    }
  }

  return { stale, fails };
}

module.exports = {
  isQa9StaleAggregation,
  collectHistoricalBaselineIds,
  isPreservedHistoricalQa9,
  liveQa9EpochBindingOk,
  rejectQa9Laundry,
};

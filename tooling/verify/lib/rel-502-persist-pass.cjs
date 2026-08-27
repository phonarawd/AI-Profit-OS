/**
 * REL-502 persist-safety PASS invariants.
 * COMPLETE != PASS. 누적 P0/P1 과 critical.failed 는 후속 스위트가 지울 수 없다.
 */
"use strict";

const { isCriticalDirty, pickCriticalCounts, inspectAcceptanceMessaging } = require(
  "../../engine-acceptance/lib/critical-invariant.cjs",
);

function inspectSuitePersistPass(spec, result, slot) {
  const fails = [];
  const id = spec.id;
  if (!result) {
    fails.push(id + " result missing");
    return fails;
  }
  if (result.completion_status !== "COMPLETE") fails.push(id + " result not COMPLETE");
  if (spec.baselineId && result.baseline_id !== spec.baselineId) {
    fails.push(id + " result.baseline_id != current epoch");
  }
  if (!slot || slot.completion_status !== "COMPLETE") fails.push(id + " evidence slot not COMPLETE");
  if (spec.baselineId && (!slot || slot.baseline_id !== spec.baselineId)) {
    fails.push(id + " evidence slot baseline_id != current epoch");
  }
  if (spec.mode && result.mode !== spec.mode) {
    fails.push(id + " mode must be " + spec.mode + " (got " + String(result.mode) + ")");
  }
  if (result.product_mutation !== 0 && result.product_mutation !== undefined) {
    fails.push(id + " product_mutation must be 0");
  }
  if (result.all_checks_pass !== true) {
    fails.push(id + " all_checks_pass != true (COMPLETE != PASS)");
  }
  const ci = result.critical_invariant || {};
  if (isCriticalDirty(ci)) {
    const c = pickCriticalCounts(ci);
    fails.push(
      id +
        " critical_invariant dirty blocked=" +
        c.blocked +
        " skipped=" +
        c.skipped +
        " uncovered=" +
        c.uncovered +
        " failed=" +
        c.failed,
    );
  }
  if (result.critical_invariant_cumulative && isCriticalDirty(result.critical_invariant_cumulative)) {
    const c = pickCriticalCounts(result.critical_invariant_cumulative);
    fails.push(
      id +
        " critical_invariant_cumulative dirty blocked=" +
        c.blocked +
        " skipped=" +
        c.skipped +
        " uncovered=" +
        c.uncovered +
        " failed=" +
        c.failed,
    );
  }
  return fails;
}

function inspectDefectRegistryPersistSafe(defects) {
  const fails = [];
  if (!defects || !defects.counts) {
    fails.push("defects.v1.json missing counts");
    return fails;
  }
  if ((defects.counts.P0 || 0) > 0) {
    fails.push("defects registry P0 must be 0 (got " + defects.counts.P0 + ")");
  }
  if ((defects.counts.P1 || 0) > 0) {
    fails.push("defects registry P1 must be 0 (got " + defects.counts.P1 + ")");
  }
  return fails;
}

function inspectCurrentEpochPersistPass(opts) {
  const fails = [];
  const required = opts.required || [];
  for (const spec of required) {
    const result = opts.results && opts.results[spec.id];
    const slot = (opts.evidence && opts.evidence.suites || []).find((s) => s.suite_id === spec.id);
    fails.push(...inspectSuitePersistPass({ ...spec, baselineId: opts.baselineId }, result, slot));
  }
  fails.push(...inspectDefectRegistryPersistSafe(opts.defects));
  fails.push(
    ...inspectAcceptanceMessaging({
      defects: opts.defects,
      verdictReason: opts.evidence && opts.evidence.verdict_reason,
      reportText: opts.reportText,
      critical: opts.evidence && opts.evidence.critical_invariant,
    }),
  );
  return fails;
}

module.exports = {
  inspectSuitePersistPass,
  inspectDefectRegistryPersistSafe,
  inspectCurrentEpochPersistPass,
};

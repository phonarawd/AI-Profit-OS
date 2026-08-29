/**
 * QA5 formal-chain contract.
 *
 * This workflow's formal QA5 path is tiny + fault harness + both axes.
 * Full mode is also allowed. Missing fault hook is not formal.
 */
"use strict";

function evaluateQa5FormalChain(result) {
  const fails = [];
  if (!result || typeof result !== "object") {
    fails.push("qa5-result required");
    return { ok: false, fails, formal: null };
  }
  const mode = result.mode;
  if (mode !== "tiny" && mode !== "full") {
    fails.push("qa5 mode must be tiny|full");
  }
  const fw = result.checks && result.checks.failure_world;
  if (!fw) {
    fails.push("failure_world check required");
    return { ok: false, fails, formal: null };
  }
  if (!fw.fault_hook || fw.fault_hook.available !== true) {
    fails.push("formal QA5 requires fault_hook.available=true");
  }
  const a1 = fw.axes && fw.axes.axis1_expected_degradation_fallback;
  const a2 = fw.axes && fw.axes.axis2_post_recovery_invariant;
  if (!a1 || a1.status !== "PASS") {
    fails.push("axis1_expected_degradation_fallback must PASS");
  }
  if (!a2 || a2.status !== "PASS") {
    fails.push("axis2_post_recovery_invariant must PASS");
  }
  if ((a1 && Number(a1.scenario_count) < 1) || (a2 && Number(a2.scenario_count) < 1)) {
    fails.push("both axes must have at least one scenario");
  }
  return {
    ok: fails.length === 0,
    fails,
    formal: mode === "full" ? "full+fault" : "tiny+fault",
  };
}

module.exports = { evaluateQa5FormalChain };

/** T1 — pre-push slice gate (T0 + path-aware extras, no next/opennext) */
const { runGateSteps } = require("./gate-runner.cjs");
const { stepsForTier, t1PushPlan, T1_PUSH } = require("./gate-tiers.cjs");

const t1 = t1PushPlan();
console.log(
  `[verify:gate:push] T1 extras ${t1.scripts.length}/${T1_PUSH.length} (${t1.reason})`,
);
runGateSteps(stepsForTier("push"), "verify:gate:push");

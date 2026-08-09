/** T1 — pre-push slice gate (T0 + infra + domain stubs, no next/opennext) */
const { runGateSteps } = require("./gate-runner.cjs");
const { stepsForTier } = require("./gate-tiers.cjs");

runGateSteps(stepsForTier("push"), "verify:gate:push");

/** T2 — CI / main full gate (backend-only · no Next/OpenNext app build) */
const { runGateSteps } = require("./gate-runner.cjs");
const { stepsForTier } = require("./gate-tiers.cjs");

runGateSteps(stepsForTier("full"), "verify:gate");

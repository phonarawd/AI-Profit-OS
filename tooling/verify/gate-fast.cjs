/** T0 — pre-commit fast gate */
const { runGateSteps } = require("./gate-runner.cjs");
const { stepsForTier } = require("./gate-tiers.cjs");

runGateSteps(stepsForTier("fast"), "verify:gate:fast");

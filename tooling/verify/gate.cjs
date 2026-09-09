/** T2 — CI / main. SSOT = gate-tiers stepsForTier("full") · api-nest-build.cjs only */
const { runGateSteps } = require("./gate-runner.cjs");
const { stepsForTier } = require("./gate-tiers.cjs");

runGateSteps(stepsForTier("full"), "verify:gate");

/**
 * Thin require bridge → @aipo/simulation-engine (CJS)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const eng = require("@aipo/simulation-engine") as typeof import("@aipo/simulation-engine");

export const PLATFORM_RESERVE_ACCOUNT_CODE = eng.PLATFORM_RESERVE_ACCOUNT_CODE;
export const GATE_THRESHOLDS = eng.GATE_THRESHOLDS;
export const evaluateS1 = eng.evaluateS1;
export const evaluateS2 = eng.evaluateS2;
export const evaluateS3 = eng.evaluateS3;
export const evaluateS4 = eng.evaluateS4;
export const evaluateGates = eng.evaluateGates;
export const evaluatePayoutFeasibility = eng.evaluatePayoutFeasibility;
export const scoreFromFeasibility = eng.scoreFromFeasibility;
export const buildSimulationReport = eng.buildSimulationReport;
export const payoutFeasible = eng.payoutFeasible;
export const evaluateGrowthEnableGate = eng.evaluateGrowthEnableGate;

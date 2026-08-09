/**
 * @aipo/simulation-engine — Engine §51.4 M0.5
 * CI: verify:simulation-gate
 */

"use strict";

const {
  GATE_THRESHOLDS,
  evaluateS1,
  evaluateS2,
  evaluateS3,
  evaluateS4,
  evaluateGates,
} = require("./gates.cjs");
const {
  evaluatePayoutFeasibility,
  scoreFromFeasibility,
} = require("./feasibility.cjs");
const { buildSimulationReport, payoutFeasible } = require("./report.cjs");
const { evaluateGrowthEnableGate } = require("./growth-gate.cjs");

/** Ledger account code · Engine §0.0.4.3 */
const PLATFORM_RESERVE_ACCOUNT_CODE = "ops.platform_reserve_usdt";

module.exports = {
  PLATFORM_RESERVE_ACCOUNT_CODE,
  GATE_THRESHOLDS,
  evaluateS1,
  evaluateS2,
  evaluateS3,
  evaluateS4,
  evaluateGates,
  evaluatePayoutFeasibility,
  scoreFromFeasibility,
  buildSimulationReport,
  payoutFeasible,
  evaluateGrowthEnableGate,
};

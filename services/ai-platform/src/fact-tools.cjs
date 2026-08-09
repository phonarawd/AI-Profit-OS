/**
 * Fact tools catalog — Engine §47.12 P-lane only · read-only
 * Mutation / withdraw execute tools MUST NOT appear
 */

"use strict";

const { isForbiddenMoneyAction } = require("./levels.cjs");

/** P-lane read-only Fact tools (Nest implements loaders) */
const FACT_TOOLS = Object.freeze([
  "getBalance",
  "getBuckets",
  "getDepositUsdt",
  "getKrwDeposit",
  "getOpportunity",
  "getExecution",
  "getKyc",
  "getReferral",
  "getCampaigns",
  "getPractice",
  "getUsdtGuide",
  "searchHelp",
  "getBenefitsSummary",
]);

const FACT_TOOL_SET = new Set(FACT_TOOLS);

/**
 * @param {string} name
 */
function isFactTool(name) {
  return FACT_TOOL_SET.has(String(name || ""));
}

/**
 * Tools allowed for a lane
 * @param {"P"|"G"|"S"} lane
 * @returns {readonly string[]}
 */
function toolsForLane(lane) {
  if (lane === "P") return FACT_TOOLS;
  return Object.freeze([]);
}

/**
 * @param {"P"|"G"|"S"} lane
 * @param {string[]} tools
 */
function assertToolsAllowedForLane(lane, tools) {
  const list = Array.isArray(tools) ? tools : [];
  if ((lane === "G" || lane === "S") && list.length > 0) {
    const err = new Error(`LANE_${lane}_TOOLS_MUST_BE_EMPTY`);
    err.code = "LANE_TOOLS_FORBIDDEN";
    throw err;
  }
  for (const t of list) {
    if (isForbiddenMoneyAction(t)) {
      const err = new Error(`FACT_TOOL_MUTATION_FORBIDDEN:${t}`);
      err.code = "FACT_TOOL_MUTATION_FORBIDDEN";
      throw err;
    }
    if (lane === "P" && !isFactTool(t)) {
      const err = new Error(`FACT_TOOL_UNKNOWN:${t}`);
      err.code = "FACT_TOOL_UNKNOWN";
      throw err;
    }
  }
}

module.exports = {
  FACT_TOOLS,
  isFactTool,
  toolsForLane,
  assertToolsAllowedForLane,
};

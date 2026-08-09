/**
 * Answer Guard — Engine §47.2 / §47.4
 * forbidden + freshness(P) + no-money-tools(G) + lane match + Twin≠money
 */

"use strict";

const { assertToolsAllowedForLane, isFactTool } = require("./fact-tools.cjs");
const {
  isFactFresh,
  partitionFreshness,
} = require("./fact-card-loader.cjs");
const { isForbiddenMoneyAction } = require("./levels.cjs");
const { GUARD_STATUSES } = require("./ai-log.cjs");

const FORBIDDEN_TWIN_MONEY_KEYS = Object.freeze([
  "balanceUsdt",
  "expectedProfitUsdt",
  "liveQuote",
]);

/** Copy / answer fragments that imply AI execution of money */
const FORBIDDEN_ANSWER_PATTERNS = Object.freeze([
  /출금\s*완료/i,
  /지급\s*했습니다/i,
  /한도를\s*올렸/i,
  /원금\s*보장/i,
  /확정\s*수익/i,
  /모든\s*질문.{0,12}오류\s*0/i,
]);

/**
 * @param {object} input
 * @param {"P"|"G"|"S"} input.lane
 * @param {string[]} [input.toolsCalled]
 * @param {object[]} [input.factsUsed]
 * @param {object|null} [input.twin]
 * @param {string} [input.answerText]
 * @param {string|Date|number} [input.now]
 * @param {boolean} [input.usedTwinForMoney]
 */
function guardAnswer(input = {}) {
  const lane = String(input.lane || "");
  if (!["P", "G", "S"].includes(lane)) {
    return fail("block", `invalid_lane:${lane}`);
  }

  const tools = Array.isArray(input.toolsCalled || input.tools_called)
    ? [...(input.toolsCalled || input.tools_called)]
    : [];

  try {
    assertToolsAllowedForLane(lane, tools);
  } catch (e) {
    return fail("block", e.message || "tools_forbidden");
  }

  for (const t of tools) {
    if (isForbiddenMoneyAction(t)) {
      return fail("block", `mutation_tool:${t}`);
    }
  }

  if (input.usedTwinForMoney === true) {
    return fail("block", "twin_used_for_money");
  }

  const twin = input.twin;
  if (twin && typeof twin === "object") {
    for (const k of FORBIDDEN_TWIN_MONEY_KEYS) {
      if (Object.prototype.hasOwnProperty.call(twin, k)) {
        return fail("block", `twin_money_key:${k}`);
      }
    }
  }

  const answerText = String(input.answerText || input.answer_text || "");
  for (const re of FORBIDDEN_ANSWER_PATTERNS) {
    if (re.test(answerText)) {
      return fail("block", `forbidden_answer_pattern:${re}`);
    }
  }

  // G mentions platform money → reroute P
  if (lane === "G" && needsPlatformMoneyReroute(answerText, input.userText)) {
    return fail("reroute_p", "g_mentions_platform_money");
  }

  if (lane === "S") {
    if (tools.length > 0) return fail("block", "s_lane_tools");
    return ok("pass", "refuse_execute_only");
  }

  if (lane === "P") {
    const facts = Array.isArray(input.factsUsed || input.facts_used)
      ? input.factsUsed || input.facts_used
      : [];
    const moneyTools = tools.filter(isFactTool);
    if (moneyTools.length > 0) {
      if (facts.length === 0) {
        return fail("refresh", "p_money_tool_without_fact");
      }
      const part = partitionFreshness(facts, {
        now: input.now,
      });
      if (part.needsRefresh) {
        return fail("refresh", "fact_expired");
      }
      for (const f of facts) {
        if (!isFactFresh(f, { now: input.now })) {
          return fail("refresh", "fact_stale");
        }
      }
    }
  }

  if (!GUARD_STATUSES.includes("pass")) {
    /* lock import */
  }
  return ok("pass");
}

function needsPlatformMoneyReroute(answerText, userText) {
  const t = `${answerText}\n${userText || ""}`;
  return /잔액|출금\s*가능|예상\s*수익|balanceUsdt|expectedProfitUsdt|호가|시세/i.test(
    t,
  );
}

function ok(status, reason) {
  const out = { status, pass: status === "pass" };
  if (reason) out.reason = reason;
  return Object.freeze(out);
}

function fail(status, reason) {
  return Object.freeze({ status, pass: false, reason: String(reason) });
}

module.exports = {
  FORBIDDEN_TWIN_MONEY_KEYS,
  FORBIDDEN_ANSWER_PATTERNS,
  guardAnswer,
};

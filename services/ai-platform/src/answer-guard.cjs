/**
 * Answer Guard — Engine §47.2 / §47.4 / §47.16.5
 * forbidden + freshness(P) + no-money-tools(G) + lane match + Twin≠money
 * + P/llm_p numeric grounding (ungrounded)
 */

"use strict";

const { assertToolsAllowedForLane, isFactTool } = require("./fact-tools.cjs");
const {
  isFactFresh,
  partitionFreshness,
} = require("./fact-card-loader.cjs");
const { isForbiddenMoneyAction } = require("./levels.cjs");
const { GUARD_STATUSES } = require("./ai-log.cjs");
const { groundAnswerNumerics } = require("./numeric-grounding.cjs");

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

/** Answer claims a tool result that was never obtained (tools_called=[]). */
const FAKE_TOOL_RESULT_PATTERNS = Object.freeze([
  /getBalance\s*(결과|returned|확인)/i,
  /getExecution\s*(결과|returned|확인)/i,
  /툴이\s*(확인|조회|반환)/,
  /도구\s*결과/,
  /execute_withdraw/,
]);

/**
 * Engine §47.16.4 — output residual guard (meta / policy exposure).
 * 2nd defense after OFF_TOPIC input redirect; does not claim complete coverage.
 */
const META_EXPOSURE_MARKERS = Object.freeze([
  /시스템\s*프롬프트/i,
  /SYSTEM_BASE/,
  /FACTS_JSON/,
  /RECENT_MEMORY/,
  /REFERENCE_JSON/,
  /GROUNDED_NUMERIC_JSON/,
  /tools_called/i,
  /answer_path\s*=/i,
  /ignore\s+previous\s+instructions/i,
  /you are (chatgpt|claude|gemini)/i,
  /숨겨진\s*정책/,
  /\[SYSTEM\]/i,
]);

/**
 * @param {object} input
 * @param {"P"|"G"|"S"} input.lane
 * @param {string[]} [input.toolsCalled]
 * @param {object[]} [input.factsUsed]
 * @param {object|null} [input.twin]
 * @param {string} [input.answerText]
 * @param {string} [input.answerPath] — Engine §47.16.5 numeric grounding (P·llm_p)
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
  for (const re of META_EXPOSURE_MARKERS) {
    if (re.test(answerText)) {
      return fail("block", `meta_exposure:${re}`);
    }
  }

  if (tools.length === 0) {
    for (const re of FAKE_TOOL_RESULT_PATTERNS) {
      if (re.test(answerText)) {
        return fail("block", `fake_tool_result:${re}`);
      }
    }
  }

  if (
    lane === "G" &&
    tools.length === 0 &&
    /(?:\d+(?:\.\d+)?)\s*USDT/.test(answerText) &&
    /잔액|수익|출금\s*가능/.test(answerText)
  ) {
    return fail("block", "g_fabricated_platform_money");
  }

  // G mentions platform money → reroute P
  if (!isTerminalScopeRedirect(input) && lane === "G") {
    // USER INTENT only — generated/template output must not grant P tools.
    if (userIntentAuthorizesPlatformMoney(input.userText)) {
      return fail("reroute_p", "g_mentions_platform_money");
    }
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

    // Engine §47.16.5 — P · llm_p only; ungrounded → orchestrator fact fallback
    const answerPath = String(input.answerPath || input.answer_path || "");
    if (answerPath === "llm_p") {
      const ng = groundAnswerNumerics({
        lane: "P",
        answerPath: "llm_p",
        answerText,
        factsUsed: facts,
        now: input.now,
      });
      if (!ng.pass) {
        return fail("ungrounded", ng.reason || "ungrounded_numeric");
      }
    }
  }

  if (!GUARD_STATUSES.includes("pass") || !GUARD_STATUSES.includes("ungrounded")) {
    /* lock import */
  }
  return ok("pass");
}

const PLATFORM_MONEY_CUE =
  /잔액|출금\s*가능|예상\s*수익|balanceUsdt|expectedProfitUsdt|호가|시세/i;

function userIntentAuthorizesPlatformMoney(userText) {
  return PLATFORM_MONEY_CUE.test(String(userText || ""));
}

function isTerminalScopeRedirect(input = {}) {
  const answerPath = String(input.answerPath || input.answer_path || "");
  const decision = String(input.scopeDecision || input.scope_decision || "");
  return answerPath === "scope_redirect" || decision === "scope_redirect";
}

/**
 * Post-generation guard must never expand tool/data authority from model output.
 * User-intent G->P may still load P facts. Terminal scope_redirect / S never escalate.
 * @param {object} input
 * @returns {boolean}
 */
function mayEscalateToPlatformFacts(input = {}) {
  if (isTerminalScopeRedirect(input)) return false;
  const answerPath = String(input.answerPath || input.answer_path || "");
  if (answerPath === "refuse_s") return false;
  if (String(input.lane || "") === "S") return false;
  return String(input.guardStatus || input.guard_status || "") === "reroute_p";
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
  FAKE_TOOL_RESULT_PATTERNS,
  META_EXPOSURE_MARKERS,
  guardAnswer,
  userIntentAuthorizesPlatformMoney,
  isTerminalScopeRedirect,
  mayEscalateToPlatformFacts,
};

/**
 * Assistant router — Engine §47.2 / §47.14
 * Intent → lane ∈ {P, G, S} → answer_path · tools
 */

"use strict";

const { toolsForLane, assertToolsAllowedForLane } = require("./fact-tools.cjs");
const { guardAnswer } = require("./answer-guard.cjs");
const { LANES, ANSWER_PATHS } = require("./ai-log.cjs");

/** Sensitive execute intents — refuse only */
const S_PATTERNS = Object.freeze([
  /출금\s*해\s*줘/,
  /출금해줘/,
  /출금\s*실행/,
  /지금\s*출금/,
  /한도\s*올려/,
  /한도를\s*올/,
  /지급\s*해/,
  /지급해줘/,
  /circuit\s*열/,
  /서킷\s*열/,
  /\bexecute[_ ]?withdraw\b/i,
  /\braise[_ ]?limit\b/i,
  /\bpayout\b/i,
]);

/** Platform Fact intents */
const P_PATTERNS = Object.freeze([
  /잔액/,
  /버킷/,
  /얼마/,
  /입금/,
  /충전/,
  /출금\s*안내/,
  /출금\s*방법/,
  /출금\s*가능/,
  /미션/,
  /기회/,
  /예상\s*수익/,
  /KYC|본인\s*확인|신원/,
  /초대|친구\s*초대|추천/,
  /혜택/,
  /이벤트|캠페인|공지/,
  /연습|체험/,
  /테더|USDT|유에스디티/,
  /이용\s*법|약관|도움말|FAQ|어떻게\s*쓰/,
  /진행\s*중|매칭/,
  /\bbalance\b/i,
  /\bdeposit\b/i,
  /\bopportunity\b/i,
  /\breferral\b/i,
]);

/**
 * @param {string} text
 * @returns {"P"|"G"|"S"}
 */
function classifyLane(text) {
  const t = String(text || "").trim();
  if (!t) return "G";
  for (const re of S_PATTERNS) {
    if (re.test(t)) return "S";
  }
  for (const re of P_PATTERNS) {
    if (re.test(t)) return "P";
  }
  return "G";
}

/**
 * @param {"P"|"G"|"S"} lane
 * @param {object} [opts]
 */
function answerPathForLane(lane, opts = {}) {
  if (lane === "S") return "refuse_s";
  if (lane === "G") return "llm_g";
  if (opts.template === true) return "template";
  if (opts.rag === true) return "rag";
  if (opts.llm === true) return "llm_p";
  return "fact";
}

/**
 * Route a user utterance (no LLM call — path/tools only)
 * @param {object} input
 * @param {string} input.text
 * @param {object|null} [input.twin]
 * @param {object[]} [input.facts]
 * @param {string[]} [input.requestedTools]
 * @param {boolean} [input.template]
 * @param {boolean} [input.rag]
 * @param {boolean} [input.llm]
 */
function routeAssistant(input = {}) {
  const text = String(input.text || "");
  let lane = classifyLane(text);
  let rerouted = false;

  // Explicit: G text that still hits platform money keywords → P
  if (lane === "G" && /잔액|예상\s*수익|balanceUsdt|호가/i.test(text)) {
    lane = "P";
    rerouted = true;
  }

  if (!LANES.includes(lane)) {
    throw new Error(`ROUTER_INVALID_LANE:${lane}`);
  }

  const tools =
    lane === "P"
      ? Array.isArray(input.requestedTools) && input.requestedTools.length
        ? [...input.requestedTools]
        : defaultToolsForText(text)
      : [];

  assertToolsAllowedForLane(lane, tools);

  const answer_path = answerPathForLane(lane, {
    template: input.template,
    rag: input.rag,
    llm: input.llm,
  });
  if (!ANSWER_PATHS.includes(answer_path)) {
    throw new Error(`ROUTER_INVALID_PATH:${answer_path}`);
  }

  const guard = guardAnswer({
    lane,
    toolsCalled: tools,
    factsUsed: input.facts || [],
    twin: input.twin || null,
    userText: text,
    answerText: "",
    usedTwinForMoney: false,
    now: input.now,
  });

  // P money tools without facts → refresh path (caller must reload Fact)
  let finalPath = answer_path;
  if (guard.status === "refresh" && lane === "P") {
    finalPath = "fact";
  }
  if (lane === "S") finalPath = "refuse_s";

  return Object.freeze({
    schema: "assistant-route.v1",
    intent: summarizeIntent(text, lane),
    lane,
    rerouted,
    answer_path: finalPath,
    tools_called: Object.freeze([...tools]),
    tools_available: toolsForLane(lane),
    guard_result: guard,
    twin_snapshot_id:
      input.twin?.twinSnapshotId || input.twin?.twin_snapshot_id || null,
  });
}

function defaultToolsForText(text) {
  const t = String(text);
  if (/잔액|버킷|얼마|balance/i.test(t)) return ["getBalance", "getBuckets"];
  if (/입금|충전|deposit/i.test(t)) return ["getDepositUsdt", "getKrwDeposit"];
  if (/기회|미션|예상\s*수익|opportunity/i.test(t)) return ["getOpportunity"];
  if (/KYC|본인|신원/i.test(t)) return ["getKyc"];
  if (/초대|친구|referral/i.test(t)) return ["getReferral"];
  if (/혜택|benefit/i.test(t)) return ["getBenefitsSummary"];
  if (/이벤트|캠페인|공지/i.test(t)) return ["getCampaigns"];
  if (/연습|체험|practice/i.test(t)) return ["getPractice"];
  if (/테더|USDT|유에스디티/i.test(t)) return ["getUsdtGuide"];
  if (/이용|약관|도움|FAQ|어떻게/i.test(t)) return ["searchHelp"];
  if (/출금/i.test(t)) return ["getBalance", "getBuckets"]; // 안내 only
  return ["getOpportunity"];
}

function summarizeIntent(text, lane) {
  if (lane === "S") return "sensitive_execute";
  if (lane === "G") return "general_chat";
  if (/잔액|balance/i.test(text)) return "balance";
  if (/입금|deposit/i.test(text)) return "deposit";
  if (/출금/i.test(text)) return "withdraw_guide";
  if (/기회|미션|opportunity/i.test(text)) return "opportunity";
  if (/초대|referral/i.test(text)) return "referral";
  if (/혜택/i.test(text)) return "benefits";
  return "platform_help";
}

module.exports = {
  S_PATTERNS,
  P_PATTERNS,
  classifyLane,
  answerPathForLane,
  routeAssistant,
};

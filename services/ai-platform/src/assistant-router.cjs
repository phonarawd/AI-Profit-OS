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
  /계정\s*탈취|비밀번호\s*(빼|훔|털)|해킹\s*해/,
  /KYC\s*우회|본인\s*확인\s*우회|한도\s*우회|인증\s*우회/,
  /자금\s*세탁|불법\s*자금|탈세\s*(방법|도와)/,
  /\bmoney\s*launder/i,
  /\bbypass\s*(kyc|limit|auth)/i,
  /\bsteal\s*(password|account)\b/i,
]);

/**
 * Engine §47.16.4 — known off-topic / injection class (code-enforced).
 * Match → answer_path=scope_redirect · tools=[] · LLM 미호출.
 * Complete domain classification = NOT_PROVEN (documented residual).
 */
const OFF_TOPIC_PATTERNS = Object.freeze([
  /코드\s*(짜|작성)|코딩\s*(해|좀)|프로그래밍|파이썬\s*코드|자바스크립트\s*코드|함수\s*만들어/i,
  /소설\s*써|시\s*(좀\s*)?써|작문|창작\s*해|짧은\s*이야기\s*써/,
  /축구|야구|농구|스포츠\s*경기|오늘\s*경기/,
  /연애\s*상담|썸\s*타는|남자친구|여자친구\s*사귀/,
  /지시\s*무시|이전\s*(규칙|지시|프롬프트)\s*무시|ignore\s+(all\s+)?(previous|prior)\s+instructions?/i,
  /시스템\s*프롬프트\s*(보여|출력|알려)|숨겨진\s*정책|system\s*prompt/i,
  /일반\s*Gemini처럼|ChatGPT처럼\s*행동|클로드처럼\s*행동|jailbreak/i,
  /SYSTEM_BASE|FACTS_JSON\s*(보여|출력|알려)|GROUNDED[_ ]NUMERIC/,
  /tools\s*=\s*\[|강제\s*툴|툴을\s*강제|force\s+tools/i,
  /developer\s+mode|정책\s*무시|disable\s+safety/i,
]);

/**
 * Assurance tiers — Engine §47.16.4 (완전 차단 선언 금지)
 * complete_NOT_PROVEN is documented residual risk, never a runtime "guaranteed" claim.
 */
const SCOPE_ASSURANCE = Object.freeze({
  KNOWN_CODE_ENFORCED: "known_code_enforced",
  AMBIGUOUS_POLICY_RESIDUAL: "ambiguous_policy_residual",
  COMPLETE_NOT_PROVEN: "complete_NOT_PROVEN",
});

/**
 * Execution-state Fact intents — Engine §47.16.3
 * Must classify as P and reach getExecution (not opportunity fallback).
 */
const EXECUTION_PATTERNS = Object.freeze([
  /진행\s*상태/,
  /진행\s*상황/,
  /어떻게\s*되고/,
  /안전\s*중단/,
  /중단\s*(된|됐)/,
  /매칭\s*상태/,
  /거래\s*상태/,
  /체결/,
]);

/** Platform Fact intents */
const P_PATTERNS = Object.freeze([
  /잔액/,
  /버킷/,
  /지갑/,
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
  ...EXECUTION_PATTERNS,
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
  // S before P — execute/mutation requests must never fall into Fact tools
  for (const re of S_PATTERNS) {
    if (re.test(t)) return "S";
  }
  for (const re of P_PATTERNS) {
    if (re.test(t)) return "P";
  }
  return "G";
}

/**
 * @param {string} text
 */
function matchesExecutionIntent(text) {
  const t = String(text || "");
  if (EXECUTION_PATTERNS.some((re) => re.test(t))) return true;
  // Existing P cue "진행 중" must also reach getExecution (§47 tools table)
  return /진행\s*중/.test(t);
}

/**
 * @param {string} text
 */
function matchesOffTopic(text) {
  const t = String(text || "");
  return OFF_TOPIC_PATTERNS.some((re) => re.test(t));
}

/**
 * Structured scope decision — inspectable by orch/verify (§47.16.4).
 * Precedence: S refuse > off-topic redirect > P in-scope > G general_safe.
 * Does not rewrite S/P/G classification taxonomy; gates tools/path.
 * @param {string} text
 * @param {"P"|"G"|"S"} lane
 */
function decideScope(text, lane) {
  if (lane === "S") {
    return Object.freeze({
      decision: "refuse_s",
      assurance: SCOPE_ASSURANCE.KNOWN_CODE_ENFORCED,
      reason: "sensitive_execute",
      toolsAllowed: Object.freeze([]),
      allowFacts: false,
      allowLlm: false,
    });
  }
  if (matchesOffTopic(text)) {
    return Object.freeze({
      decision: "scope_redirect",
      assurance: SCOPE_ASSURANCE.KNOWN_CODE_ENFORCED,
      reason: "off_topic_or_injection",
      toolsAllowed: Object.freeze([]),
      allowFacts: false,
      allowLlm: false,
    });
  }
  if (lane === "P") {
    return Object.freeze({
      decision: "in_scope",
      assurance: SCOPE_ASSURANCE.KNOWN_CODE_ENFORCED,
      reason: "platform_fact",
      toolsAllowed: null,
      allowFacts: true,
      allowLlm: true,
    });
  }
  return Object.freeze({
    decision: "general_safe",
    assurance: SCOPE_ASSURANCE.AMBIGUOUS_POLICY_RESIDUAL,
    reason: "general_chat",
    toolsAllowed: Object.freeze([]),
    allowFacts: false,
    allowLlm: true,
  });
}

/**
 * @param {"P"|"G"|"S"} lane
 * @param {object} [opts]
 */
function answerPathForLane(lane, opts = {}) {
  if (lane === "S") return "refuse_s";
  if (opts.scopeRedirect === true) return "scope_redirect";
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

  // Scope guard sits on top of lane taxonomy (does not invent mutate tools).
  const scope = decideScope(text, lane);
  if (scope.decision === "scope_redirect") {
    lane = "G";
    const guard = guardAnswer({
      lane: "G",
      toolsCalled: [],
      factsUsed: [],
      twin: input.twin || null,
      userText: text,
      answerText: "",
      usedTwinForMoney: false,
      now: input.now,
    });
    return Object.freeze({
      schema: "assistant-route.v1",
      intent: "scope_redirect",
      lane: "G",
      rerouted,
      answer_path: "scope_redirect",
      tools_called: Object.freeze([]),
      tools_available: toolsForLane("G"),
      guard_result: guard,
      scope,
      twin_snapshot_id:
        input.twin?.twinSnapshotId || input.twin?.twin_snapshot_id || null,
    });
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
    scope,
    twin_snapshot_id:
      input.twin?.twinSnapshotId || input.twin?.twin_snapshot_id || null,
  });
}

function defaultToolsForText(text) {
  const t = String(text);
  // Deterministic precedence: balance/wallet → deposit → execution → opportunity…
  // getExecution MUST be reachable before the getOpportunity fallback (§47.16.3).
  if (/잔액|버킷|지갑|얼마|balance/i.test(t)) return ["getBalance", "getBuckets"];
  if (/입금|충전|deposit/i.test(t)) return ["getDepositUsdt", "getKrwDeposit"];
  if (matchesExecutionIntent(t)) return ["getExecution"];
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
  if (/잔액|지갑|balance/i.test(text)) return "balance";
  if (/입금|deposit/i.test(text)) return "deposit";
  if (/출금/i.test(text)) return "withdraw_guide";
  if (matchesExecutionIntent(text)) return "execution";
  if (/기회|미션|opportunity/i.test(text)) return "opportunity";
  if (/초대|referral/i.test(text)) return "referral";
  if (/혜택/i.test(text)) return "benefits";
  return "platform_help";
}

module.exports = {
  S_PATTERNS,
  P_PATTERNS,
  EXECUTION_PATTERNS,
  OFF_TOPIC_PATTERNS,
  SCOPE_ASSURANCE,
  classifyLane,
  answerPathForLane,
  routeAssistant,
  defaultToolsForText,
  matchesExecutionIntent,
  matchesOffTopic,
  decideScope,
};

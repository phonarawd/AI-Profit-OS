/**
 * AI Layer levels — Engine §13
 * L1 explain/FAQ/search · L2 AI PICK/ranking · L3 simulation only (no auto payout)
 * Sensitive Decision = Rule Engine + Compliance only
 */

"use strict";

const AI_LEVELS = Object.freeze(["L1", "L2", "L3"]);

const LEVEL_POLICY = Object.freeze({
  L1: Object.freeze({
    ui: Object.freeze(["explain", "faq", "search"]),
    forbidden: Object.freeze(["money", "withdraw", "payout", "approve"]),
  }),
  L2: Object.freeze({
    ui: Object.freeze(["ai_pick_score", "ranking"]),
    forbidden: Object.freeze(["auto_approve", "withdraw", "payout", "money_execute"]),
  }),
  L3: Object.freeze({
    ui: Object.freeze(["simulation_only"]),
    forbidden: Object.freeze(["auto_payout", "money_execute", "withdraw", "approve"]),
  }),
});

/** Mutation / money tool names that must never appear in AI catalogs */
const FORBIDDEN_L3_MONEY_ACTIONS = Object.freeze([
  "withdraw",
  "payout",
  "auto_payout",
  "approve_withdraw",
  "execute_withdraw",
  "credit_balance",
  "ledger_post",
  "raise_limit",
  "open_circuit",
  "close_circuit",
  "money_execute",
  "auto_approve",
]);

/**
 * @param {string} level
 * @returns {boolean}
 */
function isAiLevel(level) {
  return AI_LEVELS.includes(level);
}

/**
 * @param {string} action
 * @returns {boolean}
 */
function isForbiddenMoneyAction(action) {
  const a = String(action || "")
    .trim()
    .toLowerCase();
  return FORBIDDEN_L3_MONEY_ACTIONS.some(
    (f) => a === f || a.includes(f) || a.endsWith(`.${f}`),
  );
}

/**
 * Guard — throws if AI path attempts L3 money execution
 * @param {string} action
 * @param {string} [level]
 */
function assertNoL3Money(action, level = "L2") {
  if (isForbiddenMoneyAction(action)) {
    const err = new Error(
      `AI_${level}_L3_MONEY_FORBIDDEN:${action}`,
    );
    err.code = "L3_MONEY_FORBIDDEN";
    throw err;
  }
  if (level === "L3" && isForbiddenMoneyAction(action)) {
    const err = new Error(`AI_L3_AUTO_PAYOUT_FORBIDDEN:${action}`);
    err.code = "L3_MONEY_FORBIDDEN";
    throw err;
  }
}

/**
 * L1 capability check — money tools 0
 * @param {string[]} tools
 */
function assertL1NoMoney(tools) {
  const list = Array.isArray(tools) ? tools : [];
  for (const t of list) {
    assertNoL3Money(t, "L1");
  }
}

module.exports = {
  AI_LEVELS,
  LEVEL_POLICY,
  FORBIDDEN_L3_MONEY_ACTIONS,
  isAiLevel,
  isForbiddenMoneyAction,
  assertNoL3Money,
  assertL1NoMoney,
};

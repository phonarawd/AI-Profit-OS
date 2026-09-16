/**
 * 공식 몰 참여 금액 — requiredCapitalUsdt=0 을 십진 문자열 "0"으로 허용.
 * 원장 지급액을 창작하지 않는다. 일일 5회·정지 가드는 호출측 유지.
 */
"use strict";

const {
  parseAmount,
  formatAmount,
  cmpAmount,
} = require("../../../market-intelligence/src/money.cjs");

/**
 * @param {{ amountUsdt?: string | null, requiredCapitalUsdt?: string | null }} input
 * @returns {{ amountUsdt: string, requiredCapitalUsdt: string }}
 */
function resolveParticipateAmountUsdt(input) {
  const requiredRaw = input && input.requiredCapitalUsdt;
  const required = formatAmount(
    parseAmount(
      requiredRaw == null || String(requiredRaw).trim() === ""
        ? "0"
        : String(requiredRaw),
    ),
  );
  const rawIn = input && input.amountUsdt;
  const raw =
    rawIn == null || String(rawIn).trim() === "" ? required : String(rawIn);
  let amount;
  try {
    amount = formatAmount(parseAmount(raw));
  } catch {
    const err = new Error("amountUsdt must be decimal string >= 0");
    err.code = "INVALID_AMOUNT";
    throw err;
  }
  if (cmpAmount(amount, "0") < 0) {
    const err = new Error("amountUsdt must be decimal string >= 0");
    err.code = "INVALID_AMOUNT";
    throw err;
  }
  if (cmpAmount(amount, required) !== 0) {
    const err = new Error("amountUsdt must equal requiredCapitalUsdt");
    err.code = "AMOUNT_MISMATCH";
    throw err;
  }
  return { amountUsdt: amount, requiredCapitalUsdt: required };
}

module.exports = { resolveParticipateAmountUsdt };

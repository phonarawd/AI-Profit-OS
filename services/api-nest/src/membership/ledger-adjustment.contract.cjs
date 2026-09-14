/**
 * F09 잔액 조정 · F10 수동 결과 정정 — 계약/dry-run만.
 * 허위 성공/수익 생성 제외. 재원·승인·통지 미확정. 실 쓰기 활성화 0.
 */

"use strict";

const ALLOWED_REASON_CODES = Object.freeze([
  "OPERATOR_COMPENSATION",
  "ERROR_CORRECTION",
  "OVERPAY_RECOVERY",
  "LEDGER_RECONCILE",
]);

const FORBIDDEN_INTENTS = Object.freeze([
  "FAKE_TRADE_SUCCESS",
  "SET_SUCCESS_RATE",
  "TOGGLE_PROFIT",
  "PRESENTATION_SETTLE",
  "OVERWRITE_BALANCE",
  "DELETE_LEDGER",
]);

function assertAmount(raw) {
  const s = String(raw ?? "");
  if (!/^[0-9]+(\.[0-9]+)?$/.test(s) || s === "0" || s === "0.0") {
    const err = new Error("amountUsdt must be a positive decimal string");
    err.code = "INVALID_AMOUNT";
    throw err;
  }
  return s;
}

/**
 * @param {object} input
 */
function dryRunBalanceAdjust(input) {
  if (input == null || typeof input !== "object") {
    const err = new Error("adjust input required");
    err.code = "INVALID_BODY";
    throw err;
  }
  if (FORBIDDEN_INTENTS.includes(String(input.intent || ""))) {
    const err = new Error("fake success/profit mutation is excluded");
    err.code = "FORBIDDEN_INTENT";
    throw err;
  }
  if (!ALLOWED_REASON_CODES.includes(String(input.reasonCode || ""))) {
    const err = new Error("reasonCode not in approved draft set");
    err.code = "REASON_UNAPPROVED";
    throw err;
  }
  if (!input.fundingAccount && input.direction === "increase") {
    const err = new Error("increase requires fundingAccount");
    err.code = "FUNDING_REQUIRED";
    throw err;
  }
  if (input.writeEnabled === true) {
    const err = new Error("balance adjust write is not activated");
    err.code = "WRITE_DISABLED";
    throw err;
  }
  if (input.clientNewBalance != null) {
    const err = new Error("client total balance is not writable");
    err.code = "CLIENT_BALANCE_FORBIDDEN";
    throw err;
  }
  const amountUsdt = assertAmount(input.amountUsdt);
  const idempotencyKey = String(input.idempotencyKey || "");
  if (!idempotencyKey) {
    const err = new Error("idempotencyKey required");
    err.code = "IDEMPOTENCY_REQUIRED";
    throw err;
  }
  return {
    status: "dry_run",
    writeEnabled: false,
    direction: input.direction === "decrease" ? "decrease" : "increase",
    amountUsdt,
    bucket: String(input.bucket || "user_bucket"),
    reasonCode: input.reasonCode,
    beforeBalance: input.currentBalanceUsdt ?? null,
    afterBalancePreview: null,
    journalProposed: true,
    postingProposed: true,
    ledgerMutated: false,
    displayAs: input.reasonCode === "OPERATOR_COMPENSATION"
      ? "운영자 보상/정정"
      : "오류 정정",
    notTradeProfit: true,
  };
}

function dryRunResultCorrection(input) {
  if (input.evidenceRef == null || input.tradeRef == null) {
    const err = new Error("evidence and trade ref required");
    err.code = "EVIDENCE_REQUIRED";
    throw err;
  }
  if (input.intent === "FAKE_TRADE_SUCCESS" || input.confirmSuccessWithoutEvidence === true) {
    const err = new Error("success confirmation without evidence is excluded");
    err.code = "FORBIDDEN_INTENT";
    throw err;
  }
  if (input.writeEnabled === true) {
    const err = new Error("result correction write is not activated");
    err.code = "WRITE_DISABLED";
    throw err;
  }
  return {
    status: "dry_run",
    writeEnabled: false,
    originalResultPreserved: true,
    compensationLabeledSeparately: true,
    ledgerMutated: false,
  };
}

module.exports = {
  ALLOWED_REASON_CODES,
  FORBIDDEN_INTENTS,
  dryRunBalanceAdjust,
  dryRunResultCorrection,
};

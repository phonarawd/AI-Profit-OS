/**
 * Money §49.9 executable guards — pure checks used by wallet/risk services.
 * P4/P5/P6/P9/P1 · E12 · circuit · practice path.
 */

import {
  PROFIT_WITHDRAW_RATE_LIMIT_PER_MIN,
  RESTRICTED_PRINCIPAL_DAILY_CAP_USDT,
} from "../risk.types";

export type BucketSnap = {
  principalUsdt: string;
  profitUsdt: string;
  lockedUsdt: string;
  practiceUsdt: string;
};

export type WithdrawGuardInput = {
  mode: "profit" | "principal" | "combined";
  amountUsdt: string;
  debitProfitUsdt: string;
  debitPrincipalUsdt: string;
  principalConfirmToken?: string;
  buckets: BucketSnap;
  /** true when client tried to debit practice */
  practiceDebitAttempt?: boolean;
};

export type GuardReject = {
  code: string;
  toastCode: string;
  statusCode: number;
  ruleCode: "P1" | "P4" | "P5" | "P6" | "P9" | "P11" | "E12";
};

function parseUsdt(v: string): bigint {
  // amounts are decimal strings with up to 8 dp — compare as scaled ints via Number for guard-only
  // Prefer string compare via Number when safe for Day-1 magnitudes
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return -1n;
  return BigInt(Math.round(n * 1e8));
}

function gt(a: string, b: string): boolean {
  return parseUsdt(a) > parseUsdt(b);
}

/** P1/P11 — practice never withdrawable / mergeable as cash */
export function assertPracticeNotWithdrawable(
  input: Pick<WithdrawGuardInput, "practiceDebitAttempt" | "buckets"> & {
    requestedBucket?: string;
  },
): GuardReject | null {
  if (input.practiceDebitAttempt) {
    return {
      code: "PRACTICE_NOT_WITHDRAWABLE",
      toastCode: "PRACTICE_NOT_WITHDRAWABLE",
      statusCode: 403,
      ruleCode: "P1",
    };
  }
  if (input.requestedBucket === "practice") {
    return {
      code: "PRACTICE_NOT_WITHDRAWABLE",
      toastCode: "PRACTICE_NOT_WITHDRAWABLE",
      statusCode: 403,
      ruleCode: "P11",
    };
  }
  return null;
}

/** P4 — profit ceiling · P5 — locked excluded (available = profit only for profit mode) */
export function assertWithdrawBucketCeilings(
  input: WithdrawGuardInput,
): GuardReject | null {
  const locked = input.buckets.lockedUsdt;
  // P5: never treat locked as available
  if (gt(locked, "0") && input.mode === "profit") {
    // locked presence alone is fine; debit must not exceed profit
  }
  if (gt(input.debitProfitUsdt, input.buckets.profitUsdt)) {
    return {
      code: "INSUFFICIENT_PROFIT",
      toastCode: "INSUFFICIENT_PROFIT",
      statusCode: 403,
      ruleCode: "P4",
    };
  }
  if (gt(input.debitPrincipalUsdt, input.buckets.principalUsdt)) {
    return {
      code: "INSUFFICIENT_PRINCIPAL",
      toastCode: "INSUFFICIENT_PRINCIPAL",
      statusCode: 403,
      ruleCode: "P5",
    };
  }
  // combined/principal must not pull from locked
  const availPrincipal = input.buckets.principalUsdt;
  if (
    input.mode !== "profit" &&
    gt(input.debitPrincipalUsdt, availPrincipal)
  ) {
    return {
      code: "INSUFFICIENT_PRINCIPAL",
      toastCode: "INSUFFICIENT_PRINCIPAL",
      statusCode: 403,
      ruleCode: "P5",
    };
  }
  return null;
}

/** P6 — principal confirm token required when principal debit > 0 */
export function assertPrincipalConfirm(
  input: Pick<
    WithdrawGuardInput,
    "mode" | "debitPrincipalUsdt" | "principalConfirmToken"
  >,
): GuardReject | null {
  const needs =
    input.mode === "principal" ||
    input.mode === "combined" ||
    gt(input.debitPrincipalUsdt, "0");
  if (!needs) return null;
  const tok = (input.principalConfirmToken || "").trim();
  if (!tok || tok.length < 8) {
    return {
      code: "PRINCIPAL_CONFIRM_REQUIRED",
      toastCode: "WITHDRAW_PRINCIPAL_WARN",
      statusCode: 403,
      ruleCode: "P6",
    };
  }
  return null;
}

/** P9 — rate limit exceeded */
export function assertWithdrawRateLimit(countInWindow: number): GuardReject | null {
  if (countInWindow >= PROFIT_WITHDRAW_RATE_LIMIT_PER_MIN) {
    return {
      code: "RATE_LIMITED",
      toastCode: "RATE_LIMITED",
      statusCode: 429,
      ruleCode: "P9",
    };
  }
  return null;
}

/** E12 — admin adjust must specify bucket */
export function assertAdminBucketSpecified(
  bucket: string | undefined | null,
): GuardReject | null {
  const ok = ["principal", "profit", "locked", "practice"].includes(
    bucket || "",
  );
  if (!ok) {
    return {
      code: "BUCKET_REQUIRED",
      toastCode: "BALANCE_ADJUSTED",
      statusCode: 400,
      ruleCode: "E12",
    };
  }
  return null;
}

export function restrictedPrincipalCapUsdt(): string {
  return RESTRICTED_PRINCIPAL_DAILY_CAP_USDT;
}

export function exceedsRestrictedPrincipalCap(
  debitPrincipalUsdt: string,
  alreadyWithdrawnPrincipalTodayUsdt: string,
): boolean {
  const sum =
    Number(debitPrincipalUsdt) + Number(alreadyWithdrawnPrincipalTodayUsdt);
  return sum > Number(RESTRICTED_PRINCIPAL_DAILY_CAP_USDT);
}

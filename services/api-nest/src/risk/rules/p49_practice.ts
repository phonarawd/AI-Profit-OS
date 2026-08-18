/**
 * Money §49.9 P1/P11 — practice path isolation helpers.
 * practice → profit/withdraw/merge/participate = 코드경로 0.
 */

import {
  assertPracticeNotWithdrawable,
  type GuardReject,
} from "./p49_guards";

export const PRACTICE_NOT_WITHDRAWABLE = "PRACTICE_NOT_WITHDRAWABLE" as const;

export function rejectPracticeCashout(opts: {
  practiceDebitAttempt?: boolean;
  requestedBucket?: string;
}): GuardReject | null {
  return assertPracticeNotWithdrawable({
    practiceDebitAttempt: opts.practiceDebitAttempt,
    requestedBucket: opts.requestedBucket,
    buckets: {
      principalUsdt: "0",
      profitUsdt: "0",
      lockedUsdt: "0",
      practiceUsdt: "0",
    },
  });
}

/** True when journal/path must never touch practice as source of cash */
export function isPracticeCashPathForbidden(journalType: string): boolean {
  const forbidden = new Set([
    "withdraw_profit",
    "withdraw_principal",
    "withdraw_combined",
    "merge_profit_to_principal",
    "participate_lock",
    "settlement_user_profit",
  ]);
  return forbidden.has(journalType);
}

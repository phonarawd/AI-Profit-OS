/**
 * 출금 검수 — 기존 withdraw_intents 상태만. 원장 전기는 후속 슬라이스.
 */

export const WITHDRAW_REVIEW_PENDING = "auth_ok" as const;
export const WITHDRAW_REVIEW_APPROVED = "queued" as const;
export const WITHDRAW_REVIEW_REJECTED = "rejected" as const;

export type WithdrawReviewDecision = "approve" | "reject";

export type WithdrawReviewTransition =
  | { ok: true; next: string; reused: boolean }
  | { ok: false; code: "ALREADY_DECIDED" | "NOT_REVIEWABLE" };

export function nextWithdrawReviewStatus(
  current: string,
  decision: WithdrawReviewDecision,
): WithdrawReviewTransition {
  if (decision === "approve") {
    if (current === WITHDRAW_REVIEW_APPROVED) {
      return { ok: true, next: WITHDRAW_REVIEW_APPROVED, reused: true };
    }
    if (current === WITHDRAW_REVIEW_PENDING) {
      return { ok: true, next: WITHDRAW_REVIEW_APPROVED, reused: false };
    }
    if (current === WITHDRAW_REVIEW_REJECTED) {
      return { ok: false, code: "ALREADY_DECIDED" };
    }
    return { ok: false, code: "NOT_REVIEWABLE" };
  }
  if (current === WITHDRAW_REVIEW_REJECTED) {
    return { ok: true, next: WITHDRAW_REVIEW_REJECTED, reused: true };
  }
  if (current === WITHDRAW_REVIEW_PENDING) {
    return { ok: true, next: WITHDRAW_REVIEW_REJECTED, reused: false };
  }
  if (current === WITHDRAW_REVIEW_APPROVED) {
    return { ok: false, code: "ALREADY_DECIDED" };
  }
  return { ok: false, code: "NOT_REVIEWABLE" };
}

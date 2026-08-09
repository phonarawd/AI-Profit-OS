/**
 * Money §49.3 guard #1 — withdrawApplyBlocked (Admin §9.8.4a).
 * When blocked → 403 WITHDRAW_APPLY_BLOCKED · ledger 불변.
 */

export const WITHDRAW_APPLY_BLOCKED = "WITHDRAW_APPLY_BLOCKED" as const;

export type WithdrawApplyCapability = {
  withdrawApplyBlocked: boolean;
};

/** null = allow · else toast/code */
export function assertWithdrawApplyAllowed(
  cap: WithdrawApplyCapability,
): null | typeof WITHDRAW_APPLY_BLOCKED {
  if (cap.withdrawApplyBlocked === true) return WITHDRAW_APPLY_BLOCKED;
  return null;
}

/**
 * Money §49.9C — malicious-user status → money-path effects.
 * flagged=monitor · restricted=principal cap · frozen=block · banned=login
 */

import type { RiskStatus, RiskStatusEffects } from "../risk.types";

export function effectsForRiskStatus(status: RiskStatus): RiskStatusEffects {
  switch (status) {
    case "active":
      return {
        withdrawBlocked: false,
        principalWithdrawCapped: false,
        mergeBlocked: false,
        participateBlocked: false,
        loginBlocked: false,
      };
    case "flagged":
      // 정상 · velocity 모니터 only
      return {
        withdrawBlocked: false,
        principalWithdrawCapped: false,
        mergeBlocked: false,
        participateBlocked: false,
        loginBlocked: false,
      };
    case "restricted":
      return {
        withdrawBlocked: false,
        principalWithdrawCapped: true,
        mergeBlocked: false,
        participateBlocked: false,
        loginBlocked: false,
      };
    case "frozen":
      return {
        withdrawBlocked: true,
        principalWithdrawCapped: true,
        mergeBlocked: true,
        participateBlocked: true,
        loginBlocked: false,
      };
    case "banned":
      return {
        withdrawBlocked: true,
        principalWithdrawCapped: true,
        mergeBlocked: true,
        participateBlocked: true,
        loginBlocked: true,
      };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function toastForRiskBlock(
  status: RiskStatus,
): "ACCOUNT_FROZEN" | "ACCOUNT_BANNED" | "WITHDRAW_BLOCKED" | null {
  if (status === "frozen") return "ACCOUNT_FROZEN";
  if (status === "banned") return "ACCOUNT_BANNED";
  if (status === "restricted") return "WITHDRAW_BLOCKED";
  return null;
}

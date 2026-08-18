/**
 * Money §49.9 P9/P23 — withdraw velocity / Sybil repeat small-profit.
 */

import {
  PROFIT_WITHDRAW_RATE_LIMIT_PER_MIN,
} from "../risk.types";
import { assertWithdrawRateLimit, type GuardReject } from "./p49_guards";

export { PROFIT_WITHDRAW_RATE_LIMIT_PER_MIN };

/** P9 — intents in last 60s */
export function checkWithdrawSpam(countInWindow: number): GuardReject | null {
  return assertWithdrawRateLimit(countInWindow);
}

/**
 * P23 heuristic — many small profit withdraws in short window.
 * Day-1 threshold: ≥10 withdraws under 5 USDT in 24h → raise signal (caller).
 */
export function isSybilSmallProfitPattern(opts: {
  withdrawCount24h: number;
  maxAmountUsdt: number;
}): boolean {
  return opts.withdrawCount24h >= 10 && opts.maxAmountUsdt <= 5;
}

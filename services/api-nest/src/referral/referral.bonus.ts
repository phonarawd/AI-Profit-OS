/**
 * Money §51.5.1a bonus formulas · ceil to 0.01 USDT · no IEEE float.
 */

import {
  cmpAmount,
  formatAmount,
  parseAmount,
} from "../ledger/ledger.money";
import type { ReferralProgramConfig } from "./referral.types";

const CENT_SCALE = 2n; // 0.01
const INTERNAL = 18n;
const CENT_FACTOR = 10n ** (INTERNAL - CENT_SCALE);

/** ceil to 0.01 (USDT display unit) */
export function ceilToCent(raw: string): string {
  const n = parseAmount(raw);
  if (n <= 0n) return "0";
  const rem = n % CENT_FACTOR;
  const ceiled = rem === 0n ? n : n + (CENT_FACTOR - rem);
  return formatAmount(ceiled);
}

export function mulPct(amountUsdt: string, pct: string): string {
  const a = parseAmount(amountUsdt);
  const p = parseAmount(pct);
  // both scaled by 1e18 → product / 1e18
  const prod = (a * p) / 10n ** INTERNAL;
  return formatAmount(prod);
}

export function minAmount(a: string, b: string): string {
  return cmpAmount(a, b) <= 0 ? a : b;
}

export function maxAmount(a: string, b: string): string {
  return cmpAmount(a, b) >= 0 ? a : b;
}

/** 초대자 L2 = min(hardCap, ceil(deposit * pct, 0.01)) */
export function computeL2ReferrerPay(
  qualifyingDepositUsdt: string,
  cfg: Pick<
    ReferralProgramConfig,
    "l2ReferrerPct" | "l2ReferrerHardCapUsdt"
  >,
): string {
  const base = mulPct(
    maxAmount(qualifyingDepositUsdt, "0"),
    cfg.l2ReferrerPct,
  );
  const ceiled = ceilToCent(base);
  return minAmount(cfg.l2ReferrerHardCapUsdt, ceiled);
}

/** 초대자 L3 = min(hardCap, flat) */
export function computeL3ReferrerPay(
  cfg: Pick<
    ReferralProgramConfig,
    "l3ReferrerFlatUsdt" | "l3ReferrerHardCapUsdt"
  >,
): string {
  return minAmount(cfg.l3ReferrerHardCapUsdt, ceilToCent(cfg.l3ReferrerFlatUsdt));
}

export function meetsMinDeposit(
  qualifyingDepositUsdt: string,
  minRefereeDepositUsdt: string,
): boolean {
  return cmpAmount(qualifyingDepositUsdt, minRefereeDepositUsdt) >= 0;
}

export function idempotencyKeyFor(
  edgeId: string,
  level: "L1" | "L2" | "L3",
): string {
  return `referral:${edgeId}:${level}`;
}

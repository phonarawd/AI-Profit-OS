/**
 * §43.2.1 Treasury TRX stake guard — pure (no I/O).
 * CI: verify:sweeper-trx-guard — min 미달 시 sweep 호출 0.
 */

import { DAY1_MIN_TRX_STAKE_FOR_SWEEPER } from "./constants";

export type TrxGuardInput = {
  /** Admin deposit-settings pause */
  adminPaused: boolean;
  energyDelegateEnabled: boolean;
  /** Treasury TRX balance (decimal string) */
  treasuryTrxBalance: string;
  /** deposit-config.usdtOnchain.minTrxStakeForSweeper · Day-1 5000 */
  minTrxStakeForSweeper?: string;
};

export type TrxGuardDecision = {
  /** When false, executeSweep must not be called */
  allowSweep: boolean;
  /** Persist sweeperPaused + Admin 🔴 when TRX < min */
  autoPause: boolean;
  reason:
    | "ok"
    | "admin_paused"
    | "energy_disabled"
    | "trx_below_min"
    | "invalid_trx_balance"
    | "invalid_min_trx";
  treasuryTrxBalance: string;
  minTrxStakeForSweeper: string;
  /** Explicit counter for CI — always 0 when allowSweep=false */
  sweepCallsAllowed: 0 | 1;
};

function cmpDecimal(a: string, b: string): number {
  const [ai, af = ""] = a.split(".");
  const [bi, bf = ""] = b.split(".");
  const aNeg = ai.startsWith("-");
  const bNeg = bi.startsWith("-");
  if (aNeg !== bNeg) return aNeg ? -1 : 1;
  const aInt = aNeg ? ai.slice(1) : ai;
  const bInt = bNeg ? bi.slice(1) : bi;
  const pad = Math.max(af.length, bf.length);
  const aFull = `${aInt}${af.padEnd(pad, "0")}`.replace(/^0+(?=\d)/, "") || "0";
  const bFull = `${bInt}${bf.padEnd(pad, "0")}`.replace(/^0+(?=\d)/, "") || "0";
  if (aFull.length !== bFull.length) {
    const longer = aFull.length > bFull.length ? 1 : -1;
    return aNeg ? -longer : longer;
  }
  if (aFull === bFull) return 0;
  const gt = aFull > bFull ? 1 : -1;
  return aNeg ? -gt : gt;
}

function isNonNegDecimal(v: string): boolean {
  return typeof v === "string" && /^[0-9]+(\.[0-9]+)?$/.test(v);
}

/**
 * Evaluate TRX + Admin pause gates before any Energy delegate / Transfer.
 * DETECTED-stage / amount / grace are handled by sweep-eligibility.
 */
export function evaluateTrxGuard(input: TrxGuardInput): TrxGuardDecision {
  const min = input.minTrxStakeForSweeper ?? DAY1_MIN_TRX_STAKE_FOR_SWEEPER;
  const bal = input.treasuryTrxBalance;

  if (input.adminPaused) {
    return {
      allowSweep: false,
      autoPause: false,
      reason: "admin_paused",
      treasuryTrxBalance: bal,
      minTrxStakeForSweeper: min,
      sweepCallsAllowed: 0,
    };
  }

  if (!input.energyDelegateEnabled) {
    return {
      allowSweep: false,
      autoPause: false,
      reason: "energy_disabled",
      treasuryTrxBalance: bal,
      minTrxStakeForSweeper: min,
      sweepCallsAllowed: 0,
    };
  }

  if (!isNonNegDecimal(min)) {
    return {
      allowSweep: false,
      autoPause: true,
      reason: "invalid_min_trx",
      treasuryTrxBalance: bal,
      minTrxStakeForSweeper: min,
      sweepCallsAllowed: 0,
    };
  }

  if (!isNonNegDecimal(bal)) {
    return {
      allowSweep: false,
      autoPause: true,
      reason: "invalid_trx_balance",
      treasuryTrxBalance: bal,
      minTrxStakeForSweeper: min,
      sweepCallsAllowed: 0,
    };
  }

  if (cmpDecimal(bal, min) < 0) {
    return {
      allowSweep: false,
      autoPause: true,
      reason: "trx_below_min",
      treasuryTrxBalance: bal,
      minTrxStakeForSweeper: min,
      sweepCallsAllowed: 0,
    };
  }

  return {
    allowSweep: true,
    autoPause: false,
    reason: "ok",
    treasuryTrxBalance: bal,
    minTrxStakeForSweeper: min,
    sweepCallsAllowed: 1,
  };
}

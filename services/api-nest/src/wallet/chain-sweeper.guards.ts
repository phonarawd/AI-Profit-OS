/**
 * §43.2 TRX + eligibility guards — mirrors workers/chain-sweeper.
 * Phase0 SoT inside Nest (emit=in-process · NATS ≠ Day-1).
 */

export const DAY1_MIN_TRX_STAKE_FOR_SWEEPER = "5000";
export const SWEEP_GRACE_SEC = 60;
export const MIN_SWEEP_AMOUNT_USDT = "0.01";
export const SWEEP_ELIGIBLE_STATUS = "ledger_credited" as const;
export const SWEEPER_KEYS_HSM_REF = "SWEEPER_KEYS_HSM_REF";

export type TrxGuardDecision = {
  allowSweep: boolean;
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
  sweepCallsAllowed: 0 | 1;
};

export type SweepEligibility = {
  eligible: boolean;
  reason:
    | "ok"
    | "status_detected_forbidden"
    | "status_not_confirmed"
    | "already_swept"
    | "grace_pending"
    | "below_min_amount"
    | "invalid_amount"
    | "missing_credited_at";
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

export function evaluateTrxGuard(input: {
  adminPaused: boolean;
  energyDelegateEnabled: boolean;
  treasuryTrxBalance: string;
  minTrxStakeForSweeper?: string;
}): TrxGuardDecision {
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

export function evaluateSweepEligibility(input: {
  status: string;
  amountUsdt: string;
  creditedAt: string | number | Date | null | undefined;
  now?: Date;
  minSweepAmountUsdt?: string;
  graceSec?: number;
}): SweepEligibility {
  const status = String(input.status ?? "");
  if (status === "swept") {
    return { eligible: false, reason: "already_swept" };
  }
  if (status === "seen" || status === "ui_confirmed" || status === "ignored") {
    return { eligible: false, reason: "status_detected_forbidden" };
  }
  if (status !== SWEEP_ELIGIBLE_STATUS) {
    return { eligible: false, reason: "status_not_confirmed" };
  }
  const amount = String(input.amountUsdt ?? "");
  if (!/^[0-9]+(\.[0-9]+)?$/.test(amount)) {
    return { eligible: false, reason: "invalid_amount" };
  }
  const minAmt = input.minSweepAmountUsdt ?? MIN_SWEEP_AMOUNT_USDT;
  if (cmpDecimal(amount, minAmt) < 0) {
    return { eligible: false, reason: "below_min_amount" };
  }
  if (input.creditedAt == null || input.creditedAt === "") {
    return { eligible: false, reason: "missing_credited_at" };
  }
  const creditedMs =
    input.creditedAt instanceof Date
      ? input.creditedAt.getTime()
      : typeof input.creditedAt === "number"
        ? input.creditedAt
        : Date.parse(String(input.creditedAt));
  if (!Number.isFinite(creditedMs)) {
    return { eligible: false, reason: "missing_credited_at" };
  }
  const now = input.now ?? new Date();
  const grace = input.graceSec ?? SWEEP_GRACE_SEC;
  if (now.getTime() - creditedMs < grace * 1000) {
    return { eligible: false, reason: "grace_pending" };
  }
  return { eligible: true, reason: "ok" };
}

export type SweepPlanStep =
  | "delegate_energy"
  | "transfer_usdt"
  | "undelegate_energy";

export type SweepPlan = {
  depositEventId: string;
  userDepositAddress: string;
  treasuryHotAddressRef: string;
  amountUsdt: string;
  steps: SweepPlanStep[];
  sweeperKeysHsmRef: string;
  userBalanceUnchanged: true;
};

export function buildEnergySweepPlan(input: {
  depositEventId: string;
  userDepositAddress: string;
  treasuryHotAddressRef: string;
  amountUsdt: string;
  energyDelegateEnabled: boolean;
}): SweepPlan {
  return {
    depositEventId: input.depositEventId,
    userDepositAddress: input.userDepositAddress,
    treasuryHotAddressRef: input.treasuryHotAddressRef,
    amountUsdt: input.amountUsdt,
    steps: input.energyDelegateEnabled
      ? ["delegate_energy", "transfer_usdt", "undelegate_energy"]
      : ["transfer_usdt"],
    sweeperKeysHsmRef: SWEEPER_KEYS_HSM_REF,
    userBalanceUnchanged: true,
  };
}

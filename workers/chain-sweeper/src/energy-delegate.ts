/**
 * §43.2 Energy Delegation plan — DelegateResource → USDT Transfer → Undelegate.
 * Keys = HSM/secrets refs only · never embed private keys in source.
 */

import { SWEEPER_KEY_REF_ENV } from "./constants";

export type SweepPlanStep =
  | "delegate_energy"
  | "transfer_usdt"
  | "undelegate_energy";

export type SweepPlan = {
  depositEventId: string;
  userDepositAddress: string;
  treasuryHotAddressRef: string;
  amountUsdt: string;
  energyDelegateEnabled: boolean;
  /** Secret ref name — value never in repo */
  sweeperKeysHsmRef: string;
  steps: SweepPlanStep[];
  /** User ledger credit unchanged by sweep */
  userBalanceUnchanged: true;
};

export function buildEnergySweepPlan(input: {
  depositEventId: string;
  userDepositAddress: string;
  treasuryHotAddressRef: string;
  amountUsdt: string;
  energyDelegateEnabled: boolean;
  sweeperKeysHsmRef?: string;
}): SweepPlan {
  const steps: SweepPlanStep[] = input.energyDelegateEnabled
    ? ["delegate_energy", "transfer_usdt", "undelegate_energy"]
    : ["transfer_usdt"];

  return {
    depositEventId: input.depositEventId,
    userDepositAddress: input.userDepositAddress,
    treasuryHotAddressRef: input.treasuryHotAddressRef,
    amountUsdt: input.amountUsdt,
    energyDelegateEnabled: input.energyDelegateEnabled,
    sweeperKeysHsmRef: input.sweeperKeysHsmRef ?? SWEEPER_KEY_REF_ENV,
    steps,
    userBalanceUnchanged: true,
  };
}

/**
 * Phase1 Worker / Nest Phase0 may call this only after evaluateTrxGuard.allowSweep.
 * Default = dry plan record (no broadcast) until HSM binding present.
 */
export type SweepExecuteResult = {
  ok: boolean;
  broadcast: boolean;
  plan: SweepPlan;
  sweepTxHash?: string;
  note: string;
};

export function executeSweepPlanDry(plan: SweepPlan): SweepExecuteResult {
  return {
    ok: true,
    broadcast: false,
    plan,
    note: "Phase0 dry · keys HSM/secrets · user balance unchanged",
  };
}

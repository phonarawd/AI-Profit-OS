/** Engine §51.4 · Admin contracts */

export type SimulationRunRequest = {
  opportunityPublishRate?: number;
  spreadDistribution?: { p50: string; p10: string; p90: string };
  payoutFeasibilityScore?: number;
  worstCasePlatformDrainUsdt?: string;
  uxDisplayAccuracy?: Array<{
    field: string;
    sample: number;
    mismatch: number;
  }>;
  /** S4 KPI 입력 — usually from adapters/simulation-s4 */
  adapterMatchFailureRate?: number;
  feasibility?: Array<{
    opportunityId: string;
    payoutFeasible: boolean;
    reasonKo?: string;
  }>;
  opportunities?: Array<{
    opportunityId: string;
    compareReady?: boolean;
    forceInfeasible?: boolean;
    payoutFeasible?: boolean;
    reasonKo?: string;
  }>;
  createdByAdminId?: string;
};

export type PlatformReservePutInput = {
  targetUsdt: string;
  updatedByAdminId: string;
  changeReason: string;
};

export type GrowthEnabledPutInput = {
  enabled: boolean;
  updatedByAdminId: string;
  changeReason: string;
};

export const PLATFORM_RESERVE_ACCOUNT_CODE = "ops.platform_reserve_usdt" as const;

/**
 * Engine §48.13.3 · schemas/execution-policy.v1.json
 * FORBIDDEN key: successRatePercent
 */

export type MatchStrictness =
  | "lenient"
  | "standard"
  | "tight"
  | "scarce"
  | "custom";

export type PresentationStep =
  | "product_check"
  | "price_compare"
  | "matching"
  | "settle_prep"
  | "credit";

export type ExecutionPolicyV1 = {
  matchStrictness: MatchStrictness;
  minProfitUsdt: string;
  staleAllowanceSec: number;
  maxRematchCount: number;
  retryWaitSec: number;
  slippageBoundBps: number;
  dailyUserMatchCap: number;
  dailyOppSlotsDefault: number;
  autoCancelOnShortfall: boolean;
  membershipBandOverlayEnabled?: boolean;
  feed?: { nearMissCapUsdt: string };
  presentation: {
    durationSecMin: number;
    durationSecMax: number;
    steps: PresentationStep[];
  };
  updatedAt: string;
  updatedByAdminId: string;
};

export type ExecutionPolicyPutInput = {
  matchStrictness: MatchStrictness;
  minProfitUsdt?: string;
  staleAllowanceSec?: number;
  maxRematchCount?: number;
  retryWaitSec?: number;
  slippageBoundBps?: number;
  dailyUserMatchCap?: number;
  dailyOppSlotsDefault?: number;
  autoCancelOnShortfall?: boolean;
  membershipBandOverlayEnabled?: boolean;
  feed?: { nearMissCapUsdt: string };
  presentation?: ExecutionPolicyV1["presentation"];
  updatedByAdminId: string;
  changeReason: string;
};

export type ExecutionPolicyGetResponse = {
  policy: ExecutionPolicyV1;
  softHard: { softSec: 60; hardSec: 90; membershipUniform: true };
  presets: Record<
    "lenient" | "standard" | "tight" | "scarce",
    {
      minProfitUsdt: string;
      staleAllowanceSec: number;
      maxRematchCount: number;
      slippageBoundBps: number;
      dailyUserMatchCap: number;
      dailyOppSlotsDefault: number;
    }
  >;
  /** Observed KPI is read-only — never a write knob */
  observedWriteForbidden: true;
};

export type ExecutionPolicyTodayStats = {
  day: string;
  successCount: number;
  priceMovedCount: number;
  belowMinProfitCount: number;
  requeueCount: number;
  otherTerminalCount: number;
  denominator: number;
  observedSuccessRate: number | null;
  priceMovedRate: number | null;
  belowMinProfitRate: number | null;
  requeueAvgPerTrade: number | null;
  readOnly: true;
};

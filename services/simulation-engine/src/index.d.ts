/** Engine §51.4 M0.5 simulation-engine */

export const PLATFORM_RESERVE_ACCOUNT_CODE: "ops.platform_reserve_usdt";

export const GATE_THRESHOLDS: {
  readonly s2ReserveDrainMaxPct: "0.10";
  readonly s3PayoutFeasibilityMin: 0.85;
  readonly s4AdapterMatchFailureRateMax: 0.15;
  readonly growthPassMaxAgeHours: 24;
};

export type UxDisplayAccuracyRow = {
  field: string;
  sample: number;
  mismatch: number;
};

export type PlatformReserveInput = {
  isSet: boolean;
  targetUsdt?: string | null;
  balanceUsdt?: string | null;
};

export type GateResult = {
  id: "S1" | "S2" | "S3" | "S4";
  pass: boolean;
  failAction: string;
  [key: string]: unknown;
};

export type GatesResult = {
  s1: GateResult;
  s2: GateResult;
  s3: GateResult;
  s4: GateResult;
  overallPass: boolean;
  thresholds: typeof GATE_THRESHOLDS;
};

export type SimulationReportV1 = {
  runId: string;
  asOf: string;
  horizonHours: 24;
  opportunityPublishRate: number;
  spreadDistribution: { p50: string; p10: string; p90: string };
  payoutFeasibilityScore: number;
  worstCasePlatformDrainUsdt: string;
  uxDisplayAccuracy: UxDisplayAccuracyRow[];
  adapterMatchFailureRate: number;
  feasibility?: Array<{
    opportunityId: string;
    payoutFeasible: boolean;
    reasonKo?: string;
  }>;
};

export function evaluateS1(
  rows: UxDisplayAccuracyRow[] | null | undefined,
): GateResult;
export function evaluateS2(
  worstCasePlatformDrainUsdt: string,
  reserve: PlatformReserveInput,
): GateResult;
export function evaluateS3(score: number): GateResult;
export function evaluateS4(rate: number): GateResult;
export function evaluateGates(
  report: Partial<SimulationReportV1>,
  reserve: PlatformReserveInput,
): GatesResult;

export function evaluatePayoutFeasibility(input: {
  opportunityId: string;
  expectedProfitUsdt?: string | null;
  minProfitUsdt?: string | null;
  compareReady?: boolean;
  forceInfeasible?: boolean;
  payoutFeasible?: boolean;
  reasonKo?: string;
}): {
  opportunityId: string;
  payoutFeasible: boolean;
  reasonKo?: string;
};

export function scoreFromFeasibility(
  items: Array<{ payoutFeasible: boolean }>,
): number;

export function buildSimulationReport(
  kpi: Record<string, unknown>,
  reserve: PlatformReserveInput,
): { report: SimulationReportV1; gates: GatesResult };

export function payoutFeasible(
  opportunityId: string,
  feasibility:
    | Array<{ opportunityId: string; payoutFeasible: boolean }>
    | null
    | undefined,
): boolean;

export function evaluateGrowthEnableGate(input: {
  latest?: { overallPass: boolean; asOf: string | Date } | null;
  reserveIsSet: boolean;
  now?: string | Date | number;
}): {
  allowed: boolean;
  reasons: string[];
  maxAgeHours: number;
  requires: string[];
};

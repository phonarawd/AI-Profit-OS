/** Engine shadow-replay — drift 0.000% · block_settlement */

export const MAX_DRIFT_PCT: 0;
export const FAIL_ACTION: "block_settlement";
export const HORIZON_HOURS: 24;
export const DEFAULT_GOLDEN_DIR: string;

export type DriftResult = {
  readonly pass: boolean;
  readonly driftPct: number;
  readonly maxDriftPct: 0;
  readonly failAction: "block_settlement" | null;
  readonly mismatchCount: number;
  readonly mismatches: readonly object[];
};

export type ShadowReplayReport = {
  readonly schema: "shadow-replay-report.v1";
  readonly runId: string;
  readonly asOf: string;
  readonly horizonHours: 24;
  readonly kind: "ai_pick";
  readonly traceCount: number;
  readonly results: readonly object[];
  readonly driftPct: number;
  readonly maxDriftPct: 0;
  readonly pass: boolean;
  readonly failAction: "block_settlement" | null;
  readonly mismatchCount: number;
  readonly mismatches: readonly object[];
};

export function driftPct(expected: number, actual: number): number;
export function evaluateDrift(
  rows: Array<{ expected: number; actual: number; id?: string }>,
): DriftResult;
export function loadAiPickGoldens(dir?: string): object[];
export function replayAiPickGolden(golden: object): object;
export function runAiPickShadowReplay(opts?: {
  goldens?: object[];
  asOf?: string;
  runId?: string;
}): ShadowReplayReport;
export function replaySettlementGoldens(
  goldenDir: string,
  ruleModule: object,
): object;

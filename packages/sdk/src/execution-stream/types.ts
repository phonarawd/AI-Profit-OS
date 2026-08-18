/**
 * Client mirror of schemas/trade-execution-state.v1.json (+ Nest Phase0 fields).
 * Money = decimal string · NEVER invent progress locally.
 */

export type TradeExecutionStatus =
  | "running"
  | "requeue"
  | "success"
  | "safe_stop"
  | "cancelled"
  | "failed";

export type TradeExecutionResultCode =
  | "MATCH_SUCCESS"
  | "REQUEUE"
  | "PRICE_MOVED"
  | "BELOW_MIN_PROFIT"
  | "CANCELLED_BY_USER"
  | "CIRCUIT_OPEN"
  | "SYSTEM_FAILED"
  | "MATCH_TIMEOUT";

export type TradeExecutionStepIndex = 0 | 1 | 2 | 3 | 4;

/** Response channel — Phase0=polling · Phase1+=sse (hook-internal swap only) */
export type ExecutionTransportKind = "polling" | "sse";

export type TradeExecutionState = {
  tradeId: string;
  opportunityId: string;
  pricingVersion: number;
  status: TradeExecutionStatus;
  resultCode?: TradeExecutionResultCode;
  stepIndex: TradeExecutionStepIndex;
  /** Presentation only until terminal — server-authored · client must not fabricate */
  progressPct: number;
  logLine?: string;
  expectedProfitUsdt: string;
  settledProfitUsdt?: string;
  softDeadlineAt?: string;
  hardDeadlineAt?: string;
  rematchCount?: number;
  transport?: ExecutionTransportKind;
  asset: {
    id: string;
    label: string;
    iconUrl?: string;
    ref?: string;
  };
};

export const TERMINAL_EXECUTION_STATUSES: ReadonlySet<TradeExecutionStatus> =
  new Set(["success", "safe_stop", "cancelled", "failed"]);

export function isTerminalExecutionStatus(
  status: TradeExecutionStatus | undefined,
): boolean {
  return status != null && TERMINAL_EXECUTION_STATUSES.has(status);
}

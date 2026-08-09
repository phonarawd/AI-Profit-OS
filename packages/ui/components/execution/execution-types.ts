/**
 * UI mirror of TradeExecutionState — sdk 훅 상태와 동일 형상 · UI→sdk 의존 0
 */
export type ExecutionUiStatus =
  | "running"
  | "requeue"
  | "success"
  | "safe_stop"
  | "cancelled"
  | "failed";

export type ExecutionUiResultCode =
  | "MATCH_SUCCESS"
  | "REQUEUE"
  | "PRICE_MOVED"
  | "BELOW_MIN_PROFIT"
  | "CANCELLED_BY_USER"
  | "CIRCUIT_OPEN"
  | "SYSTEM_FAILED"
  | "MATCH_TIMEOUT";

export type ExecutionUiState = {
  tradeId: string;
  opportunityId: string;
  pricingVersion: number;
  status: ExecutionUiStatus;
  resultCode?: ExecutionUiResultCode;
  stepIndex: 0 | 1 | 2 | 3 | 4;
  progressPct: number;
  logLine?: string;
  expectedProfitUsdt: string;
  settledProfitUsdt?: string;
  asset: {
    id: string;
    label: string;
    iconUrl?: string;
    ref?: string;
  };
};

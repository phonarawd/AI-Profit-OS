/**
 * packages/sdk/execution-stream — plan §48.10 path
 * (implemented under src/execution-stream for package layout parity)
 */

export {
  TradeExecutionRequestError,
  isTradeExecutionRequestError,
  type TradeExecutionRequestCode,
} from "./errors";
export {
  createExecutionTransport,
} from "./create-transport";
export {
  createPollingTransport,
} from "./polling-transport";
export {
  createSseTransport,
  PHASE1_EXECUTION_SSE_PATH,
} from "./sse-transport";
export {
  DEFAULT_EXECUTION_TRANSPORT,
  type ExecutionSubscribeOptions,
  type TradeExecutionTransport,
} from "./transport";
export {
  TERMINAL_EXECUTION_STATUSES,
  isTerminalExecutionStatus,
  type ExecutionTransportKind,
  type TradeExecutionResultCode,
  type TradeExecutionState,
  type TradeExecutionStatus,
  type TradeExecutionStepIndex,
} from "./types";
export {
  useTradeExecution,
  type UseTradeExecutionOptions,
  type UseTradeExecutionResult,
} from "./useTradeExecution";

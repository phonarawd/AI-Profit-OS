/** @aipo/sdk — Phase0 skeleton (install/push/haptics/marketing land in domain todos) */
export {
  detectDeviceTier,
  tierBatchMs,
  type DeviceTier,
  type StreamPolicyBands,
} from "./device-tier";

export {
  DEFAULT_EXECUTION_TRANSPORT,
  PHASE1_EXECUTION_SSE_PATH,
  TERMINAL_EXECUTION_STATUSES,
  createExecutionTransport,
  createPollingTransport,
  createSseTransport,
  isTerminalExecutionStatus,
  useTradeExecution,
  type ExecutionSubscribeOptions,
  type ExecutionTransportKind,
  type TradeExecutionResultCode,
  type TradeExecutionState,
  type TradeExecutionStatus,
  type TradeExecutionStepIndex,
  type TradeExecutionTransport,
  type UseTradeExecutionOptions,
  type UseTradeExecutionResult,
} from "./execution-stream";

export {
  fetchPeotteokChips,
  streamPeotteokChat,
  usePeotteokChat,
  type PeotteokChatDone,
  type PeotteokChatMeta,
  type PeotteokChip,
  type PeotteokChipsResponse,
  type PeotteokLane,
  type PeotteokMessage,
  type PeotteokToneBand,
  type UsePeotteokChatOptions,
  type UsePeotteokChatResult,
} from "./peotteok";

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
  TradeExecutionRequestError,
  createExecutionTransport,
  createPollingTransport,
  createSseTransport,
  isTerminalExecutionStatus,
  isTradeExecutionRequestError,
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

export {
  ParticipateError,
  issuePreflight,
  isParticipateError,
  newParticipateIdempotencyKey,
  postParticipate,
  readParticipateErrorCode,
  type ParticipateRequestBody,
  type ParticipateRequestOpts,
  type ParticipateResult,
  type PreflightResponse,
} from "./participate";

export {
  OpportunityFeedError,
  fetchDayPulse,
  fetchOpportunityDetail,
  fetchOpportunityFeed,
  isOpportunityFeedError,
  mapNearMissExtraCount,
  type DayPulseResponse,
  type OpportunityDetailResponse,
  type OpportunityFeedItem,
  type OpportunityFeedResponse,
  type UserFeedRequestOpts,
} from "./user-feed";

export {
  fetchTrade,
  fetchTradeList,
  type TradeListRequestOpts,
  type TradeListResponse,
} from "./trades";

export {
  LedgerRequestError,
  fetchUserJournal,
  fetchUserJournalList,
  isLedgerRequestError,
  type LedgerRequestCode,
  type LedgerRequestOpts,
  type UserJournal,
  type UserJournalEntry,
  type UserJournalList,
} from "./ledger";

export {
  createWithdraw,
  createWithdrawStepUpChallenge,
  fetchWalletBuckets,
  newWithdrawIdempotencyKey,
  normalizeWalletBuckets,
  verifyWithdrawStepUp,
  type CreateWithdrawInput,
  type WalletBucketsResponse,
  type WalletRequestOpts,
  type WithdrawStepUpChallengeResponse,
  type WithdrawStepUpMethod,
  type WithdrawStepUpVerifyResponse,
} from "./wallet";

export {
  fetchGrowthPublicSurface,
  type GrowthPublicSurfaceResponse,
  type GrowthRequestOpts,
} from "./growth";

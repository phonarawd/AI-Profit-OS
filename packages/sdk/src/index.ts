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
  type TradeExecutionRequestCode,
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
  readOpportunityFeedItem,
  readOpportunityFeedItems,
  type DayPulseResponse,
  type OpportunityAssetImageSource,
  type OpportunityDetailResponse,
  type OpportunityFeedItem,
  type OpportunityFeedResponse,
  type UserFeedRequestOpts,
} from "./user-feed";

export {
  createKrwDepositRequest,
  createWithdraw,
  createWithdrawStepUpChallenge,
  fetchWalletBuckets,
  getKrwDepositRequest,
  listKrwDepositRequests,
  newWithdrawIdempotencyKey,
  normalizeKrwDepositRequest,
  normalizeWalletBuckets,
  verifyWithdrawStepUp,
  type CreateKrwDepositInput,
  type CreateWithdrawInput,
  type KrwDepositFinal,
  type KrwDepositQuote,
  type KrwDepositRequest,
  type PayableSuffixRole,
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

/** Engine ai-platform L1/L2 — AI PICK · AI_LOG · Eval · Personal AI §47 · L3 money 0 */

export const AI_LEVELS: readonly ["L1", "L2", "L3"];
export const LEVEL_POLICY: Readonly<
  Record<
    "L1" | "L2" | "L3",
    { readonly ui: readonly string[]; readonly forbidden: readonly string[] }
  >
>;
export const FORBIDDEN_L3_MONEY_ACTIONS: readonly string[];
export const AI_PICK_FORMULA_ID: "ai_pick_score_v1";
export const AI_PICK_THRESHOLD: 75;
export const SCORE_WEIGHTS: Readonly<Record<string, number>>;
export const AUTO_LEARNING_ENABLED: false;
export const EVAL_THRESHOLDS: {
  readonly minAccuracy: 0.9;
  readonly maxPiiLeakRate: 0;
  readonly maxMoneyHallucinationRate: 0;
  readonly maxL3MoneyActionRate: 0;
};
export const LANES: readonly string[];
export const PROVIDER_IDS: readonly string[];
export const ANSWER_PATHS: readonly string[];
export const GUARD_STATUSES: readonly string[];
export const FACT_TOOLS: readonly string[];
export const FACT_SOURCES: readonly string[];
export const DEFAULT_MIN_CONFIDENCE: 0.5;
export const FORBIDDEN_TWIN_MONEY_KEYS: readonly string[];
export const HELP_CHUNK_KINDS: readonly string[];

export type AiPickScore = {
  readonly schema: "ai-pick-score.v1";
  readonly level: "L2";
  readonly formulaId: typeof AI_PICK_FORMULA_ID;
  readonly featureFormulaId: string;
  readonly featureVectorHash: string;
  readonly opportunityId: string | null;
  readonly userId: string | null;
  readonly aiConfidenceScore: number;
  readonly rankingScore: number;
  readonly isAiPick: boolean;
  readonly threshold: number;
  readonly tags: readonly string[];
  readonly components: Readonly<
    Record<string, { value01: number; weight: number; points: number }>
  >;
  readonly weights: typeof SCORE_WEIGHTS;
  readonly scoredAt: string;
};

export type AiLogRecord = {
  readonly schema: "ai-answer-trace.v1";
  readonly intent: string;
  readonly lane: "P" | "G" | "S";
  readonly twin_snapshot_id: string | null;
  readonly memory_ids: readonly string[];
  readonly facts_used: readonly unknown[];
  readonly tools_called: readonly string[];
  readonly provider_id: string;
  readonly answer_path: string;
  readonly guard_result: { status: string; reason?: string };
  readonly answer_preview: string | null;
  readonly createdAt: string;
};

export type EvalGateResult = {
  readonly schema: "ai-eval-gate.v1";
  readonly pass: boolean;
  readonly status: "eval_pass" | "eval_fail";
  readonly autoLearningEnabled: false;
  readonly thresholds: typeof EVAL_THRESHOLDS;
  readonly metrics: {
    readonly accuracy: number;
    readonly piiLeakRate: number;
    readonly moneyHallucinationRate: number;
    readonly l3MoneyActionRate: number;
  };
  readonly reasons: readonly string[];
  readonly evaluatedAt: string;
};

export type FactCard = {
  readonly schema: "fact-card.v1";
  readonly source: string;
  readonly captured_at: string;
  readonly expires_at: string;
  readonly confidence: number;
  readonly payload: Readonly<Record<string, unknown>>;
};

export type AssistantRoute = {
  readonly schema: "assistant-route.v1";
  readonly intent: string;
  readonly lane: "P" | "G" | "S";
  readonly rerouted: boolean;
  readonly answer_path: string;
  readonly tools_called: readonly string[];
  readonly tools_available: readonly string[];
  readonly guard_result: { status: string; pass: boolean; reason?: string };
  readonly twin_snapshot_id: string | null;
};

export function isAiLevel(level: string): boolean;
export function isForbiddenMoneyAction(action: string): boolean;
export function assertNoL3Money(action: string, level?: string): void;
export function assertL1NoMoney(tools: string[]): void;
export function scoreAiPick(input?: object): AiPickScore;
export function applyAiPickToCard(
  card: object,
  pick: AiPickScore,
): object;
export type AiLogsRow = {
  readonly user_id: string | null;
  readonly intent: string;
  readonly lane: string;
  readonly twin_snapshot_id: string | null;
  readonly memory_ids: readonly string[];
  readonly facts_used: unknown;
  readonly tools_called: readonly string[];
  readonly provider_id: string;
  readonly answer_path: string;
  readonly guard_result: unknown;
  readonly answer_preview: string;
};

export function buildAiLogRecord(input?: object): AiLogRecord;
export function toAiLogsRow(
  rec: AiLogRecord,
  userId?: string | null,
): AiLogsRow;
export function evaluateModelCandidate(metrics?: object): EvalGateResult;
export function promoteToProd(
  evalResult: EvalGateResult,
  model: { modelId: string; version: string },
): object;
export function isFactTool(name: string): boolean;
export function toolsForLane(lane: "P" | "G" | "S"): readonly string[];
export function assertToolsAllowedForLane(
  lane: "P" | "G" | "S",
  tools: string[],
): void;
export function buildFactCard(input?: object): FactCard;
export function isFactFresh(fact: object, opts?: object): boolean;
export function partitionFreshness(
  facts: object[],
  opts?: object,
): {
  fresh: readonly object[];
  stale: readonly object[];
  needsRefresh: boolean;
};
export function assertFactsFreshOrThrow(
  facts: object[],
  opts?: object,
): object[];
export function guardAnswer(input?: object): {
  status: string;
  pass: boolean;
  reason?: string;
};
export function classifyLane(text: string): "P" | "G" | "S";
export function answerPathForLane(
  lane: "P" | "G" | "S",
  opts?: object,
): string;
export function routeAssistant(input?: object): AssistantRoute;
export function buildHelpChunk(input?: object): object;
export function rankHelpChunks(
  query: string,
  chunks: object[],
  limit?: number,
): object[];

export type LlmProviderId =
  | "ollama"
  | "groq"
  | "gemini_free"
  | "openai"
  | "none";

export type LlmChatResult = {
  readonly degraded: boolean;
  readonly provider_id: LlmProviderId | string;
  readonly provider_effective: LlmProviderId | string;
  readonly text: string;
  readonly finish_reason: string;
  readonly reason?: string;
  readonly http_status?: number;
  readonly error_kind?: string;
};

export function createLlmAdapter(
  providerId: LlmProviderId | string,
  config?: object,
): { provider_id: string; chat(input?: object): Promise<LlmChatResult> };
export function llmAdapterChat(
  adapter: { chat(input?: object): Promise<LlmChatResult> },
  input?: object,
): Promise<LlmChatResult>;
export function quotaKeyRpm(providerId: string, nowMs?: number): string;
export function quotaKeyRpd(providerId: string, nowMs?: number): string;
export function isSoftQuotaExceeded(count: number, limit: number): boolean;
export function shouldDegradeForQuota(input?: object): {
  degrade: boolean;
  reason: string | null;
  provider_effective: string | null;
};
export const G_BUSY_TEMPLATE: string;
export function degradeAnswerPath(
  lane: "P" | "G" | "S",
  degraded: boolean,
): { path: string; text: string | null } | null;
export function assertProviderId(providerId: string): string;

export const SYSTEM_BASE: string;
export function buildCoachMessages(input?: object): readonly {
  readonly role: string;
  readonly content: string;
}[];
export function shouldCallLlm(
  lane: "P" | "G" | "S",
  answerPath: string,
  degraded?: boolean,
): boolean;
export const S_REFUSE_TEMPLATE: {
  readonly text: string;
  readonly deepLink: string;
  readonly copyKey: string;
};
export const P_REFRESH_TEMPLATE: {
  readonly text: string;
  readonly copyKey: string;
};
export const CS_DEEP_LINK: {
  readonly href: string;
  readonly copyKey: string;
};
export const FACT_CHIPS: readonly object[];
export function shapeByTone(toneBand: string | null | undefined, body: string): string;
export function renderFactAnswer(facts: object[], opts?: object): string;
export function pickChips(opts?: object): readonly object[];

/** Engine §47.16.2 — conversation working-state (session-scoped, Redis-backed by Nest) */
export const MAX_TURNS: 8;
export const MAX_TURN_TEXT_LEN: 300;

export type ConversationTurn = {
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly lane: string | null;
  readonly at: string;
};

/** Caller-supplied shape for `appendTurn`/`appendTurns` — `at` is always
 * server-generated inside `appendTurn`, never accepted from the caller. */
export type ConversationTurnInput = {
  role: "user" | "assistant";
  text: string;
  lane?: string | null;
};

export type ConversationState = {
  readonly schema: "conversation-state.v1";
  readonly conversationId: string;
  readonly userId: string;
  readonly createdAt: string;
  readonly lastTurnAt: string;
  readonly turns: readonly ConversationTurn[];
};

export function newConversationId(): string;
export function conversationStateRedisKey(
  userId: string,
  conversationId: string,
): string;
export function buildConversationState(input?: {
  userId?: string;
  conversationId?: string;
  createdAt?: string;
  lastTurnAt?: string;
  turns?: object[];
}): ConversationState;
export function appendTurn(
  state: ConversationState | null | undefined,
  turn: ConversationTurnInput,
): ConversationState;
export function assertStateOwnership(
  state: ConversationState | null | undefined,
  userId: string,
): void;
export function isWithinAbsoluteLifetime(
  state: ConversationState,
  nowMs: number,
  absoluteLifetimeSec: number,
): boolean;
export function effectiveTtlSec(
  state: ConversationState,
  nowMs: number,
  slidingTtlSec: number,
  absoluteLifetimeSec: number,
): number;
export function buildHistoryMessages(
  state: ConversationState | null | undefined,
  maxChars?: number,
): readonly { readonly role: string; readonly content: string }[];

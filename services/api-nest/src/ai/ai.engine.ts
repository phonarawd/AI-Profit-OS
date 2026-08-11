/**
 * Thin require bridges → feature/ai/twin/memory packages (CJS)
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const feature =
  require("@aipo/feature-platform") as typeof import("@aipo/feature-platform");
const ai = require("@aipo/ai-platform") as typeof import("@aipo/ai-platform");
const shadow =
  require("@aipo/shadow-replay-engine") as typeof import("@aipo/shadow-replay-engine");
const twin =
  require("@aipo/user-twin-service") as typeof import("@aipo/user-twin-service");
const memory =
  require("@aipo/memory-service") as typeof import("@aipo/memory-service");

export const buildFeatureVector = feature.buildFeatureVector;
export const FEATURE_FORMULA_ID = feature.FEATURE_FORMULA_ID;
export const FORBIDDEN_FEATURE_KEYS = feature.FORBIDDEN_FEATURE_KEYS;

export const scoreAiPick = ai.scoreAiPick;
export const applyAiPickToCard = ai.applyAiPickToCard;
export const AI_PICK_THRESHOLD = ai.AI_PICK_THRESHOLD;
export const AI_PICK_FORMULA_ID = ai.AI_PICK_FORMULA_ID;
export const buildAiLogRecord = ai.buildAiLogRecord;
export const toAiLogsRow = ai.toAiLogsRow;
export const evaluateModelCandidate = ai.evaluateModelCandidate;
export const promoteToProd = ai.promoteToProd;
export const AUTO_LEARNING_ENABLED = ai.AUTO_LEARNING_ENABLED;
export const assertNoL3Money = ai.assertNoL3Money;
export const FORBIDDEN_L3_MONEY_ACTIONS = ai.FORBIDDEN_L3_MONEY_ACTIONS;

export const buildFactCard = ai.buildFactCard;
export const isFactFresh = ai.isFactFresh;
export const partitionFreshness = ai.partitionFreshness;
export const assertFactsFreshOrThrow = ai.assertFactsFreshOrThrow;
export const FACT_TOOLS = ai.FACT_TOOLS;
export const FACT_CHIPS = ai.FACT_CHIPS;
export const guardAnswer = ai.guardAnswer;
export const classifyLane = ai.classifyLane;
export const routeAssistant = ai.routeAssistant;
export const toolsForLane = ai.toolsForLane;

export const createLlmAdapter = ai.createLlmAdapter;
export const llmAdapterChat = ai.llmAdapterChat;
export const quotaKeyRpm = ai.quotaKeyRpm;
export const quotaKeyRpd = ai.quotaKeyRpd;
export const shouldDegradeForQuota = ai.shouldDegradeForQuota;
export const degradeAnswerPath = ai.degradeAnswerPath;
export const G_BUSY_TEMPLATE = ai.G_BUSY_TEMPLATE;

export const buildCoachMessages = ai.buildCoachMessages;
export const shouldCallLlm = ai.shouldCallLlm;
export const S_REFUSE_TEMPLATE = ai.S_REFUSE_TEMPLATE;
export const P_REFRESH_TEMPLATE = ai.P_REFRESH_TEMPLATE;
export const CS_DEEP_LINK = ai.CS_DEEP_LINK;
export const shapeByTone = ai.shapeByTone;
export const renderFactAnswer = ai.renderFactAnswer;
export const pickChips = ai.pickChips;
export const isFactTool = ai.isFactTool;
export const assertToolsAllowedForLane = ai.assertToolsAllowedForLane;
export const buildHelpChunk = ai.buildHelpChunk;
export const rankHelpChunks = ai.rankHelpChunks;

export const runAiPickShadowReplay = shadow.runAiPickShadowReplay;
export const MAX_DRIFT_PCT = shadow.MAX_DRIFT_PCT;
export const FAIL_ACTION = shadow.FAIL_ACTION;
export const ADVISORY_LABEL = shadow.ADVISORY_LABEL;
export const DRIFT_ADVISORY_ONLY = shadow.DRIFT_ADVISORY_ONLY;
export const HORIZON_HOURS = shadow.HORIZON_HOURS;

export const FORBIDDEN_TWIN_MONEY_KEYS = twin.FORBIDDEN_TWIN_MONEY_KEYS;
export const assertNoTwinMoneyKeys = twin.assertNoTwinMoneyKeys;
export const buildTwin = twin.buildTwin;
export const patchTwin = twin.patchTwin;
export const twinRedisKey = twin.twinRedisKey;
export const TWIN_REDIS_TTL_SEC = twin.TWIN_REDIS_TTL_SEC;
export const toAiUserProfileRow = twin.toAiUserProfileRow;
export const fromAiUserProfileRow = twin.fromAiUserProfileRow;
export const resolveMoneyFromTwin = twin.resolveMoneyFromTwin;
export const assertTwinNotUsedForMoneyAnswer =
  twin.assertTwinNotUsedForMoneyAnswer;

export const buildMemoryRecord = memory.buildMemoryRecord;
export const assertNoMemoryMoneyKeys = memory.assertNoMemoryMoneyKeys;
export const matchNormalizedPreference = memory.matchNormalizedPreference;
export const buildPreferenceAppendInput = memory.buildPreferenceAppendInput;
export const assertPreferenceMetadata = memory.assertPreferenceMetadata;
export const isAllowedPreference = memory.isAllowedPreference;
export const PREFERENCE_KEY_WHITELIST = memory.PREFERENCE_KEY_WHITELIST;
export const memoryRecentRedisKey = memory.memoryRecentRedisKey;
export const assertEmbedding = memory.assertEmbedding;
export const toPgVectorLiteral = memory.toPgVectorLiteral;
export const EMBEDDING_DIM = memory.EMBEDDING_DIM;
export const DEFAULT_MODEL_ID = memory.DEFAULT_MODEL_ID;
export const rankByCosine = memory.rankByCosine;

// Engine §47.16.2 — conversation working-state (session-scoped, Redis-backed)
export type ConversationTurn = import("@aipo/ai-platform").ConversationTurn;
export type ConversationTurnInput =
  import("@aipo/ai-platform").ConversationTurnInput;
export type ConversationState = import("@aipo/ai-platform").ConversationState;
export type ConversationResultRef =
  import("@aipo/ai-platform").ConversationResultRef;
export type ResultReferenceResolution =
  import("@aipo/ai-platform").ResultReferenceResolution;
export const newConversationId = ai.newConversationId;
export const conversationStateRedisKey = ai.conversationStateRedisKey;
export const buildConversationState = ai.buildConversationState;
export const appendTurn = ai.appendTurn;
export const rememberResultRef = ai.rememberResultRef;
export const assertStateOwnership = ai.assertStateOwnership;
export const isWithinAbsoluteLifetime = ai.isWithinAbsoluteLifetime;
export const effectiveTtlSec = ai.effectiveTtlSec;
export const buildHistoryMessages = ai.buildHistoryMessages;
export const resolveResultReference = ai.resolveResultReference;
export const referencePromptBlock = ai.referencePromptBlock;
export const extractResultRefFromFacts = ai.extractResultRefFromFacts;
export const normalizeResultRefs = ai.normalizeResultRefs;
export const SCOPE_REDIRECT_TEMPLATE = ai.SCOPE_REDIRECT_TEMPLATE;
export const OFF_TOPIC_PATTERNS = ai.OFF_TOPIC_PATTERNS;
export const SCOPE_ASSURANCE = ai.SCOPE_ASSURANCE;
export const decideScope = ai.decideScope;
export const matchesOffTopic = ai.matchesOffTopic;

// Engine §47.16.5 — P-lane numeric grounding
export const groundAnswerNumerics = ai.groundAnswerNumerics;
export const buildGroundedNumericContext = ai.buildGroundedNumericContext;
export const collectGroundedNumerics = ai.collectGroundedNumerics;
export const tagServerDerived = ai.tagServerDerived;
export const assertServerDerivedAllowlist = ai.assertServerDerivedAllowlist;
export const SERVER_DERIVED_ALLOWLIST = ai.SERVER_DERIVED_ALLOWLIST;
export const ALLOWED_DERIVATION_IDS = ai.ALLOWED_DERIVATION_IDS;

/**
 * AI_LOG / answer-trace builder — aligns with schemas/ai-answer-trace.v1
 * Duplicate table FORBIDDEN — uses ai_logs columns
 * GitHub must never store PII/conversation bodies (verify:no-ai-data-in-git)
 */

"use strict";

const { assertNoL3Money, isForbiddenMoneyAction } = require("./levels.cjs");
const { sanitizeTurnText } = require("./conversation-state.cjs");

const LANES = Object.freeze(["P", "G", "S"]);
const PROVIDER_IDS = Object.freeze([
  "ollama",
  "groq",
  "gemini_free",
  "openai",
  "none",
]);
const ANSWER_PATHS = Object.freeze([
  "template",
  "fact",
  "rag",
  "llm_p",
  "llm_g",
  "refuse_s",
  "scope_redirect",
]);
const GUARD_STATUSES = Object.freeze([
  "pass",
  "refresh",
  "block",
  "reroute_p",
  "ungrounded",
]);

/**
 * Build AI_LOG row payload (DB insert shape)
 * @param {object} input
 */
function buildAiLogRecord(input = {}) {
  const lane = String(input.lane || "");
  if (!LANES.includes(lane)) {
    throw new Error(`AI_LOG invalid lane: ${lane}`);
  }
  const providerId = String(input.provider_id || input.providerId || "none");
  if (!PROVIDER_IDS.includes(providerId)) {
    throw new Error(`AI_LOG invalid provider_id: ${providerId}`);
  }
  const answerPath = String(input.answer_path || input.answerPath || "");
  if (!ANSWER_PATHS.includes(answerPath)) {
    throw new Error(`AI_LOG invalid answer_path: ${answerPath}`);
  }

  const tools = Array.isArray(input.tools_called || input.toolsCalled)
    ? [...(input.tools_called || input.toolsCalled)]
    : [];
  for (const t of tools) {
    if (isForbiddenMoneyAction(t)) {
      assertNoL3Money(t, "L1");
    }
  }
  if (lane === "G" && tools.length > 0) {
    throw new Error("AI_LOG G-lane tools must be empty");
  }
  if (lane === "S" && tools.length > 0) {
    throw new Error("AI_LOG S-lane tools must be empty");
  }

  const guard = normalizeGuard(input.guard_result || input.guardResult);
  const rawPreview =
    input.answer_preview != null
      ? input.answer_preview
      : input.answerPreview != null
        ? input.answerPreview
        : null;

  return Object.freeze({
    schema: "ai-answer-trace.v1",
    intent: String(input.intent || ""),
    lane,
    twin_snapshot_id:
      input.twin_snapshot_id || input.twinSnapshotId || null,
    memory_ids: Object.freeze(
      Array.isArray(input.memory_ids || input.memoryIds)
        ? [...(input.memory_ids || input.memoryIds)].map(String)
        : [],
    ),
    facts_used: Object.freeze(
      Array.isArray(input.facts_used || input.factsUsed)
        ? [...(input.facts_used || input.factsUsed)]
        : [],
    ),
    tools_called: Object.freeze(tools.map(String)),
    provider_id: providerId,
    answer_path: answerPath,
    guard_result: guard,
    answer_preview:
      rawPreview != null
        ? sanitizeTurnText(String(rawPreview)).slice(0, 280)
        : null,
    createdAt: input.createdAt || new Date().toISOString(),
  });
}

function normalizeGuard(g) {
  const status = String(g?.status || "pass");
  if (!GUARD_STATUSES.includes(status)) {
    throw new Error(`AI_LOG invalid guard status: ${status}`);
  }
  const out = { status };
  if (g?.reason != null) out.reason = String(g.reason);
  return Object.freeze(out);
}

/**
 * Map AI_LOG record → PG insert columns for public.ai_logs
 * @param {ReturnType<typeof buildAiLogRecord>} rec
 * @param {string|null} [userId]
 */
function toAiLogsRow(rec, userId = null) {
  return Object.freeze({
    user_id: userId,
    intent: rec.intent,
    lane: rec.lane,
    twin_snapshot_id: rec.twin_snapshot_id,
    memory_ids: rec.memory_ids,
    facts_used: rec.facts_used,
    tools_called: rec.tools_called,
    provider_id: rec.provider_id,
    answer_path: rec.answer_path,
    guard_result: rec.guard_result,
    answer_preview: rec.answer_preview,
  });
}

function pickField(row, snake, camel) {
  if (!row || typeof row !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(row, snake) && row[snake] != null) {
    return row[snake];
  }
  if (Object.prototype.hasOwnProperty.call(row, camel) && row[camel] != null) {
    return row[camel];
  }
  return row[snake] ?? row[camel];
}

function projectFactTrace(fact) {
  if (!fact || typeof fact !== "object" || Array.isArray(fact)) return null;
  const source = fact.source != null ? sanitizeTurnText(String(fact.source)) : null;
  const capturedAt = fact.captured_at || fact.capturedAt || null;
  const expiresAt = fact.expires_at || fact.expiresAt || null;
  const confidence =
    typeof fact.confidence === "number" && Number.isFinite(fact.confidence)
      ? fact.confidence
      : null;
  return Object.freeze({
    source,
    capturedAt: capturedAt != null ? String(capturedAt) : null,
    expiresAt: expiresAt != null ? String(expiresAt) : null,
    confidence,
  });
}

/**
 * Admin observability projection of an existing ai_logs / trace row.
 * Allowlist only — payload / prompt / secrets never leave this owner.
 * Observability ≠ money/ledger/opportunity authority.
 */
function toAdminAiLogsView(row = {}) {
  const factsRaw = pickField(row, "facts_used", "factsUsed");
  const facts = Array.isArray(factsRaw)
    ? factsRaw.map(projectFactTrace).filter(Boolean)
    : [];
  const toolsRaw = pickField(row, "tools_called", "toolsCalled");
  const memoryRaw = pickField(row, "memory_ids", "memoryIds");
  const guardRaw = pickField(row, "guard_result", "guardResult") || {};
  const previewRaw = pickField(row, "answer_preview", "answerPreview");
  const createdRaw =
    pickField(row, "created_at", "createdAt") ??
    pickField(row, "createdAt", "created_at");
  const id = pickField(row, "id", "id");
  const userId = pickField(row, "user_id", "userId");
  const intent = pickField(row, "intent", "intent");
  const lane = pickField(row, "lane", "lane");
  const twin = pickField(row, "twin_snapshot_id", "twinSnapshotId");
  const provider = pickField(row, "provider_id", "providerId");
  const path = pickField(row, "answer_path", "answerPath");

  const guard = {
    status: guardRaw.status != null ? String(guardRaw.status) : null,
  };
  if (guardRaw.reason != null) {
    guard.reason = sanitizeTurnText(String(guardRaw.reason));
  }

  return Object.freeze({
    id: id != null ? String(id) : null,
    createdAt:
      createdRaw instanceof Date
        ? createdRaw.toISOString()
        : createdRaw != null
          ? String(createdRaw)
          : null,
    userId: userId != null ? String(userId) : null,
    intent: intent != null ? sanitizeTurnText(String(intent)) : null,
    lane: lane != null ? String(lane) : null,
    twinSnapshotId: twin != null ? String(twin) : null,
    memoryIds: Array.isArray(memoryRaw) ? memoryRaw.map(String) : [],
    factsUsed: Object.freeze(facts),
    toolsCalled: Array.isArray(toolsRaw) ? toolsRaw.map(String) : [],
    providerId: provider != null ? String(provider) : null,
    answerPath: path != null ? String(path) : null,
    guardResult: Object.freeze(guard),
    answerPreview:
      previewRaw != null
        ? sanitizeTurnText(String(previewRaw)).slice(0, 280)
        : null,
  });
}

module.exports = {
  LANES,
  PROVIDER_IDS,
  ANSWER_PATHS,
  GUARD_STATUSES,
  buildAiLogRecord,
  toAiLogsRow,
  toAdminAiLogsView,
};

/**
 * Memory records — Engine §47.2 / §47.9
 * Conversation summaries · help chunks · never money Fact SoT
 */

"use strict";

const MEMORY_KINDS = Object.freeze([
  "session_summary",
  "long_term",
  "help_chunk",
  "other",
]);

const FORBIDDEN_MEMORY_MONEY_KEYS = Object.freeze([
  "balanceUsdt",
  "expectedProfitUsdt",
  "liveQuote",
]);

/**
 * @param {Record<string, unknown>|null|undefined} obj
 */
function assertNoMemoryMoneyKeys(obj) {
  if (!obj || typeof obj !== "object") return;
  const hits = FORBIDDEN_MEMORY_MONEY_KEYS.filter((k) =>
    Object.prototype.hasOwnProperty.call(obj, k),
  );
  if (hits.length) {
    const err = new Error(
      `MEMORY_MONEY_CACHE_FORBIDDEN:${hits.join(",")}`,
    );
    err.code = "MEMORY_MONEY_CACHE_FORBIDDEN";
    throw err;
  }
}

/**
 * @param {object} input
 */
function buildMemoryRecord(input = {}) {
  const kind = String(input.kind || "other");
  if (!MEMORY_KINDS.includes(kind)) {
    throw new Error(`MEMORY_INVALID_KIND:${kind}`);
  }
  const content = String(input.content || "").trim();
  if (!content) throw new Error("MEMORY_CONTENT_REQUIRED");

  const metadata =
    input.metadata && typeof input.metadata === "object"
      ? { ...input.metadata }
      : {};
  assertNoMemoryMoneyKeys(metadata);

  const userId =
    input.userId != null
      ? String(input.userId)
      : input.user_id != null
        ? String(input.user_id)
        : null;

  return Object.freeze({
    schema: "ai-memory.v1",
    id: input.id != null ? String(input.id) : null,
    userId,
    kind,
    content,
    metadata: Object.freeze(metadata),
    createdAt: input.createdAt || input.created_at || new Date().toISOString(),
    updatedAt: input.updatedAt || input.updated_at || new Date().toISOString(),
  });
}

/**
 * Hot Redis key for recent session memory ids
 * @param {string} userId
 */
function memoryRecentRedisKey(userId) {
  return `ai:memory:recent:${String(userId || "").trim()}`;
}

module.exports = {
  MEMORY_KINDS,
  FORBIDDEN_MEMORY_MONEY_KEYS,
  assertNoMemoryMoneyKeys,
  buildMemoryRecord,
  memoryRecentRedisKey,
};

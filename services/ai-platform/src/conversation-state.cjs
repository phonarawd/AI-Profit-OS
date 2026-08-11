/**
 * Conversation working-state — Engine §47.16.2
 * Session-scoped only · Redis-backed(Nest) · NEVER promoted to durable
 * ai_memory here (that is reference-resolution slice's job).
 * Pure functions only — Nest owns Redis I/O + config values.
 */

"use strict";

const crypto = require("crypto");

/** Sliding window cap — oldest turns drop first */
const MAX_TURNS = 8;
/** Per-turn text truncation (bytes of context, not display) */
const MAX_TURN_TEXT_LEN = 300;
const TURN_ROLES = Object.freeze(["user", "assistant"]);

/**
 * @returns {string}
 */
function newConversationId() {
  return crypto.randomUUID();
}

/**
 * Redis key bound to BOTH userId and conversationId — a conversationId
 * alone must never be enough to read another user's state.
 * @param {string} userId
 * @param {string} conversationId
 */
function conversationStateRedisKey(userId, conversationId) {
  const u = String(userId || "").trim();
  const c = String(conversationId || "").trim();
  if (!u || !c) {
    throw new Error("CONV_STATE_KEY_REQUIRES_USER_AND_CONVERSATION");
  }
  return `ai:conv:${u}:${c}`;
}

/**
 * @param {{role?:string, text?:string, lane?:string|null, at?:string}} raw
 */
function normalizeTurn(raw) {
  const role = TURN_ROLES.includes(raw?.role) ? raw.role : "user";
  return Object.freeze({
    role,
    text: String(raw?.text || "").slice(0, MAX_TURN_TEXT_LEN),
    lane: raw?.lane != null ? String(raw.lane) : null,
    at: raw?.at || new Date().toISOString(),
  });
}

/**
 * @param {object[]} turns
 */
function normalizeTurns(turns) {
  const list = Array.isArray(turns) ? turns : [];
  const clipped = list.slice(Math.max(0, list.length - MAX_TURNS));
  return Object.freeze(clipped.map(normalizeTurn));
}

/**
 * Build/normalize a conversation-state.v1 object.
 * @param {object} input
 * @param {string} input.userId
 * @param {string} input.conversationId
 * @param {string} [input.createdAt]
 * @param {string} [input.lastTurnAt]
 * @param {object[]} [input.turns]
 */
function buildConversationState(input = {}) {
  const userId = String(input.userId || "").trim();
  const conversationId = String(input.conversationId || "").trim();
  if (!userId) throw new Error("CONV_STATE_USER_ID_REQUIRED");
  if (!conversationId) throw new Error("CONV_STATE_CONVERSATION_ID_REQUIRED");
  const createdAt = input.createdAt || new Date().toISOString();
  return Object.freeze({
    schema: "conversation-state.v1",
    conversationId,
    userId,
    createdAt,
    lastTurnAt: input.lastTurnAt || createdAt,
    turns: normalizeTurns(input.turns),
  });
}

/**
 * Pure append — sliding window + truncation. Caller (Nest) persists.
 * @param {object} state
 * @param {{role:string, text:string, lane?:string|null}} turn
 */
function appendTurn(state, turn) {
  if (!turn || !TURN_ROLES.includes(turn.role)) {
    throw new Error("CONV_STATE_TURN_ROLE_INVALID");
  }
  const now = new Date().toISOString();
  const nextTurns = [
    ...(Array.isArray(state?.turns) ? state.turns : []),
    { role: turn.role, text: turn.text, lane: turn.lane ?? null, at: now },
  ];
  return buildConversationState({
    userId: state?.userId,
    conversationId: state?.conversationId,
    createdAt: state?.createdAt,
    lastTurnAt: now,
    turns: nextTurns,
  });
}

/**
 * Fail-closed ownership check. resultRef/conversationId are hints, never
 * authorization — the caller-supplied userId (from a verified JWT) is the
 * only trusted identity.
 * @param {object|null|undefined} state
 * @param {string} userId
 */
function assertStateOwnership(state, userId) {
  if (!state) return;
  if (String(state.userId || "") !== String(userId || "")) {
    const err = new Error("CONV_STATE_OWNERSHIP_MISMATCH");
    err.code = "CONV_STATE_OWNERSHIP_MISMATCH";
    throw err;
  }
}

/**
 * @param {object} state
 * @param {number} nowMs
 * @param {number} absoluteLifetimeSec
 */
function isWithinAbsoluteLifetime(state, nowMs, absoluteLifetimeSec) {
  const createdMs = Date.parse(state?.createdAt || "");
  if (!Number.isFinite(createdMs)) return false;
  return Number(nowMs) < createdMs + Number(absoluteLifetimeSec) * 1000;
}

/**
 * Sliding TTL bounded by the absolute lifetime cap — never lets a refresh
 * extend the key past `createdAt + absoluteLifetimeSec`.
 * @param {object} state
 * @param {number} nowMs
 * @param {number} slidingTtlSec
 * @param {number} absoluteLifetimeSec
 * @returns {number} seconds to pass as Redis EX (0 = do not persist further)
 */
function effectiveTtlSec(state, nowMs, slidingTtlSec, absoluteLifetimeSec) {
  const createdMs = Date.parse(state?.createdAt || "");
  if (!Number.isFinite(createdMs)) return 0;
  const remainingSec = Math.floor(
    (createdMs + Number(absoluteLifetimeSec) * 1000 - Number(nowMs)) / 1000,
  );
  return Math.max(0, Math.min(Number(slidingTtlSec), remainingSec));
}

/**
 * Bounded recent-turn messages for LLM prompt assembly (most recent turns
 * first filled, dropping the oldest once the character budget is hit).
 * Always keeps at least the single most recent turn.
 * @param {object|null} state
 * @param {number} [maxChars]
 */
function buildHistoryMessages(state, maxChars = 800) {
  const turns = Array.isArray(state?.turns) ? state.turns : [];
  const out = [];
  let total = 0;
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i];
    const content = String(t.text || "");
    if (total + content.length > maxChars && out.length > 0) break;
    out.unshift(
      Object.freeze({
        role: t.role === "assistant" ? "assistant" : "user",
        content,
      }),
    );
    total += content.length;
  }
  return Object.freeze(out);
}

module.exports = {
  MAX_TURNS,
  MAX_TURN_TEXT_LEN,
  newConversationId,
  conversationStateRedisKey,
  buildConversationState,
  appendTurn,
  assertStateOwnership,
  isWithinAbsoluteLifetime,
  effectiveTtlSec,
  buildHistoryMessages,
};

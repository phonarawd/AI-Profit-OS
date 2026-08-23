/**
 * Admin audit event core — REL-405 · ASVS V8/V16
 * Nest/DB 밖에서도 동일 검증·deny fixture가 돈다 (src/dist 상대경로 동일).
 *
 * NEVER: PII/token/secret persist · money reconstruction · delete API.
 */
"use strict";

const RESULTS = Object.freeze(["preview", "applied", "denied", "rolled_back"]);
const MODES = Object.freeze(["LIVE", "DRY_RUN", "SIMULATION", "n/a"]);
const LEVEL_RANK = Object.freeze({ none: 0, read: 1, write: 2 });
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORBIDDEN_KEYS = Object.freeze([
  "authorization",
  "bearer",
  "token",
  "accesstoken",
  "refreshtoken",
  "password",
  "secret",
  "jwt",
  "cookie",
  "email",
  "phone",
  "pin",
  "amount",
  "amountusdt",
  "usdt",
  "krw",
  "balance",
  "journalid",
]);

/** @type {null | ((event: object) => void | Promise<void>)} */
let sink = null;

function setAuditSink(fn) {
  sink = typeof fn === "function" ? fn : null;
}

function resetAuditSink() {
  sink = null;
}

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

function looksLikeJwt(value) {
  return (
    typeof value === "string" && /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./.test(value)
  );
}

function hasForbiddenKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.includes(String(key).toLowerCase())) return true;
    if (hasForbiddenKey(child)) return true;
  }
  return false;
}

function containsJwtString(value) {
  if (typeof value === "string") return looksLikeJwt(value);
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsJwtString);
  return Object.values(value).some(containsJwtString);
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, event: object } | { ok: false, error: string }}
 */
function normalizeEvent(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "AUDIT_EVENT_INVALID" };
  }
  const input = /** @type {Record<string, unknown>} */ (raw);
  if (hasForbiddenKey(input) || containsJwtString(input)) {
    return { ok: false, error: "AUDIT_FORBIDDEN_FIELD" };
  }
  const actorKey = String(input.actorKey || input.actorId || "").trim();
  if (!actorKey) return { ok: false, error: "AUDIT_ACTOR_REQUIRED" };
  const actorId = isUuid(String(input.actorId || ""))
    ? String(input.actorId)
    : isUuid(actorKey)
      ? actorKey
      : null;
  const role = String(input.role || "").trim();
  const action = String(input.action || "").trim();
  const targetType = String(input.targetType || "").trim();
  const targetId = String(input.targetId || "").trim();
  if (!role || !action || !targetType || !targetId) {
    return { ok: false, error: "AUDIT_EVENT_INCOMPLETE" };
  }
  const mode = String(input.mode || "n/a");
  const result = String(input.result || "");
  if (!MODES.includes(mode)) return { ok: false, error: "AUDIT_MODE_INVALID" };
  if (!RESULTS.includes(result)) return { ok: false, error: "AUDIT_RESULT_INVALID" };
  const reason =
    input.reason == null ? "" : String(input.reason).slice(0, 500);
  if (looksLikeJwt(reason)) return { ok: false, error: "AUDIT_FORBIDDEN_FIELD" };
  const payload =
    input.payload && typeof input.payload === "object" && !Array.isArray(input.payload)
      ? input.payload
      : {};
  if (hasForbiddenKey(payload) || containsJwtString(payload)) {
    return { ok: false, error: "AUDIT_FORBIDDEN_FIELD" };
  }
  const occurredAt =
    typeof input.occurredAt === "string" && input.occurredAt
      ? input.occurredAt
      : new Date().toISOString();
  const idempotencyKey =
    typeof input.idempotencyKey === "string" && input.idempotencyKey.trim()
      ? input.idempotencyKey.trim().slice(0, 128)
      : null;
  return {
    ok: true,
    event: {
      actorKey,
      actorId,
      role,
      action,
      targetType,
      targetId,
      occurredAt,
      mode,
      result,
      reason,
      idempotencyKey,
      payload,
    },
  };
}

function buildDeniedEvent(input) {
  const src = input && typeof input === "object" ? input : {};
  const target = src.target && typeof src.target === "object" ? src.target : {};
  return {
    actorKey: String(src.actorKey || src.actorId || ""),
    actorId: src.actorId || null,
    role: String(src.role || "unknown"),
    action: String(src.action || ""),
    targetType: String(target.type || src.targetType || "admin_route"),
    targetId: String(target.id || src.targetId || src.action || "unknown"),
    occurredAt: new Date().toISOString(),
    mode: "n/a",
    result: "denied",
    reason: String(src.reason || "ADMIN_CAPABILITY_DENIED"),
    idempotencyKey: null,
    payload: {},
  };
}

async function writeAuditEvent(raw) {
  const parsed = normalizeEvent(raw);
  if (!parsed.ok) return parsed;
  if (sink) {
    await sink(parsed.event);
    return { ok: true, event: parsed.event, persisted: true };
  }
  return { ok: true, event: parsed.event, persisted: false };
}

/**
 * Schema default.roles 기준 (서버 매트릭스와 동일 규칙).
 * explicit none 이 all 보다 이긴다.
 */
function roleAllowsFromSchema(schema, role, capability, required) {
  const roles = schema && schema.default && Array.isArray(schema.default.roles)
    ? schema.default.roles
    : [];
  const entry = roles.find((r) => r && r.id === role);
  if (!entry || !entry.capabilities || typeof entry.capabilities !== "object") {
    return false;
  }
  const caps = entry.capabilities;
  const granted =
    caps[capability] !== undefined ? caps[capability] : caps.all || "none";
  const need = LEVEL_RANK[required] || 0;
  const have = LEVEL_RANK[granted] || 0;
  return have >= need;
}

function lockedAdminRoles(schema) {
  const roles = schema && schema.default && Array.isArray(schema.default.roles)
    ? schema.default.roles.map((r) => r && r.id).filter(Boolean)
    : [];
  return roles;
}

module.exports = {
  RESULTS,
  MODES,
  FORBIDDEN_KEYS,
  setAuditSink,
  resetAuditSink,
  normalizeEvent,
  buildDeniedEvent,
  writeAuditEvent,
  roleAllowsFromSchema,
  lockedAdminRoles,
  isUuid,
};

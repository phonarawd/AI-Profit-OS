/**
 * Auth route fixed-window limiter — REL-010
 * Nest + QA spec share this file. Production flood 0.
 */
"use strict";

const MESSAGE_KO = "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
const DEFAULT_MAX = 20;
const DEFAULT_WINDOW_MS = 60_000;

/** @type {Map<string, { windowStart: number, count: number }>} */
const store = new Map();

function readConfig() {
  const max = Number(process.env.AUTH_RATE_LIMIT_MAX || DEFAULT_MAX);
  const windowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || DEFAULT_WINDOW_MS);
  if (!Number.isFinite(max) || max < 1 || !Number.isFinite(windowMs) || windowMs < 1) {
    return { failClosed: true, max: 0, windowMs: 0 };
  }
  return { failClosed: false, max, windowMs };
}

function deny() {
  return { allow: false, status: 429, messageKo: MESSAGE_KO };
}

/**
 * @param {{ ip?: string, account?: string, route?: string, nowMs?: number }} input
 */
function decideAuthRateLimit(input) {
  const cfg = readConfig();
  if (cfg.failClosed) return deny();
  const nowMs = Number(input && input.nowMs);
  if (!Number.isFinite(nowMs)) return deny();
  const ip = String((input && input.ip) || "unknown").trim() || "unknown";
  const account = String((input && input.account) || "-").trim() || "-";
  const route = String((input && input.route) || "*").trim() || "*";
  const windowStart = Math.floor(nowMs / cfg.windowMs) * cfg.windowMs;
  const key = `${ip}\t${account}\t${route}`;
  let row = store.get(key);
  if (!row || row.windowStart !== windowStart) {
    row = { windowStart, count: 0 };
  }
  if (row.count >= cfg.max) {
    store.set(key, row);
    return deny();
  }
  row.count += 1;
  store.set(key, row);
  return { allow: true, remaining: cfg.max - row.count };
}

function resetAuthRateLimitStore() {
  store.clear();
}

function extractAccountHint(body) {
  if (!body || typeof body !== "object") return "-";
  if (typeof body.email === "string" && body.email.trim()) return body.email.trim();
  if (typeof body.account === "string" && body.account.trim()) {
    return body.account.trim();
  }
  return "-";
}

function extractClientIp(req) {
  const xf = req && req.headers && req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0].trim() || "unknown";
  }
  if (req && typeof req.ip === "string" && req.ip.trim()) return req.ip.trim();
  const remote = req && req.socket && req.socket.remoteAddress;
  if (typeof remote === "string" && remote.trim()) return remote.trim();
  return "unknown";
}

// =====================================================================
// Distributed limiter (S1F Section 6.4) - additive only, does not change
// any behaviour of decideAuthRateLimit()/resetAuthRateLimitStore() above.
//
// Behaviour summary:
// - REDIS_URL unset (local/CI/dev, matches phase0-ram.mdc's remote-only
//   Redis policy and this file's own selftest contract of needing no
//   Redis): delegates to the same in-memory logic above, byte-identical.
// - REDIS_URL set and reachable: atomic INCR+PEXPIRE per ip/account-hash/
//   route window key, correct across multiple Node processes/instances.
// - REDIS_URL set but unreachable at call time: never silently degrade to
//   the in-memory store for a sensitive write endpoint (that would let an
//   attacker bypass the shared limit one instance at a time). Sensitive
//   routes fail closed (503, try-again). Non-sensitive routes fail open
//   (allow, flagged degraded:true for observability) so a Redis hiccup
//   does not take the whole auth surface offline for read-ish routes.
// =====================================================================

const crypto = require("crypto");

const UNAVAILABLE_MESSAGE_KO = "지금은 처리할 수 없어요. 잠시 후 다시 시도해 주세요.";

/** Route suffixes that are real credential-guessing or account-enumeration
 * attack surface - these fail CLOSED on a Redis outage. */
const SENSITIVE_ROUTE_SUFFIXES = Object.freeze([
  "/auth/signup",
  "/auth/login",
  "/auth/password-reset/request",
  "/auth/password-reset/complete",
  "/auth/find-id",
  "/auth/magic-link/request",
  "/auth/email/resend",
]);

function isSensitiveRoute(route) {
  const r = String(route || "");
  return SENSITIVE_ROUTE_SUFFIXES.some((suffix) => r.endsWith(suffix));
}

/** Rate-limit key derivation only (not password storage, unrelated threat
 * model) - never key Redis by a raw email/username string. */
function hashAccountForKey(account) {
  const normalized = String(account || "-").trim().toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

let redisClient = null;
let redisClientUrl = null;

/** Test seam only - never call in product code. */
function resetRedisClientForTests() {
  if (redisClient) {
    try {
      redisClient.disconnect();
    } catch {
      /* ignore */
    }
  }
  redisClient = null;
  redisClientUrl = null;
}

function getRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (redisClient && redisClientUrl === url) return redisClient;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Redis = require("ioredis");
  redisClient = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 3000,
  });
  redisClientUrl = url;
  return redisClient;
}

async function redisDecide(client, key, cfg, nowMs) {
  if (client.status === "wait" || client.status === "end") {
    await client.connect();
  }
  const windowStart = Math.floor(nowMs / cfg.windowMs) * cfg.windowMs;
  const redisKey = "aipo:auth-rl:" + key + ":" + windowStart;
  const count = await client.incr(redisKey);
  if (count === 1) {
    await client.pexpire(redisKey, cfg.windowMs + 5000);
  }
  if (count > cfg.max) {
    return { allow: false, status: 429, messageKo: MESSAGE_KO };
  }
  return { allow: true, remaining: Math.max(0, cfg.max - count) };
}

/**
 * @param {{ ip?: string, account?: string, route?: string, nowMs?: number }} input
 * @returns {Promise<{ allow: boolean, status?: number, messageKo?: string, remaining?: number, degraded?: boolean }>}
 */
async function decideAuthRateLimitAsync(input) {
  const cfg = readConfig();
  if (cfg.failClosed) return deny();
  const nowMs = Number(input && input.nowMs) || Date.now();
  const ip = String((input && input.ip) || "unknown").trim() || "unknown";
  const account = String((input && input.account) || "-").trim() || "-";
  const route = String((input && input.route) || "*").trim() || "*";

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return decideAuthRateLimit({ ip: ip, account: account, route: route, nowMs: nowMs });
  }

  const key = ip + "\t" + hashAccountForKey(account) + "\t" + route;
  try {
    const client = getRedisClient();
    if (!client) return decideAuthRateLimit({ ip: ip, account: account, route: route, nowMs: nowMs });
    return await redisDecide(client, key, cfg, nowMs);
  } catch (err) {
    if (isSensitiveRoute(route)) {
      return {
        allow: false,
        status: 503,
        messageKo: UNAVAILABLE_MESSAGE_KO,
        degraded: true,
        degradedReason: err instanceof Error ? err.message : "redis_unavailable",
      };
    }
    return { allow: true, remaining: 0, degraded: true };
  }
}

module.exports = {
  MESSAGE_KO,
  UNAVAILABLE_MESSAGE_KO,
  DEFAULT_MAX,
  DEFAULT_WINDOW_MS,
  decideAuthRateLimit,
  decideAuthRateLimitAsync,
  resetAuthRateLimitStore,
  resetRedisClientForTests,
  extractAccountHint,
  extractClientIp,
  hashAccountForKey,
  isSensitiveRoute,
  SENSITIVE_ROUTE_SUFFIXES,
  readConfig,
};

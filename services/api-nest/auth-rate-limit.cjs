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

module.exports = {
  MESSAGE_KO,
  DEFAULT_MAX,
  DEFAULT_WINDOW_MS,
  decideAuthRateLimit,
  resetAuthRateLimitStore,
  extractAccountHint,
  extractClientIp,
  readConfig,
};

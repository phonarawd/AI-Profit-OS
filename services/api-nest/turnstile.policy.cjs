/**
 * Turnstile hostname / action / expiry / replay — Nest 없이 검증 가능한 순수 규칙.
 */
"use strict";

const { createHash } = require("node:crypto");

const CHALLENGE_MAX_AGE_MS = 5 * 60 * 1000;
const REPLAY_TTL_MS = 10 * 60 * 1000;

const TURNSTILE_PRODUCTION_HOSTS = Object.freeze([
  "app.hiptk.app",
  "hiptk.app",
  "ops.hiptk.app",
]);

const TURNSTILE_DEV_HOSTS = Object.freeze([
  "localhost",
  "127.0.0.1",
  "example.com",
  "ai-profit-ops-dedicated.ebay-adapter.workers.dev",
  "ai-profit-web-dedicated.ebay-adapter.workers.dev",
  "ai-profit-ops-preview.ebay-adapter.workers.dev",
  "ai-profit-web-preview.ebay-adapter.workers.dev",
]);

const memoryReplay = new Map();

function hashTurnstileToken(token) {
  return createHash("sha256").update(String(token), "utf8").digest("hex");
}

function allowedTurnstileHostnames(nodeEnv) {
  const hosts = new Set(TURNSTILE_PRODUCTION_HOSTS);
  if (nodeEnv !== "production") {
    for (const h of TURNSTILE_DEV_HOSTS) hosts.add(h);
  }
  return hosts;
}

function hostnameAllowed(hostname, nodeEnv) {
  const host = String(hostname || "")
    .trim()
    .toLowerCase()
    .split(":")[0];
  if (!host || host.includes("hitpk.app")) return false;
  return allowedTurnstileHostnames(nodeEnv).has(host);
}

/** 관리자 로그인은 일반 /login 보다 먼저 본다. */
function turnstileActionFromPath(path) {
  const p = String(path || "");
  if (p.includes("admin-auth") && p.includes("login")) return "admin-login";
  if (p.includes("signup/classic") || p.endsWith("/signup")) return "signup";
  if (p.endsWith("/login") || p.includes("/auth/login")) return "login";
  if (p.includes("find-id")) return "find-id";
  if (p.includes("password-reset")) return "password-reset";
  if (p.includes("email/resend")) return "email-resend";
  if (p.includes("magic-link")) return "magic-link";
  return undefined;
}

function challengeFresh(challengeTs, nowMs, maxAgeMs = CHALLENGE_MAX_AGE_MS) {
  const t = Date.parse(challengeTs);
  if (!Number.isFinite(t)) return false;
  return nowMs - t <= maxAgeMs && t <= nowMs + 60_000;
}

function memoryReplayStore() {
  return {
    async consume(tokenHash, ttlMs) {
      const now = Date.now();
      for (const [key, exp] of memoryReplay) {
        if (exp <= now) memoryReplay.delete(key);
      }
      if (memoryReplay.has(tokenHash)) return false;
      memoryReplay.set(tokenHash, now + ttlMs);
      return true;
    },
  };
}

function resetTurnstileReplayForTests() {
  memoryReplay.clear();
}

function evaluateSiteverify(json, opts) {
  if (!json || json.success !== true) {
    const errorCodes = Array.isArray(json && json["error-codes"])
      ? json["error-codes"].map(String)
      : [];
    return { ok: false, reason: "VERIFY_FAILED", errorCodes };
  }
  const hostname = typeof json.hostname === "string" ? json.hostname : "";
  if (!hostnameAllowed(hostname, opts.nodeEnv)) {
    return { ok: false, reason: "HOSTNAME_MISMATCH" };
  }
  if (opts.expectedAction) {
    const action = typeof json.action === "string" ? json.action : "";
    if (action !== opts.expectedAction) {
      return { ok: false, reason: "ACTION_MISMATCH" };
    }
  }
  const challengeTs = typeof json.challenge_ts === "string" ? json.challenge_ts : "";
  if (!challengeFresh(challengeTs, opts.nowMs)) {
    return { ok: false, reason: "CHALLENGE_EXPIRED" };
  }
  return { ok: true };
}

module.exports = {
  CHALLENGE_MAX_AGE_MS,
  REPLAY_TTL_MS,
  TURNSTILE_PRODUCTION_HOSTS,
  TURNSTILE_DEV_HOSTS,
  hashTurnstileToken,
  allowedTurnstileHostnames,
  hostnameAllowed,
  turnstileActionFromPath,
  challengeFresh,
  memoryReplayStore,
  resetTurnstileReplayForTests,
  evaluateSiteverify,
};

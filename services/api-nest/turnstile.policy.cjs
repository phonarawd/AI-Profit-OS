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
  challengeFresh,
  memoryReplayStore,
  resetTurnstileReplayForTests,
  evaluateSiteverify,
};

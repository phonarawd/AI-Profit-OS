/**
 * PTF-00C P0-C/§7 — eBay Browse API resilience: bounded retry, timeout,
 * exponential backoff + jitter, error classification. Pure decision logic
 * only (no `fetch`, no `setTimeout`, no `Math.random` baked in — the caller
 * injects those) so this file is testable from plain Node (tooling/verify)
 * AND bundles cleanly into the Cloudflare Worker (esbuild handles the
 * `.cjs` require/import either way — same convention as
 * services/market-intelligence's *.cjs pure-logic modules).
 *
 * "No infinite retry" — DEFAULT_MAX_ATTEMPTS bounds total calls per query;
 * combined with the worker's own marketplace×query loop this mathematically
 * bounds one scheduled tick's total upstream request volume (§10).
 */
"use strict";

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_BASE_DELAY_MS = 250;
const DEFAULT_MAX_DELAY_MS = 4000;

/**
 * Classify an HTTP status into an error class. Never distinguishes
 * credentials/response bodies — classification labels only (§8 "no leak").
 * @param {number} status
 * @returns {"auth_failed"|"rate_limited"|"server_error"|"client_error"|"unknown"}
 */
function classifyHttpStatus(status) {
  if (status === 401 || status === 403) return "auth_failed";
  if (status === 429) return "rate_limited";
  if (status >= 500 && status <= 599) return "server_error";
  if (status >= 400 && status <= 499) return "client_error";
  return "unknown";
}

/**
 * Classify a thrown/caught error (network failure, timeout, JSON parse
 * failure) into the same error-class vocabulary as classifyHttpStatus.
 * @param {unknown} err
 * @returns {"timeout"|"network_error"|"malformed_response"|"unknown"}
 */
function classifyThrown(err) {
  const name = err && typeof err === "object" ? String(err.name || "") : "";
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (name === "AbortError" || /timeout/i.test(message)) return "timeout";
  if (name === "SyntaxError" || /json/i.test(message)) return "malformed_response";
  if (/network|fetch failed|ECONNRESET|ENOTFOUND|ECONNREFUSED/i.test(message)) {
    return "network_error";
  }
  return "unknown";
}

/** Only transient classes are retried — auth/client/malformed never are. */
function isRetryableErrorClass(errorClass) {
  return (
    errorClass === "rate_limited" ||
    errorClass === "server_error" ||
    errorClass === "timeout" ||
    errorClass === "network_error"
  );
}

/**
 * Deterministic bounded-exponential backoff delay (ms) before jitter.
 * @param {number} attemptIndex 0-based (0 = delay before the 2nd attempt)
 */
function backoffDelayMs(attemptIndex, opts = {}) {
  const base = opts.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const max = opts.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const exp = base * Math.pow(2, Math.max(0, attemptIndex));
  return Math.min(max, exp);
}

/**
 * Full-jitter delay ∈ [0, delayMs). Caller supplies `randomFn` (defaults to
 * Math.random) so callers needing determinism (tests) can inject one.
 */
function applyFullJitter(delayMs, randomFn) {
  const rnd = typeof randomFn === "function" ? randomFn : Math.random;
  return Math.floor(rnd() * delayMs);
}

/**
 * @param {{ attemptIndex: number, errorClass: string, maxAttempts?: number }} input
 * @returns {boolean}
 */
function shouldRetry(input) {
  const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  if (input.attemptIndex + 1 >= maxAttempts) return false;
  return isRetryableErrorClass(input.errorClass);
}

module.exports = {
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_BASE_DELAY_MS,
  DEFAULT_MAX_DELAY_MS,
  classifyHttpStatus,
  classifyThrown,
  isRetryableErrorClass,
  backoffDelayMs,
  applyFullJitter,
  shouldRetry,
};

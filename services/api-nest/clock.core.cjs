/**
 * Domain Clock primitive (reusable · no Peotteok vocabulary).
 *
 * Lives OUTSIDE src/ (sibling to dist/) so the same relative path resolves from
 * both `src/**​/*.ts` (dev) and `dist/**​/*.js` (build), and so an acceptance
 * harness can drive the exact module the product runs — mirrors the
 * services/api-nest/jwt.core.cjs · services/engine-rust/settlement_rule.cjs
 * cross-boundary SSOT pattern.
 *
 * Default is always real system time. A synthetic clock can only become active
 * when EVERY safety prerequisite holds at the same time (see
 * evaluateSyntheticClockGate) — a single env flag is never enough.
 *
 * NOT for authentication time. JWT issue/expiry, session and step-up TTLs keep
 * using Date.now() directly so synthetic QA time can never revive an expired
 * token (jwt.core.cjs is deliberately not wired to this module).
 */
"use strict";

const os = require("node:os");

/** Asia/Seoul is a fixed +09:00 offset (no DST). */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Mirrors tooling/engine-acceptance/kill-switch.cjs — never a weaker list. */
const ALLOWED_TARGET_ENV = Object.freeze([
  "local",
  "ci",
  "acceptance",
  "ephemeral",
  "qa",
]);

const HOSTNAME_ALLOWLIST = Object.freeze([
  /^localhost$/i,
  /^127\.0\.0\.1$/,
  /^::1$/,
  /^.*\.actions\.githubusercontent\.local$/i,
  /^runner-/i,
  /^fv-az/i,
]);

const HOSTNAME_DENY = Object.freeze([
  /peotteok\.(com|kr|app)$/i,
  /ai-profit-os/i,
  /aiprofit/i,
  /\.workers\.dev$/i,
  /\.pages\.dev$/i,
  /supabase\.co$/i,
]);

/**
 * Managed/production Postgres host suffixes — structural fix for CodeQL
 * js/regex/missing-regexp-anchor alerts 80/81 (D1-S1F 2026-09-05).
 *
 * History: alerts 51/52 (D1-S1C) added `\b` word-boundary anchors to the
 * previous regex-against-whole-DSN-string DENY list. CodeQL's dataflow
 * engine still flagged the result (alerts 80/81) because it treats
 * `DATABASE_URL` as a URL-shaped value and considers ANY `regex.test(url)`
 * — anchored or not — capable of matching "anywhere" in the string
 * (e.g. inside a query parameter or userinfo component), independent of
 * which direction (allow/deny) the match drives.
 *
 * Real fix (not another anchor): parse the DSN with `URL` and compare ONLY
 * the resolved `.hostname` component against known managed-host suffixes.
 * A crafted value like `postgres://x/db?x=rds.amazonaws.com` or
 * `postgres://rds.amazonaws.com@evil.example/db` can no longer influence
 * the decision — `new URL(...).hostname` for those is `x` / `evil.example`,
 * never `rds.amazonaws.com`. This is strictly at least as strict as the
 * previous regex list for every real hostname shape (see the regression
 * suite), and is fail-closed on parse failure (unlike an unanchored regex,
 * which would simply not match and silently ALLOW an unparseable target —
 * see isManagedDatabaseHost() below).
 *
 * `aws-\d-`/`.pooler.supabase` are intentionally dropped as separate
 * entries: Supabase pooler hostnames (e.g.
 * "aws-0-ap-northeast-2.pooler.supabase.com") already end in
 * ".supabase.com", so the "supabase.com"/"supabase.co" suffix entries below
 * cover them with zero loss of coverage — one precise check instead of two
 * overlapping substring heuristics.
 */
const DB_HOST_DENY_SUFFIXES = Object.freeze([
  "supabase.co",
  "supabase.com",
  "rds.amazonaws.com",
  "peotteok.com",
  "peotteok.kr",
  "peotteok.app",
  "hiptk.app", // infra/domain.manifest.json rootDomain (current production root)
  "ai-profit-os.com",
  "aiprofit.com",
  "workers.dev",
  "pages.dev",
]);

/** `host` IS `suffix`, or a real subdomain of it — never a coincidental substring. */
function hostMatchesManagedSuffix(host, suffix) {
  return host === suffix || host.endsWith("." + suffix);
}

/**
 * Extract only the hostname component of a Postgres-style connection URL.
 * Returns null for anything that does not parse as a URL with an authority
 * — callers MUST treat null as "unknown target" (fail closed), never as
 * safe. Never returns/logs the raw DSN (credentials live before `@`, which
 * `URL.hostname` never includes).
 */
function safeDatabaseUrlHostname(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  const host = (parsed.hostname || "").toLowerCase().replace(/\.+$/, "");
  return host || null;
}

/**
 * True when `databaseUrl` structurally targets a known managed/production
 * Postgres host. Parse failure returns true (fail closed — never allow a
 * synthetic clock against a target this function cannot positively clear).
 */
function isManagedDatabaseHost(databaseUrl) {
  const host = safeDatabaseUrlHostname(databaseUrl);
  if (host === null) return true;
  return DB_HOST_DENY_SUFFIXES.some((suffix) => hostMatchesManagedSuffix(host, suffix));
}

const SYNTHETIC_NS_RE = /^qa-synth-[a-z0-9][a-z0-9_-]{1,62}$/i;

/** Public host env keys that must not look production-like while QA time is on. */
const PUBLIC_HOST_KEYS = Object.freeze([
  "ROOT_DOMAIN",
  "APP_HOST",
  "OPS_HOST",
  "API_HOST",
]);

function readEnv(env, key) {
  const v = env[key];
  if (typeof v !== "string") return "";
  return v.trim();
}

/**
 * Fail-closed AND gate. Every check must pass before synthetic time may be
 * installed; the result is a pure function of `env` + `hostname` so it can be
 * fixture-tested without touching the process.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @param {string} [hostname]
 */
function evaluateSyntheticClockGate(env = process.env, hostname = undefined) {
  const checks = [];
  const deny = (id, detail) => checks.push({ id, ok: false, detail });
  const allow = (id, detail) => checks.push({ id, ok: true, detail });

  const nodeEnv = readEnv(env, "NODE_ENV") || "development";
  if (nodeEnv === "production") deny("non_production_environment", nodeEnv);
  else allow("non_production_environment", nodeEnv);

  const enabled = readEnv(env, "AIPO_QA_CLOCK_ENABLE");
  if (enabled === "1") allow("explicit_qa_clock_enable", enabled);
  else deny("explicit_qa_clock_enable", enabled || "(unset)");

  const ns = readEnv(env, "AIPO_QA_SYNTHETIC_NS");
  if (SYNTHETIC_NS_RE.test(ns)) allow("synthetic_namespace", ns);
  else deny("synthetic_namespace", ns || "(unset)");

  const targetEnv = readEnv(env, "AIPO_QA_TARGET_ENV");
  if (ALLOWED_TARGET_ENV.includes(targetEnv)) allow("target_env", targetEnv);
  else deny("target_env", targetEnv || "(unset)");

  const host = String(
    hostname ?? readEnv(env, "AIPO_QA_HOSTNAME") ?? "",
  ).trim() || safeHostname();
  if (!host) {
    deny("hostname", "(empty)");
  } else if (HOSTNAME_DENY.some((re) => re.test(host))) {
    deny("hostname", `production-like: ${host}`);
  } else if (
    HOSTNAME_ALLOWLIST.some((re) => re.test(host)) ||
    targetEnv === "ci" ||
    targetEnv === "acceptance" ||
    targetEnv === "ephemeral"
  ) {
    allow("hostname", host);
  } else {
    deny("hostname", `not allowlisted: ${host}`);
  }

  const publicHostHit = PUBLIC_HOST_KEYS.map((k) => [k, readEnv(env, k)]).find(
    ([, v]) => v && HOSTNAME_DENY.some((re) => re.test(v)),
  );
  if (publicHostHit) deny("public_host_env", `${publicHostHit[0]}=${publicHostHit[1]}`);
  else allow("public_host_env", "none production-like");

  const databaseUrl = readEnv(env, "DATABASE_URL");
  if (databaseUrl && isManagedDatabaseHost(databaseUrl)) {
    // Never redact-leak the DSN — only the fact that it is production-like.
    deny("database_target", "production/managed DATABASE_URL");
  } else {
    allow("database_target", databaseUrl ? "isolated/unknown-local" : "(unset)");
  }

  const failed = checks.filter((c) => !c.ok);
  return {
    ok: failed.length === 0,
    reason: failed.length ? `synthetic clock denied: ${failed.map((c) => c.id).join(", ")}` : null,
    checks,
  };
}

function safeHostname() {
  try {
    return os.hostname() || "";
  } catch {
    return "";
  }
}

/** @typedef {{ nowMs: () => number }} Clock */

/** Production/default clock — real system time, always. */
const SYSTEM_CLOCK = Object.freeze({
  nowMs() {
    return Date.now();
  },
});

/** Module-level singleton: Node's require cache keeps product and harness in sync. */
let active = null;

function assertClockShape(clock) {
  if (!clock || typeof clock.nowMs !== "function") {
    throw new Error("Clock must expose nowMs(): number");
  }
  const probe = clock.nowMs();
  if (!Number.isFinite(probe)) {
    throw new Error("Clock.nowMs() must return a finite number");
  }
}

/**
 * Install a synthetic clock. Throws unless every safety prerequisite holds.
 * @param {Clock} clock
 * @param {{ env?: NodeJS.ProcessEnv, hostname?: string }} [opts]
 */
function setClock(clock, opts = {}) {
  const gate = evaluateSyntheticClockGate(opts.env || process.env, opts.hostname);
  if (!gate.ok) {
    const err = new Error(gate.reason);
    err.code = "AIPO_SYNTHETIC_CLOCK_DENIED";
    err.checks = gate.checks;
    throw err;
  }
  assertClockShape(clock);
  active = clock;
  return { installed: true, gate };
}

function clearClock() {
  active = null;
}

/** Fixed-instant clock helper for deterministic scenarios. */
function createFixedClock(ms) {
  const at = Number(ms);
  if (!Number.isFinite(at)) throw new Error("createFixedClock(ms) requires a finite number");
  let cursor = at;
  return {
    nowMs: () => cursor,
    advanceMs(delta) {
      cursor += Number(delta) || 0;
      return cursor;
    },
  };
}

/**
 * Run `fn` with a synthetic clock installed, always restoring the previous one.
 * @template T
 * @param {Clock} clock
 * @param {() => T} fn
 * @param {{ env?: NodeJS.ProcessEnv, hostname?: string }} [opts]
 */
function withClock(clock, fn, opts = {}) {
  const previous = active;
  setClock(clock, opts);
  try {
    return fn();
  } finally {
    active = previous;
  }
}

function activeClockKind() {
  return active ? "synthetic" : "system";
}

/** The clock the product actually reads. */
function resolveClock() {
  return active || SYSTEM_CLOCK;
}

function nowMs() {
  return resolveClock().nowMs();
}

// ── domain time helpers (the decision surface QA4 exercises) ──

/** `YYYY-MM-DD` in UTC — referral share day key. */
function utcDayKey(ms = nowMs()) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` in Asia/Seoul — day-pulse / accrual day boundary. */
function kstDayKey(ms = nowMs()) {
  return new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Epoch ms of 00:00 Asia/Seoul for the KST day containing `ms`. */
function kstDayStartMs(ms = nowMs()) {
  const shifted = ms + KST_OFFSET_MS;
  return shifted - (shifted % DAY_MS) - KST_OFFSET_MS;
}

function addDaysMs(ms, days) {
  return ms + days * DAY_MS;
}

module.exports = {
  SYSTEM_CLOCK,
  KST_OFFSET_MS,
  DAY_MS,
  ALLOWED_TARGET_ENV,
  HOSTNAME_ALLOWLIST,
  HOSTNAME_DENY,
  DB_HOST_DENY_SUFFIXES,
  hostMatchesManagedSuffix,
  safeDatabaseUrlHostname,
  isManagedDatabaseHost,
  SYNTHETIC_NS_RE,
  PUBLIC_HOST_KEYS,
  evaluateSyntheticClockGate,
  setClock,
  clearClock,
  withClock,
  createFixedClock,
  resolveClock,
  activeClockKind,
  nowMs,
  utcDayKey,
  kstDayKey,
  kstDayStartMs,
  addDaysMs,
};

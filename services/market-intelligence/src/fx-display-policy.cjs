/**
 * P0-C — KRW display freshness, free-plan budget, retry, anomaly.
 * Marketplace native→USDT normalization stays in fx-snapshot-formula.cjs (P0-B).
 */
"use strict";

const {
  assertAmount,
  cmpAmount,
  mulAmount,
  divAmount,
  absDiff,
  parseAmount,
} = require("./money.cjs");

const COINGECKO_PLAN = "FREE_DEMO";
const COINGECKO_MONTHLY_LIMIT = 10000;
const COINGECKO_RATE_LIMIT_PER_MIN = 100;
/** Official Demo freshness is "from 60 sec". We poll far slower to stay in budget. */
const UPSTREAM_FETCH_INTERVAL_SEC = 600;
const FRONTEND_REFRESH_MS = 45000;
/** 10m cadence + 5m grace — do not mark STALE at interval+1ms. */
const FRESH_UNTIL_MS = 15 * 60 * 1000;
/** Bounded outage window. Older than this → KRW unavailable (not infinite reuse). */
const STALE_UNTIL_MS = 45 * 60 * 1000;
const ANOMALY_RATIO = "0.08";
const MAX_TRANSIENT_RETRIES = 1;
const QUOTES_MAX = 40;
const MONTHLY_WARNING_RATIO = 0.6;
const MONTHLY_CRITICAL_RATIO = 0.8;
const SCALE_FACTOR = 10n ** 18n;

const FX_STATUS = Object.freeze({
  FRESH: "FRESH",
  STALE: "STALE",
  UNAVAILABLE: "UNAVAILABLE",
  INVALID: "INVALID",
});

const BUDGET_LEVEL = Object.freeze({
  NORMAL: "NORMAL",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
});

function classifyFxFreshness(capturedAt, nowMs) {
  if (capturedAt == null || capturedAt === "") {
    return { status: FX_STATUS.UNAVAILABLE, ageMs: null };
  }
  const t = Date.parse(String(capturedAt));
  if (!Number.isFinite(t)) {
    return { status: FX_STATUS.INVALID, ageMs: null };
  }
  const ageMs = Number(nowMs) - t;
  if (ageMs < 0) return { status: FX_STATUS.INVALID, ageMs };
  if (ageMs <= FRESH_UNTIL_MS) return { status: FX_STATUS.FRESH, ageMs };
  if (ageMs <= STALE_UNTIL_MS) return { status: FX_STATUS.STALE, ageMs };
  return { status: FX_STATUS.UNAVAILABLE, ageMs };
}

function krwDisplayAvailable(status) {
  return status === FX_STATUS.FRESH || status === FX_STATUS.STALE;
}

function shouldRetryFxHttp(status, attempt) {
  if (attempt >= MAX_TRANSIENT_RETRIES) return false;
  if (status == null) return true;
  if (status === 429) return false;
  if (status >= 400 && status < 500) return false;
  return status >= 500;
}

function estimateMonthlyCalls(intervalSec) {
  const sec = Number(intervalSec);
  if (!Number.isFinite(sec) || sec <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil((30 * 24 * 3600) / sec);
}

function classifyBudgetLevel(callsThisMonth, monthlyLimit) {
  const calls = Number(callsThisMonth);
  const limit = Number(monthlyLimit);
  if (!Number.isFinite(calls) || !Number.isFinite(limit) || limit <= 0) {
    return BUDGET_LEVEL.CRITICAL;
  }
  const ratio = calls / limit;
  if (ratio >= MONTHLY_CRITICAL_RATIO) return BUDGET_LEVEL.CRITICAL;
  if (ratio >= MONTHLY_WARNING_RATIO) return BUDGET_LEVEL.WARNING;
  return BUDGET_LEVEL.NORMAL;
}

function isPositiveRate(raw) {
  try {
    const s = assertAmount(String(raw), "rate");
    return cmpAmount(s, "0") > 0;
  } catch {
    return false;
  }
}

function rejectInvalidRate(raw) {
  if (raw == null) return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return isPositiveRate(String(raw)) ? String(raw) : null;
  }
  const s = String(raw).trim();
  if (!s || s.toLowerCase() === "nan" || s.toLowerCase() === "infinity") {
    return null;
  }
  return isPositiveRate(s) ? s : null;
}

/**
 * CoinGecko USDT/KRW vs Frankfurter-cross (USDT/USD × USD/KRW).
 * Roles differ — this is anomaly detection, not 1:1 equality.
 */
function detectUsdtKrwAnomaly(primaryUsdtKrw, fallbackUsdtUsd, fallbackUsdKrw) {
  const primary = rejectInvalidRate(primaryUsdtKrw);
  const usdtUsd = rejectInvalidRate(fallbackUsdtUsd);
  const usdKrw = rejectInvalidRate(fallbackUsdKrw);
  if (!primary || !usdtUsd || !usdKrw) {
    return { anomalous: false, ratio: null, reference: null };
  }
  const reference = mulAmount(usdtUsd, usdKrw);
  const diff = absDiff(primary, reference);
  const ratio = divAmount(diff, primary);
  return {
    anomalous: cmpAmount(ratio, ANOMALY_RATIO) > 0,
    ratio,
    reference,
  };
}

function roundKrwDisplay(amount) {
  const n = parseAmount(assertAmount(String(amount), "krw"));
  const half = SCALE_FACTOR / 2n;
  const whole = n >= 0n ? (n + half) / SCALE_FACTOR : (n - half) / SCALE_FACTOR;
  return whole.toString();
}

function clampQuotes(quotes) {
  if (!Array.isArray(quotes)) return [];
  return quotes.slice(0, QUOTES_MAX);
}

function selftestFxDisplayPolicy() {
  const fails = [];
  const now = Date.parse("2026-08-26T03:00:00.000Z");
  const fresh = classifyFxFreshness("2026-08-26T02:50:00.000Z", now);
  if (fresh.status !== FX_STATUS.FRESH) fails.push(`fresh got ${fresh.status}`);
  const stale = classifyFxFreshness("2026-08-26T02:30:00.000Z", now);
  if (stale.status !== FX_STATUS.STALE) fails.push(`stale got ${stale.status}`);
  const gone = classifyFxFreshness("2026-08-26T01:00:00.000Z", now);
  if (gone.status !== FX_STATUS.UNAVAILABLE) {
    fails.push(`too stale got ${gone.status}`);
  }
  if (classifyFxFreshness(null, now).status !== FX_STATUS.UNAVAILABLE) {
    fails.push("missing capturedAt must be UNAVAILABLE");
  }
  if (classifyFxFreshness("not-a-date", now).status !== FX_STATUS.INVALID) {
    fails.push("malformed capturedAt must be INVALID");
  }
  if (krwDisplayAvailable(FX_STATUS.UNAVAILABLE)) {
    fails.push("unavailable must fail-closed");
  }
  if (!krwDisplayAvailable(FX_STATUS.STALE)) {
    fails.push("STALE remains displayable inside grace");
  }

  if (shouldRetryFxHttp(429, 0)) fails.push("429 must not retry");
  if (shouldRetryFxHttp(400, 0)) fails.push("4xx must not retry");
  if (!shouldRetryFxHttp(503, 0)) fails.push("5xx attempt0 must retry");
  if (shouldRetryFxHttp(503, 1)) fails.push("retry must be bounded to 1");
  if (!shouldRetryFxHttp(null, 0)) fails.push("timeout/network must retry once");

  const monthly = estimateMonthlyCalls(UPSTREAM_FETCH_INTERVAL_SEC);
  if (monthly !== 4320) fails.push(`monthly calls ${monthly} want 4320`);
  if (monthly / COINGECKO_MONTHLY_LIMIT > 0.7) {
    fails.push("default interval exceeds 70% of Demo 10k");
  }
  if (classifyBudgetLevel(4320, 10000) !== BUDGET_LEVEL.NORMAL) {
    fails.push("4320/10000 must be NORMAL");
  }
  if (classifyBudgetLevel(6000, 10000) !== BUDGET_LEVEL.WARNING) {
    fails.push("6000/10000 must be WARNING");
  }
  if (classifyBudgetLevel(8000, 10000) !== BUDGET_LEVEL.CRITICAL) {
    fails.push("8000/10000 must be CRITICAL");
  }

  if (rejectInvalidRate(0) != null) fails.push("zero rate invalid");
  if (rejectInvalidRate(-1) != null) fails.push("negative rate invalid");
  if (rejectInvalidRate(Number.NaN) != null) fails.push("NaN invalid");
  if (rejectInvalidRate(Number.POSITIVE_INFINITY) != null) {
    fails.push("Infinity invalid");
  }
  if (rejectInvalidRate("1387.25") !== "1387.25") fails.push("valid rate rejected");

  const anomaly = detectUsdtKrwAnomaly("2000", "1.00", "1380");
  if (!anomaly.anomalous) fails.push("large CG vs Frankfurter gap must flag");
  const ok = detectUsdtKrwAnomaly("1387", "1.001", "1386");
  if (ok.anomalous) fails.push("near-aligned rates must not flag");

  if (roundKrwDisplay("186900.4") !== "186900") {
    fails.push(`roundKrw ${roundKrwDisplay("186900.4")}`);
  }
  if (roundKrwDisplay("-11680.6") !== "-11681") {
    fails.push(`neg round ${roundKrwDisplay("-11680.6")}`);
  }
  if (roundKrwDisplay("0") !== "0") fails.push("zero KRW round");

  if (clampQuotes(new Array(50).fill({ id: "x" })).length !== 40) {
    fails.push("quotes must clamp to 40");
  }

  if (fails.length) {
    throw new Error(fails.join("\n"));
  }
  return true;
}

module.exports = {
  COINGECKO_PLAN,
  COINGECKO_MONTHLY_LIMIT,
  COINGECKO_RATE_LIMIT_PER_MIN,
  UPSTREAM_FETCH_INTERVAL_SEC,
  FRONTEND_REFRESH_MS,
  FRESH_UNTIL_MS,
  STALE_UNTIL_MS,
  ANOMALY_RATIO,
  MAX_TRANSIENT_RETRIES,
  QUOTES_MAX,
  MONTHLY_WARNING_RATIO,
  MONTHLY_CRITICAL_RATIO,
  FX_STATUS,
  BUDGET_LEVEL,
  classifyFxFreshness,
  krwDisplayAvailable,
  shouldRetryFxHttp,
  estimateMonthlyCalls,
  classifyBudgetLevel,
  isPositiveRate,
  rejectInvalidRate,
  detectUsdtKrwAnomaly,
  roundKrwDisplay,
  clampQuotes,
  selftestFxDisplayPolicy,
};

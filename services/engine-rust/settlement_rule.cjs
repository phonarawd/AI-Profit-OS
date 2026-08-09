/**
 * §48.13 MATCH_SUCCESS Rule Engine — Node verify mirror of settlement_rule.rs
 * Soft60 / Hard90 · REQUEUE · MATCH_TIMEOUT · P0b
 * FORBIDDEN: Math.random · percent-success knobs · presentation → credit
 */

"use strict";

const SOFT_SEC = 60;
const HARD_SEC = 90;
const DEFAULT_PRICE_STALE_MAX_SEC = 3;

function softDeadlineMs(participateAcceptedAtMs) {
  return participateAcceptedAtMs + SOFT_SEC * 1000;
}

function hardDeadlineMs(participateAcceptedAtMs) {
  return participateAcceptedAtMs + HARD_SEC * 1000;
}

function parseUsdtMicros(s) {
  const raw = String(s ?? "").trim();
  if (!raw) return 0n;
  const neg = raw.startsWith("-");
  const body = neg ? raw.slice(1) : raw;
  const [w, f = ""] = body.split(".");
  let whole = 0n;
  try {
    whole = BigInt(w || "0");
  } catch {
    whole = 0n;
  }
  let micros = 0n;
  for (let i = 0; i < 6; i++) {
    const ch = f[i];
    const d = ch && ch >= "0" && ch <= "9" ? BigInt(ch) : 0n;
    micros = micros * 10n + d;
  }
  const v = whole * 1_000_000n + micros;
  return neg ? -v : v;
}

function usdtGe(a, b) {
  return parseUsdtMicros(a) >= parseUsdtMicros(b);
}

function isRetryable(code) {
  return code === "PRICE_MOVED";
}

/**
 * §48.13.1 P0b / P1 / P5 — trade not created on failure.
 * @returns {"OK"|"MATCH_BLOCKED"|"COMPARE_NOT_READY"|"PRICE_STALE_DATA"}
 */
function guardParticipate(ctx) {
  if (ctx.matchBlocked === true) return "MATCH_BLOCKED";
  if (ctx.compareReady !== true) return "COMPARE_NOT_READY";
  const maxSec = ctx.priceStaleMaxSec ?? DEFAULT_PRICE_STALE_MAX_SEC;
  const ageSec = Math.max(0, Math.floor((ctx.nowMs - ctx.staleAtMs) / 1000));
  if (ageSec > maxSec) return "PRICE_STALE_DATA";
  return "OK";
}

function evaluateRules(ctx) {
  const policy = ctx.policy || {};
  // R1
  if (ctx.circuitStatus !== "closed") return "CIRCUIT_OPEN";
  // R2
  if (ctx.userStatus === "frozen" || ctx.userStatus === "banned") {
    return "SYSTEM_FAILED";
  }
  // R3
  if (ctx.opportunityStatus !== "available") return "PRICE_MOVED";
  // R4
  if (ctx.compareReady !== true) return "PRICE_MOVED";
  // R5
  const staleSec = Math.max(0, Math.floor((ctx.nowMs - ctx.staleAtMs) / 1000));
  if (staleSec > (policy.staleAllowanceSec ?? 0)) return "PRICE_MOVED";
  // R6
  if (!usdtGe(ctx.expectedProfitUsdt, policy.minProfitUsdt)) {
    return "BELOW_MIN_PROFIT";
  }
  // R7 — version match OR priceSoftAccept
  const versionOk =
    ctx.tradePricingVersion === ctx.opportunityPricingVersion;
  const softAccept = usdtGe(ctx.expectedProfitUsdt, policy.minProfitUsdt);
  if (!versionOk && !softAccept) return "PRICE_MOVED";
  // R8
  if (ctx.simulationPayoutFeasible !== true) return "BELOW_MIN_PROFIT";
  // R9
  if (ctx.listingLegsFresh !== true) return "PRICE_MOVED";
  // R10
  if ((ctx.rematchCount ?? 0) > (policy.maxRematchCount ?? 0)) {
    return "BELOW_MIN_PROFIT";
  }
  return null;
}

/**
 * evaluateExecution(trade, opportunity, policy, user, sim) → ExecutionResultCode
 * presentationDurationSec is ignored.
 */
function evaluateExecution(ctx) {
  const hard = hardDeadlineMs(ctx.participateAcceptedAtMs);
  if (ctx.nowMs >= hard) return "MATCH_TIMEOUT";

  const fail = evaluateRules(ctx);
  if (fail == null) return "MATCH_SUCCESS";

  const policy = ctx.policy || {};
  const canRequeue =
    isRetryable(fail) &&
    (ctx.rematchCount ?? 0) < (policy.maxRematchCount ?? 0) &&
    ctx.nowMs + (policy.retryWaitSec ?? 0) * 1000 < hard;

  return canRequeue ? "REQUEUE" : fail;
}

function evaluateMatchSuccess(ctx) {
  return evaluateExecution(ctx);
}

module.exports = {
  SOFT_SEC,
  HARD_SEC,
  DEFAULT_PRICE_STALE_MAX_SEC,
  softDeadlineMs,
  hardDeadlineMs,
  guardParticipate,
  evaluateExecution,
  evaluateMatchSuccess,
  usdtGe,
};

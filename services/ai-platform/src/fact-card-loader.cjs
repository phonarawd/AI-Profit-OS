/**
 * Fact Card loader — Engine §47.4 freshness-aware
 * Money/price answers MUST use Fact cards · never Twin cache
 */

"use strict";

const FACT_SOURCES = Object.freeze([
  "ledger",
  "opportunity",
  "kyc",
  "fx",
  "wallet",
  "membership",
  "referral",
  "ux_prefs",
  "other",
]);

const DEFAULT_MIN_CONFIDENCE = 0.5;

/**
 * @param {string|Date|number} v
 */
function toMs(v) {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const t = Date.parse(String(v || ""));
  return Number.isFinite(t) ? t : NaN;
}

/**
 * @param {object} input
 * @param {string} input.source
 * @param {object} [input.payload]
 * @param {string|Date|number} [input.captured_at]
 * @param {string|Date|number} [input.expires_at]
 * @param {number} [input.confidence]
 * @param {number} [input.ttlSec]
 * @param {string|Date|number} [input.now]
 */
function buildFactCard(input = {}) {
  const source = String(input.source || "");
  if (!FACT_SOURCES.includes(source)) {
    throw new Error(`FACT_SOURCE_INVALID:${source}`);
  }
  const nowMs = toMs(input.now ?? Date.now());
  const capturedMs = toMs(input.captured_at ?? input.capturedAt ?? nowMs);
  let expiresMs = toMs(input.expires_at ?? input.expiresAt);
  if (!Number.isFinite(expiresMs)) {
    const ttl = Number(input.ttlSec);
    const ttlSec = Number.isFinite(ttl) && ttl > 0 ? ttl : 60;
    expiresMs = capturedMs + ttlSec * 1000;
  }
  const confidence = Number(input.confidence);
  const conf =
    Number.isFinite(confidence) && confidence >= 0 && confidence <= 1
      ? confidence
      : 1;

  return Object.freeze({
    schema: "fact-card.v1",
    source,
    captured_at: new Date(capturedMs).toISOString(),
    expires_at: new Date(expiresMs).toISOString(),
    confidence: conf,
    payload:
      input.payload && typeof input.payload === "object"
        ? Object.freeze({ ...input.payload })
        : Object.freeze({}),
  });
}

/**
 * @param {object} fact
 * @param {object} [opts]
 * @param {string|Date|number} [opts.now]
 * @param {number} [opts.minConfidence]
 */
function isFactFresh(fact, opts = {}) {
  if (!fact || typeof fact !== "object") return false;
  const nowMs = toMs(opts.now ?? Date.now());
  const exp = toMs(fact.expires_at ?? fact.expiresAt);
  if (!Number.isFinite(exp) || !Number.isFinite(nowMs)) return false;
  if (nowMs > exp) return false;
  const min =
    opts.minConfidence != null
      ? Number(opts.minConfidence)
      : DEFAULT_MIN_CONFIDENCE;
  const conf = Number(fact.confidence);
  if (!Number.isFinite(conf) || conf < min) return false;
  return true;
}

/**
 * @param {object[]} facts
 * @param {object} [opts]
 */
function partitionFreshness(facts, opts = {}) {
  const list = Array.isArray(facts) ? facts : [];
  const fresh = [];
  const stale = [];
  for (const f of list) {
    if (isFactFresh(f, opts)) fresh.push(f);
    else stale.push(f);
  }
  return Object.freeze({
    fresh: Object.freeze([...fresh]),
    stale: Object.freeze([...stale]),
    needsRefresh: stale.length > 0,
  });
}

/**
 * Guard helper — refuse answering money with expired facts
 * @param {object[]} facts
 * @param {object} [opts]
 */
function assertFactsFreshOrThrow(facts, opts = {}) {
  const part = partitionFreshness(facts, opts);
  if (part.needsRefresh || part.fresh.length === 0) {
    const err = new Error("FACT_STALE_REFRESH_REQUIRED");
    err.code = "FACT_STALE";
    err.stale = part.stale;
    throw err;
  }
  return part.fresh;
}

module.exports = {
  FACT_SOURCES,
  DEFAULT_MIN_CONFIDENCE,
  buildFactCard,
  isFactFresh,
  partitionFreshness,
  assertFactsFreshOrThrow,
};

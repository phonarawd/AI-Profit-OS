/**
 * Failure Evidence builder — seed 단독 금지
 * 최소: seed · rng_version · clock_as_of · request_sequence ·
 * sanitized I/O · baseline_id · configuration_fingerprint
 */
"use strict";

const crypto = require("node:crypto");
const { RNG_VERSION } = require("./seeded-rng.cjs");

function sanitizeValue(v, depth = 0) {
  if (depth > 6) return "[truncated]";
  if (v === null || v === undefined) return v;
  if (typeof v === "string") {
    if (v.length > 240) return `${v.slice(0, 240)}…`;
    if (/bearer\s+/i.test(v) || /eyJ[A-Za-z0-9_-]+\./.test(v)) {
      return "[redacted_token]";
    }
    return v;
  }
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.slice(0, 32).map((x) => sanitizeValue(x, depth + 1));
  if (typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (/secret|password|authorization|cookie/i.test(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = sanitizeValue(val, depth + 1);
      }
    }
    return out;
  }
  return String(v);
}

function configurationFingerprint(cfg) {
  const text = JSON.stringify(cfg || {});
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * @param {object} opts
 * @returns {object} rich evidence record
 */
function buildRichFailureEvidence(opts) {
  const clock_as_of = opts.clock_as_of || new Date().toISOString();
  const request_sequence = Array.isArray(opts.request_sequence)
    ? opts.request_sequence
    : [];
  const suite_id = opts.suite_id || "QA3";
  const cfg = {
    property_id: opts.property_id,
    invariant_id: opts.invariant_id,
    numRuns: opts.numRuns,
    mode: opts.mode,
    fast_check_version: opts.fast_check_version || null,
    product_mutation: 0,
    suite_id,
    ...(opts.configuration_fingerprint &&
    typeof opts.configuration_fingerprint === "object"
      ? opts.configuration_fingerprint
      : {}),
  };
  return {
    seed: opts.seed ?? null,
    rng_version: opts.rng_version || RNG_VERSION,
    clock_as_of,
    request_sequence: sanitizeValue(request_sequence),
    sanitized_request: sanitizeValue(opts.sanitized_request ?? null),
    sanitized_response: sanitizeValue(opts.sanitized_response ?? null),
    counterexample: sanitizeValue(opts.counterexample ?? null),
    error_message: opts.error_message ? String(opts.error_message).slice(0, 2000) : null,
    baseline_id: opts.baseline_id,
    model_identifier: opts.model_identifier || "harness-static-oracle",
    configuration_fingerprint: configurationFingerprint(cfg),
    property_id: opts.property_id,
    invariant_id: opts.invariant_id,
    suite_id,
    live_http: false,
  };
}

module.exports = {
  buildRichFailureEvidence,
  sanitizeValue,
  configurationFingerprint,
};

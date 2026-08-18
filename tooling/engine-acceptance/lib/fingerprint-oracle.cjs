/**
 * Idempotency fingerprint oracle (QA harness) — product TS 미러
 * 제품 mutation 0 · 계약 속성만 property-test
 */
"use strict";

const crypto = require("node:crypto");

const IDEMPOTENCY_FINGERPRINT_VERSION = "v1";

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

function fingerprintPayload(semantic) {
  const canonical = `${IDEMPOTENCY_FINGERPRINT_VERSION}:${stableStringify(semantic)}`;
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

function participateSemantic(input) {
  return {
    userId: input.userId,
    opportunityId: input.opportunityId,
    pricingVersion: input.pricingVersion,
    minProfitUsdt: input.minProfitUsdt,
    amountUsdt: input.amountUsdt,
  };
}

function assertFingerprintMatch(opts) {
  const stored = String(opts.stored ?? "").trim();
  if (!stored) return { ok: true };
  if (stored !== opts.incoming) {
    return {
      ok: false,
      code: opts.code ?? "IDEMPOTENCY_KEY_CONFLICT",
      statusCode: 409,
    };
  }
  return { ok: true };
}

module.exports = {
  IDEMPOTENCY_FINGERPRINT_VERSION,
  stableStringify,
  fingerprintPayload,
  participateSemantic,
  assertFingerprintMatch,
};

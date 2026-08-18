/**
 * LLM soft quota helpers — Engine §47.13
 * Pure functions · Nest passes Redis incr
 */

"use strict";

const { PROVIDER_IDS } = require("./ai-log.cjs");

/**
 * @param {string} providerId
 * @param {number} [nowMs]
 */
function quotaKeyRpm(providerId, nowMs = Date.now()) {
  const bucket = Math.floor(nowMs / 60_000);
  return `ai:llm:quota:${providerId}:rpm:${bucket}`;
}

/**
 * @param {string} providerId
 * @param {number} [nowMs]
 */
function quotaKeyRpd(providerId, nowMs = Date.now()) {
  const d = new Date(nowMs);
  const day = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return `ai:llm:quota:${providerId}:rpd:${day}`;
}

/**
 * @param {number} count
 * @param {number} limit
 */
function isSoftQuotaExceeded(count, limit) {
  const c = Number(count);
  const l = Number(limit);
  if (!Number.isFinite(l) || l <= 0) return false;
  if (!Number.isFinite(c)) return false;
  return c > l;
}

/**
 * @param {object} input
 * @param {number} [input.rpmCount]
 * @param {number} [input.rpdCount]
 * @param {number} [input.softRpm]
 * @param {number} [input.softRpd]
 */
function shouldDegradeForQuota(input = {}) {
  if (
    isSoftQuotaExceeded(input.rpmCount, input.softRpm) ||
    isSoftQuotaExceeded(input.rpdCount, input.softRpd)
  ) {
    return Object.freeze({
      degrade: true,
      reason: "soft_quota_exceeded",
      provider_effective: "none",
    });
  }
  return Object.freeze({ degrade: false, reason: null, provider_effective: null });
}

/**
 * G-lane busy template when LLM degraded — no money facts
 */
const G_BUSY_TEMPLATE =
  "지금은 잠시 바빠요. 조금 뒤 다시 물어봐 주세요.";

/**
 * @param {"G"|"P"|"S"} lane
 * @param {boolean} degraded
 */
function degradeAnswerPath(lane, degraded) {
  if (!degraded) return null;
  if (lane === "G") return { path: "template", text: G_BUSY_TEMPLATE };
  if (lane === "P") return { path: "fact", text: null };
  return { path: "refuse_s", text: null };
}

/**
 * @param {string} providerId
 */
function assertProviderId(providerId) {
  const id = String(providerId || "");
  if (!PROVIDER_IDS.includes(id)) {
    throw new Error(`LLM_PROVIDER_INVALID:${id}`);
  }
  return id;
}

module.exports = {
  quotaKeyRpm,
  quotaKeyRpd,
  isSoftQuotaExceeded,
  shouldDegradeForQuota,
  G_BUSY_TEMPLATE,
  degradeAnswerPath,
  assertProviderId,
};

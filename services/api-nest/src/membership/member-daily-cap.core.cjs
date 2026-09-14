/**
 * 회원별 참여 횟수 단독 제어 (B1).
 * 품질(minProfit/stale/strictness/자본/혜택)과 분리. 0은 명시 차단.
 * DB/네트워크 없음 — 서비스·HTTP 격리가 같은 함수를 쓴다.
 */

"use strict";

const path = require("path");
const membership = require(path.join(
  __dirname,
  "..",
  "..",
  "..",
  "market-intelligence",
  "src",
  "membership.cjs",
));

const {
  readExplicitNonNegativeInt,
  resolveMemberDailyMatchCap,
  projectDailyMatchQuota,
  checkParticipateMembershipGuards,
  mergeEffectivePolicy,
} = membership;

/**
 * @param {unknown} raw
 * @returns {number}
 */
function assertMemberDailyMatchCap(raw) {
  const n = readExplicitNonNegativeInt(raw);
  if (n === null) {
    const err = new Error(
      "dailyUserMatchCap must be a non-negative integer (0 blocks new participate)",
    );
    err.code = "INVALID_CAP";
    throw err;
  }
  return n;
}

/**
 * cap-only 다음 override. 기존 품질 필드는 복사만 하고 바꾸지 않는다.
 * 신규 행은 custom + 품질 null — merge가 정책 품질을 유지하고 cap만 적용.
 * @param {object|null} before
 * @param {number} cap
 * @param {{ reason: string, updatedByAdminId: string }} meta
 */
function nextCapOnlyOverride(before, cap, meta) {
  if (before && typeof before === "object") {
    return {
      userId: before.userId,
      matchStrictnessOverride: before.matchStrictnessOverride,
      minProfitUsdt: before.minProfitUsdt,
      staleAllowanceSec: before.staleAllowanceSec,
      maxRematchCount: before.maxRematchCount,
      dailyUserMatchCap: cap,
      reason: meta.reason,
      updatedByAdminId: meta.updatedByAdminId,
      insertMode: "update_cap_only",
      qualityUntouched: true,
    };
  }
  return {
    matchStrictnessOverride: "custom",
    dailyUserMatchCap: cap,
    reason: meta.reason,
    updatedByAdminId: meta.updatedByAdminId,
    insertMode: "insert_cap_only_custom",
    qualityUntouched: true,
  };
}

/**
 * cap-only 행(품질 필드 없음)이면 행 삭제, 아니면 cap만 null.
 * @param {object|null} before
 */
function nextClearCapOnly(before) {
  if (!before) {
    return { action: "noop", override: null };
  }
  const qualityEmpty =
    before.matchStrictnessOverride === "custom" &&
    before.minProfitUsdt == null &&
    before.staleAllowanceSec == null &&
    before.maxRematchCount == null;
  if (qualityEmpty) {
    return { action: "delete", override: null };
  }
  return {
    action: "null_cap",
    override: {
      ...before,
      dailyUserMatchCap: undefined,
    },
  };
}

/**
 * 회원 단위 참여 허용. used/cap은 해당 userId 것만 본다.
 * @param {{
 *   userId: string,
 *   used: unknown,
 *   overrideDailyUserMatchCap?: unknown,
 *   membershipRowCap?: unknown,
 *   ladderCap?: unknown,
 *   policyCap?: unknown,
 *   opportunityCapitalBand?: string,
 *   maxCapitalBand?: string,
 *   slotsLeft?: number,
 * }} input
 */
function decideMemberParticipate(input) {
  const quota = projectDailyMatchQuota(input);
  const hit = checkParticipateMembershipGuards({
    opportunityCapitalBand: input.opportunityCapitalBand ?? "micro",
    maxCapitalBand: input.maxCapitalBand ?? "micro",
    dailyMatchesUsed: quota.used,
    dailyUserMatchCap: quota.cap,
    slotsLeft: input.slotsLeft == null ? 1 : Number(input.slotsLeft),
  });
  return {
    userId: quota.userId,
    quota,
    allowed: hit == null,
    deny: hit,
  };
}

/**
 * cap-only 후 품질 필드가 그대로인지 비교.
 */
function qualityFieldsOf(policy) {
  return {
    matchStrictness: policy.matchStrictness,
    minProfitUsdt: String(policy.minProfitUsdt),
    staleAllowanceSec: Number(policy.staleAllowanceSec),
    maxRematchCount: Number(policy.maxRematchCount),
    slippageBoundBps: Number(policy.slippageBoundBps),
  };
}

module.exports = {
  assertMemberDailyMatchCap,
  nextCapOnlyOverride,
  nextClearCapOnly,
  decideMemberParticipate,
  qualityFieldsOf,
  readExplicitNonNegativeInt,
  resolveMemberDailyMatchCap,
  projectDailyMatchQuota,
  checkParticipateMembershipGuards,
  mergeEffectivePolicy,
};

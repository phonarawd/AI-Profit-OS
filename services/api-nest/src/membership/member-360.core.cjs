/**
 * 회원 360 조회 계약 (U01–U10). 잘못된 ID를 첫 회원/demo로 대체하지 않음.
 * 카탈로그 S2·원문 PII 전체 수집은 명세만.
 */

"use strict";

function assertExactUserId(raw) {
  const s = String(raw || "").trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s,
    )
  ) {
    const err = new Error("userId must be uuid");
    err.code = "INVALID_USER";
    throw err;
  }
  return s.toLowerCase();
}

/**
 * @param {{ requestedUserId: unknown, foundUserId?: string|null, demoUserId?: string }} input
 */
function resolveExactMember360(input) {
  const requested = assertExactUserId(input.requestedUserId);
  if (input.foundUserId == null || input.foundUserId === "") {
    return {
      ok: false,
      status: 404,
      code: "USER_NOT_FOUND",
      userId: requested,
      substituted: false,
    };
  }
  const found = assertExactUserId(input.foundUserId);
  if (found !== requested) {
    return {
      ok: false,
      status: 409,
      code: "USER_ID_MISMATCH",
      userId: requested,
      substituted: false,
    };
  }
  if (input.demoUserId && assertExactUserId(input.demoUserId) === requested) {
    // demo 계정 자체 조회는 허용. 다른 ID를 demo로 바꾸는 것은 금지.
  }
  return {
    ok: true,
    status: 200,
    userId: requested,
    substituted: false,
  };
}

function userVisibleMembershipProjection(adminFull) {
  return {
    membership: adminFull.membership,
    labelKo: adminFull.labelKo,
    dailyUserMatchCap: adminFull.quota && adminFull.quota.cap,
    dailyMatchesUsed: adminFull.quota && adminFull.quota.used,
    remaining: adminFull.quota && adminFull.quota.participateRemaining != null
      ? adminFull.quota.participateRemaining
      : adminFull.quota && adminFull.quota.remaining,
    blocked: adminFull.quota && adminFull.quota.blocked,
    staffNotesExcluded: true,
    otherMembersExcluded: true,
    riskEvidenceExcluded: true,
  };
}

function maskPii(value) {
  const s = String(value || "");
  if (s.length <= 2) return "*";
  return `${s.slice(0, 1)}***${s.slice(-1)}`;
}

module.exports = {
  assertExactUserId,
  resolveExactMember360,
  userVisibleMembershipProjection,
  maskPii,
};

/**
 * 세션 revoke 소비 판정 (U06).
 * AuthService.session()은 DB revoke를 읽는다. JwtAuthGuard는 현재 JWT 서명만 본다.
 * 이 모듈은 가드가 써야 할 판정이며, 실 DB 조회를 수행하지 않는다.
 */

"use strict";

/**
 * @param {{
 *   jwtValid: boolean,
 *   sessionRevoked?: boolean,
 *   sessionRowMissing?: boolean,
 *   userDeleted?: boolean,
 *   guardChecksDb?: boolean,
 * }} input
 */
function decideAccessTokenAdmission(input) {
  if (input.jwtValid !== true) {
    return { admit: false, code: "AUTH_REQUIRED", consumed: "jwt" };
  }
  if (input.userDeleted === true) {
    return { admit: false, code: "ACCOUNT_DELETED", consumed: "user_status" };
  }
  if (input.sessionRevoked === true || input.sessionRowMissing === true) {
    return {
      admit: false,
      code: "SESSION_REVOKED",
      consumed: "auth_sessions",
    };
  }
  return { admit: true, code: "OK", consumed: "jwt" };
}

function describeCurrentGuardGap() {
  return {
    jwtAuthGuardChecksDbRevoke: false,
    authServiceSessionChecksDbRevoke: true,
    processMapIsNotDurable: true,
    immediateLogoutOnAllProtectedApis: "UNVERIFIED",
    note: "JwtAuthGuard canActivate는 서명/iss/aud만 확인. 모든 기기 로그아웃의 즉시 API 차단은 미검증.",
  };
}

module.exports = {
  decideAccessTokenAdmission,
  describeCurrentGuardGap,
};

/**
 * QA Lab 인증 세션 헬퍼. 실 브라우저 쿠키는 호출측이 채운다.
 * 프로덕션 자격으로 세션을 만들지 않는다.
 */
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");

function createAuthSession(input = {}) {
  assertQaIsolation({ purpose: input.purpose || "e2e" });
  const personaId = String(input.personaId || "").trim();
  if (!personaId) {
    throw new Error("auth-session: personaId required");
  }
  return {
    personaId,
    cookieName: "aipo_session",
    cookieHeader: input.cookieHeader || null,
    source: "committed-helper",
  };
}

module.exports = { createAuthSession };

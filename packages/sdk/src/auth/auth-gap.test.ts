import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AuthError,
  assertNoForbiddenProfileFields,
  buildStageBProfileBody,
  continuePathAfterAuth,
  deleteAuthAccount,
  normalizeAuthSession,
} from "./fetch.ts";
import { DELETE_ACCOUNT_CONFIRM_PHRASE } from "./types.ts";
import { isKakaoOAuthReady } from "./kakao-ready.ts";

describe("auth gap wiring — session/kakao/profile safety", () => {
  it("does not invent a session when required fields are missing", () => {
    assert.throws(
      () =>
        normalizeAuthSession({
          userId: "u1",
          issuer: "ai-profit-os-nest",
          onboardingStage: "B_complete",
        }),
      AuthError,
    );
  });

  it("rejects a non-Nest issuer instead of accepting another auth owner", () => {
    assert.throws(
      () =>
        normalizeAuthSession({
          sessionId: "s1",
          userId: "u1",
          issuer: "supabase",
          issuedAt: "2026-08-20T00:00:00.000Z",
          expiresAt: "2026-08-20T00:15:00.000Z",
          revoked: false,
          onboardingStage: "B_complete",
        }),
      /SESSION_UNAVAILABLE/,
    );
  });

  it("treats a revoked session as unusable", () => {
    assert.throws(
      () =>
        normalizeAuthSession({
          sessionId: "s1",
          userId: "u1",
          issuer: "ai-profit-os-nest",
          issuedAt: "2026-08-20T00:00:00.000Z",
          expiresAt: "2026-08-20T00:15:00.000Z",
          revoked: true,
          onboardingStage: "B_complete",
        }),
      /AUTH_REQUIRED/,
    );
  });

  it("does not enable Kakao on CLIENT_ID alone", () => {
    assert.equal(
      isKakaoOAuthReady({
        NEXT_PUBLIC_OAUTH_KAKAO_CLIENT_ID: "kakao-client",
      }),
      false,
    );
    assert.equal(
      isKakaoOAuthReady({
        NEXT_PUBLIC_OAUTH_KAKAO_ENABLED: "1",
      }),
      true,
    );
  });

  it("routes incomplete Stage B to complete-profile, complete to Home", () => {
    assert.equal(continuePathAfterAuth("A"), "/auth/complete-profile");
    assert.equal(continuePathAfterAuth("B_incomplete"), "/auth/complete-profile");
    assert.equal(continuePathAfterAuth("B_complete"), "/");
  });

  it("rejects gender/RRN on Stage B body", () => {
    assert.throws(
      () => assertNoForbiddenProfileFields({ gender: "x" }),
      /FORBIDDEN_FIELD/,
    );
    const body = buildStageBProfileBody({
      displayName: "이름",
      phoneE164: "+821012345678",
      birthDate: "1990-01-01",
      email: "a@b.co",
    });
    assert.equal(body.gender, undefined);
    assert.equal(body.rrn, undefined);
  });

  it("rejects delete-account without the exact confirm phrase", async () => {
    await assert.rejects(
      () =>
        deleteAuthAccount({
          confirmPhrase: "탈퇴",
          confirmAgain: true,
        }),
      /VALIDATION_ERROR/,
    );
    assert.equal(DELETE_ACCOUNT_CONFIRM_PHRASE, "탈퇴하겠습니다");
  });
});

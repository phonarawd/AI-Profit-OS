import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  AuthError,
  continuePathAfterAuth,
  fetchAuthSession,
  patchAuthProfile,
  requestMagicLink,
  signupStageA,
  startKakaoOAuth,
} from "./fetch.ts";

const nestSession = {
  sessionId: "s1",
  userId: "u1",
  issuer: "ai-profit-os-nest",
  issuedAt: "2026-08-20T00:00:00.000Z",
  expiresAt: "2026-08-20T00:15:00.000Z",
  revoked: false,
  onboardingStage: "B_complete" as const,
};

function jsonRes(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String(input);
    return handler(url, init);
  }) as typeof fetch;
}

afterEach(() => {
  // @ts-expect-error test cleanup
  delete globalThis.fetch;
});

describe("acquisition release — guest / auth / error / resume", () => {
  it("guest 401 stays without a session", async () => {
    mockFetch(() => jsonRes(401, { message: "unauthorized" }));
    const session = await fetchAuthSession({ apiBase: "" });
    assert.equal(session, null);
  });

  it("resumes a Nest B_complete session to Home", async () => {
    mockFetch((url) => {
      assert.match(url, /\/api\/v1\/auth\/session$/);
      return jsonRes(200, nestSession);
    });
    const session = await fetchAuthSession({ apiBase: "" });
    assert.ok(session);
    assert.equal(session.userId, "u1");
    assert.equal(continuePathAfterAuth(session.onboardingStage), "/");
  });

  it("resumes B_incomplete to complete-profile", async () => {
    mockFetch(() =>
      jsonRes(200, { ...nestSession, onboardingStage: "B_incomplete" }),
    );
    const session = await fetchAuthSession({ apiBase: "" });
    assert.ok(session);
    assert.equal(
      continuePathAfterAuth(session.onboardingStage),
      "/auth/complete-profile",
    );
  });

  it("does not treat a revoked session as resume", async () => {
    mockFetch(() => jsonRes(200, { ...nestSession, revoked: true }));
    const session = await fetchAuthSession({ apiBase: "" });
    assert.equal(session, null);
  });

  it("starts Kakao with Stage A terms and never sends code as subject", async () => {
    let body = "";
    mockFetch((url, init) => {
      assert.equal(url, "/api/v1/auth/oauth/kakao/start");
      assert.equal(init?.method, "POST");
      body = String(init?.body ?? "");
      return jsonRes(200, {
        status: "ready",
        authorizeUrl: "https://kauth.kakao.com/oauth/authorize?client_id=x",
      });
    });
    const out = await startKakaoOAuth(
      {
        termsAcceptedAt: "2026-08-20T00:00:00.000Z",
        privacyAcceptedAt: "2026-08-20T00:00:00.000Z",
      },
      { apiBase: "" },
    );
    assert.equal(out.status, "ready");
    if (out.status === "ready") {
      assert.match(out.authorizeUrl, /^https:\/\/kauth\.kakao\.com\//);
    }
    assert.match(body, /termsAcceptedAt/);
    assert.match(body, /privacyAcceptedAt/);
    assert.doesNotMatch(body, /providerSubject/);
    assert.doesNotMatch(body, /"code"/);
  });

  it("maps Kakao not_configured to unavailable, not a fake ready URL", async () => {
    mockFetch(() => jsonRes(200, { status: "not_configured" }));
    const out = await startKakaoOAuth({}, { apiBase: "" });
    assert.equal(out.status, "not_configured");
  });

  it("surfaces magic-link provider delivery failure instead of fake success", async () => {
    mockFetch(() =>
      jsonRes(503, { message: "MAGIC_LINK_DELIVERY_UNAVAILABLE" }),
    );
    await assert.rejects(
      () => requestMagicLink("user@example.com", { apiBase: "" }),
      (err: unknown) => {
        assert.ok(err instanceof AuthError);
        assert.equal(err.status, 503);
        assert.equal(err.code, "MAGIC_LINK_DELIVERY_UNAVAILABLE");
        return true;
      },
    );
  });

  it("surfaces TERMS_REQUIRED without inventing a session", async () => {
    mockFetch(() => jsonRes(400, { message: "TERMS_REQUIRED" }));
    await assert.rejects(
      () => startKakaoOAuth({}, { apiBase: "" }),
      (err: unknown) => {
        assert.ok(err instanceof AuthError);
        assert.equal(err.code, "TERMS_REQUIRED");
        return true;
      },
    );
  });

  it("surfaces KAKAO_UNAVAILABLE on a malformed start payload", async () => {
    mockFetch(() => jsonRes(200, { status: "ready" }));
    await assert.rejects(
      () => startKakaoOAuth({}, { apiBase: "" }),
      (err: unknown) => {
        assert.ok(err instanceof AuthError);
        assert.equal(err.code, "KAKAO_UNAVAILABLE");
        return true;
      },
    );
  });

  it("creates a Stage A session through POST /signup", async () => {
    mockFetch((url, init) => {
      assert.equal(url, "/api/v1/auth/signup");
      assert.equal(init?.method, "POST");
      const body = String(init?.body ?? "");
      assert.match(body, /email_magic/);
      assert.match(body, /termsAcceptedAt/);
      assert.doesNotMatch(body, /gender/);
      return jsonRes(200, { ok: true, session: nestSession });
    });
    const session = await signupStageA(
      {
        method: "email_magic",
        termsAcceptedAt: "2026-08-20T00:00:00.000Z",
        privacyAcceptedAt: "2026-08-20T00:00:00.000Z",
        email: "a@b.co",
      },
      { apiBase: "" },
    );
    assert.equal(session.userId, "u1");
    assert.equal(continuePathAfterAuth(session.onboardingStage), "/");
  });

  it("keeps signup validation as a server error, not a fake session", async () => {
    mockFetch(() => jsonRes(400, { message: "termsAcceptedAt and privacyAcceptedAt required" }));
    await assert.rejects(
      () =>
        signupStageA(
          {
            method: "email_magic",
            termsAcceptedAt: "2026-08-20T00:00:00.000Z",
            privacyAcceptedAt: "2026-08-20T00:00:00.000Z",
            email: "a@b.co",
          },
          { apiBase: "" },
        ),
      (err: unknown) => {
        assert.ok(err instanceof AuthError);
        assert.equal(err.code, "TERMS_REQUIRED");
        return true;
      },
    );
  });

  it("patches Stage B without gender or RRN", async () => {
    let body = "";
    mockFetch((url, init) => {
      assert.equal(url, "/api/v1/auth/profile");
      assert.equal(init?.method, "PATCH");
      body = String(init?.body ?? "");
      return jsonRes(200, { ok: true });
    });
    const out = await patchAuthProfile(
      {
        displayName: "이름",
        phoneE164: "+821012345678",
        birthDate: "1990-01-01",
        email: "a@b.co",
      },
      { apiBase: "" },
    );
    assert.equal(out.onboardingStage, "B_complete");
    assert.doesNotMatch(body, /gender/);
    assert.doesNotMatch(body, /rrn/i);
  });

  it("rejects a non-Nest issuer instead of resuming", async () => {
    mockFetch(() => jsonRes(200, { ...nestSession, issuer: "supabase" }));
    await assert.rejects(() => fetchAuthSession({ apiBase: "" }), /SESSION_UNAVAILABLE/);
  });
});

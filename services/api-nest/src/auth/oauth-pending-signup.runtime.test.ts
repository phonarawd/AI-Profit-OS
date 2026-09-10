import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HttpException } from "@nestjs/common";
import {
  MemoryOauthPendingStore,
  consumeOauthPendingForCreate,
  hashOauthBind,
  issueOauthPending,
  loadOauthPending,
  termsPresent,
  termsRequiredBody,
} from "./oauth-pending-signup.ts";

describe("oauth pending signup contract", () => {
  it("requires both terms timestamps", () => {
    assert.equal(termsPresent({}), false);
    assert.equal(termsPresent({ termsAcceptedAt: "2026-01-01T00:00:00.000Z" }), false);
    assert.equal(
      termsPresent({
        termsAcceptedAt: "2026-01-01T00:00:00.000Z",
        privacyAcceptedAt: "2026-01-01T00:00:00.000Z",
      }),
      true,
    );
  });

  it("issues a one-time pending token and rejects replay before user mark", async () => {
    const store = new MemoryOauthPendingStore();
    const bind = "bind-secret-value-32bytes-minimum";
    const token = await issueOauthPending({
      store,
      provider: "google",
      providerSubject: "sub-1",
      bindHash: hashOauthBind(bind),
      nowMs: 1_000,
    });
    const first = await consumeOauthPendingForCreate({
      store,
      provider: "google",
      pendingToken: token,
      bindCookie: bind,
      nowMs: 1_001,
    });
    assert.equal(first.providerSubject, "sub-1");
    await assert.rejects(
      () =>
        consumeOauthPendingForCreate({
          store,
          provider: "google",
          pendingToken: token,
          bindCookie: bind,
          nowMs: 1_002,
        }),
      /OAUTH_PENDING_INVALID/,
    );
  });

  it("retries after markUser return the same user (idempotent)", async () => {
    const store = new MemoryOauthPendingStore();
    const bind = "bind-secret-value-32bytes-minimum";
    const token = await issueOauthPending({
      store,
      provider: "google",
      providerSubject: "sub-2",
      bindHash: hashOauthBind(bind),
      nowMs: 1_000,
    });
    const first = await consumeOauthPendingForCreate({
      store,
      provider: "google",
      pendingToken: token,
      bindCookie: bind,
      nowMs: 1_001,
    });
    await store.markUser(first.tokenHash, "user-9");
    const again = await consumeOauthPendingForCreate({
      store,
      provider: "google",
      pendingToken: token,
      bindCookie: bind,
      nowMs: 1_002,
    });
    assert.equal(again.userId, "user-9");
  });

  it("rejects expired, wrong bind, and other provider", async () => {
    const store = new MemoryOauthPendingStore();
    const bind = "bind-secret-value-32bytes-minimum";
    const token = await issueOauthPending({
      store,
      provider: "google",
      providerSubject: "sub-3",
      bindHash: hashOauthBind(bind),
      nowMs: 1_000,
    });
    await assert.rejects(
      () =>
        consumeOauthPendingForCreate({
          store,
          provider: "google",
          pendingToken: token,
          bindCookie: bind,
          nowMs: 1_000 + 11 * 60 * 1000,
        }),
      /OAUTH_PENDING_INVALID/,
    );
    const fresh = await issueOauthPending({
      store,
      provider: "google",
      providerSubject: "sub-4",
      bindHash: hashOauthBind(bind),
      nowMs: 2_000,
    });
    await assert.rejects(
      () =>
        consumeOauthPendingForCreate({
          store,
          provider: "google",
          pendingToken: fresh,
          bindCookie: "other-browser",
          nowMs: 2_001,
        }),
      /OAUTH_BIND_MISMATCH/,
    );
    await assert.rejects(
      () =>
        consumeOauthPendingForCreate({
          store,
          provider: "kakao",
          pendingToken: fresh,
          bindCookie: bind,
          nowMs: 2_001,
        }),
      /OAUTH_PENDING_INVALID/,
    );
    assert.equal(fresh.length >= 16, true);
  });

  it("load stays valid until expire so complete can retry after a network drop", async () => {
    const store = new MemoryOauthPendingStore();
    const bind = "bind-secret-value-32bytes-minimum";
    const token = await issueOauthPending({
      store,
      provider: "google",
      providerSubject: "sub-retry",
      bindHash: hashOauthBind(bind),
      nowMs: 1_000,
    });
    const first = await loadOauthPending({
      store,
      provider: "google",
      pendingToken: token,
      bindCookie: bind,
      nowMs: 1_001,
    });
    const second = await loadOauthPending({
      store,
      provider: "google",
      pendingToken: token,
      bindCookie: bind,
      nowMs: 1_002,
    });
    assert.equal(first.tokenHash, second.tokenHash);
    await store.markUser(first.tokenHash, "user-retry");
    const after = await loadOauthPending({
      store,
      provider: "google",
      pendingToken: token,
      bindCookie: bind,
      nowMs: 1_003,
    });
    assert.equal(after.userId, "user-retry");
  });

  it("TERMS_REQUIRED body keeps pendingToken and 400", () => {
    try {
      termsRequiredBody("pending-token-value");
      assert.fail("expected throw");
    } catch (err) {
      assert.ok(err instanceof HttpException);
      assert.equal(err.getStatus(), 400);
      const body = err.getResponse() as { code: string; pendingToken: string };
      assert.equal(body.code, "TERMS_REQUIRED");
      assert.equal(body.pendingToken, "pending-token-value");
    }
  });
});

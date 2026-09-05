import assert from "node:assert/strict";
import { test } from "node:test";
import {
  installSessionRefreshFetch,
  shouldAttemptRefreshRetry,
} from "./session-refresh-fetch.ts";

type MockImpl = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

let currentImpl: MockImpl = async () => new Response(null, { status: 200 });

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return (input as Request).url;
}

function mockFetchEntry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return currentImpl(input, init);
}

(globalThis as unknown as { window: unknown }).window = {
  location: { origin: "http://localhost:3000" },
  fetch: mockFetchEntry,
};

installSessionRefreshFetch();

function windowFetch(): typeof fetch {
  return (globalThis as unknown as { window: { fetch: typeof fetch } }).window
    .fetch;
}

test("shouldAttemptRefreshRetry skip list", () => {
  assert.equal(shouldAttemptRefreshRetry("/api/v1/auth/refresh"), false);
  assert.equal(shouldAttemptRefreshRetry("/api/v1/auth/login"), false);
  assert.equal(shouldAttemptRefreshRetry("/api/v1/auth/signup/classic"), false);
  assert.equal(
    shouldAttemptRefreshRetry("/api/v1/auth/password-reset/request"),
    false,
  );
  assert.equal(shouldAttemptRefreshRetry("/api/v1/auth/find-id"), false);
  assert.equal(
    shouldAttemptRefreshRetry("/api/v1/auth/magic-link/request"),
    false,
  );
  assert.equal(shouldAttemptRefreshRetry("/api/v1/auth/oauth/kakao/start"), false);
});

test("shouldAttemptRefreshRetry session paths included", () => {
  assert.equal(shouldAttemptRefreshRetry("/api/v1/auth/session"), true);
  assert.equal(shouldAttemptRefreshRetry("/api/v1/auth/profile"), true);
  assert.equal(shouldAttemptRefreshRetry("/api/v1/auth/logout"), true);
  assert.equal(shouldAttemptRefreshRetry("/api/v1/wallet/buckets"), true);
  assert.equal(shouldAttemptRefreshRetry("/api/v1/ledger/entries"), true);
  assert.equal(shouldAttemptRefreshRetry("/api/v1/trades"), true);
});

test("shouldAttemptRefreshRetry non-api paths excluded", () => {
  assert.equal(shouldAttemptRefreshRetry("/favicon.ico"), false);
  assert.equal(shouldAttemptRefreshRetry(null), false);
});

test("public auth path 401 is not retried", async () => {
  let calls = 0;
  currentImpl = async () => {
    calls += 1;
    return new Response(null, { status: 401 });
  };
  const res = await windowFetch()("/api/v1/auth/login", { method: "POST" });
  assert.equal(res.status, 401);
  assert.equal(calls, 1);
});

test("normal api 401 triggers one refresh then one retry", async () => {
  let refreshCalls = 0;
  let walletCalls = 0;
  currentImpl = async (input) => {
    const url = requestUrl(input);
    if (url.includes("/api/v1/auth/refresh")) {
      refreshCalls += 1;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    walletCalls += 1;
    if (walletCalls === 1) return new Response(null, { status: 401 });
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  };
  const res = await windowFetch()("/api/v1/wallet/buckets");
  assert.equal(res.status, 200);
  assert.equal(refreshCalls, 1);
  assert.equal(walletCalls, 2);
});

test("failed refresh returns original 401 without retry", async () => {
  let refreshCalls = 0;
  let walletCalls = 0;
  currentImpl = async (input) => {
    const url = requestUrl(input);
    if (url.includes("/api/v1/auth/refresh")) {
      refreshCalls += 1;
      return new Response(null, { status: 401 });
    }
    walletCalls += 1;
    return new Response(null, { status: 401 });
  };
  const res = await windowFetch()("/api/v1/wallet/buckets");
  assert.equal(res.status, 401);
  assert.equal(refreshCalls, 1);
  assert.equal(walletCalls, 1);
});

test("concurrent 401s share exactly one refresh call", async () => {
  let refreshCalls = 0;
  const attemptCounts: Record<string, number> = {};
  currentImpl = async (input) => {
    const url = requestUrl(input);
    if (url.includes("/api/v1/auth/refresh")) {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    attemptCounts[url] = (attemptCounts[url] ?? 0) + 1;
    if (attemptCounts[url] === 1) return new Response(null, { status: 401 });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const [r1, r2, r3] = await Promise.all([
    windowFetch()("/api/v1/wallet/buckets"),
    windowFetch()("/api/v1/ledger/entries"),
    windowFetch()("/api/v1/auth/session"),
  ]);
  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.equal(r3.status, 200);
  assert.equal(refreshCalls, 1);
});

test("200 responses pass through without a refresh call", async () => {
  let refreshCalls = 0;
  currentImpl = async (input) => {
    const url = requestUrl(input);
    if (url.includes("/api/v1/auth/refresh")) refreshCalls += 1;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const res = await windowFetch()("/api/v1/wallet/buckets");
  assert.equal(res.status, 200);
  assert.equal(refreshCalls, 0);
});

test("non-api path 401 is left untouched", async () => {
  let refreshCalls = 0;
  currentImpl = async (input) => {
    const url = requestUrl(input);
    if (url.includes("refresh")) refreshCalls += 1;
    return new Response(null, { status: 401 });
  };
  const res = await windowFetch()("https://example.com/some-resource");
  assert.equal(res.status, 401);
  assert.equal(refreshCalls, 0);
});

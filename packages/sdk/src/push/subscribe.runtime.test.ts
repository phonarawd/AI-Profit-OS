import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchServerPushEnabled } from "./subscribe.ts";

test("서버가 pushEnabled=true면 true", async () => {
  const prev = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ pushEnabled: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
  try {
    assert.equal(await fetchServerPushEnabled(), true);
  } finally {
    globalThis.fetch = prev;
  }
});

test("서버 false·비true·HTTP 실패는 모두 숨김", async () => {
  const prev = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ pushEnabled: false }), { status: 200 })) as typeof fetch;
    assert.equal(await fetchServerPushEnabled(), false);

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({}), { status: 200 })) as typeof fetch;
    assert.equal(await fetchServerPushEnabled(), false);

    globalThis.fetch = (async () =>
      new Response("no", { status: 500 })) as typeof fetch;
    assert.equal(await fetchServerPushEnabled(), false);

    globalThis.fetch = (async () => {
      throw new Error("offline");
    }) as typeof fetch;
    assert.equal(await fetchServerPushEnabled(), false);
  } finally {
    globalThis.fetch = prev;
  }
});

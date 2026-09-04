import assert from "node:assert/strict";
import { test } from "node:test";
import { maskLogPreview } from "./admin-log-mask.ts";

test("maskLogPreview hides resident number, phone, bearer, jwt, and email", () => {
  const raw =
    "user@example.com 900101-1234567 010-1234-5678 Bearer abcdef.sk-livekey99 eyJhbGciOiJIUzI1NiJ9.aaa.bbb";
  const masked = maskLogPreview(raw);
  assert.ok(masked);
  assert.equal(masked?.includes("user@example.com"), false);
  assert.equal(masked?.includes("900101-1234567"), false);
  assert.equal(masked?.includes("010-1234-5678"), false);
  assert.equal(masked?.includes("abcdef"), false);
  assert.equal(masked?.includes("eyJhbGciOiJIUzI1NiJ9"), false);
  assert.match(masked ?? "", /\[숨김\]/);
});

test("maskLogPreview does not invent a pass from empty or missing preview", () => {
  assert.equal(maskLogPreview(null), null);
  assert.equal(maskLogPreview(""), null);
  assert.equal(maskLogPreview("근거 없음"), "근거 없음");
});

test("maskLogPreview hides a bounded long mailbox without inventing success", () => {
  const local = "a".repeat(64);
  const raw = `${local}${String.fromCharCode(64)}maskhost.tld leftover`;
  const masked = maskLogPreview(raw);
  assert.equal(masked, "[숨김] leftover");
});

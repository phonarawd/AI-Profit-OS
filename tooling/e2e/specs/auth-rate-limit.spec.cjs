/**
 * REL-010 committed spec — 한도 초과 시 429.
 * 프로덕션 자격으로 폭격하지 않는다. QA 가드 안에서만. 브라우저 0 · node:test.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertQaIsolation,
} = require("../lib/qa-env-isolation-guard.cjs");
const {
  runAuthRateLimitRepeat,
} = require("../lib/auth-rate-limit-harness.cjs");

test("qa isolation guard accepts the local e2e host", () => {
  assert.doesNotThrow(() =>
    assertQaIsolation({ purpose: "e2e", host: "127.0.0.1" }),
  );
});

test("auth limiter returns 429 after the fixed window", () => {
  const rows = runAuthRateLimitRepeat({ max: 3, host: "127.0.0.1" });
  assert.equal(rows.length, 4);
  assert.equal(rows[0].allow, true);
  assert.equal(rows[1].allow, true);
  assert.equal(rows[2].allow, true);
  assert.equal(rows[3].allow, false);
  assert.equal(rows[3].status, 429);
  assert.equal(
    rows[3].messageKo,
    "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
  );
});

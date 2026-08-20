/**
 * REL-010 committed spec — 한도 초과 시 429.
 * 프로덕션 자격으로 폭격하지 않는다. QA 가드 안에서만.
 */
const { test, expect } = require("@playwright/test");
const {
  assertQaIsolation,
} = require("../lib/qa-env-isolation-guard.cjs");
const {
  runAuthRateLimitRepeat,
} = require("../lib/auth-rate-limit-harness.cjs");

test.beforeAll(() => {
  assertQaIsolation({ purpose: "e2e", host: "127.0.0.1" });
});

test("auth limiter returns 429 after the fixed window", () => {
  const rows = runAuthRateLimitRepeat({ max: 3, host: "127.0.0.1" });
  expect(rows).toHaveLength(4);
  expect(rows[0].allow).toBe(true);
  expect(rows[1].allow).toBe(true);
  expect(rows[2].allow).toBe(true);
  expect(rows[3].allow).toBe(false);
  expect(rows[3].status).toBe(429);
  expect(rows[3].messageKo).toBe("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.");
});

/**
 * REL-507 PRODUCTION_E2E committed spec.
 * 가드 없이 실서비스 폭격 금지. 성공 숫자를 픽스처로 위조하지 않음.
 * stubMoneyLoop / 12.50 fixture는 이 spec의 PASS가 아니다.
 */
const { test, expect } = require("@playwright/test");
const {
  assertQaIsolation,
} = require("../lib/qa-env-isolation-guard.cjs");

test.beforeAll(() => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
});

test("production loop is not proven by stubbed money fixtures", () => {
  const stub = require("../lib/consumer-route-stubs.cjs");
  expect(typeof stub.stubMoneyLoop).toBe("function");
  expect(process.env.QA_PRODUCTION_LOOP).not.toBe("stub");
});

test("real login→participate→settlement→wallet stays gated", async () => {
  if (process.env.QA_PRODUCTION_LOOP !== "1") {
    test.skip(
      true,
      "REL-507 browser loop requires isolated QA session (QA_PRODUCTION_LOOP=1)",
    );
    return;
  }
  throw new Error(
    "QA_PRODUCTION_LOOP=1 is set but isolated QA credentials/DB were not provided",
  );
});

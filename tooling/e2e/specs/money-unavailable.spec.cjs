/**
 * REL-007: missing money는 0이 아니라 UNAVAILABLE.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { moneyDisplayState } = require("../lib/money-unavailable.cjs");

test.beforeAll(() => {
  assertQaIsolation({ purpose: "e2e" });
});

test("missing money is UNAVAILABLE, not 0", () => {
  expect(moneyDisplayState(null).state).toBe("UNAVAILABLE");
  expect(moneyDisplayState(undefined).state).toBe("UNAVAILABLE");
  expect(moneyDisplayState("").state).toBe("UNAVAILABLE");
  expect(moneyDisplayState("n/a").state).toBe("UNAVAILABLE");
  expect(moneyDisplayState(null).display).toBeNull();
  expect(moneyDisplayState(null).display).not.toBe("0");
});

test("real zero balance stays ready 0", () => {
  expect(moneyDisplayState("0")).toEqual({ state: "ready", display: "0" });
  expect(moneyDisplayState("0.00")).toEqual({
    state: "ready",
    display: "0.00",
  });
});

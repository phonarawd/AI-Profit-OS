/**
 * REL-501: 금융/red-team 실패 모드.
 * 가드 없이 실행 0. 실원장 mutation 0. MCP-only ≠ DONE.
 */
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const {
  loadMatrix,
  runMatrix,
  evaluateMode,
  assertProductBindings,
  assertGuardStopsMutation,
  LOCAL_QA,
} = require("../lib/money-red-team.cjs");

test.beforeAll(() => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
});

test("isolation guard aborts before any money callback", () => {
  expect(assertGuardStopsMutation()).toEqual([]);
});

test("seven failure modes stay bound to product reject codes", () => {
  const matrix = loadMatrix();
  expect(matrix.modes.map((m) => m.id)).toEqual([
    "idempotency",
    "double_submit",
    "insufficient",
    "stale",
    "expired",
    "blocked",
    "replay",
  ]);
  expect(assertProductBindings(matrix)).toEqual([]);
});

test("allowlisted local matrix runs in-process without ledger writes", () => {
  const ran = runMatrix(LOCAL_QA);
  expect(ran.mutated).toBe(false);
  expect(ran.results.every((r) => r.mutated === false)).toBeTruthy();
  const conflict = evaluateMode(
    "idempotency",
    { sameKey: true, samePayload: false },
    LOCAL_QA,
  );
  expect(conflict.code).toBe("IDEMPOTENCY_KEY_CONFLICT");
  expect(evaluateMode("insufficient", { kind: "balance" }, LOCAL_QA).code).toBe(
    "INSUFFICIENT_BALANCE",
  );
  expect(evaluateMode("expired", {}, LOCAL_QA).code).toBe("OPPORTUNITY_EXPIRED");
  expect(evaluateMode("replay", {}, LOCAL_QA).sideEffects).toBe(1);
});

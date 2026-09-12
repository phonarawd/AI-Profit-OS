/**
 * REL-501: 금융/red-team 실패 모드.
 * 가드 없이 실행 0. 실원장 mutation 0. MCP-only ≠ DONE. 브라우저 0 · node:test.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const {
  loadMatrix,
  runMatrix,
  evaluateMode,
  assertProductBindings,
  assertGuardStopsMutation,
  LOCAL_QA,
} = require("../lib/money-red-team.cjs");

test("isolation guard accepts empty local qa refs", () => {
  assert.doesNotThrow(() =>
    assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" }),
  );
});

test("isolation guard aborts before any money callback", () => {
  assert.deepEqual(assertGuardStopsMutation(), []);
});

test("seven failure modes stay bound to product reject codes", () => {
  const matrix = loadMatrix();
  assert.deepEqual(
    matrix.modes.map((m) => m.id),
    [
      "idempotency",
      "double_submit",
      "insufficient",
      "stale",
      "expired",
      "blocked",
      "replay",
    ],
  );
  assert.deepEqual(assertProductBindings(matrix), []);
});

test("allowlisted local matrix runs in-process without ledger writes", () => {
  const ran = runMatrix(LOCAL_QA);
  assert.equal(ran.mutated, false);
  assert.ok(ran.results.every((r) => r.mutated === false));
  const conflict = evaluateMode(
    "idempotency",
    { sameKey: true, samePayload: false },
    LOCAL_QA,
  );
  assert.equal(conflict.code, "IDEMPOTENCY_KEY_CONFLICT");
  assert.equal(
    evaluateMode("insufficient", { kind: "balance" }, LOCAL_QA).code,
    "INSUFFICIENT_BALANCE",
  );
  assert.equal(evaluateMode("expired", {}, LOCAL_QA).code, "OPPORTUNITY_EXPIRED");
  assert.equal(evaluateMode("replay", {}, LOCAL_QA).sideEffects, 1);
});

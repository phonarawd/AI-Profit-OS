/**
 * REL-015 committed spec — 유저 원장 조회 권한/빈목록/정상목록.
 * 프로덕션 DB mutation 0. 브라우저 0 · node:test.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertQaIsolation,
} = require("../lib/qa-env-isolation-guard.cjs");
const {
  runLedgerUserQueryCases,
} = require("../lib/ledger-user-query-harness.cjs");

test("qa isolation guard accepts the local e2e host", () => {
  assert.doesNotThrow(() =>
    assertQaIsolation({ purpose: "e2e", host: "127.0.0.1" }),
  );
});

test("user ledger query: empty / own list / foreign 403", () => {
  const { empty, listed, other, unauth } = runLedgerUserQueryCases();
  assert.equal(unauth.status, 401);
  assert.equal(empty.status, 200);
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.items, []);
  assert.equal(listed.status, 200);
  assert.equal(listed.total, 1);
  assert.equal(listed.items[0].entries[0].amountUsdt, "10.5");
  assert.equal(
    listed.items[0].entries.some(
      (e) => e.bucket === "profit" && e.amountUsdt === "1",
    ),
    false,
  );
  assert.equal(other.status, 403);
});

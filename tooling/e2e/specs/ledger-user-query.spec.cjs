/**
 * REL-015 committed spec — 유저 원장 조회 권한/빈목록/정상목록.
 * 프로덕션 DB mutation 0.
 */
const { test, expect } = require("@playwright/test");
const {
  assertQaIsolation,
} = require("../lib/qa-env-isolation-guard.cjs");
const {
  runLedgerUserQueryCases,
} = require("../lib/ledger-user-query-harness.cjs");

test.beforeAll(() => {
  assertQaIsolation({ purpose: "e2e", host: "127.0.0.1" });
});

test("user ledger query: empty / own list / foreign 403", () => {
  const { empty, listed, other, unauth } = runLedgerUserQueryCases();
  expect(unauth.status).toBe(401);
  expect(empty.status).toBe(200);
  expect(empty.total).toBe(0);
  expect(empty.items).toEqual([]);
  expect(listed.status).toBe(200);
  expect(listed.total).toBe(1);
  expect(listed.items[0].entries[0].amountUsdt).toBe("10.5");
  expect(listed.items[0].entries.some((e) => e.bucket === "profit" && e.amountUsdt === "1")).toBe(false);
  expect(other.status).toBe(403);
});

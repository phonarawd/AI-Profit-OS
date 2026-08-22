/**
 * REL-501 금융/red-team committed spec.
 * 가드 없이 실행되면 즉시 중단. production DB 0.
 * Playwright MCP 클릭만으로는 DONE이 아니다.
 */
const { test, expect } = require("@playwright/test");
const {
  assertQaIsolation,
} = require("../lib/qa-env-isolation-guard.cjs");
const {
  loadMatrix,
  runFailureModes,
  assertProductionDenied,
} = require("../lib/money-red-team.cjs");

test.beforeAll(() => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
});

test("production money mutation is fail-closed before any red-team case", () => {
  expect(() => assertProductionDenied()).not.toThrow();
});

test("core money failure modes are covered under the isolation guard", () => {
  const matrix = loadMatrix();
  expect(matrix.modes.map((m) => m.id).sort()).toEqual(
    [
      "blocked",
      "double_submit",
      "expired",
      "idempotency",
      "insufficient",
      "replay",
      "stale",
    ].sort(),
  );
  const report = runFailureModes();
  expect(report.productionDbWrite).toBe(0);
  expect(report.liveDbMoneyMutation).toBe("NOT_RUN");
  for (const mode of matrix.modes) {
    const row = report.results.find((r) => r.id === mode.id);
    expect(row, mode.id).toBeTruthy();
    expect(row.pass, `${mode.id} ${row.actual}`).toBe(true);
  }
});

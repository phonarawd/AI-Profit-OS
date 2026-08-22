/**
 * REL-500 QA-LAB-EXPANSION committed spec.
 * 기본은 매트릭스/가드 자기검증. 브라우저 풀매트릭스는 QA_LAB_EXPANSION_BROWSER=1 (CI).
 * Playwright MCP 클릭만으로는 DONE이 아니다.
 */
const { test, expect } = require("@playwright/test");
const {
  assertQaIsolation,
} = require("../lib/qa-env-isolation-guard.cjs");
const { createAuthSession } = require("../helpers/auth-session.cjs");
const {
  loadExpansionMatrix,
  assertRiskBased,
  assertLocalFullMatrixForbidden,
  selectRunnableCells,
  assertCellOwnersExist,
  ownerSpecUsesGuard,
  cellOwnerSpecs,
} = require("../lib/qa-lab-expansion.cjs");

test.beforeAll(() => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
});

test("risk-based matrix stays a subset and keeps the isolation guard", () => {
  const matrix = loadExpansionMatrix();
  const sizes = assertRiskBased(matrix);
  expect(sizes.cartesian).toBeGreaterThan(sizes.selected);
  expect(matrix.policy.localFullMatrix).toBe("FORBIDDEN");
  expect(matrix.policy.mcpOnlyDone).toBe(false);

  assertCellOwnersExist(matrix);
  for (const cell of matrix.cells) {
    for (const spec of cellOwnerSpecs(cell)) {
      expect(ownerSpecUsesGuard(spec)).toBe(true);
    }
    const session = createAuthSession({ personaId: cell.persona });
    expect(session.personaId).toBe(cell.persona);
    expect(session.source).toBe("committed-helper");
  }
});

test("local full matrix request is fail-closed", () => {
  expect(() =>
    assertLocalFullMatrixForbidden({ fullMatrix: true }, { CI: "" }),
  ).toThrow(/local full matrix forbidden/);
  const runnable = selectRunnableCells(loadExpansionMatrix(), {}, { CI: "" });
  expect(runnable.every((cell) => cell.required || cell.sample)).toBe(true);
  expect(runnable.some((cell) => cell.runEnv === "ci")).toBe(false);
});

test("browser expansion cells stay gated", async () => {
  if (process.env.QA_LAB_EXPANSION_BROWSER !== "1") {
    test.skip(
      true,
      "browser expansion is CI-delegated (QA_LAB_EXPANSION_BROWSER=1)",
    );
    return;
  }
  const matrix = loadExpansionMatrix();
  const cells = selectRunnableCells(matrix);
  expect(cells.length).toBeGreaterThan(0);
  expect(cells.every((cell) => cellOwnerSpecs(cell).length > 0)).toBe(true);
});

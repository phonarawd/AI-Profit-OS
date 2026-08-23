/**
 * REL-500: 위험 기반 QA Lab 확장.
 * 카르테시안 풀폭주 0. 로컬 풀매트릭스 0. MCP-only ≠ DONE.
 */
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const {
  loadMatrix,
  cartesianSize,
  requiredCells,
  sampleCells,
  selectRunnableCells,
  isFullMatrixAllowed,
  assertRiskContract,
  assertBoundSpecs,
} = require("../lib/qa-lab-expansion.cjs");
const { moneyDisplayState } = require("../lib/money-unavailable.cjs");

const ROOT = path.resolve(__dirname, "../../..");

test.beforeAll(() => {
  assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
});

test("expansion matrix is risk-based, not a cartesian dump", () => {
  const matrix = loadMatrix();
  expect(matrix.mcpOnlyDone).toBe(false);
  expect(matrix.localFullMatrixForbidden).toBe(true);
  expect(assertRiskContract(matrix)).toEqual([]);
  const size = cartesianSize(matrix.axes);
  const required = requiredCells(matrix);
  expect(size).toBeGreaterThanOrEqual(200);
  expect(required.length * 20).toBeLessThan(size);
});

test("required cells bind to committed isolated specs", () => {
  const matrix = loadMatrix();
  expect(assertBoundSpecs(matrix, ROOT)).toEqual([]);
  for (const cell of requiredCells(matrix)) {
    expect(cell.isolation).toBe(true);
    expect(fs.existsSync(path.join(ROOT, cell.specFile))).toBeTruthy();
  }
});

test("local default run is required-only", () => {
  const matrix = loadMatrix();
  const local = selectRunnableCells(matrix, {});
  expect(local.every((cell) => cell.class === "required")).toBeTruthy();
  expect(local.length).toBe(requiredCells(matrix).length);
  const withSample = selectRunnableCells(matrix, { QA_LAB_SAMPLE: "1" });
  expect(withSample.length).toBe(
    requiredCells(matrix).length + sampleCells(matrix).length,
  );
});

test("full browser matrix stays gated", () => {
  expect(isFullMatrixAllowed({})).toBe(false);
  expect(isFullMatrixAllowed({ QA_LAB_FULL: "1" })).toBe(true);
  expect(isFullMatrixAllowed({ CI: "true" })).toBe(true);
});

test("missing money stays UNAVAILABLE, not forged 0", () => {
  expect(moneyDisplayState(null).state).toBe("UNAVAILABLE");
  expect(moneyDisplayState(null).display).not.toBe("0");
  expect(moneyDisplayState("0").state).toBe("ready");
});

test("browser full matrix is not run from this spec", async () => {
  test.skip(
    !isFullMatrixAllowed(),
    "로컬 풀매트릭스 금지 — QA_LAB_FULL=1 또는 CI. 실행은 바인딩된 closure spec",
  );
  test.skip(true, "expansion spec owns the contract; bound specs own browser runs");
});

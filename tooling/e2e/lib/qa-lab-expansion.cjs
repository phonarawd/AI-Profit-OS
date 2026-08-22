/**
 * REL-500 — 위험 기반 QA Lab 확장 선택기.
 * 나이브 카르테시안·로컬 풀매트릭스·MCP-only DONE 금지.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const MATRIX_PATH = path.join(ROOT, "tooling/e2e/matrix/qa-lab-expansion.v1.json");

const REQUIRED_AXES = ["persona", "device", "browser", "network", "a11y"];

function loadExpansionMatrix() {
  const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, "utf8"));
  if (matrix.id !== "qa-lab-expansion" || matrix.rel !== "REL-500") {
    throw new Error("QA_LAB_EXPANSION: matrix id/rel drift");
  }
  if (matrix.policy.naiveCartesian !== false) {
    throw new Error("QA_LAB_EXPANSION: naiveCartesian must stay false");
  }
  if (matrix.policy.localFullMatrix !== "FORBIDDEN") {
    throw new Error("QA_LAB_EXPANSION: localFullMatrix must stay FORBIDDEN");
  }
  if (matrix.policy.mcpOnlyDone !== false) {
    throw new Error("QA_LAB_EXPANSION: mcpOnlyDone must stay false");
  }
  if (matrix.policy.qaEnvIsolationGuard !== "REQUIRED") {
    throw new Error("QA_LAB_EXPANSION: QA_ENV_ISOLATION_GUARD required");
  }
  if (matrix.policy.ageSpecificUi !== 0) {
    throw new Error("QA_LAB_EXPANSION: age-specific UI is forbidden");
  }
  return matrix;
}

function axisCount(matrix, name) {
  const axis = matrix.axes[name];
  if (!Array.isArray(axis) || axis.length === 0) {
    throw new Error(`QA_LAB_EXPANSION: empty axis ${name}`);
  }
  return axis.length;
}

function naiveCartesianSize(matrix) {
  return REQUIRED_AXES.reduce((acc, name) => acc * axisCount(matrix, name), 1);
}

function selectedCells(matrix) {
  return matrix.cells || [];
}

function requiredCells(matrix) {
  return selectedCells(matrix).filter((cell) => cell.required === true);
}

function sampleCells(matrix) {
  return selectedCells(matrix).filter((cell) => cell.sample === true);
}

function assertRiskBased(matrix) {
  const cartesian = naiveCartesianSize(matrix);
  const selected = selectedCells(matrix).length;
  const required = requiredCells(matrix).length;
  if (cartesian < 100) {
    throw new Error("QA_LAB_EXPANSION: axes too small to prove anti-cartesian");
  }
  if (selected >= cartesian) {
    throw new Error("QA_LAB_EXPANSION: selected cells equal naive cartesian");
  }
  if (selected * 8 >= cartesian) {
    throw new Error(
      `QA_LAB_EXPANSION: selected ${selected} is not a risk subset of cartesian ${cartesian}`,
    );
  }
  if (required < 8) {
    throw new Error("QA_LAB_EXPANSION: high-risk required cells missing");
  }
  if (!sampleCells(matrix).length) {
    throw new Error("QA_LAB_EXPANSION: low-risk sample cells missing");
  }
  return { cartesian, selected, required };
}

function isCiEnv(env = process.env) {
  return env.CI === "true" || env.CI === "1";
}

function wantsFullMatrix(opts = {}, env = process.env) {
  return (
    opts.fullMatrix === true ||
    env.QA_LAB_FULL_MATRIX === "1" ||
    env.QA_LAB_FULL_MATRIX === "true"
  );
}

function assertLocalFullMatrixForbidden(opts = {}, env = process.env) {
  if (wantsFullMatrix(opts, env) && !isCiEnv(env)) {
    throw new Error(
      "QA_LAB_EXPANSION: local full matrix forbidden (CI delegation only)",
    );
  }
  return { ok: true, env: isCiEnv(env) ? "ci" : "local" };
}

function selectRunnableCells(matrix, opts = {}, env = process.env) {
  assertLocalFullMatrixForbidden(opts, env);
  const includeSample = opts.includeSample === true || isCiEnv(env);
  return selectedCells(matrix).filter((cell) => {
    if (cell.runEnv === "ci" && !isCiEnv(env) && opts.forceCiCells !== true) {
      return false;
    }
    if (cell.required) return true;
    return includeSample && cell.sample === true;
  });
}

function cellOwnerSpecs(cell) {
  return [cell.spec, cell.secondarySpec].filter(Boolean);
}

function assertCellOwnersExist(matrix, root = ROOT) {
  const missing = [];
  for (const cell of selectedCells(matrix)) {
    for (const rel of cellOwnerSpecs(cell)) {
      if (!fs.existsSync(path.join(root, rel))) {
        missing.push(`${cell.id}:${rel}`);
      }
    }
  }
  if (missing.length) {
    throw new Error(`QA_LAB_EXPANSION: missing owner spec ${missing.join(",")}`);
  }
  return true;
}

function ownerSpecUsesGuard(rel, root = ROOT) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  return text.includes("assertQaIsolation");
}

module.exports = {
  ROOT,
  MATRIX_PATH,
  REQUIRED_AXES,
  loadExpansionMatrix,
  naiveCartesianSize,
  selectedCells,
  requiredCells,
  sampleCells,
  assertRiskBased,
  isCiEnv,
  wantsFullMatrix,
  assertLocalFullMatrixForbidden,
  selectRunnableCells,
  cellOwnerSpecs,
  assertCellOwnersExist,
  ownerSpecUsesGuard,
};

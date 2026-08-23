/**
 * REL-500 QA Lab 확장 선택기.
 * 나이브 카르테시안을 required 집합으로 만들지 않는다.
 * 브라우저 풀매트릭스는 CI / QA_LAB_FULL=1 만.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const MATRIX_PATH = path.join(
  ROOT,
  "tooling/e2e/expansion/qa-lab-expansion.v1.json",
);

const REQUIRED_CELL_IDS = [
  "req-home-390-chromium-a11y",
  "req-home-1440-chromium-a11y",
  "req-auth-login-chromium-online",
  "req-wallet-auth-chromium-online",
  "req-profits-auth-chromium-online",
  "req-participate-auth-chromium-online",
  "req-settlement-auth-chromium-online",
  "req-admin-entry-isolation",
];

const MONEY_SURFACES = ["wallet", "profits", "participate", "settlement"];

function loadMatrix() {
  const raw = JSON.parse(fs.readFileSync(MATRIX_PATH, "utf8"));
  if (raw.version !== 1) {
    throw new Error("qa-lab-expansion: version must be 1");
  }
  if (raw.mcpOnlyDone !== false) {
    throw new Error("qa-lab-expansion: MCP-only must not be DONE");
  }
  if (raw.localFullMatrixForbidden !== true) {
    throw new Error("qa-lab-expansion: local full matrix must stay forbidden");
  }
  if (raw.homeGeometryPatch !== 0) {
    throw new Error("qa-lab-expansion: Home geometry patch forbidden");
  }
  if (raw.fakeFomo !== 0 || raw.fakeMoney !== 0 || raw.fakeDuration !== 0) {
    throw new Error("qa-lab-expansion: fake FOMO/money/duration must stay 0");
  }
  if (raw.missingMoneyAsZero !== 0) {
    throw new Error("qa-lab-expansion: missing money must not become 0");
  }
  if (raw.productionDbWrite !== 0) {
    throw new Error("qa-lab-expansion: production DB write must stay 0");
  }
  if (raw.isolationGuardRequired !== true) {
    throw new Error("qa-lab-expansion: isolation guard is required");
  }
  if (!Array.isArray(raw.cells)) {
    throw new Error("qa-lab-expansion: cells must be an explicit array");
  }
  return raw;
}

function cartesianSize(axes) {
  const lists = Object.values(axes || {});
  if (lists.length === 0) return 0;
  return lists.reduce((acc, arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return acc * arr.length;
  }, 1);
}

function cellsByClass(matrix, cls) {
  return (matrix.cells || []).filter((cell) => cell.class === cls);
}

function requiredCells(matrix) {
  return cellsByClass(matrix, "required");
}

function sampleCells(matrix) {
  return cellsByClass(matrix, "sample");
}

function isFullMatrixAllowed(env = process.env) {
  return env.CI === "true" || env.CI === "1" || env.QA_LAB_FULL === "1";
}

function isSampleAllowed(env = process.env) {
  return isFullMatrixAllowed(env) || env.QA_LAB_SAMPLE === "1";
}

/**
 * 실행 집합. 카르테시안 전개를 하지 않고 명시 셀만 고른다.
 */
function selectRunnableCells(matrix, env = process.env) {
  const out = [];
  for (const cell of matrix.cells || []) {
    if (cell.class === "required") out.push(cell);
    else if (cell.class === "sample" && isSampleAllowed(env)) out.push(cell);
    else if (cell.class === "ci_only" && isFullMatrixAllowed(env)) out.push(cell);
  }
  return out;
}

function assertRiskContract(matrix) {
  const errors = [];
  const size = cartesianSize(matrix.axes);
  const req = requiredCells(matrix);
  const sample = sampleCells(matrix);

  if (size < 200) {
    errors.push("axes must describe a large cartesian (diagnostic only)");
  }
  if (req.length < 7) errors.push("required cells too few for money/auth/home/admin");
  if (req.length > 16) {
    errors.push("required cells look like a cartesian dump");
  }
  if (req.length * 20 >= size) {
    errors.push("required set is not risk-based versus cartesian size");
  }
  if (sample.length < 3) errors.push("sample cells missing (firefox/webkit/tablet/offline)");

  const ids = new Set(req.map((cell) => cell.id));
  for (const must of REQUIRED_CELL_IDS) {
    if (!ids.has(must)) errors.push("missing required cell " + must);
  }

  const surfaces = new Set(req.map((cell) => cell.surface));
  for (const surface of MONEY_SURFACES) {
    if (!surfaces.has(surface)) {
      errors.push("money path required cell missing: " + surface);
    }
  }
  if (!surfaces.has("home")) errors.push("Home required cell missing");
  if (!surfaces.has("auth-login")) errors.push("auth required cell missing");
  if (!surfaces.has("admin-entry")) {
    errors.push("admin-entry isolation required cell missing");
  }

  for (const cell of req) {
    if (cell.isolation !== true) {
      errors.push("required cell missing isolation: " + cell.id);
    }
    if (cell.homeGeometryPatch !== 0) {
      errors.push("Home geometry patch on " + cell.id);
    }
    if (!cell.specFile) errors.push("required cell missing specFile: " + cell.id);
    if (cell.surface !== "admin-entry") {
      if (cell.browser && cell.browser !== "chromium") {
        errors.push("required cell must not promote secondary browser: " + cell.id);
      }
      if (cell.network === "offline") {
        errors.push("offline must not be required: " + cell.id);
      }
      if (cell.device && String(cell.device).startsWith("tablet")) {
        errors.push("tablet must not be required: " + cell.id);
      }
    }
  }

  const sampleBrowsers = new Set(sample.map((cell) => cell.browser));
  if (!sampleBrowsers.has("firefox") || !sampleBrowsers.has("webkit")) {
    errors.push("sample set must include firefox and webkit Home");
  }
  if (!sample.some((cell) => String(cell.device || "").startsWith("tablet"))) {
    errors.push("sample set must include tablet Home");
  }
  if (!sample.some((cell) => cell.network === "offline")) {
    errors.push("sample set must include offline Home");
  }

  return errors;
}

function assertBoundSpecs(matrix, root = ROOT) {
  const errors = [];
  for (const cell of matrix.cells || []) {
    const abs = path.join(root, cell.specFile);
    if (!fs.existsSync(abs)) {
      errors.push("missing bound spec " + cell.specFile);
      continue;
    }
    const src = fs.readFileSync(abs, "utf8");
    if (!src.includes("assertQaIsolation")) {
      errors.push("bound spec missing isolation: " + cell.specFile);
    }
  }
  return errors;
}

module.exports = {
  MATRIX_PATH,
  REQUIRED_CELL_IDS,
  MONEY_SURFACES,
  loadMatrix,
  cartesianSize,
  cellsByClass,
  requiredCells,
  sampleCells,
  isFullMatrixAllowed,
  isSampleAllowed,
  selectRunnableCells,
  assertRiskContract,
  assertBoundSpecs,
};

/**
 * verify:qa-lab-expansion — REL-500
 * 확장 spec이 git에 있고 가드가 유지된다. MCP-only 확장은 DONE 아님.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return "";
  return fs.readFileSync(p, "utf8");
}

const files = [
  "tooling/e2e/matrix/qa-lab-expansion.v1.json",
  "tooling/e2e/lib/qa-lab-expansion.cjs",
  "tooling/e2e/specs/qa-lab-expansion.spec.cjs",
  "tooling/e2e/lib/qa-env-isolation-guard.cjs",
  "tooling/e2e/persona/qa-lab-seed.v1.md",
  "tooling/e2e/README.md",
  ".github/workflows/qa-lab-expansion.yml",
];
for (const f of files) mustExist(f);

const readme = read("tooling/e2e/README.md");
if (!/REL-500/.test(readme) || !/MCP 브라우저 클릭만으로는 DONE이 아니다/.test(readme)) {
  fails.push("README must document REL-500 and forbid MCP-only DONE");
}
if (!/로컬 풀매트릭스 금지|local full matrix/.test(readme)) {
  fails.push("README must forbid local full matrix");
}

const seed = read("tooling/e2e/persona/qa-lab-seed.v1.md");
for (const persona of [
  "qa-lab-persona-guest",
  "qa-lab-persona-member",
  "qa-lab-persona-insufficient",
  "qa-lab-persona-blocked",
  "qa-lab-persona-admin",
]) {
  if (!seed.includes(persona)) fails.push(`persona seed missing ${persona}`);
}

const spec = read("tooling/e2e/specs/qa-lab-expansion.spec.cjs");
if (!spec.includes("assertQaIsolation") || !spec.includes("loadExpansionMatrix")) {
  fails.push("expansion spec must use guard + matrix loader");
}
if (!spec.includes("QA_LAB_EXPANSION_BROWSER")) {
  fails.push("browser expansion must stay gated");
}
if (/browser_navigate\s*\(|mcp_browser_|CallMcpTool/.test(spec)) {
  fails.push("MCP-only evidence is not DONE");
}
if (!/DONE이 아니다/.test(spec)) {
  fails.push("expansion spec must forbid MCP-only DONE");
}

const workflow = read(".github/workflows/qa-lab-expansion.yml");
if (!workflow.includes("verify:qa-lab-expansion")) {
  fails.push("CI workflow must run verify:qa-lab-expansion");
}
if (!/QA_LAB_FULL_MATRIX/.test(workflow) && !/풀매트릭스/.test(readme)) {
  fails.push("CI/README must keep full matrix out of local default");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:qa-lab-expansion"')) {
  fails.push("package.json missing verify:qa-lab-expansion");
}

const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("qa-lab-expansion")) {
  fails.push("CATALOG.md must list qa-lab-expansion");
}

const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("qa-lab-expansion.cjs")) {
  fails.push("domain-by-path must trigger qa-lab-expansion");
}

if (fails.length === 0) {
  const {
    assertQaIsolation,
  } = require(path.join(root, "tooling/e2e/lib/qa-env-isolation-guard.cjs"));
  const {
    loadExpansionMatrix,
    naiveCartesianSize,
    assertRiskBased,
    assertLocalFullMatrixForbidden,
    selectRunnableCells,
    assertCellOwnersExist,
    ownerSpecUsesGuard,
    cellOwnerSpecs,
    requiredCells,
  } = require(path.join(root, "tooling/e2e/lib/qa-lab-expansion.cjs"));
  const { createAuthSession } = require(path.join(
    root,
    "tooling/e2e/helpers/auth-session.cjs",
  ));

  try {
    assertQaIsolation({ purpose: "e2e", databaseUrl: "", projectRef: "" });
  } catch (err) {
    fails.push(`guard failed on isolated e2e: ${err.message}`);
  }

  try {
    assertQaIsolation({
      purpose: "qa",
      projectRef: "mgsytcetsiecllmhcyox",
    });
    fails.push("guard must still throw on production project_ref");
  } catch (err) {
    if (!String(err.message).includes("production")) {
      fails.push(`guard throw lost production needle: ${err.message}`);
    }
  }

  let matrix;
  try {
    matrix = loadExpansionMatrix();
    const sizes = assertRiskBased(matrix);
    if (sizes.cartesian !== naiveCartesianSize(matrix)) {
      fails.push("cartesian size helper drift");
    }
    assertCellOwnersExist(matrix);
    for (const cell of requiredCells(matrix)) {
      if (cell.risk !== "high") {
        fails.push(`required cell ${cell.id} must be high risk`);
      }
      for (const owner of cellOwnerSpecs(cell)) {
        if (!ownerSpecUsesGuard(owner)) {
          fails.push(`owner spec missing guard: ${owner}`);
        }
      }
      createAuthSession({ personaId: cell.persona });
    }
    assertLocalFullMatrixForbidden({}, { CI: "" });
    try {
      assertLocalFullMatrixForbidden({ fullMatrix: true }, { CI: "" });
      fails.push("local full matrix must throw");
    } catch (err) {
      if (!String(err.message).includes("local full matrix forbidden")) {
        fails.push(`full-matrix throw mismatch: ${err.message}`);
      }
    }
    const localCells = selectRunnableCells(matrix, {}, { CI: "" });
    if (localCells.some((cell) => cell.runEnv === "ci")) {
      fails.push("local selector leaked CI-only browser sample");
    }
  } catch (err) {
    fails.push(err.message);
  }
}

if (fails.length) {
  console.error("[verify:qa-lab-expansion] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log(
  "[verify:qa-lab-expansion] PASS (risk matrix committed · guard kept · local full matrix 0 · MCP-only 0)",
);

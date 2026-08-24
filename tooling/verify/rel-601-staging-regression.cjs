/**
 * verify:rel-601-staging-regression
 * REL-601 staging surface matrix regression — preview workers only.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function readJson(rel) {
  const text = read(rel);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    fails.push(rel + " invalid JSON: " + e.message);
    return {};
  }
}

const fixture = readJson("tooling/verify/fixtures/rel-601-staging-regression.v1.json");
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const evidence = read("governance/release-master/REL-601-STAGING-REGRESSION.md");
const matrixJson = read("tooling/e2e/expansion/staging-regression-matrix.v1.json");
const lib = read("tooling/e2e/lib/staging-regression.cjs");
const spec = read("tooling/e2e/specs/staging-regression.spec.cjs");
const runner = read("tooling/dev/run-staging-regression.cjs");
const visualMatrix = read("governance/visual-reconciliation/PUTDUK_UI_VISUAL_MATRIX.md");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");
const largeScreen = readJson("governance/responsive/large-screen-safety.v1.json");

const regression = require(path.join(root, "tooling/e2e/lib/staging-regression.cjs"));

function todoCompleted(relId) {
  const id = relId.replace(/^REL-/i, "rel-").toLowerCase();
  const re = new RegExp("- id: " + id + "\\r?\\n(?:.*\\r?\\n){0,3}\\s*status: (\\w+)");
  const m = plan.match(re);
  return m && m[1] === "completed";
}

function yamlCompleted(relId) {
  const idx = plan.indexOf("ID: " + relId);
  if (idx < 0) return false;
  return /STATUS:\s*COMPLETED/.test(plan.slice(idx, idx + 240));
}

if (fixture.homeGeometryPatch !== 0) fails.push("fixture homeGeometryPatch must be 0");
if (fixture.pixelDiffAloneFail !== 0) fails.push("fixture pixelDiffAloneFail must be 0");
if (fixture.productionHost !== 0) fails.push("fixture productionHost must be 0");
if (fixture.mcpOnlyDone !== 0) fails.push("fixture mcpOnlyDone must be 0");

for (const dep of fixture.deps || []) {
  if (!todoCompleted(dep)) fails.push("EXIT_GATE: plan todo not completed " + dep);
  if (!yamlCompleted(dep)) fails.push("EXIT_GATE: YAML STATUS not COMPLETED " + dep);
}

let matrix;
try {
  matrix = regression.loadMatrix();
} catch (e) {
  fails.push(String(e.message || e));
}
if (matrix) {
  for (const item of regression.assertMatrixContract(matrix)) fails.push(item);
  if (matrix.surfaces.length < Number(fixture.minSurfaces || 50)) {
    fails.push("surface matrix below minSurfaces");
  }
}

if (!lib.includes("preview workers only")) fails.push("lib must document preview-only");
if (!lib.includes("pixel-diff alone")) fails.push("lib must forbid pixel-diff alone fail");
if (!spec.includes("overflow-safe")) fails.push("spec must check overflow-safe");
if (!spec.includes("staging-regression.cjs")) fails.push("spec must use staging-regression lib");
if (/browser_navigate/.test(spec + lib)) fails.push("MCP-only evidence is not DONE");
if (!runner.includes("runHttpRegression")) fails.push("runner must call runHttpRegression");
if (!visualMatrix.includes("PUTDUK UI Visual Matrix")) {
  fails.push("visual matrix doc missing");
}
if (!largeScreen.homeQaRels || !largeScreen.homeQaRels.includes("REL-601")) {
  fails.push("large-screen-safety must list REL-601");
}

if (!pkg.includes("verify:rel-601-staging-regression")) {
  fails.push("package.json missing verify:rel-601-staging-regression");
}
if (!pkg.includes("staging:regression")) {
  fails.push("package.json missing staging:regression");
}
if (!catalog.includes("rel-601-staging-regression")) {
  fails.push("CATALOG missing rel-601-staging-regression");
}
if (!gate.includes("verify:rel-601-staging-regression")) {
  fails.push("gate.yml must run verify:rel-601-staging-regression");
}
if (!domain.includes("rel-601-staging-regression.cjs")) {
  fails.push("domain-by-path must trigger rel-601");
}

const closed = yamlCompleted("REL-601") || todoCompleted("REL-601");
if (closed) {
  for (const needle of [
    "STATUS = COMPLETED",
    "HOME_GEOMETRY_PATCH = 0",
    "PIXEL_DIFF_ALONE_FAIL = 0",
    "PRODUCTION_HOST = 0",
    "MCP_ONLY_DONE = 0",
    "SURFACE_MATRIX_PASS = 1",
    "LARGE_SCREEN_SAFETY = 1",
    "https://ai-profit-web-preview.ebay-adapter.workers.dev",
    "https://ai-profit-ops-preview.ebay-adapter.workers.dev",
  ]) {
    if (!evidence.includes(needle)) fails.push("evidence missing " + needle);
  }
  if (/CLOUDFLARE_API_TOKEN\s*=\s*[A-Za-z0-9_-]{20,}/.test(evidence)) {
    fails.push("evidence leaked a Cloudflare token");
  }
  if (!todoCompleted("REL-601")) fails.push("rel-601 todo must be completed");
  if (!yamlCompleted("REL-601")) fails.push("REL-601 YAML must be COMPLETED");
}

(async function main() {
  if (fails.length === 0 && closed) {
    const run = spawnSync(process.execPath, [path.join(root, "tooling/dev/run-staging-regression.cjs")], {
      cwd: root,
      encoding: "utf8",
      timeout: 300000,
      env: {
        ...process.env,
        STAGING_REGRESSION_PW: process.env.STAGING_REGRESSION_PW || (process.env.CI ? "1" : "0"),
      },
    });
    if (run.status !== 0) {
      fails.push(
        "live regression FAIL: " + String(run.stderr || run.stdout || "").split("\n").slice(-5).join(" "),
      );
    }
  }

  if (fails.length === 0) {
    for (const script of fixture.extraVerifies || []) {
      const rerun = spawnSync(process.execPath, [path.join(root, "tooling/verify", script)], {
        cwd: root,
        encoding: "utf8",
        timeout: 120000,
      });
      if (rerun.status !== 0) {
        fails.push("re-run FAIL " + script + ": " + String(rerun.stderr || rerun.stdout || "").split("\n")[0]);
      }
    }
  }

  if (fails.length) {
    console.error("[verify:rel-601-staging-regression] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  if (closed) {
    console.log("[verify:rel-601-staging-regression] PASS (staging surface matrix · evidence locked)");
  } else {
    console.log("[verify:rel-601-staging-regression] PASS (path lock · regression evidence pending)");
  }
})();

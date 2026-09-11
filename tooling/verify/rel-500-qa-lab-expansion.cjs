/**
 * verify:rel-500-qa-lab-expansion
 * risk-based committed spec. cartesian dump 0. MCP-only 0.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const root = path.resolve(__dirname, "../..");
const fails = [];
function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) { fails.push("missing: " + rel); return ""; }
  return fs.readFileSync(p, "utf8");
}
const fixture = JSON.parse(read("tooling/verify/fixtures/rel-500-qa-lab-expansion.v1.json") || "{}");
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const readme = read("tooling/e2e/README.md");
const spec = read("tooling/e2e/specs/qa-lab-expansion.spec.cjs");
const lib = read("tooling/e2e/lib/qa-lab-expansion.cjs");
const personas = read("tooling/e2e/expansion/qa-lab-personas.v1.md");
const doc = read("tooling/e2e/expansion/qa-lab-expansion.v1.md");
const evidence = read("governance/release-master/REL-500-QA-LAB-EXPANSION.md");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const pw = read("tooling/e2e/playwright.config.cjs");
const expansion = require(path.join(root, "tooling/e2e/lib/qa-lab-expansion.cjs"));
let matrix;
try { matrix = expansion.loadMatrix(); } catch (err) { fails.push(String(err.message || err)); }
if (matrix) {
  if (matrix.mcpOnlyDone !== fixture.mcpOnlyDone) fails.push("mcpOnlyDone drift");
  if (matrix.localFullMatrixForbidden !== fixture.localFullMatrixForbidden) fails.push("localFullMatrixForbidden drift");
  if (matrix.homeGeometryPatch !== fixture.homeGeometryPatch) fails.push("Home geometry patch must stay 0");
  for (const item of expansion.assertRiskContract(matrix)) fails.push(item);
  for (const item of expansion.assertBoundSpecs(matrix, root)) fails.push(item);
  const size = expansion.cartesianSize(matrix.axes);
  const req = expansion.requiredCells(matrix);
  if (size < Number(fixture.minCartesian || 200)) fails.push("cartesian diagnostic too small");
  if (req.length < Number(fixture.minRequired || 7)) fails.push("required cells below floor");
  if (req.length > Number(fixture.maxRequired || 16)) fails.push("required cells above risk-based ceiling");
  const ids = req.map((cell) => cell.id);
  for (const must of fixture.requiredCellIds || []) {
    if (!ids.includes(must)) fails.push("fixture required cell missing " + must);
  }
  const localRun = expansion.selectRunnableCells(matrix, {});
  if (localRun.some((cell) => cell.class !== "required")) fails.push("local default must not select sample/ci_only");
  if (expansion.isFullMatrixAllowed({})) fails.push("empty env must not allow full matrix");
}
const homeLock = JSON.parse(read("governance/responsive/home-geometry-lock.v1.json") || "{}");
if (homeLock.rewrite !== "FORBIDDEN") fails.push("home-geometry-lock rewrite must stay FORBIDDEN");
for (const rel of fixture.bootstrapMustExist || []) {
  if (!fs.existsSync(path.join(root, rel))) fails.push("bootstrap deleted: " + rel);
}
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
for (const dep of fixture.deps || []) {
  if (!todoCompleted(dep)) fails.push("EXIT_GATE: plan todo not completed " + dep);
  if (!yamlCompleted(dep)) fails.push("EXIT_GATE: YAML STATUS not COMPLETED " + dep);
}
if (!readme.includes("MCP 브라우저 클릭만으로는 DONE이 아니다")) fails.push("README must keep MCP-only not DONE");
if (!readme.includes("REL-500") || !readme.includes("위험 기반")) fails.push("README must document REL-500 risk-based expansion");
if (!/QA_LAB_FULL/.test(readme + spec + lib)) fails.push("full matrix must stay gated by QA_LAB_FULL");
if (!spec.includes("assertQaIsolation") || !spec.includes("@playwright/test")) fails.push("expansion spec must be isolated Playwright harness");
if (/browser_navigate/.test(spec + lib)) fails.push("MCP-only evidence is not DONE");
if (!personas.includes("qa-lab-persona-001") || !personas.includes("auth-consumer")) fails.push("persona expansion must keep seed + auth-consumer");
if (!doc.includes("카르테시안") || !doc.includes("MCP")) fails.push("expansion doc must forbid cartesian dump and MCP-only DONE");
if (!pw.includes("mcpOnlyEvidence") || !pw.includes("NOT_DONE")) fails.push("playwright config must keep mcpOnlyEvidence NOT_DONE");
if (!pkg.includes("verify:rel-500-qa-lab-expansion")) fails.push("package.json missing verify:rel-500-qa-lab-expansion");
if (!catalog.includes("rel-500-qa-lab-expansion")) fails.push("CATALOG missing rel-500-qa-lab-expansion");
if (!gate.includes("verify:rel-500-qa-lab-expansion")) fails.push("gate.yml must run verify:rel-500-qa-lab-expansion");
for (const needle of ["STATUS = COMPLETED","MCP_ONLY_DONE = 0","LOCAL_FULL_MATRIX = 0","HOME_GEOMETRY_PATCH = 0","CARTESIAN_REQUIRED = 0","ISOLATION_GUARD = 1"]) {
  if (!evidence.includes(needle)) fails.push("REL-500 evidence missing " + needle);
}
if (fails.length === 0) {
  for (const script of fixture.extraVerifies || []) {
    const run = spawnSync(process.execPath, [path.join(root, "tooling/verify", script)], { cwd: root, encoding: "utf8", timeout: 60000 });
    if (run.status !== 0) fails.push("re-run FAIL " + script + ": " + String(run.stderr || run.stdout || "").split("\n")[0]);
  }
}
if (fails.length) {
  console.error("[verify:rel-500-qa-lab-expansion] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log("[verify:rel-500-qa-lab-expansion] PASS (risk-based · committed specs · isolation · cartesian not required)");


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
const fixture = JSON.parse(read("tooling/verify/fixtures/rel-501-money-red-team.v1.json") || "{}");
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const readme = read("tooling/e2e/README.md");
const spec = read("tooling/e2e/specs/money-red-team.spec.cjs");
const lib = read("tooling/e2e/lib/money-red-team.cjs");
const report = read("tooling/e2e/money/red-team-report.v1.md");
const evidence = read("governance/release-master/REL-501-MONEY-RED-TEAM.md");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const red = require(path.join(root, "tooling/e2e/lib/money-red-team.cjs"));
let matrix;
try { matrix = red.loadMatrix(); } catch (err) { fails.push(String(err.message || err)); }
if (matrix) {
  const ids = (matrix.modes || []).map((m) => m.id);
  if (ids.join(",") !== (fixture.modes || []).join(",")) fails.push("mode list drift");
  if (ids.length !== Number(fixture.modeCount || 7)) fails.push("mode count drift");
  for (const item of red.assertProductBindings(matrix, root)) fails.push(item);
  for (const item of red.assertGuardStopsMutation()) fails.push(item);
  try {
    const ran = red.runMatrix(red.LOCAL_QA);
    if (ran.mutated) fails.push("matrix must not mark real ledger mutation");
    if (!ran.results.some((r) => r.code === "IDEMPOTENCY_KEY_CONFLICT")) fails.push("idempotency conflict vector missing");
    if (!ran.results.some((r) => r.code === "INSUFFICIENT_BALANCE")) fails.push("insufficient vector missing");
    if (!ran.results.some((r) => r.code === "OPPORTUNITY_EXPIRED")) fails.push("expired vector missing");
    if (!ran.results.some((r) => r.replayed === true && r.sideEffects === 1)) fails.push("replay reuse vector missing");
  } catch (err) { fails.push("local matrix: " + String(err.message || err)); }
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
if (!spec.includes("assertQaIsolation") || !spec.includes("@playwright/test")) fails.push("spec must be isolated Playwright harness");
if (!lib.includes("runMoneyMutationTest")) fails.push("harness must enter through runMoneyMutationTest");
if (/browser_navigate/.test(spec + lib)) fails.push("MCP-only evidence is not DONE");
if (!readme.includes("REL-501") || !readme.includes("runMoneyMutationTest")) fails.push("README must document REL-501 guard entry");
if (!pkg.includes("verify:rel-501-money-red-team")) fails.push("package.json missing verify:rel-501-money-red-team");
if (!catalog.includes("rel-501-money-red-team")) fails.push("CATALOG missing rel-501-money-red-team");
if (!gate.includes("verify:rel-501-money-red-team")) fails.push("gate.yml must run verify:rel-501-money-red-team");
for (const needle of ["STATUS = COMPLETED","ISOLATION_GUARD = 1","PRODUCTION_DB_WRITE = 0","REAL_LEDGER_MUTATION = 0","MCP_ONLY_DONE = 0","GUARD_ABORT = 1"]) {
  if (!evidence.includes(needle) && !report.includes(needle)) fails.push("REL-501 evidence missing " + needle);
}
if (fails.length === 0) {
  for (const script of fixture.extraVerifies || []) {
    const run = spawnSync(process.execPath, [path.join(root, "tooling/verify", script)], { cwd: root, encoding: "utf8", timeout: 60000 });
    if (run.status !== 0) fails.push("re-run FAIL " + script + ": " + String(run.stderr || run.stdout || "").split("\n")[0]);
  }
}
if (fails.length) {
  console.error("[verify:rel-501-money-red-team] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log("[verify:rel-501-money-red-team] PASS (7 modes · guard abort · product codes · ledger write 0)");


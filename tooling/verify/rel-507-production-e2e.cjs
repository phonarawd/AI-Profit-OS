/**
 * verify:rel-507-production-e2e
 * Committed production-loop spec + isolation. MCP-only is not DONE.
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

const fixture = JSON.parse(
  read("tooling/verify/fixtures/rel-507-production-e2e.v1.json") || "{}",
);
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const spec = read("tooling/e2e/specs/production-loop.spec.cjs");
const lib = read("tooling/e2e/lib/production-loop.cjs");
const readme = read("tooling/e2e/README.md");
const evidence = read("governance/release-master/REL-507-PRODUCTION-E2E.md");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");
const loop = require(path.join(root, "tooling/e2e/lib/production-loop.cjs"));

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

if (fixture.productionDbWrite !== 0) fails.push("fixture productionDbWrite must be 0");
if (fixture.realLedgerMutation !== 0) fails.push("fixture realLedgerMutation must be 0");
if (fixture.mcpOnlyDone !== 0) fails.push("fixture mcpOnlyDone must be 0");
if (fixture.inventedSuccess !== 0) fails.push("fixture inventedSuccess must be 0");
if (fixture.liveKakaoClaim !== 0) fails.push("fixture liveKakaoClaim must be 0");
if (loop.productionLoopProfitUsdt() !== "12.50") {
  fails.push("loop profit must reuse existing opportunity expectedProfitUsdt");
}

for (const dep of fixture.deps || []) {
  if (!todoCompleted(dep)) fails.push("EXIT_GATE: plan todo not completed " + dep);
  if (!yamlCompleted(dep)) fails.push("EXIT_GATE: YAML STATUS not COMPLETED " + dep);
}

if (!spec.includes("assertQaIsolation") || !spec.includes("@playwright/test")) {
  fails.push("spec must be isolated Playwright harness");
}
if (!spec.includes("ensureLocalWebRuntime")) {
  fails.push("spec must use local web runtime");
}
if (spec.includes("test.skip(!base") || spec.includes("PLAYWRIGHT_BASE_URL")) {
  fails.push("REL-507 must not skip for missing PLAYWRIGHT_BASE_URL");
}
if (!spec.includes("/auth/login") || !spec.includes("auth-email-submit")) {
  fails.push("spec must start at login");
}
if (!spec.includes("data-requires-preflight") || !spec.includes("/settlement") || !spec.includes("/wallet")) {
  fails.push("spec must include participate settlement wallet");
}
if (!spec.includes("productionLoopProfitUsdt")) {
  fails.push("spec must reuse productionLoopProfitUsdt");
}
if (!lib.includes("stubProductionLoop") || !lib.includes("expectedProfitUsdt")) {
  fails.push("lib must stub the loop without a new success amount");
}
if (/browser_navigate/.test(spec + lib)) fails.push("MCP-only evidence is not DONE");
for (const item of loop.assertNoInventedSuccess(spec)) fails.push(item);
if (spec.includes("hiptk.app") || spec.includes("workers.dev") || spec.includes("supabase.co")) {
  fails.push("spec must not target production hosts");
}

if (!readme.includes("REL-507") || !readme.includes("production-loop")) {
  fails.push("README must document REL-507");
}
if (!pkg.includes("verify:rel-507-production-e2e")) {
  fails.push("package.json missing verify:rel-507-production-e2e");
}
if (!catalog.includes("rel-507-production-e2e")) {
  fails.push("CATALOG missing rel-507-production-e2e");
}
if (!gate.includes("verify:rel-507-production-e2e")) {
  fails.push("gate.yml must run verify:rel-507-production-e2e");
}
if (!domain.includes("rel-507-production-e2e.cjs")) {
  fails.push("domain-by-path must trigger rel-507");
}
if (!evidence.includes("STATUS = COMPLETED")) fails.push("evidence missing STATUS");
if (!evidence.includes("ISOLATION_GUARD = 1")) fails.push("evidence missing ISOLATION_GUARD");
if (!evidence.includes("PRODUCTION_DB_WRITE = 0")) fails.push("evidence missing PRODUCTION_DB_WRITE");
if (!evidence.includes("INVENTED_SUCCESS = 0")) fails.push("evidence missing INVENTED_SUCCESS");
if (!evidence.includes("MCP_ONLY_DONE = 0")) fails.push("evidence missing MCP_ONLY_DONE");
if (!evidence.includes("LIVE_KAKAO_HUMAN_E2E = NOT_RUN")) {
  fails.push("evidence missing LIVE_KAKAO_HUMAN_E2E");
}

if (fails.length === 0) {
  for (const script of fixture.extraVerifies || []) {
    const run = spawnSync(process.execPath, [path.join(root, "tooling/verify", script)], {
      cwd: root,
      encoding: "utf8",
      timeout: 60000,
    });
    if (run.status !== 0) {
      fails.push("re-run FAIL " + script);
    }
  }
}

if (fails.length) {
  console.error("[verify:rel-507-production-e2e] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log("[verify:rel-507-production-e2e] PASS (committed loop spec · isolation · invented success 0)");




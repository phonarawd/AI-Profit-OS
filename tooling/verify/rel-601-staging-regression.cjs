/**
 * verify:rel-601-staging-regression
 * Backend locks only: no production mutation, no money mutate on staging,
 * extraVerifies (qa-env-isolation + rel-600). Live customer-web Surface Matrix
 * / Home OpenNext probes are putduk-web (see quality/putduk-web-ui-assertions-handoff.md).
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
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/backend-ci.yml");
const domain = read("tooling/verify/domain-by-path.cjs");

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

if (fixture.productionDomainMutation !== 0) fails.push("fixture productionDomainMutation must be 0");
if (fixture.productionWorkflowDispatch !== 0) fails.push("fixture productionWorkflowDispatch must be 0");
if (fixture.pagesDeploy !== 0) fails.push("fixture pagesDeploy must be 0");
if (fixture.vercel !== 0) fails.push("fixture vercel must be 0");
if (fixture.homeVisualRedesign !== 0) fails.push("fixture homeVisualRedesign must be 0");
if (fixture.localFullMatrix !== 0) fails.push("fixture localFullMatrix must stay 0");
if (fixture.localFullLighthouse !== 0) fails.push("fixture localFullLighthouse must stay 0");
if (fixture.localBrowserVsLiveStaging !== 0) fails.push("fixture must not claim live staging browser");
if (fixture.moneyMutationVsLiveStaging !== 0) fails.push("fixture must not mutate money on live staging");
if (fixture.mcpOnlyDone !== 0) fails.push("MCP-only is not DONE");
if (!Array.isArray(fixture.probes) || fixture.probes.length !== 0) {
  fails.push("fixture probes must be empty (customer-web Surface Matrix handed off)");
}

for (const dep of fixture.deps || []) {
  if (!todoCompleted(dep)) fails.push("EXIT_GATE: plan todo not completed " + dep);
  if (!yamlCompleted(dep)) fails.push("EXIT_GATE: YAML STATUS not COMPLETED " + dep);
}

for (const host of fixture.forbiddenLiveHosts || []) {
  const body = JSON.stringify(fixture.probes || []);
  if (body.includes(host)) fails.push("probe list must not target production host " + host);
}

if (fs.existsSync(path.join(root, "tooling/e2e/specs/home-closure.spec.cjs"))) {
  fails.push("home-closure.spec.cjs must stay handed off");
}

if (!pkg.includes("verify:rel-601-staging-regression")) {
  fails.push("package.json missing verify:rel-601-staging-regression");
}
if (!catalog.includes("rel-601-staging-regression")) {
  fails.push("CATALOG missing rel-601-staging-regression");
}
if (!gate.includes("verify:rel-601-staging-regression")) {
  fails.push("backend-ci.yml must run verify:rel-601-staging-regression");
}
if (!domain.includes("rel-601-staging-regression.cjs")) {
  fails.push("domain-by-path must trigger rel-601");
}
if (!fixture.skippedExtraVerifies || !fixture.skippedExtraVerifies["device-tier-system.cjs"]) {
  fails.push("fixture must record why device-tier is not a hard extra");
}
if (!fixture.skippedExtraVerifies || !fixture.skippedExtraVerifies["asset-production-pipeline.cjs"]) {
  fails.push("fixture must record why asset-pipeline is not a hard extra");
}

const closed = yamlCompleted("REL-601") || todoCompleted("REL-601");
if (closed) {
  for (const needle of [
    "STATUS = COMPLETED",
    "HOME_RETROACTIVE_VISUAL_REDESIGN = NO",
    "LOCAL_FULL_MATRIX = 0",
    "LOCAL_FULL_LIGHTHOUSE = 0",
    "LOCAL_BROWSER_VS_LIVE_STAGING = NOT_RUN",
    "MONEY_MUTATION_VS_LIVE_STAGING = NOT_RUN",
    "PRODUCTION_DOMAIN_UNCHANGED = 1",
    "DEVICE_TIER_RERUN = SKIP",
    "ASSET_PIPELINE_RERUN = SKIP",
    "REL-500_RERUN = SKIP",
  ]) {
    if (!evidence.includes(needle)) fails.push("evidence missing " + needle);
  }
  if (!todoCompleted("REL-601")) fails.push("rel-601 todo must be completed");
  if (!yamlCompleted("REL-601")) fails.push("REL-601 YAML must be COMPLETED");
  if (/CLOUDFLARE_API_TOKEN\s*=\s*[A-Za-z0-9_-]{20,}/.test(evidence)) {
    fails.push("evidence leaked a Cloudflare token");
  }
  if (evidence.includes("workflow_dispatch") && /target\s*=\s*production/.test(evidence)) {
    fails.push("evidence must not dispatch production");
  }
}

(function main() {
  if (fails.length === 0) {
    for (const script of fixture.extraVerifies || []) {
      const run = spawnSync(process.execPath, [path.join(root, "tooling/verify", script)], {
        cwd: root,
        encoding: "utf8",
        timeout: 120_000,
      });
      if (run.status !== 0) {
        fails.push("re-run FAIL " + script + ": " + String(run.stderr || run.stdout || "").split("\n")[0]);
      }
    }
  }

  if (fails.length) {
    console.error("[verify:rel-601-staging-regression] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  if (closed) {
    console.log("[verify:rel-601-staging-regression] PASS (backend locks · extraVerifies · live Surface Matrix handed off)");
  } else {
    console.log("[verify:rel-601-staging-regression] PASS (backend locks · close pending)");
  }
})();

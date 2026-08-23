/**
 * verify:rel-600-staging
 * Staging origin from manifest. Preview workers only. Production hosts unchanged.
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

const fixture = readJson("tooling/verify/fixtures/rel-600-staging.v1.json");
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const evidence = read("governance/release-master/REL-600-STAGING.md");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");
const manifest = readJson("infra/domain.manifest.json");
const webDeploy = read("tooling/deploy/cf-pages-web.cjs");
const opsDeploy = read("tooling/deploy/cf-pages-ops.cjs");
const stagingDeploy = read("tooling/deploy/cf-deploy-staging.cjs");
const stagingWorkflow = read(".github/workflows/deploy-staging.yml");
const prodWorkflow = read(".github/workflows/deploy-cloudflare.yml");

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

if (fixture.productionDomainMutation !== 0) {
  fails.push("fixture productionDomainMutation must be 0");
}
if (fixture.productionWorkflowDispatch !== 0) {
  fails.push("fixture productionWorkflowDispatch must be 0");
}
if (fixture.pagesDeploy !== 0) fails.push("fixture pagesDeploy must be 0");
if (fixture.vercel !== 0) fails.push("fixture vercel must be 0");
if (fixture.secretHardcoded !== 0) fails.push("fixture secretHardcoded must be 0");

for (const dep of fixture.deps || []) {
  if (!todoCompleted(dep)) fails.push("EXIT_GATE: plan todo not completed " + dep);
  if (!yamlCompleted(dep)) fails.push("EXIT_GATE: YAML STATUS not COMPLETED " + dep);
}

const staging = manifest.openNext && manifest.openNext.staging;
if (!staging || staging.wranglerEnv !== "preview") {
  fails.push("manifest staging wranglerEnv must be preview");
}
if (!staging || staging.web.workersDev !== "ai-profit-web-preview.ebay-adapter.workers.dev") {
  fails.push("staging web origin drift");
}
if (!staging || staging.ops.workersDev !== "ai-profit-ops-preview.ebay-adapter.workers.dev") {
  fails.push("staging ops origin drift");
}
if (manifest.openNext.web.workersDev !== "ai-profit-web.ebay-adapter.workers.dev") {
  fails.push("production web origin must stay unchanged");
}
if (manifest.openNext.ops.workersDev !== "ai-profit-ops.ebay-adapter.workers.dev") {
  fails.push("production ops origin must stay unchanged");
}
if (manifest.env.APP_HOST !== "app.hiptk.app") fails.push("APP_HOST must stay app.hiptk.app");
if (manifest.env.OPS_HOST !== "ops.hiptk.app") fails.push("OPS_HOST must stay ops.hiptk.app");
if (manifest.env.API_HOST !== "api.hiptk.app") fails.push("API_HOST must stay api.hiptk.app");
if (manifest.bridgeWorkers["web-proxy"].target !== "https://ai-profit-web.ebay-adapter.workers.dev") {
  fails.push("web-proxy target must stay production origin");
}
if (manifest.bridgeWorkers["ops-proxy"].target !== "https://ai-profit-ops.ebay-adapter.workers.dev") {
  fails.push("ops-proxy target must stay production origin");
}

if (!webDeploy.includes("resolveWranglerEnv") || !webDeploy.includes("--env=")) {
  fails.push("web deploy must pass wrangler env");
}
if (!opsDeploy.includes("resolveWranglerEnv") || !opsDeploy.includes("--env=")) {
  fails.push("ops deploy must pass wrangler env");
}
if (stagingDeploy.includes("production") && /isProdTarget\(target\)/.test(stagingDeploy) === false) {
  fails.push("staging orchestrator must refuse production");
}
if (!stagingDeploy.includes("cf-pages-web.cjs") || !stagingDeploy.includes("cf-pages-ops.cjs")) {
  fails.push("staging orchestrator must deploy web and ops");
}
if (stagingDeploy.includes("cf-workers.cjs") || stagingDeploy.includes("cf-domain-bridge")) {
  fails.push("staging orchestrator must not deploy production bridge workers");
}

if (!stagingWorkflow.includes("name: deploy-staging")) {
  fails.push("dedicated staging workflow missing");
}
if (/inputs:\s*\n\s*target:/.test(stagingWorkflow) && stagingWorkflow.includes("production")) {
  fails.push("staging workflow must not accept production target");
}
if (stagingWorkflow.includes("environment: production")) {
  fails.push("staging workflow must not use production GitHub environment");
}
if (prodWorkflow.includes("workflow_dispatch") === false) {
  fails.push("production workflow_dispatch must remain on deploy-cloudflare.yml");
}

for (const rel of [
  "tooling/deploy/cf-pages-web.cjs",
  "tooling/deploy/cf-pages-ops.cjs",
  "tooling/deploy/cf-deploy-staging.cjs",
  ".github/workflows/deploy-staging.yml",
]) {
  const body = read(rel);
  if (/\bwrangler\s+pages\s+deploy\b/.test(body) || /\bpages\s+deploy\b/.test(body)) {
    fails.push("pages deploy path present: " + rel);
  }
  if (/\bvercel\s+deploy\b/.test(body) || /npx\s+vercel/.test(body)) {
    fails.push("vercel deploy path present: " + rel);
  }
}

if (!pkg.includes("verify:rel-600-staging")) {
  fails.push("package.json missing verify:rel-600-staging");
}
if (!pkg.includes("cf:deploy:staging")) {
  fails.push("package.json missing cf:deploy:staging");
}
if (!catalog.includes("rel-600-staging")) {
  fails.push("CATALOG missing rel-600-staging");
}
if (!gate.includes("verify:rel-600-staging")) {
  fails.push("gate.yml must run verify:rel-600-staging");
}
if (!domain.includes("rel-600-staging.cjs")) {
  fails.push("domain-by-path must trigger rel-600");
}

if (!evidence.includes("STATUS = COMPLETED")) fails.push("evidence missing STATUS");
if (!evidence.includes("PRODUCTION_DOMAIN_UNCHANGED = 1")) {
  fails.push("evidence missing PRODUCTION_DOMAIN_UNCHANGED");
}
if (!evidence.includes("PRODUCTION_WORKFLOW_DISPATCH = 0")) {
  fails.push("evidence missing PRODUCTION_WORKFLOW_DISPATCH");
}
if (!evidence.includes("https://ai-profit-web-preview.ebay-adapter.workers.dev")) {
  fails.push("evidence missing staging web URL");
}
if (!evidence.includes("https://ai-profit-ops-preview.ebay-adapter.workers.dev")) {
  fails.push("evidence missing staging ops URL");
}
if (/CLOUDFLARE_API_TOKEN\s*=\s*[A-Za-z0-9_-]{20,}/.test(evidence)) {
  fails.push("evidence leaked a Cloudflare token");
}

if (!todoCompleted("REL-600")) fails.push("rel-600 todo must be completed");
if (!yamlCompleted("REL-600")) fails.push("REL-600 YAML must be COMPLETED");

async function live(url, ok) {
  const res = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "ai-profit-os-rel-600-verify/1" },
  });
  if (!ok(res.status, res.headers)) {
    fails.push("live FAIL " + url + " status=" + res.status);
    return;
  }
  console.log("[verify:rel-600-staging] live PASS " + url + " " + res.status);
}

(async function main() {
  if (fails.length === 0) {
    try {
      await live("https://ai-profit-web-preview.ebay-adapter.workers.dev/", function (s, h) {
        return s === 200 && h.get("x-opennext") === "1";
      });
      await live("https://ai-profit-ops-preview.ebay-adapter.workers.dev/", function (s, h) {
        return (s === 200 || s === 307 || s === 308) && (h.get("x-opennext") === "1" || s === 307 || s === 308);
      });
      await live("https://ai-profit-web.ebay-adapter.workers.dev/", function (s, h) {
        return s === 200 && h.get("x-opennext") === "1";
      });
      await live("https://ai-profit-ops.ebay-adapter.workers.dev/", function (s, h) {
        return (s === 200 || s === 307 || s === 308) && (h.get("x-opennext") === "1" || s === 307 || s === 308);
      });
      await live("https://app.hiptk.app/", function (s, h) {
        return s === 200 && h.get("x-opennext") === "1";
      });
      await live("https://ops.hiptk.app/", function (s) {
        return s === 200 || s === 307 || s === 308;
      });
    } catch (e) {
      fails.push("live fetch error: " + (e.message || e));
    }
  }

  if (fails.length === 0) {
    for (const script of fixture.extraVerifies || []) {
      const run = spawnSync(process.execPath, [path.join(root, "tooling/verify", script)], {
        cwd: root,
        encoding: "utf8",
        timeout: 90_000,
      });
      if (run.status !== 0) {
        fails.push("re-run FAIL " + script + ": " + String(run.stderr || run.stdout || "").split("\n")[0]);
      }
    }
  }

  if (fails.length) {
    console.error("[verify:rel-600-staging] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  console.log("[verify:rel-600-staging] PASS (staging exists · production hosts unchanged)");
})();

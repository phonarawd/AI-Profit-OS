/**
 * verify:rel-602-staging-rollback
 * Staging rollback practice. Fake COMPLETED without version-id evidence = FAIL.
 * Pending + honest blockers is a legal T0 PASS.
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

const fixture = readJson("tooling/verify/fixtures/rel-602-staging-rollback.v1.json");
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const evidence = read("governance/release-master/REL-602-STAGING-ROLLBACK.md");
const runbook = read("governance/release-master/ROLLBACK_RUNBOOK.md");
const versioning = read("governance/release-master/VERSIONING.md");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");
const rollback = read("tooling/deploy/cf-rollback-staging.cjs");
const manifest = readJson("infra/domain.manifest.json");
const prodWorkflow = read(".github/workflows/deploy-cloudflare.yml");

function todoCompleted(relId) {
  const id = relId.replace(/^REL-/i, "rel-").toLowerCase();
  const re = new RegExp("- id: " + id + "\\r?\\n(?:.*\\r?\\n){0,3}\\s*status: (\\w+)");
  const m = plan.match(re);
  return m && m[1] === "completed";
}

function todoStatus(relId) {
  const id = relId.replace(/^REL-/i, "rel-").toLowerCase();
  const re = new RegExp("- id: " + id + "\\r?\\n(?:.*\\r?\\n){0,3}\\s*status: (\\w+)");
  const m = plan.match(re);
  return m ? m[1] : "";
}

function yamlStatus(relId) {
  const idx = plan.indexOf("ID: " + relId);
  if (idx < 0) return "";
  const m = plan.slice(idx, idx + 240).match(/STATUS:\s*(\w+)/);
  return m ? m[1] : "";
}

function yamlCompleted(relId) {
  return yamlStatus(relId) === "COMPLETED";
}

if (fixture.productionDomainMutation !== 0) fails.push("fixture productionDomainMutation must be 0");
if (fixture.productionWorkflowDispatch !== 0) fails.push("fixture productionWorkflowDispatch must be 0");
if (fixture.pagesDeploy !== 0) fails.push("fixture pagesDeploy must be 0");
if (fixture.vercel !== 0) fails.push("fixture vercel must be 0");
if (fixture.secretHardcoded !== 0) fails.push("fixture secretHardcoded must be 0");
if (fixture.fakePass !== 0) fails.push("fixture fakePass must be 0");
if (fixture.moneyMutation !== 0) fails.push("fixture moneyMutation must be 0");
if (fixture.homeVisualRedesign !== 0) fails.push("fixture homeVisualRedesign must be 0");
if (fixture.ledgerBalanceUpdate !== 0) fails.push("fixture ledgerBalanceUpdate must be 0");

for (const dep of fixture.deps || []) {
  if (!todoCompleted(dep)) fails.push("EXIT_GATE: plan todo not completed " + dep);
  if (!yamlCompleted(dep)) fails.push("EXIT_GATE: YAML STATUS not COMPLETED " + dep);
}

const staging = manifest.openNext && manifest.openNext.staging;
if (!staging || staging.wranglerEnv !== "preview") {
  fails.push("manifest staging wranglerEnv must be preview");
}
if (!fixture.stagingWeb || !fixture.stagingWeb.includes("ai-profit-web-preview")) {
  fails.push("fixture staging web must be preview workers");
}
if (!fixture.stagingOps || !fixture.stagingOps.includes("ai-profit-ops-preview")) {
  fails.push("fixture staging ops must be preview workers");
}
if (staging.web.workersDev !== "ai-profit-web-preview.ebay-adapter.workers.dev") {
  fails.push("staging web origin drift");
}
if (staging.ops.workersDev !== "ai-profit-ops-preview.ebay-adapter.workers.dev") {
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

if (!rollback.includes("isProdTarget") || !rollback.includes("production target forbidden")) {
  fails.push("rollback helper must refuse production target");
}
if (!rollback.includes("ai-profit-web-preview") || !rollback.includes("ai-profit-ops-preview")) {
  fails.push("rollback helper must name preview workers");
}
if (!rollback.includes("CLOUDFLARE_API_TOKEN missing")) {
  fails.push("rollback helper must fail-closed without token");
}
if (/\bwrangler\s+pages\s+deploy\b/.test(rollback) || /\bpages\s+deploy\b/.test(rollback)) {
  fails.push("rollback helper must not pages deploy");
}
if (/\bvercel\s+deploy\b/.test(rollback) || /npx\s+vercel/.test(rollback)) {
  fails.push("rollback helper must not vercel deploy");
}
for (const name of fixture.forbiddenWorkers || []) {
  if (new RegExp("--name\\s+[\"']?" + name + "[\"']?\\s*$", "m").test(rollback)) {
    fails.push("rollback helper must not deploy forbidden worker " + name);
  }
}
if (rollback.includes("target=production") || rollback.includes("env.production")) {
  fails.push("rollback helper must not select production wrangler env");
}

if (!pkg.includes("verify:rel-602-staging-rollback")) {
  fails.push("package.json missing verify:rel-602-staging-rollback");
}
if (!pkg.includes("cf:rollback:staging")) {
  fails.push("package.json missing cf:rollback:staging");
}
if (!catalog.includes("rel-602-staging-rollback")) {
  fails.push("CATALOG missing rel-602-staging-rollback");
}
if (!gate.includes("verify:rel-602-staging-rollback")) {
  fails.push("gate.yml must run verify:rel-602-staging-rollback");
}
if (!domain.includes("rel-602-staging-rollback.cjs")) {
  fails.push("domain-by-path must trigger rel-602");
}
if (!versioning.includes("ROLLBACK_CONSUMER = REL-602")) {
  fails.push("VERSIONING must keep REL-602 as rollback consumer");
}
if (!runbook.includes("PRACTICE_OWNER = REL-602")) {
  fails.push("ROLLBACK_RUNBOOK must keep PRACTICE_OWNER = REL-602");
}
if (!runbook.includes("REL-602-STAGING-ROLLBACK.md")) {
  fails.push("ROLLBACK_RUNBOOK must point at REL-602 evidence");
}
if (!prodWorkflow.includes("workflow_dispatch")) {
  fails.push("production workflow_dispatch must remain on deploy-cloudflare.yml");
}

const closed = yamlCompleted("REL-602") || todoCompleted("REL-602");
const yamlPending = yamlStatus("REL-602") === "PENDING";
const todoPending = todoStatus("REL-602") === "pending";
const evidenceHead = evidence.split("## ORIGIN")[0] || evidence;

if (evidence.includes("FAKE_PASS = 1")) fails.push("evidence must not set FAKE_PASS = 1");
if (/CLOUDFLARE_API_TOKEN\s*=\s*[A-Za-z0-9_-]{20,}/.test(evidence)) {
  fails.push("evidence leaked a Cloudflare token");
}
if (/target\s*=\s*production/.test(evidence) && /workflow_dispatch/.test(evidence)) {
  if (!evidence.includes("PRODUCTION_WORKFLOW_DISPATCH = 0")) {
    fails.push("evidence must not dispatch production");
  }
}
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

if (closed) {
  if (fixture.acceptanceMet !== 1) fails.push("closed REL-602 fixture.acceptanceMet must be 1");
  if (fixture.rollbackExecuted !== 1) fails.push("closed REL-602 fixture.rollbackExecuted must be 1");
  if (fixture.forwardDeployExecuted !== 1) {
    fails.push("closed REL-602 fixture.forwardDeployExecuted must be 1");
  }
  if (!evidenceHead.includes("STATUS = COMPLETED")) fails.push("closed evidence missing STATUS = COMPLETED");
  if (!evidence.includes("ACCEPTANCE_MET = 1")) fails.push("closed evidence missing ACCEPTANCE_MET = 1");
  if (!evidence.includes("ROLLBACK_EXECUTED = 1")) {
    fails.push("closed evidence missing ROLLBACK_EXECUTED = 1");
  }
  if (!evidence.includes("FORWARD_DEPLOY_EXECUTED = 1")) {
    fails.push("closed evidence missing FORWARD_DEPLOY_EXECUTED = 1");
  }
  if (!/before|BEFORE/.test(evidence) || !/after|AFTER/.test(evidence)) {
    fails.push("closed evidence must record before/after version ids");
  }
  if (!todoCompleted("REL-602")) fails.push("rel-602 todo must be completed");
  if (!yamlCompleted("REL-602")) fails.push("REL-602 YAML must be COMPLETED");
} else {
  if (fixture.acceptanceMet !== 0) fails.push("pending fixture.acceptanceMet must stay 0");
  if (fixture.rollbackExecuted !== 0) fails.push("pending fixture.rollbackExecuted must stay 0");
  if (fixture.forwardDeployExecuted !== 0) {
    fails.push("pending fixture.forwardDeployExecuted must stay 0");
  }
  if (!evidenceHead.includes("STATUS = PENDING")) fails.push("pending evidence missing STATUS = PENDING");
  if (!evidence.includes("ACCEPTANCE_MET = 0")) fails.push("pending evidence missing ACCEPTANCE_MET = 0");
  if (!evidence.includes("ROLLBACK_EXECUTED = 0")) {
    fails.push("pending evidence missing ROLLBACK_EXECUTED = 0");
  }
  if (!evidence.includes("## BLOCKERS")) fails.push("pending evidence must list BLOCKERS");
  if (!/CLOUDFLARE_API_TOKEN|staging slot control|known-good/i.test(evidence)) {
    fails.push("pending evidence must name a real blocker");
  }
  if (evidenceHead.includes("STATUS = COMPLETED")) {
    fails.push("pending evidence header must not claim COMPLETED");
  }
  if (!yamlPending) fails.push("REL-602 YAML must stay PENDING until rollback is real");
  if (!todoPending) fails.push("rel-602 todo must stay pending until rollback is real");
  if (!plan.includes("FIRST_EXECUTION_TODO = REL-602")) {
    fails.push("PUTDUK pointer FIRST_EXECUTION_TODO must stay REL-602 while pending");
  }
  if (!plan.includes("LAST_COMPLETED_TODO = REL-601")) {
    fails.push("PUTDUK pointer LAST_COMPLETED_TODO must stay REL-601 while pending");
  }
}

async function live(url, ok) {
  const res = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "ai-profit-os-rel-602-verify/1" },
  });
  if (!ok(res.status, res.headers)) {
    fails.push("live FAIL " + url + " status=" + res.status);
    return;
  }
  console.log("[verify:rel-602-staging-rollback] live PASS " + url + " " + res.status);
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
        timeout: 120_000,
      });
      if (run.status !== 0) {
        fails.push("re-run FAIL " + script + ": " + String(run.stderr || run.stdout || "").split("\n")[0]);
      }
    }
  }

  if (fails.length) {
    console.error("[verify:rel-602-staging-rollback] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  if (closed) {
    console.log("[verify:rel-602-staging-rollback] PASS (rollback practiced · version ids recorded)");
  } else {
    console.log("[verify:rel-602-staging-rollback] PASS (honest pending · blockers recorded · production unchanged)");
  }
})();

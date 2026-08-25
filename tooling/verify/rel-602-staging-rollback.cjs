#!/usr/bin/env node
/**
 * verify:rel-602-staging-rollback
 * REL-602 is complete only when a real preview-worker rollback and forward deploy
 * are evidenced. Production/domain/DB/money mutation remains forbidden.
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
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");
const gateTiers = read("tooling/verify/gate-tiers.cjs");
const rollback = read("tooling/deploy/cf-rollback-staging.cjs");
const manifest = readJson("infra/domain.manifest.json");
const prodWorkflow = read(".github/workflows/deploy-cloudflare.yml");

function todoStatus(relId) {
  const id = relId.replace(/^REL-/i, "rel-").toLowerCase();
  const re = new RegExp("- id: " + id + "\\r?\\n(?:.*\\r?\\n){0,3}\\s*status: (\\w+)");
  const m = plan.match(re);
  return m ? m[1] : "";
}

function yamlStatus(relId) {
  const idx = plan.indexOf("ID: " + relId);
  if (idx < 0) return "";
  const m = plan.slice(idx, idx + 300).match(/STATUS:\s*(\w+)/);
  return m ? m[1] : "";
}

function mustZero(key) {
  if (fixture[key] !== 0) fails.push("fixture " + key + " must be 0");
}

for (const key of [
  "productionDomainMutation",
  "productionWorkflowDispatch",
  "productionDbMutation",
  "applyMigration",
  "pagesDeploy",
  "vercel",
  "secretHardcoded",
  "fakePass",
  "moneyMutation",
  "homeVisualRedesign",
  "ledgerBalanceUpdate",
  "failedAttemptsMutation",
]) mustZero(key);

if (fixture.status !== "COMPLETED") fails.push("fixture status must be COMPLETED");
if (fixture.acceptanceMet !== 1) fails.push("acceptanceMet must be 1");
if (fixture.rollbackExecuted !== 1) fails.push("rollbackExecuted must be 1");
if (fixture.forwardDeployExecuted !== 1) fails.push("forwardDeployExecuted must be 1");
if (fixture.protectedScopeMutation !== false) fails.push("protectedScopeMutation must be false");

for (const dep of fixture.deps || []) {
  if (todoStatus(dep) !== "completed") fails.push("EXIT_GATE: todo dependency not completed " + dep);
  if (yamlStatus(dep) !== "COMPLETED") fails.push("EXIT_GATE: YAML dependency not COMPLETED " + dep);
}
if (todoStatus("REL-602") !== "completed") fails.push("rel-602 todo must be completed");
if (yamlStatus("REL-602") !== "COMPLETED") fails.push("REL-602 YAML must be COMPLETED");
const rel603Closed = todoStatus("REL-603") === "completed" && yamlStatus("REL-603") === "COMPLETED";
if (rel603Closed) {
  if (!plan.includes("FIRST_EXECUTION_TODO = REL-700")) fails.push("FIRST_EXECUTION_TODO must advance to REL-700 after REL-603");
  if (!plan.includes("LAST_COMPLETED_TODO = REL-603")) fails.push("LAST_COMPLETED_TODO must be REL-603 after REL-603 close");
  if (!plan.includes("HARD_STOP_AFTER = REL-603")) fails.push("HARD_STOP_AFTER must be REL-603 after REL-603 close");
} else {
  if (!plan.includes("FIRST_EXECUTION_TODO = REL-603")) fails.push("FIRST_EXECUTION_TODO must advance to REL-603");
  if (!plan.includes("LAST_COMPLETED_TODO = REL-602")) fails.push("LAST_COMPLETED_TODO must be REL-602");
  if (!plan.includes("HARD_STOP_AFTER = REL-602")) fails.push("HARD_STOP_AFTER must be REL-602");
}

const staging = manifest.openNext && manifest.openNext.staging;
if (!staging || staging.wranglerEnv !== "preview") fails.push("manifest staging wranglerEnv must be preview");
if (!fixture.stagingWeb.includes("ai-profit-web-preview")) fails.push("staging web must be preview");
if (!fixture.stagingOps.includes("ai-profit-ops-preview")) fails.push("staging ops must be preview");
if (!staging || staging.web.workersDev !== "ai-profit-web-preview.ebay-adapter.workers.dev") fails.push("staging web origin drift");
if (!staging || staging.ops.workersDev !== "ai-profit-ops-preview.ebay-adapter.workers.dev") fails.push("staging ops origin drift");
if (manifest.openNext.web.workersDev !== "ai-profit-web.ebay-adapter.workers.dev") fails.push("production web origin drift");
if (manifest.openNext.ops.workersDev !== "ai-profit-ops.ebay-adapter.workers.dev") fails.push("production ops origin drift");
if (manifest.env.APP_HOST !== "app.hiptk.app") fails.push("APP_HOST drift");
if (manifest.env.OPS_HOST !== "ops.hiptk.app") fails.push("OPS_HOST drift");

for (const needle of [
  "production target forbidden",
  "ai-profit-web-preview",
  "ai-profit-ops-preview",
  "Atomic preflight",
  "target version(s) not present",
  "MUTATION = 0",
  "CLOUDFLARE_API_TOKEN missing",
]) {
  if (!rollback.includes(needle)) fails.push("rollback helper missing: " + needle);
}
for (const forbidden of fixture.forbiddenWorkers || []) {
  if (new RegExp("--name\\s+[\\\"']?" + forbidden + "[\\\"']?\\s*$", "m").test(rollback)) {
    fails.push("rollback helper must not target production worker " + forbidden);
  }
}
if (/\bwrangler\s+pages\s+deploy\b/.test(rollback)) fails.push("rollback helper must not Pages deploy");
if (/\bapply_migration\b|supabase\s+db\s+push/.test(rollback)) fails.push("rollback helper must not mutate DB");

for (const needle of [
  "STATUS = COMPLETED",
  "ACCEPTANCE_MET = 1",
  "ROLLBACK_EXECUTED = 1",
  "FORWARD_DEPLOY_EXECUTED = 1",
  "PRODUCTION_DOMAIN_UNCHANGED = 1",
  "PRODUCTION_WORKFLOW_DISPATCH = 0",
  "PRODUCTION_DB_MUTATION = 0",
  "APPLY_MIGRATION = 0",
  "MONEY_MUTATION = 0",
  "LEDGER_BALANCE_UPDATE = 0",
  "FAKE_PASS = 0",
  String(fixture.workflowRunId),
  String(fixture.workflowJobId),
  String(fixture.artifactId),
  fixture.artifactDigest,
  fixture.webBeforeVersionId,
  fixture.opsBeforeVersionId,
  fixture.webRollbackVersionId,
  fixture.opsRollbackVersionId,
  fixture.webForwardVersionId,
  fixture.opsForwardVersionId,
]) {
  if (!evidence.includes(needle)) fails.push("evidence missing: " + needle);
}
if (fixture.webRollbackVersionId === fixture.webForwardVersionId) fails.push("web forward must move off rollback ID");
if (fixture.opsRollbackVersionId === fixture.opsForwardVersionId) fails.push("ops forward must move off rollback ID");
if (/CLOUDFLARE_API_TOKEN\s*=\s*[A-Za-z0-9_-]{20,}/.test(evidence)) fails.push("evidence leaked Cloudflare token");

if (!runbook.includes("PRACTICE_OWNER = REL-602")) fails.push("runbook practice owner drift");
if (!runbook.includes("REL-602-STAGING-ROLLBACK.md")) fails.push("runbook missing REL-602 evidence pointer");
if (!runbook.includes("THIS_REL_PRACTICE = 1")) fails.push("runbook must record staging practice complete");
if (!runbook.includes("PRODUCTION_EXECUTE = 0")) fails.push("runbook production execute must stay 0");
if (!prodWorkflow.includes("workflow_dispatch")) fails.push("production deploy workflow contract drift");

if (!pkg.includes("verify:rel-602-staging-rollback")) fails.push("package missing REL-602 verify script");
if (!pkg.includes("cf:rollback:staging")) fails.push("package missing staging rollback script");
if (!catalog.includes("rel-602-staging-rollback")) fails.push("catalog missing REL-602");
if (!gate.includes("verify:rel-602-staging-rollback")) fails.push("gate missing REL-602");
if (!domain.includes("rel-602-staging-rollback.cjs")) {
  fails.push("domain-by-path SSOT missing REL-602 T0 mapping");
}
if (gateTiers.includes("isRel602Path")) {
  fails.push("REL-602 T0 must live in domain-by-path only");
}

async function live(url, allowed) {
  const res = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "ai-profit-os-rel-602-verify/1" },
  });
  if (!allowed.includes(res.status)) {
    fails.push("live FAIL " + url + " status=" + res.status);
    return;
  }
  if (res.status === 200 && res.headers.get("x-opennext") !== "1") {
    fails.push("live FAIL " + url + " missing x-opennext=1");
    return;
  }
  console.log("[verify:rel-602-staging-rollback] live PASS " + url + " " + res.status);
}

(async function main() {
  if (fails.length === 0) {
    try {
      await live(fixture.stagingWeb + "/", [200]);
      await live(fixture.stagingOps + "/", [200, 307, 308]);
    } catch (e) {
      fails.push("live fetch error: " + (e.message || e));
    }
  }

  if (fails.length === 0) {
    for (const script of fixture.extraVerifies || []) {
      const run = spawnSync(process.execPath, [path.join(root, "tooling/verify", script)], {
        cwd: root,
        encoding: "utf8",
        timeout: 180000,
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
  console.log("[verify:rel-602-staging-rollback] PASS (real staging rollback + read-only regression + forward deploy evidenced)");
})();

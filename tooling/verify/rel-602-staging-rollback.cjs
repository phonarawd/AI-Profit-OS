/**
 * verify:rel-602-staging-rollback
 * REL-602 staging rollback practice — Cloudflare Worker version control.
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
const versionsScript = read("tooling/deploy/cf-worker-versions.cjs");
const rollbackScript = read("tooling/deploy/cf-worker-rollback.cjs");
const wranglerLib = read("tooling/deploy/lib/cf-wrangler.cjs");
const practiceWorkflow = read(".github/workflows/staging-rollback-practice.yml");

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

if (fixture.productionRollback !== 0) {
  fails.push("fixture productionRollback must be 0");
}
if (fixture.productionWorkflowRollback !== 0) {
  fails.push("fixture productionWorkflowRollback must be 0");
}
if (fixture.pagesDeploy !== 0) fails.push("fixture pagesDeploy must be 0");
if (fixture.vercel !== 0) fails.push("fixture vercel must be 0");

for (const dep of fixture.deps || []) {
  if (!todoCompleted(dep)) fails.push("EXIT_GATE: plan todo not completed " + dep);
  if (!yamlCompleted(dep)) fails.push("EXIT_GATE: YAML STATUS not COMPLETED " + dep);
}

if (!wranglerLib.includes("production rollback blocked")) {
  fails.push("cf-wrangler must block production rollback");
}
if (!rollbackScript.includes("production rollback blocked")) {
  fails.push("cf-worker-rollback must block production");
}
if (!versionsScript.includes("versionsList") && !wranglerLib.includes("versions list")) {
  fails.push("cf version tooling must call wrangler versions list");
}
if (!versionsScript.includes("deploymentStatus") && !wranglerLib.includes("deployments status")) {
  fails.push("cf version tooling must call wrangler deployments status");
}

for (const rel of [
  "tooling/deploy/cf-worker-versions.cjs",
  "tooling/deploy/cf-worker-rollback.cjs",
  "tooling/deploy/lib/cf-wrangler.cjs",
]) {
  const body = read(rel);
  if (/\bwrangler\s+pages\s+deploy\b/.test(body) || /\bpages\s+deploy\b/.test(body)) {
    fails.push("pages deploy path present: " + rel);
  }
  if (/\bvercel\s+deploy\b/.test(body) || /npx\s+vercel/.test(body)) {
    fails.push("vercel deploy path present: " + rel);
  }
}

if (!practiceWorkflow.includes("workflow_dispatch")) {
  fails.push("staging-rollback-practice workflow must be workflow_dispatch");
}
if (practiceWorkflow.includes("target: production") || /inputs:\s*\n\s*target:[\s\S]*production/.test(practiceWorkflow)) {
  fails.push("staging rollback workflow must not accept production target");
}
if (!practiceWorkflow.includes("cf-worker-rollback.cjs")) {
  fails.push("practice workflow must call cf-worker-rollback.cjs");
}

if (!runbook.includes("cf-worker-versions") || !runbook.includes("cf-worker-rollback")) {
  fails.push("ROLLBACK_RUNBOOK must reference cf version control scripts");
}

if (!pkg.includes("cf:versions:staging")) {
  fails.push("package.json missing cf:versions:staging");
}
if (!pkg.includes("cf:rollback:staging")) {
  fails.push("package.json missing cf:rollback:staging");
}
if (!pkg.includes("verify:rel-602-staging-rollback")) {
  fails.push("package.json missing verify:rel-602-staging-rollback");
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

const baseline = fixture.knownGoodBaseline || {};
if (!baseline.web || !baseline.ops) {
  fails.push("fixture knownGoodBaseline must pin web and ops version ids");
}
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(baseline.web)) {
  fails.push("knownGoodBaseline.web must be a CF version UUID");
}

const closed = yamlCompleted("REL-602") || todoCompleted("REL-602");
if (closed) {
  if (!evidence.includes("STATUS = COMPLETED")) fails.push("evidence missing STATUS = COMPLETED");
  if (!evidence.includes("PRODUCTION_ROLLBACK = 0")) {
    fails.push("evidence missing PRODUCTION_ROLLBACK = 0");
  }
  if (!evidence.includes("KNOWN_GOOD_VERSION_ID")) {
    fails.push("evidence missing KNOWN_GOOD_VERSION_ID");
  }
  if (!evidence.includes("VERSION_BEFORE_ROLLBACK")) {
    fails.push("evidence missing VERSION_BEFORE_ROLLBACK");
  }
  if (!evidence.includes("VERSION_AFTER_ROLLBACK")) {
    fails.push("evidence missing VERSION_AFTER_ROLLBACK");
  }
  if (!evidence.includes("FORWARD_DEPLOY")) {
    fails.push("evidence missing FORWARD_DEPLOY");
  }
  if (/CLOUDFLARE_API_TOKEN\s*=\s*[A-Za-z0-9_-]{20,}/.test(evidence)) {
    fails.push("evidence leaked a Cloudflare token");
  }
  if (!todoCompleted("REL-602")) fails.push("rel-602 todo must be completed");
  if (!yamlCompleted("REL-602")) fails.push("REL-602 YAML must be COMPLETED");
}

(async function main() {
  if (fails.length === 0 && closed) {
    for (const script of fixture.extraVerifies || []) {
      const run = spawnSync(process.execPath, [path.join(root, "tooling/verify", script)], {
        cwd: root,
        encoding: "utf8",
        timeout: 90_000,
      });
      if (run.status !== 0) {
        fails.push(
          "re-run FAIL " + script + ": " + String(run.stderr || run.stdout || "").split("\n")[0]
        );
      }
    }
  }

  if (fails.length) {
    console.error("[verify:rel-602-staging-rollback] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  if (closed) {
    console.log("[verify:rel-602-staging-rollback] PASS (staging rollback practiced · evidence locked)");
  } else {
    console.log("[verify:rel-602-staging-rollback] PASS (path lock · practice evidence pending)");
  }
})();

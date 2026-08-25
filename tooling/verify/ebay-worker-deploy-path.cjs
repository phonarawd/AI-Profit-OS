/**
 * verify:ebay-worker-deploy-path — PRODUCT-DATA P0-A
 * Official ebay-adapter-only worker set + surface fail-closed.
 * Cloudflare / DB mutation 0.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const deployScript = path.join(root, "tooling/deploy/cf-workers.cjs");
const deploy = require(deployScript);
const fails = [];

const PHASE1_LOCKED = Object.freeze([
  "push-dispatcher",
  "marketing-capi-dispatcher",
  "chain-watchers",
  "chain-sweeper",
  "ebay-adapter",
  "amazon-adapter",
  "yahoo-jp-adapter",
  "pokemontcg-adapter",
  "ygoprodeck-adapter",
  "coingecko-adapter",
  "frankfurter-adapter",
]);

const SECRET_NAME_NEEDLES = Object.freeze([
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "EBAY_CLIENT_ID",
  "EBAY_CLIENT_SECRET",
  "NEST_ADAPTER_INGEST_URL",
  "ADAPTER_INGEST_TOKEN",
]);

function fail(message) {
  fails.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

function spawnDeploy(args) {
  return spawnSync(process.execPath, [deployScript, ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: "",
      CLOUDFLARE_ACCOUNT_ID: "",
      EBAY_CLIENT_ID: "",
      EBAY_CLIENT_SECRET: "",
      NEST_ADAPTER_INGEST_URL: "",
      ADAPTER_INGEST_TOKEN: "",
    },
  });
}

function parsePlan(stdout) {
  const plan = {};
  for (const line of String(stdout || "").split(/\r?\n/)) {
    const idx = line.indexOf("=");
    if (idx < 1) continue;
    const key = line.slice(0, idx);
    if (
      key === "target" ||
      key === "worker_set" ||
      key === "worker_count" ||
      key === "worker_names" ||
      key === "environment"
    ) {
      plan[key] = line.slice(idx + 1);
    }
  }
  return plan;
}

function assertNoSecretValues(text, label) {
  const body = String(text || "");
  for (const name of SECRET_NAME_NEEDLES) {
    const value = process.env[name];
    if (value && value.length > 0 && body.includes(value)) {
      fail(`${label} leaked secret value for ${name}`);
    }
  }
  if (
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(body) ||
    /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+\./.test(body)
  ) {
    fail(`${label} looks like it printed a secret payload`);
  }
}

function assertNoMutation(stdout, stderr, label) {
  const body = `${stdout || ""}\n${stderr || ""}`;
  if (/\[cf:deploy:workers\] deploying /.test(body)) {
    fail(`${label} must not enter deploy spawn`);
  }
  if (/Uploaded .* workers\.dev|Current Version ID:|Published/.test(body)) {
    fail(`${label} looks like a Cloudflare upload`);
  }
}

const manifest = readJson("infra/workers.manifest.json");
const workflow = read(".github/workflows/deploy-cloudflare.yml");
const ebayToml = deploy.readEbayWranglerToml();

if (!Array.isArray(manifest.phase0) || manifest.phase0.join(",") !== "push-dispatcher") {
  fail("phase0 must remain [push-dispatcher]");
}
if (JSON.stringify(manifest.phase1) !== JSON.stringify(PHASE1_LOCKED)) {
  fail("phase1 content must not be rewritten");
}
if (JSON.stringify(manifest["p0-ebay"]) !== JSON.stringify(["ebay-adapter"])) {
  fail('p0-ebay must be exactly ["ebay-adapter"]');
}

let p0Workers;
try {
  p0Workers = deploy.resolveWorkers(manifest, "p0-ebay");
} catch (err) {
  fail(`p0-ebay resolve threw: ${err.message}`);
  p0Workers = [];
}
if (p0Workers.length !== 1 || p0Workers[0] !== "ebay-adapter") {
  fail("p0-ebay must resolve to [ebay-adapter] count=1");
}
for (const banned of deploy.P0_EBAY_FORBIDDEN) {
  if (p0Workers.includes(banned)) fail(`p0-ebay contains forbidden ${banned}`);
}

if (deploy.DEFAULT_WORKER_SET !== "phase0") {
  fail("DEFAULT_WORKER_SET must be phase0");
}
const defaultWorkers = deploy.resolveWorkers(manifest, deploy.DEFAULT_WORKER_SET);
if (defaultWorkers.join(",") !== "push-dispatcher") {
  fail("unspecified/default worker_set must resolve phase0 [push-dispatcher]");
}

const invalidSets = [
  "random",
  "phase9",
  "../../whatever",
  "phase0;rm",
  "notes",
  "p0-ebay/../phase1",
];
for (const value of invalidSets) {
  const checked = deploy.validateWorkerSetName(value);
  if (checked.ok) fail(`validateWorkerSetName must reject ${value}`);
  const spawned = spawnDeploy(["preview", value, "--dry-run"]);
  if (spawned.status === 0) fail(`CLI must fail-closed for worker_set=${value}`);
  assertNoMutation(spawned.stdout, spawned.stderr, `invalid ${value}`);
  assertNoSecretValues(`${spawned.stdout}\n${spawned.stderr}`, `invalid ${value}`);
}

const surfacePass = deploy.assertSurfaceAllowed("p0-ebay", "workers");
if (!surfacePass.ok) fail("p0-ebay + workers must PASS");
for (const surface of ["all", "web", "ops"]) {
  const blocked = deploy.assertSurfaceAllowed("p0-ebay", surface);
  if (blocked.ok) fail(`p0-ebay + ${surface} must FAIL`);
  const spawned = spawnDeploy(["--check-surface", "p0-ebay", surface]);
  if (spawned.status === 0) fail(`CLI surface-guard must fail p0-ebay + ${surface}`);
}
const surfaceOk = spawnDeploy(["--check-surface", "p0-ebay", "workers"]);
if (surfaceOk.status !== 0) fail("CLI surface-guard must pass p0-ebay + workers");
const phase0All = spawnDeploy(["--check-surface", "phase0", "all"]);
if (phase0All.status !== 0) fail("phase0 + all must remain allowed");

const prodPlan = spawnDeploy(["production", "p0-ebay", "--dry-run"]);
const previewPlan = spawnDeploy(["preview", "p0-ebay", "--dry-run"]);
const defaultPlan = spawnDeploy(["--dry-run"]);
if (prodPlan.status !== 0) fail("production p0-ebay --dry-run must PASS");
if (previewPlan.status !== 0) fail("preview p0-ebay --dry-run must PASS");
if (defaultPlan.status !== 0) fail("default --dry-run must PASS");

const prodParsed = parsePlan(prodPlan.stdout);
const previewParsed = parsePlan(previewPlan.stdout);
const defaultParsed = parsePlan(defaultPlan.stdout);

if (prodParsed.target !== "production" || prodParsed.environment !== "production") {
  fail("production plan must set target/environment=production");
}
if (prodParsed.worker_set !== "p0-ebay" || prodParsed.worker_names !== "ebay-adapter") {
  fail("production plan must be p0-ebay / ebay-adapter");
}
if (prodParsed.worker_count !== "1") fail("production plan worker_count must be 1");
if (previewParsed.target !== "preview" || previewParsed.environment !== "preview") {
  fail("preview plan must set target/environment=preview");
}
if (previewParsed.worker_set !== "p0-ebay" || previewParsed.worker_names !== "ebay-adapter") {
  fail("preview plan must be p0-ebay / ebay-adapter");
}
if (defaultParsed.worker_set !== "phase0" || defaultParsed.worker_names !== "push-dispatcher") {
  fail("unspecified dry-run must stay phase0 / push-dispatcher");
}

const phase1Plan = spawnDeploy(["preview", "phase1", "--dry-run"]);
if (phase1Plan.status !== 0) fail("phase1 manual dry-run must remain usable");
const phase1Parsed = parsePlan(phase1Plan.stdout);
if (phase1Parsed.worker_set !== "phase1") fail("phase1 dry-run must keep worker_set=phase1");
if (phase1Parsed.worker_names !== PHASE1_LOCKED.join(",")) {
  fail("phase1 dry-run must resolve the existing phase1 worker list");
}
assertNoMutation(phase1Plan.stdout, phase1Plan.stderr, "phase1 dry-run");
assertNoSecretValues(`${phase1Plan.stdout}\n${phase1Plan.stderr}`, "phase1 dry-run");

if (deploy.resolveWranglerWorkerName(ebayToml, "production") !== "ebay-adapter") {
  fail("production wrangler name must be ebay-adapter");
}
if (deploy.resolveWranglerWorkerName(ebayToml, "preview") !== "ebay-adapter-preview") {
  fail("preview wrangler name must be ebay-adapter-preview");
}

const prodCrons = deploy.resolveWranglerCrons(ebayToml, "production");
const previewCrons = deploy.resolveWranglerCrons(ebayToml, "preview");
if (prodCrons.join(",") !== "*/15 * * * *") {
  fail("production cron must inherit */15 * * * *");
}
if (previewCrons.join(",") !== "*/15 * * * *") {
  fail("preview cron must inherit */15 * * * *");
}
if (/\[env\.production\.triggers\]/.test(ebayToml) || /\[env\.preview\.triggers\]/.test(ebayToml)) {
  fail("ebay wrangler.toml must not duplicate env triggers without proven defect");
}

const wranglerCli = path.join(root, "node_modules/wrangler/wrangler-dist/cli.js");
if (fs.existsSync(wranglerCli)) {
  const wranglerSrc = fs.readFileSync(wranglerCli, "utf8");
  if (!/triggers:\s*inheritable\(/.test(wranglerSrc)) {
    fail("pinned wrangler must inherit top-level triggers into named envs");
  }
}

for (const [label, result] of [
  ["production dry-run", prodPlan],
  ["preview dry-run", previewPlan],
  ["default dry-run", defaultPlan],
  ["surface pass", surfaceOk],
]) {
  assertNoMutation(result.stdout, result.stderr, label);
  assertNoSecretValues(`${result.stdout}\n${result.stderr}`, label);
  if (/mutation=0/.test(`${result.stdout}\n${result.stderr}`) === false && label.includes("dry-run")) {
    fail(`${label} must declare mutation=0`);
  }
}

if (!/worker_set:/.test(workflow)) fail("workflow missing worker_set input");
const workerSetBlock = workflow.slice(
  workflow.indexOf("worker_set:"),
  workflow.indexOf("concurrency:"),
);
if (!/default:\s*phase0/.test(workerSetBlock)) {
  fail("workflow worker_set default must be phase0");
}
if (!/options:\s*\r?\n\s*-\s*phase0\s*\r?\n\s*-\s*p0-ebay/.test(workerSetBlock)) {
  fail("workflow worker_set options must be phase0 and p0-ebay only");
}
if (/- phase1/.test(workerSetBlock)) {
  fail("workflow must not expose phase1 as a worker_set choice");
}
if (/yahoo-jp-adapter|yahoo_jp/.test(workerSetBlock)) {
  fail("workflow worker_set must not mention yahoo_jp");
}
if (!/--check-surface/.test(workflow)) {
  fail("workflow must invoke surface guard");
}
if (!/cf-workers\.cjs "\$\{\{ inputs\.target \}\}" "\$\{\{ inputs\.worker_set \}\}"/.test(workflow)) {
  fail("workflow deploy step must use validated worker_set");
}
if (/cf-workers\.cjs \$\{?\{\{ inputs\.target \}\}\}? phase0/.test(workflow)) {
  fail("workflow must not hardcode phase0 in the deploy step");
}

if (fails.length) {
  console.error("[verify:ebay-worker-deploy-path] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:ebay-worker-deploy-path] PASS (p0-ebay=ebay-adapter · default=phase0 · surface fail-closed · dry-run mutation=0)",
);

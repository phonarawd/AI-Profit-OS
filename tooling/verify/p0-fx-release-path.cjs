#!/usr/bin/env node
/** Static/dry-run contract for the isolated P0-C FX release path. */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));

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
const FX_EXACT = Object.freeze(["coingecko-adapter", "frankfurter-adapter"]);
const deployRel = "tooling/deploy/cf-fx-workers.cjs";
const deployAbs = path.join(root, deployRel);
const deploy = require(deployAbs);
const health = require(path.join(root, "tooling/deploy/cf-fx-health-smoke.cjs"));
const rollback = require(path.join(root, "tooling/deploy/cf-fx-rollback.cjs"));

function spawnDeploy(args) {
  return spawnSync(process.execPath, [deployAbs, ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: "",
      CLOUDFLARE_ACCOUNT_ID: "",
      ALLOW_PREVIEW_P0_FX_DEPLOY: "",
    },
  });
}

function body(result) {
  return `${result.stdout || ""}\n${result.stderr || ""}`;
}

function assertNoDeployMutation(result, label) {
  const text = body(result);
  if (/wrangler\s+deploy|deploying\s+coingecko|deploying\s+frankfurter|Uploaded .*workers\.dev|Published/i.test(text)) {
    fail(`${label} looks like a deploy mutation`);
  }
}

const manifest = readJson("infra/workers.manifest.json");
if (JSON.stringify(manifest.phase0) !== JSON.stringify(["push-dispatcher"])) {
  fail("phase0 must remain exactly [push-dispatcher]");
}
if (JSON.stringify(manifest.phase1) !== JSON.stringify(PHASE1_LOCKED)) {
  fail("phase1 existing worker list must remain byte-semantically unchanged");
}
if (JSON.stringify(manifest["p0-ebay"]) !== JSON.stringify(["ebay-adapter"])) {
  fail("p0-ebay must remain exactly [ebay-adapter]");
}
if (JSON.stringify(manifest["p0-fx"]) !== JSON.stringify(FX_EXACT)) {
  fail("p0-fx must be exactly [coingecko-adapter, frankfurter-adapter]");
}

try {
  if (JSON.stringify(deploy.exactFxWorkers(manifest)) !== JSON.stringify(FX_EXACT)) {
    fail("deploy exactFxWorkers did not resolve exact two");
  }
} catch (error) {
  fail(`deploy exactFxWorkers threw: ${error.message}`);
}
if (deploy.FX_WORKER_SET !== "p0-fx") fail("deploy worker set must be p0-fx");
if (JSON.stringify(deploy.FX_WORKERS) !== JSON.stringify(FX_EXACT)) {
  fail("deploy FX_WORKERS must remain exact two");
}
if (deploy.COMMERCIAL_BLOCK !== "COMMERCIAL_PROVIDER_NOT_CLEARED") {
  fail("production commercial fail-closed marker changed");
}

if (!deploy.assertSurfaceAllowed("workers").ok) fail("p0-fx workers surface must pass");
for (const surface of ["all", "web", "ops", ""]) {
  if (deploy.assertSurfaceAllowed(surface).ok) fail(`p0-fx surface ${surface || "missing"} must fail`);
  const spawned = spawnDeploy(["--check-surface", surface || "missing"]);
  if (spawned.status === 0) fail(`CLI surface ${surface || "missing"} must fail`);
  assertNoDeployMutation(spawned, `surface ${surface || "missing"}`);
}
const surfacePass = spawnDeploy(["--check-surface", "workers"]);
if (surfacePass.status !== 0) fail("CLI p0-fx workers surface must pass");

for (const target of ["preview", "production"]) {
  const result = spawnDeploy([target, "--dry-run"]);
  if (result.status !== 0) fail(`${target} dry-run must pass`);
  const text = body(result);
  if (!text.includes("worker_set=p0-fx")) fail(`${target} dry-run missing p0-fx`);
  if (!text.includes("worker_count=2")) fail(`${target} dry-run missing worker_count=2`);
  if (!text.includes("worker_names=coingecko-adapter,frankfurter-adapter")) {
    fail(`${target} dry-run resolved unexpected workers`);
  }
  if (!text.includes("mutation=0")) fail(`${target} dry-run must declare mutation=0`);
  assertNoDeployMutation(result, `${target} dry-run`);
}

const prodApply = spawnDeploy(["production", "--apply"]);
if (prodApply.status === 0) fail("production apply must be fail-closed today");
if (!body(prodApply).includes("COMMERCIAL_PROVIDER_NOT_CLEARED")) {
  fail("production apply must fail with commercial provider blocker");
}
if (!body(prodApply).includes("mutation=0")) fail("blocked production apply must declare mutation=0");
assertNoDeployMutation(prodApply, "blocked production apply");

const previewApply = spawnDeploy(["preview", "--apply", `--confirm=${deploy.PREVIEW_CONFIRM}`]);
if (previewApply.status === 0) fail("preview apply must require explicit allow env");
if (!body(previewApply).includes(`${deploy.PREVIEW_ALLOW_ENV} must be YES`)) {
  fail("preview apply missing explicit allow-env guard");
}
assertNoDeployMutation(previewApply, "blocked preview apply");

const cgToml = read("workers/coingecko-adapter/wrangler.toml");
const ffToml = read("workers/frankfurter-adapter/wrangler.toml");
if (!/crons\s*=\s*\["\*\/10 \* \* \* \*"\]/.test(cgToml)) fail("CoinGecko cron must remain */10");
if (!/crons\s*=\s*\["0 \* \* \* \*"\]/.test(ffToml)) fail("Frankfurter cron must remain hourly");
for (const [label, toml] of [["coingecko", cgToml], ["frankfurter", ffToml]]) {
  if (!/\[env\.production\][\s\S]*?ALLOW_MANUAL_TICK\s*=\s*"false"/.test(toml)) {
    fail(`${label} production manual tick must remain false`);
  }
  if (!/\[env\.preview\][\s\S]*?ALLOW_MANUAL_TICK\s*=\s*"true"/.test(toml)) {
    fail(`${label} preview manual tick must remain true`);
  }
}

const prodCgHealth = {
  ok: true,
  adapterId: "coingecko",
  service: "coingecko-adapter",
  role: "fx",
  credentialsConfigured: true,
  ingestConfigured: true,
  manualTickEnabled: false,
};
const prodFfHealth = {
  ok: true,
  adapterId: "frankfurter",
  service: "frankfurter-adapter",
  role: "fx",
  credentialsConfigured: true,
  ingestConfigured: true,
  manualTickEnabled: false,
};
if (health.validateHealth("coingecko", "production", prodCgHealth).length) {
  fail("valid production CoinGecko health fixture rejected");
}
if (health.validateHealth("frankfurter", "production", prodFfHealth).length) {
  fail("valid production Frankfurter health fixture rejected");
}
const badCg = { ...prodCgHealth, credentialsConfigured: false };
if (!health.validateHealth("coingecko", "production", badCg).some((x) => x.includes("credentialsConfigured"))) {
  fail("production health must reject missing CoinGecko credentials");
}
const badIngest = { ...prodFfHealth, ingestConfigured: false };
if (!health.validateHealth("frankfurter", "production", badIngest).some((x) => x.includes("ingestConfigured"))) {
  fail("production health must reject missing Nest ingest configuration");
}

const versionFixture = {
  coingecko: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  frankfurter: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
};
try {
  rollback.requireVersionShape(versionFixture);
} catch (error) {
  fail(`valid rollback version ids rejected: ${error.message}`);
}
try {
  rollback.validateApplyGate(
    "production",
    { confirm: rollback.PROD_CONFIRM },
    {
      [rollback.PROD_ALLOW_ENV]: "YES",
      CLOUDFLARE_API_TOKEN: "present",
      CLOUDFLARE_ACCOUNT_ID: "present",
    },
  );
} catch (error) {
  fail(`valid production rollback gate fixture rejected: ${error.message}`);
}
let blockedRollback = false;
try {
  rollback.validateApplyGate("production", { confirm: rollback.PROD_CONFIRM }, {});
} catch {
  blockedRollback = true;
}
if (!blockedRollback) fail("production rollback must reject missing explicit allow env/credentials");

const existingDeployWorkflow = read(".github/workflows/deploy-cloudflare.yml");
const workerSetBlock = existingDeployWorkflow.slice(
  existingDeployWorkflow.indexOf("worker_set:"),
  existingDeployWorkflow.indexOf("concurrency:"),
);
if (/-\s*phase1\b/.test(workerSetBlock)) fail("general deploy workflow must not expose phase1");
if (/-\s*p0-fx\b/.test(workerSetBlock)) {
  fail("general deploy workflow must not expose p0-fx while commercial provider is blocked");
}

const ciWorkflow = read(".github/workflows/p0-fx-release-hardening.yml");
if (/workflow_dispatch:/.test(ciWorkflow)) fail("P0-FX hardening workflow must not expose a deploy dispatch");
if (!/p0-fx-release-path\.cjs/.test(ciWorkflow)) fail("P0-FX hardening workflow must run the release verifier");
if (/CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID/.test(ciWorkflow)) {
  fail("P0-FX hardening CI must not request Cloudflare secrets");
}

const deploySource = read(deployRel);
for (const forbidden of ["amazon-adapter", "yahoo-jp-adapter", "chain-watchers", "chain-sweeper", "marketing-capi-dispatcher"] ) {
  if (deploySource.includes(`\"${forbidden}\"`) || deploySource.includes(`'${forbidden}'`)) {
    fail(`dedicated FX deploy source must not name forbidden worker ${forbidden}`);
  }
}

if (fails.length) {
  console.error("[verify:p0-fx-release-path] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:p0-fx-release-path] PASS — exact-two FX set · dry-run default · production commercial fail-closed · health/rollback guards",
);

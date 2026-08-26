#!/usr/bin/env node
/**
 * P0-C FX Worker release path.
 *
 * Safety contract:
 * - exact worker set only: coingecko-adapter + frankfurter-adapter
 * - default is dry-run / mutation=0
 * - preview apply needs an explicit env + confirmation
 * - production apply is intentionally blocked until the commercial CoinGecko
 *   provider/auth path is independently cleared and implemented
 * - this script never deploys phase1 and never touches eBay or web/ops
 */
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const {
  root,
  readWorkersManifest,
  resolveWranglerEnv,
  requireCloudflareCreds,
} = require("./lib/env.cjs");

const FX_WORKER_SET = "p0-fx";
const FX_WORKERS = Object.freeze(["coingecko-adapter", "frankfurter-adapter"]);
const PREVIEW_ALLOW_ENV = "ALLOW_PREVIEW_P0_FX_DEPLOY";
const PREVIEW_CONFIRM = "APPLY_PREVIEW_P0_FX_WORKERS";
const COMMERCIAL_BLOCK = "COMMERCIAL_PROVIDER_NOT_CLEARED";

function parseCli(argv) {
  const flags = new Set();
  const kv = {};
  const positional = [];
  for (const arg of argv.slice(2)) {
    if (arg === "--apply" || arg === "--dry-run" || arg === "--plan" || arg === "--check-surface") {
      flags.add(arg);
      continue;
    }
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq > 2) kv[arg.slice(2, eq)] = arg.slice(eq + 1);
      else flags.add(arg);
      continue;
    }
    positional.push(arg);
  }
  return { flags, kv, positional };
}

function isProduction(target) {
  return target === "production" || target === "prod";
}

function normalizeTarget(target) {
  if (target === "staging") return "preview";
  if (target === "prod") return "production";
  if (target === "preview" || target === "production") return target;
  throw new Error(`invalid target ${target}`);
}

function isDryRun(flags) {
  return !flags.has("--apply");
}

function exactFxWorkers(manifest) {
  const current = manifest[FX_WORKER_SET];
  if (!Array.isArray(current)) {
    throw new Error(`${FX_WORKER_SET} missing from workers manifest`);
  }
  if (JSON.stringify(current) !== JSON.stringify(FX_WORKERS)) {
    throw new Error(`${FX_WORKER_SET} must be exactly [${FX_WORKERS.join(",")}]`);
  }
  return current.slice();
}

function assertSurfaceAllowed(surface) {
  if (surface === "workers") return { ok: true };
  return { ok: false, reason: `${FX_WORKER_SET} requires surface=workers (got ${surface || "missing"})` };
}

function readCron(worker) {
  const toml = fs.readFileSync(path.join(root, "workers", worker, "wrangler.toml"), "utf8");
  const match = toml.match(/^\s*crons\s*=\s*\[([^\]]*)\]/m);
  return match ? [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
}

function buildPlan(target, manifest) {
  const normalized = normalizeTarget(target);
  const workers = exactFxWorkers(manifest);
  return {
    target: normalized,
    environment: resolveWranglerEnv(normalized),
    workerSet: FX_WORKER_SET,
    workers,
    crons: Object.fromEntries(workers.map((worker) => [worker, readCron(worker)])),
    productionApplyAllowed: false,
  };
}

function formatPlan(plan) {
  return [
    `target=${plan.target}`,
    `worker_set=${plan.workerSet}`,
    `worker_count=${plan.workers.length}`,
    `worker_names=${plan.workers.join(",")}`,
    `environment=${plan.environment}`,
    `coingecko_cron=${plan.crons["coingecko-adapter"].join(",")}`,
    `frankfurter_cron=${plan.crons["frankfurter-adapter"].join(",")}`,
    `production_apply_allowed=${plan.productionApplyAllowed ? "YES" : "NO"}`,
    `commercial_provider_status=${COMMERCIAL_BLOCK}`,
  ].join("\n");
}

function deployPreview(plan) {
  requireCloudflareCreds();
  for (const worker of plan.workers) {
    const dir = path.join(root, "workers", worker);
    const result = spawnSync(
      "pnpm",
      ["exec", "wrangler", "deploy", "--config", "wrangler.toml", `--env=${plan.environment}`],
      { cwd: dir, stdio: "inherit", shell: true },
    );
    if (result.status !== 0) process.exit(result.status || 1);
  }
}

function fail(message, code = 1) {
  console.error(`[cf:fx-workers] FAIL: ${message}`);
  process.exit(code);
}

function main() {
  const parsed = parseCli(process.argv);
  if (parsed.flags.has("--check-surface")) {
    const surface = parsed.positional[0] || "";
    const checked = assertSurfaceAllowed(surface);
    if (!checked.ok) fail(checked.reason);
    console.log(`[cf:fx-workers] surface-guard PASS · worker_set=${FX_WORKER_SET} · surface=${surface}`);
    return;
  }

  const targetArg = parsed.positional[0] || "preview";
  let plan;
  try {
    plan = buildPlan(targetArg, readWorkersManifest());
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  console.log(formatPlan(plan));

  if (isDryRun(parsed.flags)) {
    console.log("mutation=0");
    console.log("[cf:fx-workers] DRY-RUN · mutation=0");
    return;
  }

  if (isProduction(plan.target)) {
    console.log("mutation=0");
    fail(`${COMMERCIAL_BLOCK}: current CoinGecko implementation uses Demo auth and is not cleared for commercial production`);
  }

  const confirm = parsed.kv.confirm || "";
  if (process.env[PREVIEW_ALLOW_ENV] !== "YES") {
    console.log("mutation=0");
    fail(`${PREVIEW_ALLOW_ENV} must be YES for preview apply`);
  }
  if (confirm !== PREVIEW_CONFIRM) {
    console.log("mutation=0");
    fail(`confirm must be ${PREVIEW_CONFIRM}`);
  }

  deployPreview(plan);
  console.log(`[cf:fx-workers] PASS · target=preview · worker_set=${FX_WORKER_SET} · count=${plan.workers.length}`);
}

const exported = {
  FX_WORKER_SET,
  FX_WORKERS,
  PREVIEW_ALLOW_ENV,
  PREVIEW_CONFIRM,
  COMMERCIAL_BLOCK,
  parseCli,
  isDryRun,
  isProduction,
  normalizeTarget,
  exactFxWorkers,
  assertSurfaceAllowed,
  readCron,
  buildPlan,
  formatPlan,
};

if (require.main === module) main();
else module.exports = exported;

#!/usr/bin/env node
/**
 * P0-C FX Worker rollback guard.
 * Default is a plan only. Apply requires explicit version ids for BOTH FX workers.
 * Both targets are proven to exist before the first rollback mutation.
 */
"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { root, resolveWranglerEnv } = require("./lib/env.cjs");

const WORKERS = Object.freeze([
  { key: "coingecko", name: "coingecko-adapter", dir: "workers/coingecko-adapter" },
  { key: "frankfurter", name: "frankfurter-adapter", dir: "workers/frankfurter-adapter" },
]);
const PROD_ALLOW_ENV = "ALLOW_PRODUCTION_P0_FX_ROLLBACK";
const PROD_CONFIRM = "ROLLBACK_PRODUCTION_P0_FX_WORKERS";
const PREVIEW_ALLOW_ENV = "ALLOW_PREVIEW_P0_FX_ROLLBACK";
const PREVIEW_CONFIRM = "ROLLBACK_PREVIEW_P0_FX_WORKERS";

function parseCli(argv) {
  const flags = new Set();
  const kv = {};
  const positional = [];
  for (const arg of argv.slice(2)) {
    if (arg === "--apply" || arg === "--dry-run" || arg === "--plan") {
      flags.add(arg);
      continue;
    }
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq > 2) kv[arg.slice(2, eq)] = arg.slice(eq + 1);
      continue;
    }
    positional.push(arg);
  }
  return { flags, kv, positional };
}

function normalizeTarget(target) {
  if (target === "prod") return "production";
  if (target === "staging") return "preview";
  if (target === "production" || target === "preview") return target;
  throw new Error(`invalid target ${target}`);
}

function isDryRun(flags) {
  return !flags.has("--apply");
}

function requestedVersions(kv) {
  return {
    coingecko: kv["coingecko-version"] || "",
    frankfurter: kv["frankfurter-version"] || "",
  };
}

function requireVersionShape(versions) {
  for (const worker of WORKERS) {
    const id = versions[worker.key];
    if (!id || !/^[0-9a-f-]{16,}$/i.test(id)) {
      throw new Error(`${worker.key} explicit version id is required`);
    }
  }
}

function wrangler(worker, target, args) {
  return spawnSync(
    "pnpm",
    ["exec", "wrangler", ...args, "--config", "wrangler.toml", `--env=${resolveWranglerEnv(target)}`],
    {
      cwd: path.join(root, worker.dir),
      encoding: "utf8",
      env: process.env,
      shell: true,
      timeout: 120_000,
    },
  );
}

function versionRows(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.versions)) return parsed.versions;
  if (parsed && Array.isArray(parsed.items)) return parsed.items;
  return [];
}

function rowId(row) {
  if (typeof row === "string") return row;
  return row?.id || row?.version_id || row?.versionId || null;
}

function listVersions(worker, target) {
  const result = wrangler(worker, target, ["versions", "list", "--json"]);
  if (result.status !== 0) {
    throw new Error(`${worker.name} versions list failed`);
  }
  let parsed;
  try {
    parsed = JSON.parse(result.stdout || "[]");
  } catch {
    throw new Error(`${worker.name} versions list was not JSON`);
  }
  return versionRows(parsed).map(rowId).filter(Boolean);
}

function assertVersionsExist(target, versions) {
  const available = {};
  for (const worker of WORKERS) {
    available[worker.key] = listVersions(worker, target);
  }
  const missing = WORKERS.filter((worker) => !available[worker.key].includes(versions[worker.key]));
  if (missing.length) {
    throw new Error(`rollback target version missing for ${missing.map((w) => w.name).join(",")}`);
  }
}

function rollbackOne(worker, target, versionId) {
  const result = wrangler(worker, target, [
    "rollback",
    versionId,
    "--message",
    `P0-C FX rollback ${worker.name}`,
  ]);
  if (result.status !== 0) {
    throw new Error(`${worker.name} rollback failed`);
  }
}

function validateApplyGate(target, kv, env) {
  const confirm = kv.confirm || "";
  if (target === "production") {
    if (env[PROD_ALLOW_ENV] !== "YES") throw new Error(`${PROD_ALLOW_ENV} must be YES`);
    if (confirm !== PROD_CONFIRM) throw new Error(`confirm must be ${PROD_CONFIRM}`);
  } else {
    if (env[PREVIEW_ALLOW_ENV] !== "YES") throw new Error(`${PREVIEW_ALLOW_ENV} must be YES`);
    if (confirm !== PREVIEW_CONFIRM) throw new Error(`confirm must be ${PREVIEW_CONFIRM}`);
  }
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error("Cloudflare credentials are required for rollback apply");
  }
}

function main() {
  const parsed = parseCli(process.argv);
  let target;
  let versions;
  try {
    target = normalizeTarget(parsed.positional[0] || "preview");
    versions = requestedVersions(parsed.kv);
    requireVersionShape(versions);
  } catch (error) {
    console.error(`[cf:fx-rollback] FAIL: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log(`target=${target}`);
  console.log("worker_set=p0-fx");
  console.log("worker_count=2");
  console.log(`coingecko_version=${versions.coingecko}`);
  console.log(`frankfurter_version=${versions.frankfurter}`);

  if (isDryRun(parsed.flags)) {
    console.log("mutation=0");
    console.log("[cf:fx-rollback] DRY-RUN · explicit version ids recorded · mutation=0");
    return;
  }

  try {
    validateApplyGate(target, parsed.kv, process.env);
    // Atomic preflight: prove BOTH rollback targets exist before mutating either worker.
    assertVersionsExist(target, versions);
    rollbackOne(WORKERS[0], target, versions.coingecko);
    rollbackOne(WORKERS[1], target, versions.frankfurter);
  } catch (error) {
    console.error(`[cf:fx-rollback] FAIL: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log(`[cf:fx-rollback] PASS · target=${target} · exact_workers=2`);
}

const exported = {
  WORKERS,
  PROD_ALLOW_ENV,
  PROD_CONFIRM,
  PREVIEW_ALLOW_ENV,
  PREVIEW_CONFIRM,
  parseCli,
  normalizeTarget,
  isDryRun,
  requestedVersions,
  requireVersionShape,
  versionRows,
  rowId,
  validateApplyGate,
};

if (require.main === module) main();
else module.exports = exported;

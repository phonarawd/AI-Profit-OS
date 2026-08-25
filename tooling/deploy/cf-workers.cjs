#!/usr/bin/env node
/** Deploy Workers from infra/workers.manifest.json (phase0 / phase1 / p0-ebay) */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const {
  root,
  requireRootDomainForProd,
  requireCloudflareCreds,
  readWorkersManifest,
  loadDotEnv,
  isProdTarget,
  resolveWranglerEnv,
} = require("./lib/env.cjs");

const ALLOWED_WORKER_SETS = Object.freeze(["phase0", "phase1", "p0-ebay"]);
const DEFAULT_WORKER_SET = "phase0";
const DEFAULT_TARGET = "preview";
const WORKER_SET_RE = /^[a-z][a-z0-9-]*$/;
const WORKER_NAME_RE = /^[a-z][a-z0-9-]*$/;
const P0_EBAY_ONLY = Object.freeze(["ebay-adapter"]);
const P0_EBAY_FORBIDDEN = Object.freeze([
  "amazon-adapter",
  "yahoo-jp-adapter",
  "pokemontcg-adapter",
  "ygoprodeck-adapter",
  "coingecko-adapter",
  "frankfurter-adapter",
  "marketing-capi-dispatcher",
  "chain-watchers",
  "chain-sweeper",
]);

function parseCli(argv) {
  const flags = new Set();
  const positional = [];
  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--")) flags.add(arg);
    else positional.push(arg);
  }
  return { flags, positional };
}

function isDryRun(flags) {
  return flags.has("--dry-run") || flags.has("--plan");
}

function validateWorkerSetName(name) {
  if (typeof name !== "string" || name.length === 0) {
    return { ok: false, reason: "worker_set is required" };
  }
  if (
    name.includes("..") ||
    name.includes("/") ||
    name.includes("\\") ||
    name.includes(" ") ||
    !WORKER_SET_RE.test(name)
  ) {
    return { ok: false, reason: `invalid worker_set ${name}` };
  }
  if (!ALLOWED_WORKER_SETS.includes(name)) {
    return { ok: false, reason: `unknown worker_set ${name}` };
  }
  return { ok: true };
}

function assertSurfaceAllowed(workerSet, surface) {
  if (typeof surface !== "string" || surface.length === 0) {
    return { ok: false, reason: "surface is required" };
  }
  if (workerSet === "p0-ebay" && surface !== "workers") {
    return {
      ok: false,
      reason: `p0-ebay requires surface=workers (got ${surface})`,
    };
  }
  return { ok: true };
}

function resolveWorkers(manifest, workerSet) {
  const checked = validateWorkerSetName(workerSet);
  if (!checked.ok) {
    const err = new Error(checked.reason);
    err.code = "INVALID_WORKER_SET";
    throw err;
  }
  const list = manifest[workerSet];
  if (!Array.isArray(list) || list.length === 0) {
    const err = new Error(`unknown worker_set ${workerSet}`);
    err.code = "INVALID_WORKER_SET";
    throw err;
  }
  for (const name of list) {
    if (
      typeof name !== "string" ||
      name.includes("..") ||
      name.includes("/") ||
      name.includes("\\") ||
      !WORKER_NAME_RE.test(name)
    ) {
      const err = new Error(`invalid worker name ${name}`);
      err.code = "INVALID_WORKER_NAME";
      throw err;
    }
  }
  if (workerSet === "p0-ebay") {
    const exact =
      list.length === P0_EBAY_ONLY.length &&
      P0_EBAY_ONLY.every((name, i) => list[i] === name);
    if (!exact) {
      const err = new Error("p0-ebay must be exactly [ebay-adapter]");
      err.code = "P0_EBAY_EXACTNESS";
      throw err;
    }
    for (const banned of P0_EBAY_FORBIDDEN) {
      if (list.includes(banned)) {
        const err = new Error(`p0-ebay must not include ${banned}`);
        err.code = "P0_EBAY_FORBIDDEN";
        throw err;
      }
    }
  }
  return list.slice();
}

function planTargetLabel(target) {
  return isProdTarget(target) ? "production" : "preview";
}

function formatPlan({ target, workerSet, workers, environment }) {
  return [
    `target=${target}`,
    `worker_set=${workerSet}`,
    `worker_count=${workers.length}`,
    `worker_names=${workers.join(",")}`,
    `environment=${environment}`,
  ].join("\n");
}

function buildPlan(manifest, target, workerSet) {
  const workers = resolveWorkers(manifest, workerSet);
  const environment = resolveWranglerEnv(target);
  return {
    target: planTargetLabel(target),
    workerSet,
    workers,
    workerCount: workers.length,
    environment,
    text: formatPlan({
      target: planTargetLabel(target),
      workerSet,
      workers,
      environment,
    }),
  };
}

function extractTomlSection(toml, header) {
  const re = new RegExp(
    `^\\[${header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\s*\\r?\\n([\\s\\S]*?)(?=^\\[|\\s*$)`,
    "m",
  );
  const match = toml.match(re);
  return match ? match[1] : "";
}

function parseTomlName(section, fallback) {
  const match = section.match(/^\s*name\s*=\s*"([^"]+)"/m);
  return match ? match[1] : fallback;
}

function parseTomlCrons(section) {
  const match = section.match(/^\s*crons\s*=\s*\[([^\]]*)\]/m);
  if (!match) return null;
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function resolveWranglerWorkerName(toml, envName) {
  const envSection = extractTomlSection(toml, `env.${envName}`);
  const envNameValue = parseTomlName(envSection, null);
  if (envNameValue) return envNameValue;
  return parseTomlName(toml, null);
}

function resolveWranglerCrons(toml, envName) {
  const envTriggers = extractTomlSection(toml, `env.${envName}.triggers`);
  const envCrons = parseTomlCrons(envTriggers);
  if (envCrons) return envCrons;
  const topTriggers = extractTomlSection(toml, "triggers");
  return parseTomlCrons(topTriggers) || [];
}

function readEbayWranglerToml() {
  return fs.readFileSync(
    path.join(root, "workers/ebay-adapter/wrangler.toml"),
    "utf8",
  );
}

function fail(message) {
  console.error(`[cf:deploy:workers] FAIL: ${message}`);
  process.exit(1);
}

function main() {
  const { flags, positional } = parseCli(process.argv);

  if (flags.has("--check-surface")) {
    const workerSet = positional[0];
    const surface = positional[1];
    const setOk = validateWorkerSetName(workerSet);
    if (!setOk.ok) fail(setOk.reason);
    const surfaceOk = assertSurfaceAllowed(workerSet, surface);
    if (!surfaceOk.ok) fail(surfaceOk.reason);
    console.log(
      `[cf:deploy:workers] surface-guard PASS · worker_set=${workerSet} · surface=${surface}`,
    );
    return;
  }

  const targetArg = positional[0] || DEFAULT_TARGET;
  const workerSet = positional[1] || DEFAULT_WORKER_SET;
  const dry = isDryRun(flags);

  if (!dry) {
    requireRootDomainForProd(targetArg);
    requireCloudflareCreds();
    loadDotEnv();
  }

  const manifest = readWorkersManifest();
  let plan;
  try {
    plan = buildPlan(manifest, targetArg, workerSet);
  } catch (err) {
    fail(err.message);
  }

  console.log(plan.text);

  if (dry) {
    console.log("[cf:deploy:workers] DRY-RUN · mutation=0");
    return;
  }

  for (const name of plan.workers) {
    const dir = path.join(root, "workers", name);
    console.log(`[cf:deploy:workers] deploying ${name} …`);
    const r = spawnSync(
      "pnpm",
      ["exec", "wrangler", "deploy", "--config", "wrangler.toml", `--env=${plan.environment}`],
      { cwd: dir, stdio: "inherit", shell: true },
    );
    if (r.status !== 0) process.exit(r.status || 1);
  }

  console.log(
    `[cf:deploy:workers] PASS · worker_set=${workerSet} · count=${plan.workers.length}`,
  );
}

const exported = {
  ALLOWED_WORKER_SETS,
  DEFAULT_WORKER_SET,
  P0_EBAY_ONLY,
  P0_EBAY_FORBIDDEN,
  assertSurfaceAllowed,
  buildPlan,
  formatPlan,
  parseCli,
  readEbayWranglerToml,
  resolveWorkers,
  resolveWranglerCrons,
  resolveWranglerWorkerName,
  validateWorkerSetName,
};

if (require.main === module) {
  main();
} else {
  module.exports = exported;
}

#!/usr/bin/env node
/**
 * production ebay-adapter 전용 runtime secret provisioning.
 * 기본 = dry-run · mutation=0.
 * apply 는 `wrangler secret put` 이라 Worker version 을 즉시 publish 한다.
 * .env 로드 금지 · preview 복사 금지 · 값 출력 금지.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const WORKER_DIR = path.join(root, "workers", "ebay-adapter");

const SECRET_NAMES = Object.freeze([
  "EBAY_CLIENT_ID",
  "EBAY_CLIENT_SECRET",
  "NEST_ADAPTER_INGEST_URL",
  "ADAPTER_INGEST_TOKEN",
]);

const PRODUCTION_WORKER = "ebay-adapter";
const WRANGLER_ENV = "production";
const ALLOWED_TARGET = "production";
const ALLOWED_WORKER_SET = "p0-ebay";
const APPLY_ALLOW_ENV = "ALLOW_PRODUCTION_EBAY_SECRET_PUT";
const APPLY_CONFIRM = "APPLY_PRODUCTION_EBAY_ADAPTER_SECRETS";
const FORBIDDEN_WORKERS = Object.freeze([
  "ebay-adapter-preview",
  "amazon-adapter",
  "yahoo-jp-adapter",
  "pokemontcg-adapter",
  "ygoprodeck-adapter",
  "coingecko-adapter",
  "frankfurter-adapter",
  "push-dispatcher",
  "marketing-capi-dispatcher",
  "chain-watchers",
  "chain-sweeper",
]);

function parseCli(argv) {
  const flags = new Set();
  const kv = {};
  const positional = [];
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run" || arg === "--plan") {
      flags.add("--dry-run");
      continue;
    }
    if (arg === "--apply") {
      flags.add("--apply");
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

function isDryRun(flags) {
  if (flags.has("--dry-run") || flags.has("--plan")) return true;
  if (flags.has("--apply")) return false;
  return true;
}

function validateTarget(target) {
  if (typeof target !== "string" || target.length === 0) {
    return { ok: false, reason: "target is required" };
  }
  if (target === "preview" || target === "staging") {
    return {
      ok: false,
      reason: "preview/staging secret provision is forbidden (no preview copy)",
    };
  }
  if (target !== "production" && target !== "prod") {
    return { ok: false, reason: `target must be production (got ${target})` };
  }
  return { ok: true };
}

function validateWorker(worker) {
  if (typeof worker !== "string" || worker.length === 0) {
    return { ok: false, reason: "worker is required" };
  }
  if (FORBIDDEN_WORKERS.includes(worker) || worker !== PRODUCTION_WORKER) {
    return { ok: false, reason: `worker must be ${PRODUCTION_WORKER}` };
  }
  return { ok: true };
}

function validateWorkerSet(workerSet) {
  if (typeof workerSet !== "string" || workerSet.length === 0) {
    return { ok: false, reason: "worker_set is required" };
  }
  if (workerSet !== ALLOWED_WORKER_SET) {
    return { ok: false, reason: `worker_set must be ${ALLOWED_WORKER_SET}` };
  }
  return { ok: true };
}

function secretPresent(env, name) {
  const raw = env[name];
  return typeof raw === "string" && raw.trim().length > 0;
}

function presenceMap(env) {
  const out = {};
  for (const name of SECRET_NAMES) out[name] = secretPresent(env, name);
  return out;
}

function collectPresentValues(env) {
  const values = [];
  for (const name of SECRET_NAMES) {
    if (secretPresent(env, name)) values.push(env[name]);
  }
  return values;
}

function redact(text, secretValues) {
  let out = String(text || "");
  for (const value of secretValues) {
    if (typeof value === "string" && value.length > 0) {
      out = out.split(value).join("[REDACTED]");
    }
  }
  return out;
}

function fail(message) {
  console.error(`[cf:ebay-secrets] FAIL: ${message}`);
  process.exit(1);
}

function formatPlan(presence) {
  const map = presence || {};
  const lines = [
    "target=production",
    `worker_name=${PRODUCTION_WORKER}`,
    `worker_set=${ALLOWED_WORKER_SET}`,
    `wrangler_env=${WRANGLER_ENV}`,
    `secret_names=${SECRET_NAMES.join(",")}`,
    "secret_count=4",
    "preview_copy=0",
  ];
  for (const name of SECRET_NAMES) {
    if (typeof map[name] === "boolean") {
      lines.push(`${name}_PRESENT=${map[name] ? "YES" : "NO"}`);
    }
  }
  return lines.join("\n");
}

function resolveWranglerJs() {
  const candidate = path.join(root, "node_modules", "wrangler", "bin", "wrangler.js");
  return fs.existsSync(candidate) ? candidate : null;
}

function spawnWrangler(args, opts) {
  const bin = resolveWranglerJs();
  if (!bin) {
    return { status: 1, stdout: "", stderr: "wrangler binary not installed" };
  }
  return spawnSync(process.execPath, [bin, ...args], {
    cwd: WORKER_DIR,
    encoding: "utf8",
    env: { ...process.env, ...(opts.env || {}) },
    input: opts.input,
    timeout: opts.timeout || 120000,
    windowsHide: true,
  });
}

function putLooksSuccessful(put) {
  const body = `${put.stdout || ""}\n${put.stderr || ""}`;
  return /uploaded secret|success! uploaded|creating the secret/i.test(body);
}

function wranglerNameArgs() {
  return ["--config", "wrangler.toml", "--env", WRANGLER_ENV, "--name", PRODUCTION_WORKER];
}

function summarizeWranglerError(result, secretValues) {
  const raw = redact(`${result.stderr || ""}\n${result.stdout || ""}`, secretValues);
  const line =
    raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find((s) => s.length > 0) || "";
  return line.slice(0, 180);
}

function productionWorkerExists(env, secretValues) {
  const result = spawnWrangler(
    ["versions", "list", ...wranglerNameArgs(), "--json"],
    { env },
  );
  if (result.status !== 0) {
    return {
      ok: false,
      reason: "production worker versions list failed",
      detail: summarizeWranglerError(result, secretValues),
    };
  }
  try {
    const parsed = JSON.parse(result.stdout || "[]");
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { ok: false, reason: "production worker has no versions", detail: "" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "production worker versions JSON parse failed", detail: "" };
  }
}

function listProductionSecretNames(env, secretValues) {
  const result = spawnWrangler(
    ["secret", "list", ...wranglerNameArgs(), "--format", "json"],
    { env },
  );
  const stdout = redact(result.stdout, secretValues);
  const stderr = redact(result.stderr, secretValues);
  if (result.status !== 0) {
    const exists = productionWorkerExists(env, secretValues);
    if (exists.ok) {
      return {
        ok: true,
        names: [],
        firstBind: true,
        stdout,
        stderr,
      };
    }
    return {
      ok: false,
      names: [],
      reason:
        "production worker secret list failed and worker versions were not proven",
      detail: [summarizeWranglerError(result, secretValues), exists.reason, exists.detail]
        .filter(Boolean)
        .join(" | "),
      stdout,
      stderr,
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(result.stdout || "[]");
  } catch {
    return { ok: false, names: [], reason: "secret list JSON parse failed", stdout, stderr };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, names: [], reason: "secret list is not an array", stdout, stderr };
  }
  const names = [];
  for (const item of parsed) {
    if (item && typeof item.name === "string") names.push(item.name);
  }
  return { ok: true, names, firstBind: false, stdout, stderr };
}

function putSecret(name, value, env, secretValues) {
  const result = spawnWrangler(
    ["secret", "put", name, ...wranglerNameArgs()],
    { env, input: `${value}\n`, timeout: 120000 },
  );
  return {
    status: result.status,
    stdout: redact(result.stdout, secretValues),
    stderr: redact(result.stderr, secretValues),
  };
}

function main(argv, env) {
  const parsed = parseCli(argv);
  const dry = isDryRun(parsed.flags);
  const target = parsed.kv.target || parsed.positional[0] || ALLOWED_TARGET;
  const worker = parsed.kv.worker || PRODUCTION_WORKER;
  const workerSet = parsed.kv["worker-set"] || parsed.kv.worker_set || ALLOWED_WORKER_SET;
  const confirm = parsed.kv.confirm || "";

  const targetOk = validateTarget(target);
  if (!targetOk.ok) fail(targetOk.reason);
  if (!dry) {
    const workerOk = validateWorker(worker);
    if (!workerOk.ok) fail(workerOk.reason);
    const setOk = validateWorkerSet(workerSet);
    if (!setOk.ok) fail(setOk.reason);
  } else if (parsed.kv.worker || parsed.kv["worker-set"] || parsed.kv.worker_set) {
    const workerOk = validateWorker(worker);
    if (!workerOk.ok) fail(workerOk.reason);
    const setOk = validateWorkerSet(workerSet);
    if (!setOk.ok) fail(setOk.reason);
  }

  const presence = presenceMap(env);
  console.log(formatPlan(presence));

  if (dry) {
    console.log("mutation=0");
    console.log("[cf:ebay-secrets] DRY-RUN · mutation=0");
    return;
  }

  if (env[APPLY_ALLOW_ENV] !== "YES") {
    console.log("mutation=0");
    fail(`${APPLY_ALLOW_ENV} must be YES for apply`);
  }
  if (confirm !== APPLY_CONFIRM) {
    console.log("mutation=0");
    fail(`confirm must be ${APPLY_CONFIRM}`);
  }

  const missing = SECRET_NAMES.filter((name) => !presence[name]);
  if (missing.length) {
    console.log("mutation=0");
    fail(`missing env ${missing.join(",")} (value not printed)`);
  }

  if (!secretPresent(env, "CLOUDFLARE_API_TOKEN")) {
    console.log("mutation=0");
    fail("CLOUDFLARE_API_TOKEN missing");
  }

  const secretValues = collectPresentValues(env);
  const listed = listProductionSecretNames(env, secretValues);
  if (!listed.ok) {
    console.log("mutation=0");
    if (listed.detail) console.log(`secret_list_detail=${listed.detail}`);
    fail(listed.reason);
  }
  console.log(`existing_secret_name_count=${listed.names.length}`);
  console.log(`first_bind=${listed.firstBind ? "YES" : "NO"}`);
  for (const name of SECRET_NAMES) {
    console.log(`${name}_ALREADY_BOUND=${listed.names.includes(name) ? "YES" : "NO"}`);
  }

  for (const name of SECRET_NAMES) {
    const put = putSecret(name, env[name], env, secretValues);
    if (put.status !== 0 || !putLooksSuccessful(put)) {
      const detail = summarizeWranglerError(put, secretValues);
      if (detail) console.log(`${name}_PUT_DETAIL=${detail}`);
      fail(`wrangler secret put failed for ${name} (value not printed)`);
    }
    console.log(`${name}_PUT=YES`);
  }
  console.log(
    `[cf:ebay-secrets] PASS · worker=${PRODUCTION_WORKER} · env=${WRANGLER_ENV} · names=${SECRET_NAMES.length}`,
  );
}

const exported = {
  SECRET_NAMES,
  PRODUCTION_WORKER,
  WRANGLER_ENV,
  ALLOWED_TARGET,
  ALLOWED_WORKER_SET,
  APPLY_ALLOW_ENV,
  APPLY_CONFIRM,
  FORBIDDEN_WORKERS,
  formatPlan,
  isDryRun,
  parseCli,
  validateTarget,
  validateWorker,
  validateWorkerSet,
  presenceMap,
  redact,
};

if (require.main === module) {
  main(process.argv, process.env);
} else {
  module.exports = exported;
}

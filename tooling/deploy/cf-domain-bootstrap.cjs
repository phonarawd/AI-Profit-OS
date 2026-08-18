#!/usr/bin/env node
/**
 * cf-domain-bootstrap — hiptk.app Phase0 domain prep (Infra §15.0 · ADR-010)
 * Idempotent: Pages projects · bridge Workers · .env · GitHub production secrets
 *
 * Usage: node tooling/deploy/cf-domain-bootstrap.cjs [--dry-run] [--skip-github] [--skip-env] [--skip-bridge]
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { root, loadDotEnv, requireCloudflareCreds } = require("./lib/env.cjs");

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const SKIP_GH = args.has("--skip-github");
const SKIP_ENV = args.has("--skip-env");
const SKIP_BRIDGE = args.has("--skip-bridge");

const manifestPath = path.join(root, "infra/domain.manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

loadDotEnv();
requireCloudflareCreds();

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId =
  process.env.CLOUDFLARE_ACCOUNT_ID || manifest.cloudflare.accountId;

if (!token) {
  console.error("[cf:domain:bootstrap] FAIL: CLOUDFLARE_API_TOKEN required");
  process.exit(1);
}

/** @type {string[]} */
const notes = [];
/** @type {string[]} */
const fails = [];

async function cf(pathname, init = {}) {
  if (DRY) {
    notes.push(`DRY ${init.method || "GET"} ${pathname}`);
    return { success: true, result: null, dry: true };
  }
  const res = await fetch(`https://api.cloudflare.com/client/v4${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  return res.json();
}

async function ensurePagesProject(name) {
  const list = await cf(`/accounts/${accountId}/pages/projects`);
  if (!list.success) {
    fails.push(`pages list: ${JSON.stringify(list.errors)}`);
    return;
  }
  if ((list.result || []).some((p) => p.name === name)) {
    notes.push(`pages project exists: ${name}`);
    return;
  }
  const created = await cf(`/accounts/${accountId}/pages/projects`, {
    method: "POST",
    body: JSON.stringify({ name, production_branch: "main" }),
  });
  if (!created.success) {
    fails.push(`pages create ${name}: ${JSON.stringify(created.errors)}`);
    return;
  }
  notes.push(`pages project created: ${name}`);
}

function patchEnvFile() {
  if (SKIP_ENV) return;
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) {
    notes.push(".env missing — copy from .env.example first");
    return;
  }
  let text = fs.readFileSync(envPath, "utf8");
  const updates = { ...manifest.env, CLOUDFLARE_ACCOUNT_ID: accountId };
  for (const [key, val] of Object.entries(updates)) {
    const re = new RegExp(`^${key}=.*$`, "m");
    text = re.test(text) ? text.replace(re, `${key}=${val}`) : `${text}\n${key}=${val}`;
  }
  if (!DRY) fs.writeFileSync(envPath, text);
  notes.push("patched .env domain hosts + CLOUDFLARE_ACCOUNT_ID");
}

function syncGithubSecrets() {
  if (SKIP_GH) return;
  const repo = manifest.github.repository;
  const envName = manifest.github.environment;

  if (DRY) {
    notes.push(`DRY github environment ${envName} + secrets`);
    return;
  }

  const envPut = spawnSync(
    "gh",
    ["api", `repos/${repo}/environments/${envName}`, "-X", "PUT", "--input", "-"],
    { cwd: root, encoding: "utf8", input: JSON.stringify({ wait_timer: 0 }) }
  );
  if (envPut.status !== 0) {
    fails.push(`github environment: ${envPut.stderr || envPut.stdout}`);
    return;
  }
  notes.push(`github environment ready: ${envName}`);

  const secretValues = {
    ROOT_DOMAIN: manifest.env.ROOT_DOMAIN,
    APP_HOST: manifest.env.APP_HOST,
    OPS_HOST: manifest.env.OPS_HOST,
    API_HOST: manifest.env.API_HOST,
    CLOUDFLARE_ACCOUNT_ID: accountId,
    CLOUDFLARE_API_TOKEN: token,
  };

  for (const key of manifest.github.secretKeys) {
    const val = secretValues[key];
    if (!val) {
      fails.push(`github secret missing value: ${key}`);
      continue;
    }
    const set = spawnSync(
      "gh",
      ["secret", "set", key, "--env", envName, "--repo", repo, "--body", val],
      { cwd: root, encoding: "utf8" }
    );
    if (set.status !== 0) fails.push(`github secret ${key}: ${set.stderr || set.stdout}`);
    else notes.push(`github secret set: ${key}`);
  }
}

function deployBridgeWorkers() {
  if (SKIP_BRIDGE) return;
  if (DRY) {
    notes.push("DRY cf:domain:bridge");
    return;
  }
  const r = spawnSync("node", [path.join(__dirname, "cf-domain-bridge.cjs")], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) {
    fails.push("cf:domain:bridge failed");
    return;
  }
  notes.push("bridge workers deployed (custom_domain DNS auto)");
}

async function main() {
  console.log(
    `[cf:domain:bootstrap] start · root=${manifest.rootDomain} · dry=${DRY}`
  );

  for (const cfg of Object.values(manifest.pages)) {
    await ensurePagesProject(cfg.project);
  }

  patchEnvFile();
  syncGithubSecrets();
  deployBridgeWorkers();

  console.log("\n[cf:domain:bootstrap] notes:");
  for (const n of notes) console.log(`  · ${n}`);

  if (fails.length) {
    console.error("\n[cf:domain:bootstrap] FAIL:");
    for (const f of fails) console.error(`  · ${f}`);
    process.exit(1);
  }

  console.log("\n[cf:domain:bootstrap] PASS");
}

main().catch((e) => {
  console.error("[cf:domain:bootstrap] fatal:", e);
  process.exit(1);
});

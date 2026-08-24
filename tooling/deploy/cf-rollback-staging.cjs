#!/usr/bin/env node
/**
 * REL-602 staging rollback — preview Workers only.
 * Production names, custom domains, DB/migrations and ledger are out of scope.
 *
 * Usage:
 *   node tooling/deploy/cf-rollback-staging.cjs staging <webVersionId> <opsVersionId>
 *
 * Exit 2 = blocked (missing creds). Exit 1 = refused/failure.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const {
  root,
  isProdTarget,
  resolveWranglerEnv,
  requireCloudflareCreds,
} = require("./lib/env.cjs");

const ALLOWED = {
  web: {
    name: "ai-profit-web-preview",
    config: path.join(root, "infra/web/wrangler.toml"),
  },
  ops: {
    name: "ai-profit-ops-preview",
    config: path.join(root, "infra/ops/wrangler.toml"),
  },
};

const FORBIDDEN_NAMES = [
  "ai-profit-web",
  "ai-profit-ops",
  "hiptk-web-proxy",
  "hiptk-ops-proxy",
];

const target = process.argv[2] || "staging";
const webVersion = process.argv[3] || "";
const opsVersion = process.argv[4] || "";

if (!webVersion || !opsVersion) {
  console.error("[cf:rollback:staging] FAIL: explicit web/ops version ids are required");
  process.exit(1);
}
if (isProdTarget(target)) {
  console.error("[cf:rollback:staging] FAIL: production target forbidden");
  process.exit(1);
}
const envFlag = resolveWranglerEnv(target);
if (envFlag !== "preview") {
  console.error("[cf:rollback:staging] FAIL: wrangler env must be preview");
  process.exit(1);
}
for (const name of FORBIDDEN_NAMES) {
  if (ALLOWED.web.name === name || ALLOWED.ops.name === name) {
    console.error("[cf:rollback:staging] FAIL: preview allowlist drifted into production name");
    process.exit(1);
  }
}
if (!ALLOWED.web.name.endsWith("-preview") || !ALLOWED.ops.name.endsWith("-preview")) {
  console.error("[cf:rollback:staging] FAIL: worker names must be *-preview");
  process.exit(1);
}

const creds = requireCloudflareCreds();
if (!creds.hasToken) {
  console.error("[cf:rollback:staging] BLOCKED: CLOUDFLARE_API_TOKEN missing");
  process.exit(2);
}

function wrangler(args) {
  return spawnSync("pnpm", ["exec", "wrangler", ...args], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
}

function rollbackOne(slot, versionId) {
  const cfg = ALLOWED[slot];
  const list = wrangler([
    "versions",
    "list",
    "--config",
    cfg.config,
    "--env",
    "preview",
    "--name",
    cfg.name,
    "--json",
  ]);
  if (list.status !== 0) {
    console.error("[cf:rollback:staging] FAIL versions list " + cfg.name);
    console.error(list.stderr || list.stdout);
    process.exit(list.status || 1);
  }
  let versions;
  try {
    versions = JSON.parse(list.stdout || "[]");
  } catch {
    console.error("[cf:rollback:staging] FAIL: versions list was not JSON for " + cfg.name);
    process.exit(1);
  }
  if (!Array.isArray(versions) || !versions.some((v) => (v.id || v.version_id) === versionId)) {
    console.error("[cf:rollback:staging] FAIL: target version not present for " + cfg.name + ": " + versionId);
    process.exit(1);
  }

  const rb = wrangler([
    "rollback",
    versionId,
    "--config",
    cfg.config,
    "--env",
    "preview",
    "--name",
    cfg.name,
    "--message",
    "REL-602 staging practice",
  ]);
  if (rb.status !== 0) {
    console.error("[cf:rollback:staging] FAIL rollback " + cfg.name);
    console.error(rb.stderr || rb.stdout);
    process.exit(rb.status || 1);
  }
  console.log("[cf:rollback:staging] rollback " + cfg.name + " -> " + versionId + " OK");
}

rollbackOne("web", webVersion);
rollbackOne("ops", opsVersion);
console.log("[cf:rollback:staging] PASS · preview workers only");

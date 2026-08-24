#!/usr/bin/env node
/**
 * REL-602 staging rollback — preview Workers only.
 * Production names, custom domains, DB/migrations and ledger are out of scope.
 *
 * Usage:
 *   node tooling/deploy/cf-rollback-staging.cjs staging <webVersionId> <opsVersionId>
 *
 * Both target versions are preflighted before any rollback mutation, so a missing
 * target cannot leave web/ops in a partial rollback state.
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
const requested = {
  web: process.argv[3] || "",
  ops: process.argv[4] || "",
};

if (!requested.web || !requested.ops) {
  console.error("[cf:rollback:staging] FAIL: explicit web/ops version ids are required");
  process.exit(1);
}
if (isProdTarget(target)) {
  console.error("[cf:rollback:staging] FAIL: production target forbidden");
  process.exit(1);
}
if (resolveWranglerEnv(target) !== "preview") {
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

function readVersions(slot) {
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
  try {
    const versions = JSON.parse(list.stdout || "[]");
    if (!Array.isArray(versions)) throw new Error("not an array");
    console.log(
      "[cf:rollback:staging] deployable " + cfg.name + ": " +
        versions.map((v) => v.id || v.version_id).filter(Boolean).join(","),
    );
    return versions;
  } catch (error) {
    console.error("[cf:rollback:staging] FAIL: versions list was not JSON for " + cfg.name);
    console.error(error && error.message ? error.message : String(error));
    process.exit(1);
  }
}

function hasVersion(versions, versionId) {
  return versions.some((v) => (v.id || v.version_id) === versionId);
}

// Atomic preflight: prove both targets exist before mutating either worker.
const webVersions = readVersions("web");
const opsVersions = readVersions("ops");
const missing = [];
if (!hasVersion(webVersions, requested.web)) missing.push(ALLOWED.web.name + ":" + requested.web);
if (!hasVersion(opsVersions, requested.ops)) missing.push(ALLOWED.ops.name + ":" + requested.ops);
if (missing.length) {
  console.error("[cf:rollback:staging] FAIL: target version(s) not present: " + missing.join(", "));
  console.error("[cf:rollback:staging] MUTATION = 0");
  process.exit(1);
}

function rollbackOne(slot) {
  const cfg = ALLOWED[slot];
  const versionId = requested[slot];
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

rollbackOne("web");
rollbackOne("ops");
console.log("[cf:rollback:staging] PASS · preview workers only");

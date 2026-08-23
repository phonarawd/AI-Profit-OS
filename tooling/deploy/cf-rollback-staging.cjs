#!/usr/bin/env node
/**
 * REL-602 staging rollback — preview Workers only.
 * production names / custom domains / pages / vercel / workflow_dispatch production 금지.
 *
 * Usage:
 *   node tooling/deploy/cf-rollback-staging.cjs staging
 *   node tooling/deploy/cf-rollback-staging.cjs staging <webVersionId> <opsVersionId>
 *
 * Exit 2 = blocked (missing creds / no prior version). Exit 1 = refused (production).
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
    console.error("[cf:rollback:staging] FAIL: allowed list drifted into production name");
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
  console.error("[cf:rollback:staging] staging slot control = 0 · rollback not executed");
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
    "--json",
  ]);
  if (list.status !== 0) {
    console.error("[cf:rollback:staging] FAIL versions list " + cfg.name);
    console.error(list.stderr || list.stdout);
    process.exit(list.status || 1);
  }
  console.log("[cf:rollback:staging] versions " + cfg.name);
  console.log(String(list.stdout || "").slice(0, 4000));

  const args = [
    "rollback",
    "--config",
    cfg.config,
    "--env",
    "preview",
    "--name",
    cfg.name,
    "--message",
    "REL-602 staging practice",
  ];
  if (versionId) args.splice(1, 0, versionId);

  const rb = wrangler(args);
  if (rb.status !== 0) {
    console.error("[cf:rollback:staging] FAIL rollback " + cfg.name);
    console.error(rb.stderr || rb.stdout);
    process.exit(rb.status || 1);
  }
  console.log("[cf:rollback:staging] rollback " + cfg.name + " ok");
  console.log(String(rb.stdout || "").slice(0, 2000));
}

rollbackOne("web", webVersion);
rollbackOne("ops", opsVersion);
console.log("[cf:rollback:staging] PASS · preview workers only · production hosts untouched");

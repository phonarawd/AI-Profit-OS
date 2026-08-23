#!/usr/bin/env node
/**
 * Deploy Admin Ops to CF Workers (OpenNext).
 * Filename cf-pages-ops is legacy; actual path is Workers deploy.
 * staging/preview = env preview (ai-profit-ops-preview, REL-600)
 * production = env production (ai-profit-ops)
 */
const { spawnSync } = require("child_process");
const path = require("path");
const {
  root,
  requireRootDomainForProd,
  requireCloudflareCreds,
  mustExist,
  loadDotEnv,
  resolveWranglerEnv,
} = require("./lib/env.cjs");

const target = process.argv[2] || "preview";
requireRootDomainForProd(target);
requireCloudflareCreds();
loadDotEnv();
mustExist("apps/admin/package.json", "apps/admin");

const appDir = path.join(root, "apps/admin");
const configPath = path.join(root, "infra/ops/wrangler.toml");
const envFlag = resolveWranglerEnv(target);
const smokeSlot = envFlag === "production" ? "production" : "staging";

console.log("[cf:deploy:ops] building apps/admin");
const build = spawnSync("pnpm", ["--filter", "@aipo/admin", "build:cf"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
if (build.status !== 0) process.exit(build.status || 1);

const deployArgs = [
  "exec",
  "opennextjs-cloudflare",
  "deploy",
  "--config=" + configPath,
  "--env=" + envFlag,
];

console.log("[cf:deploy:ops] OpenNext Workers deploy target=" + envFlag + " smoke=" + smokeSlot);
const deploy = spawnSync("pnpm", deployArgs, {
  cwd: appDir,
  stdio: "inherit",
  shell: true,
});
if (deploy.status !== 0) process.exit(deploy.status || 1);

console.log("[cf:deploy:ops] origin smoke");
const smoke = spawnSync(
  "node",
  [path.join(__dirname, "cf-origin-smoke.cjs"), "ops", smokeSlot],
  { cwd: root, stdio: "inherit", shell: true }
);
process.exit(smoke.status || 0);

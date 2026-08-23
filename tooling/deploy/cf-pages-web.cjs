#!/usr/bin/env node
/**
 * Deploy user PWA to CF Workers (OpenNext).
 * Filename cf-pages-web is legacy; actual path is Workers deploy.
 * staging/preview = env preview (ai-profit-web-preview, REL-600)
 * production = env production (ai-profit-web)
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
mustExist("apps/web/package.json", "apps/web");

const appDir = path.join(root, "apps/web");
const configPath = path.join(root, "infra/web/wrangler.toml");
const envFlag = resolveWranglerEnv(target);
const smokeSlot = envFlag === "production" ? "production" : "staging";

function spawnEnv() {
  const env = { ...process.env };
  if (process.platform === "win32") {
    const shim = path.join(__dirname, "win32-symlink-shim.cjs");
    const prev = env.NODE_OPTIONS || "";
    env.NODE_OPTIONS = `--require ${shim}${prev ? ` ${prev}` : ""}`;
    env.NODE_ENV = env.NODE_ENV || "production";
  }
  return env;
}

console.log("[cf:deploy:web] building apps/web");
const build = spawnSync("pnpm", ["--filter", "@aipo/web", "build:cf"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: spawnEnv(),
});
if (build.status !== 0) process.exit(build.status || 1);

const deployArgs = [
  "exec",
  "opennextjs-cloudflare",
  "deploy",
  "--config=" + configPath,
  "--env=" + envFlag,
];

console.log("[cf:deploy:web] OpenNext Workers deploy target=" + envFlag + " smoke=" + smokeSlot);
const deploy = spawnSync("pnpm", deployArgs, {
  cwd: appDir,
  stdio: "inherit",
  shell: true,
  env: spawnEnv(),
});
if (deploy.status !== 0) process.exit(deploy.status || 1);

console.log("[cf:deploy:web] origin smoke");
const smoke = spawnSync(
  "node",
  [path.join(__dirname, "cf-origin-smoke.cjs"), "web", smokeSlot],
  { cwd: root, stdio: "inherit", shell: true, env: spawnEnv() }
);
process.exit(smoke.status || 0);

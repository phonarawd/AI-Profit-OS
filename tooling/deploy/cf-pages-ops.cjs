#!/usr/bin/env node
/**
 * Deploy Admin Ops → CF Workers ai-profit-ops (OpenNext)
 * 파일명 cf-pages-ops = 레거시 · 실제는 Workers deploy
 */
const { spawnSync } = require("child_process");
const path = require("path");
const {
  root,
  requireRootDomainForProd,
  requireCloudflareCreds,
  mustExist,
  loadDotEnv,
} = require("./lib/env.cjs");

const target = process.argv[2] || "preview";
requireRootDomainForProd(target);
requireCloudflareCreds();
loadDotEnv();
mustExist("apps/admin/package.json", "apps/admin");

const appDir = path.join(root, "apps/admin");
const configPath = path.join(root, "infra/ops/wrangler.toml");
const envFlag = target === "production" || target === "prod" ? "production" : "preview";

console.log("[cf:deploy:ops] building apps/admin …");
const build = spawnSync("pnpm", ["--filter", "@aipo/admin", "build:cf"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
if (build.status !== 0) process.exit(build.status || 1);

console.log(`[cf:deploy:ops] OpenNext Workers deploy · env=${envFlag} …`);
const deploy = spawnSync(
  "pnpm",
  [
    "exec",
    "opennextjs-cloudflare",
    "deploy",
    `--config=${configPath}`,
    `--env=${envFlag}`,
  ],
  {
    cwd: appDir,
    stdio: "inherit",
    shell: true,
  }
);
process.exit(deploy.status || 0);

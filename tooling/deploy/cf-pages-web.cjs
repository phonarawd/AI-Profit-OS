#!/usr/bin/env node
/**
 * Deploy 유저 PWA → CF Workers ai-profit-web (OpenNext)
 * 파일명 cf-pages-web = 레거시 · 실제는 Workers deploy (pages.dev 404 원인 수정)
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
mustExist("apps/web/package.json", "apps/web");

const appDir = path.join(root, "apps/web");
const configPath = path.join(root, "infra/web/wrangler.toml");
const envFlag = target === "production" || target === "prod" ? "production" : "preview";

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

console.log("[cf:deploy:web] building apps/web …");
const build = spawnSync("pnpm", ["--filter", "@aipo/web", "build:cf"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: spawnEnv(),
});
if (build.status !== 0) process.exit(build.status || 1);

// preview = top-level name ai-profit-web (proxy/workers.dev SSOT)
// production = --env=production (동일 이름 · 향후 바인딩 분리)
const deployArgs = [
  "exec",
  "opennextjs-cloudflare",
  "deploy",
  `--config=${configPath}`,
];
if (envFlag === "production") {
  deployArgs.push("--env=production");
}

console.log(
  `[cf:deploy:web] OpenNext Workers deploy · target=${envFlag} · worker=ai-profit-web …`
);
const deploy = spawnSync("pnpm", deployArgs, {
  cwd: appDir,
  stdio: "inherit",
  shell: true,
  env: spawnEnv(),
});
process.exit(deploy.status || 0);

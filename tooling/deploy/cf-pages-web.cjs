#!/usr/bin/env node
/** Deploy 유저 PWA → CF Pages ai-profit-web */
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

const buildDir = path.join(root, "apps/web/.open-next/cloudflare");
const wranglerDir = path.join(root, "infra/web");
const envFlag = target === "production" || target === "prod" ? "production" : "preview";
const projectName = "ai-profit-web";

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

const deployArgs = [
  "exec",
  "wrangler",
  "pages",
  "deploy",
  buildDir,
  `--project-name=${projectName}`,
];
if (envFlag === "preview") {
  deployArgs.push("--branch=preview");
}

const deploy = spawnSync("pnpm", deployArgs, {
  cwd: wranglerDir,
  stdio: "inherit",
  shell: true,
  env: spawnEnv(),
});
process.exit(deploy.status || 0);

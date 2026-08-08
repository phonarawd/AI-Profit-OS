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
const config = path.join(root, "infra/web/wrangler.toml");
const envFlag = target === "production" || target === "prod" ? "production" : "preview";

console.log("[cf:deploy:web] building apps/web …");
const build = spawnSync("pnpm", ["--filter", "@ai-profit-os/web", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
if (build.status !== 0) process.exit(build.status || 1);

const deploy = spawnSync(
  "pnpm",
  [
    "exec",
    "wrangler",
    "pages",
    "deploy",
    buildDir,
    "--project-name=ai-profit-web",
    `--config=${config}`,
    `--env=${envFlag}`,
  ],
  { cwd: root, stdio: "inherit", shell: true }
);
process.exit(deploy.status || 0);

#!/usr/bin/env node
/** Deploy Admin Ops → CF Pages ai-profit-ops */
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

const buildDir = path.join(root, "apps/admin/.open-next/cloudflare");
const config = path.join(root, "infra/ops/wrangler.toml");
const envFlag = target === "production" || target === "prod" ? "production" : "preview";

console.log("[cf:deploy:ops] building apps/admin …");
const build = spawnSync("pnpm", ["--filter", "@ai-profit-os/admin", "build"], {
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
    "--project-name=ai-profit-ops",
    `--config=${config}`,
    `--env=${envFlag}`,
  ],
  { cwd: root, stdio: "inherit", shell: true }
);
process.exit(deploy.status || 0);

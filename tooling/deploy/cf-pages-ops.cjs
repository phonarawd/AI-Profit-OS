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
const {
  isProductionTarget,
  requireAcceptedArtifactAuthority,
} = require("./lib/accepted-artifact-authority.cjs");

const argv = process.argv.slice(2);
const noRebuild = argv.includes("--no-rebuild");
const target = argv.find((arg) => !arg.startsWith("--")) || "preview";
if (isProductionTarget(target)) {
  try {
    requireAcceptedArtifactAuthority(target, process.env);
  } catch (err) {
    console.error("[cf:deploy:ops] " + String(err && err.message ? err.message : err));
    process.exit(1);
  }
  if (!noRebuild) {
    console.error("[cf:deploy:ops] FAIL_CLOSED:production_rebuild_forbidden");
    process.exit(1);
  }
}
requireRootDomainForProd(target);
requireCloudflareCreds();
loadDotEnv();
mustExist("apps/admin/package.json", "apps/admin");

const appDir = path.join(root, "apps/admin");
const configPath = path.join(root, "infra/ops/wrangler.toml");
const envFlag = resolveWranglerEnv(target);
const smokeSlot = envFlag === "production" ? "production" : "staging";

if (noRebuild) {
  mustExist("apps/admin/.open-next/worker.js", "apps/admin OpenNext worker");
  mustExist("apps/admin/.open-next/assets", "apps/admin OpenNext assets");
  console.log("[cf:deploy:ops] no-rebuild · wrangler only");
} else {
  console.log("[cf:deploy:ops] building apps/admin");
  const build = spawnSync("pnpm", ["--filter", "@aipo/admin", "build:cf"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  if (build.status !== 0) process.exit(build.status || 1);
}

const deployArgs = noRebuild
  // REL-701 2026-09-04: apps/web과 동일한 이유로 --no-bundle 제거 (code 10021 회피).
  ? ["exec", "wrangler", "deploy", "--config", configPath, "--env=" + envFlag]
  : [
      "exec",
      "opennextjs-cloudflare",
      "deploy",
      "--config=" + configPath,
      "--env=" + envFlag,
    ];

console.log("[cf:deploy:ops] OpenNext Workers deploy target=" + envFlag + " smoke=" + smokeSlot);
const deploy = spawnSync("pnpm", deployArgs, {
  cwd: noRebuild ? root : appDir,
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

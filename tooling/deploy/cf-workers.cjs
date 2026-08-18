#!/usr/bin/env node
/** Deploy Phase0/1 Workers from infra/workers.manifest.json */
const { spawnSync } = require("child_process");
const path = require("path");
const {
  root,
  requireRootDomainForProd,
  requireCloudflareCreds,
  readWorkersManifest,
  loadDotEnv,
} = require("./lib/env.cjs");

const target = process.argv[2] || "preview";
const phase = process.argv[3] || "phase0";
requireRootDomainForProd(target);
requireCloudflareCreds();
loadDotEnv();

const manifest = readWorkersManifest();
const list = manifest[phase];
if (!Array.isArray(list) || list.length === 0) {
  console.error(`[cf:deploy:workers] FAIL: unknown phase ${phase}`);
  process.exit(1);
}

const envFlag = target === "production" || target === "prod" ? "production" : "preview";

for (const name of list) {
  const dir = path.join(root, "workers", name);
  console.log(`[cf:deploy:workers] deploying ${name} …`);
  const r = spawnSync(
    "pnpm",
    ["exec", "wrangler", "deploy", "--config", "wrangler.toml", `--env=${envFlag}`],
    { cwd: dir, stdio: "inherit", shell: true }
  );
  if (r.status !== 0) process.exit(r.status || 1);
}

console.log(`[cf:deploy:workers] PASS · phase=${phase} · count=${list.length}`);

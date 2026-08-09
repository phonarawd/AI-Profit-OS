#!/usr/bin/env node
/** Deploy Phase0 domain bridge workers (api stub · custom_domain auto-DNS) */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { root, loadDotEnv, requireCloudflareCreds } = require("./lib/env.cjs");

loadDotEnv();
requireCloudflareCreds();

const workers = ["workers/api-stub", "workers/web-proxy", "workers/ops-proxy"];

for (const rel of workers) {
  const dir = path.join(root, rel);
  console.log(`[cf:domain:bridge] deploy ${rel} …`);
  const envFile = path.join(root, ".env");
  const args = ["exec", "wrangler", "deploy", "--env", "production"];
  if (fs.existsSync(envFile)) args.push(`--env-file=${envFile}`);
  const r = spawnSync("pnpm", args, {
    cwd: dir,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...loadDotEnv() },
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

console.log("[cf:domain:bridge] PASS");

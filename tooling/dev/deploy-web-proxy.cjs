#!/usr/bin/env node
/**
 * hiptk-web-proxy 만 배포한다.
 * REL-701 · ai-profit-web · ops-proxy · api-stub 0.
 */
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { root, loadDotEnv, requireCloudflareCreds } = require("../deploy/lib/env.cjs");

loadDotEnv();
requireCloudflareCreds();

const dir = path.join(root, "workers/web-proxy");
const envFile = path.join(root, ".env");
const args = ["exec", "wrangler", "deploy", "--env", "production"];
if (fs.existsSync(envFile)) args.push(`--env-file=${envFile}`);

const r = spawnSync("pnpm", args, {
  cwd: dir,
  stdio: "inherit",
  shell: true,
  env: { ...process.env },
});
if (r.status !== 0) process.exit(r.status || 1);
process.stdout.write(
  JSON.stringify(
    {
      target: "hiptk-web-proxy",
      origin: "https://putduk-web.ebay-adapter.workers.dev",
      rel701: 0,
      aiProfitWeb: 0,
    },
    null,
    2,
  ) + "\n",
);

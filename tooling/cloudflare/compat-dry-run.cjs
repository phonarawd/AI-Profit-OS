#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const DATES = Object.freeze(["2025-08-15", "2026-08-04", "2026-08-27"]);
const CONFIGS = Object.freeze([
  "infra/web/wrangler.toml",
  "infra/ops/wrangler.toml",
  "workers/amazon-adapter/wrangler.toml",
  "workers/api-stub/wrangler.toml",
  "workers/chain-sweeper/wrangler.toml",
  "workers/chain-watchers/wrangler.toml",
  "workers/coingecko-adapter/wrangler.toml",
  "workers/ebay-adapter/wrangler.toml",
  "workers/frankfurter-adapter/wrangler.toml",
  "workers/marketing-capi-dispatcher/wrangler.toml",
  "workers/ops-proxy/wrangler.toml",
  "workers/pokemontcg-adapter/wrangler.toml",
  "workers/push-dispatcher/wrangler.toml",
  "workers/web-proxy/wrangler.toml",
  "workers/yahoo-jp-adapter/wrangler.toml",
  "workers/ygoprodeck-adapter/wrangler.toml",
]);

function fail(message) {
  console.error("[cf-compat-dry-run] FAIL:", message);
  process.exit(1);
}

for (const config of CONFIGS) {
  if (!fs.existsSync(path.resolve(config))) fail(`missing config: ${config}`);
}
for (const required of [
  "apps/web/.open-next/worker.js",
  "apps/admin/.open-next/worker.js",
]) {
  if (!fs.existsSync(path.resolve(required))) {
    fail(`missing OpenNext build output: ${required}`);
  }
}

const root = process.env.RUNNER_TEMP || "/tmp";
for (const date of DATES) {
  for (const config of CONFIGS) {
    const label = config.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
    const outdir = path.join(root, "aipo-cf-compat", date, label);
    fs.mkdirSync(outdir, { recursive: true });
    console.log(`[cf-compat-dry-run] BUILD_COMPAT date=${date} config=${config}`);
    const run = spawnSync(
      "pnpm",
      [
        "exec",
        "wrangler",
        "deploy",
        "--dry-run",
        "--config",
        config,
        "--compatibility-date",
        date,
        "--outdir",
        outdir,
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, CI: "1" },
        stdio: "inherit",
      },
    );
    if (run.error) fail(`${date} ${config}: ${run.error.message}`);
    if (run.status !== 0) fail(`${date} ${config}: exit ${run.status}`);
  }
}

console.log(
  `[cf-compat-dry-run] PASS evidence=BUILD_COMPAT runtime_preview=NOT_RUN configs=${CONFIGS.length} dates=${DATES.join(",")}`,
);

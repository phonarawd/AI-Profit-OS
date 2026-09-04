#!/usr/bin/env node
/**
 * 워커 로컬 deploy는 preview env만. top-level/production 이름 배포 금지.
 */
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const tomlPath = path.join(cwd, "wrangler.toml");
if (!fs.existsSync(tomlPath)) {
  process.stderr.write(
    "[wrangler-worker-preview-only] FAIL_CLOSED:wrangler_toml_missing\n",
  );
  process.exit(1);
}

const toml = fs.readFileSync(tomlPath, "utf8");
if (!/\[env\.preview\]/.test(toml)) {
  process.stderr.write(
    "[wrangler-worker-preview-only] FAIL_CLOSED:worker_preview_env_missing\n",
  );
  process.exit(1);
}

for (const arg of process.argv.slice(2)) {
  const lower = String(arg).toLowerCase();
  if (lower.includes("production") || /^--env(?:=|$)/.test(lower)) {
    process.stderr.write(
      "[wrangler-worker-preview-only] FAIL_CLOSED:direct_worker_production_wrangler_forbidden\n",
    );
    process.exit(1);
  }
}

const r = spawnSync(
  "pnpm",
  ["exec", "wrangler", "deploy", "--config", "wrangler.toml", "--env", "preview"],
  { cwd, stdio: "inherit", shell: true },
);
process.exit(r.status === 0 ? 0 : r.status || 1);

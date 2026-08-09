#!/usr/bin/env node
/** Start api-nest with repo-root .env loaded (ADR-016) */
const { spawnSync } = require("child_process");
const path = require("path");
const { loadDotEnv, root } = require("../deploy/lib/env.cjs");

loadDotEnv();

const apiDir = path.join(root, "services", "api-nest");
const build = spawnSync("pnpm", ["--filter", "@aipo/api-nest", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: process.env,
});
if (build.status !== 0) process.exit(build.status || 1);

const start = spawnSync("node", ["dist/main.js"], {
  cwd: apiDir,
  stdio: "inherit",
  shell: true,
  env: process.env,
});
process.exit(start.status || 0);

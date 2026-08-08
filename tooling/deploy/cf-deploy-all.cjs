#!/usr/bin/env node
/** Full Cloudflare deploy orchestrator (web + ops + workers) */
const { spawnSync } = require("child_process");
const path = require("path");

const target = process.argv[2] || "preview";
const root = path.resolve(__dirname, "../..");

function run(script, ...args) {
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
    cwd: root,
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

run("cf-preflight.cjs", target, "workers");
run("cf-workers.cjs", target, "phase0");

const fs = require("fs");
if (fs.existsSync(path.join(root, "apps/web/package.json"))) {
  run("cf-pages-web.cjs", target);
}
if (fs.existsSync(path.join(root, "apps/admin/package.json"))) {
  run("cf-pages-ops.cjs", target);
}

console.log("[cf:deploy:all] PASS");

#!/usr/bin/env node
/**
 * REL-600 staging deploy — OpenNext preview Workers only.
 * production custom domain / production workersDev / bridge / workflow_dispatch 금지.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const { root, isProdTarget } = require("./lib/env.cjs");

const target = process.argv[2] || "staging";
if (isProdTarget(target)) {
  console.error("[cf:deploy:staging] FAIL: production target forbidden");
  process.exit(1);
}

function run(script, ...args) {
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
    cwd: root,
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

run("cf-preflight.cjs", "staging", "all");
run("cf-pages-web.cjs", "staging");
run("cf-pages-ops.cjs", "staging");

console.log("[cf:deploy:staging] PASS · preview workers only · production hosts untouched");

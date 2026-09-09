#!/usr/bin/env node
/**
 * S5 전용 staging 배포 — wrangler [env.dedicated] only.
 * REL-600 preview · production custom domain / bridge 금지.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const { root, isProdTarget, resolveWranglerEnv } = require("./lib/env.cjs");

const target = process.argv[2] || "dedicated";
if (isProdTarget(target)) {
  console.error("[cf:deploy:dedicated] FAIL: production target forbidden");
  process.exit(1);
}
if (resolveWranglerEnv(target) !== "dedicated") {
  console.error("[cf:deploy:dedicated] FAIL: target must resolve to wrangler env dedicated");
  process.exit(1);
}

function run(script, ...args) {
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
    cwd: root,
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

run("cf-preflight.cjs", "dedicated", "all");
run("cf-pages-web.cjs", "dedicated");
run("cf-pages-ops.cjs", "dedicated");

console.log("[cf:deploy:dedicated] PASS · dedicated workers only · preview/production untouched");

/**
 * verify:opennext-build — OpenNext → .open-next/worker.js + assets (Workers deploy SSOT)
 * Windows: SKIP (symlink EPERM · OpenNext docs recommend WSL/Linux).
 * CI gate.yml runs on ubuntu-latest → full build:cf enforced there.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

if (process.platform === "win32") {
  console.log(
    "[verify:opennext-build] SKIP on Windows (symlink EPERM); CI ubuntu runs build:cf"
  );
  process.exit(0);
}

const root = path.resolve(__dirname, "../..");
const apps = ["@aipo/web", "@aipo/admin"];
const env = {
  ...process.env,
  NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=1536",
};

for (const app of apps) {
  console.log(`[verify:opennext-build] ${app} build:cf …`);
  const r = spawnSync("pnpm", ["--filter", app, "build:cf"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env,
  });
  if (r.status !== 0) {
    console.error(`[verify:opennext-build] FAIL at ${app}`);
    process.exit(1);
  }
  const rel = app === "@aipo/web" ? "apps/web" : "apps/admin";
  const worker = path.join(root, rel, ".open-next", "worker.js");
  const assets = path.join(root, rel, ".open-next", "assets");
  if (!fs.existsSync(worker)) {
    console.error(`[verify:opennext-build] missing ${rel}/.open-next/worker.js`);
    process.exit(1);
  }
  if (!fs.existsSync(assets)) {
    console.error(`[verify:opennext-build] missing ${rel}/.open-next/assets`);
    process.exit(1);
  }
}

console.log("[verify:opennext-build] PASS (web + admin · worker.js + assets)");

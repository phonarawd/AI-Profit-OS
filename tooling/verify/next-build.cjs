/**
 * verify:next-build — apps/web + apps/admin next build (Next@16 prerender gate)
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const apps = ["@aipo/web", "@aipo/admin"];
const env = {
  ...process.env,
  NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=1536",
};

for (const app of apps) {
  console.log(`[verify:next-build] ${app} …`);
  const r = spawnSync("pnpm", ["--filter", app, "build"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env,
  });
  if (r.status !== 0) {
    console.error(`[verify:next-build] FAIL at ${app}`);
    process.exit(1);
  }
}

console.log("[verify:next-build] PASS (web + admin)");

/** pnpm verify:gate — local thin gate before commit/push (ADR-016) */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const steps = [
  "stack-lock.cjs",
  "secrets.cjs",
  "pg-module-scan.cjs",
  "brand-consumer.cjs",
  "brand-assets.cjs",
  "cf-infra.cjs",
  "phase0-bootstrap.cjs",
  "root-domain-env.cjs",
  "next-major-pin.cjs",
  "no-admin-in-web.cjs",
  "ia-tabs.cjs",
  "admin-routes.cjs",
  "plans-ssot.cjs",
  "stubs/run-all.cjs",
];

let failed = false;
for (const step of steps) {
  const r = spawnSync(process.execPath, [path.join(__dirname, step)], {
    cwd: root,
    encoding: "utf8",
  });
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
  if (r.status !== 0) {
    failed = true;
    console.error(`[verify:gate] FAIL at ${step}`);
    break;
  }
}

if (failed) process.exit(1);
console.log("[verify:gate] PASS");

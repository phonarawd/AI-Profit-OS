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
  "ebay-worker-deploy-path.cjs",
  "p0-ebay-secret-provisioning.cjs",
  "nest-production-provenance.cjs",
  "workers-types.cjs",
  "phase0-bootstrap.cjs",
  "root-domain-env.cjs",
  "domain-bootstrap.cjs",
  "opennext-workers-origin.cjs",
  "next-major-pin.cjs",
  "tailwind-v4.cjs",
  "putduk-theme-sync.cjs",
  "cf-deploy-packages.cjs",
  "no-admin-in-web.cjs",
  "ia-tabs.cjs",
  "admin-routes.cjs",
  "plans-ssot.cjs",
  "next-build.cjs",
  "opennext-build.cjs",
  "api-nest-build.cjs",
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

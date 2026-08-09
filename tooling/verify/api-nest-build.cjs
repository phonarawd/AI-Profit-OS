/**
 * verify:api-nest-build — Engine Final Re-Verification Audit P1-1
 * Type-check/build services/api-nest so a broken import/type error is
 * caught before merge (previously: zero tsc/build step existed for this
 * service anywhere in CI — audit §22 Test Audit / §33.3).
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const tscBin = require.resolve("typescript/bin/tsc");
const tsconfig = path.join(root, "services/api-nest/tsconfig.json");

const r = spawnSync(process.execPath, [tscBin, "-p", tsconfig], {
  cwd: root,
  encoding: "utf8",
});
process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");

if (r.status !== 0) {
  console.error(
    "[verify:api-nest-build] FAIL — services/api-nest tsc build errors (see above)",
  );
  process.exit(1);
}
console.log("[verify:api-nest-build] PASS (services/api-nest tsc build clean)");

/**
 * verify:api-nest-build — Engine Final Re-Verification Audit P1-1
 * Type-check/build services/api-nest so a broken import/type error is
 * caught before merge (previously: zero tsc/build step existed for this
 * service anywhere in CI — audit §22 Test Audit / §33.3).
 * tsc does not emit src-colocated .cjs; copy them into dist after emit
 * so Nest createRequire(__filename) can resolve siblings. No payout/mall change.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const nestRoot = path.join(root, "services/api-nest");
const srcRoot = path.join(nestRoot, "src");
const distRoot = path.join(nestRoot, "dist");
const tscBin = require.resolve("typescript/bin/tsc");
const tsconfig = path.join(nestRoot, "tsconfig.json");
const copyOnly = process.argv.includes("--copy-src-cjs");

function walkCjs(dir, acc) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkCjs(full, acc);
      continue;
    }
    if (ent.isFile() && ent.name.endsWith(".cjs")) acc.push(full);
  }
  return acc;
}

function copySrcCjsToDist() {
  if (!fs.existsSync(path.join(distRoot, "main.js"))) {
    console.error("[verify:api-nest-build] FAIL — dist/main.js missing");
    process.exit(1);
  }
  const files = walkCjs(srcRoot, []);
  if (files.length === 0) {
    console.error("[verify:api-nest-build] FAIL — no src cjs files");
    process.exit(1);
  }
  for (const abs of files) {
    const rel = path.relative(srcRoot, abs);
    const dest = path.join(distRoot, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(abs, dest);
  }
  const bootRequired = [
    "membership/member-daily-cap.core.cjs",
    "membership/grade-daily-policy.core.cjs",
    "membership/operator-control.persist.cjs",
    "membership/operator-control.provider.cjs",
    "membership/admin-member-directory.core.cjs",
    "membership/admin-member-directory.persist.cjs",
    "membership/auto-downgrade.core.cjs",
    "membership/presentation-profile.core.cjs",
    "referral/reseller-id.persist.cjs",
    "opportunities/operator-mall-product.core.cjs",
    "opportunities/operator-mall-product.persist.cjs",
    "ledger/money-authority.core.cjs",
  ];
  const missing = bootRequired.filter(
    (rel) => !fs.existsSync(path.join(distRoot, rel)),
  );
  if (missing.length) {
    console.error(
      "[verify:api-nest-build] FAIL — missing dist cjs: " + missing.join(", "),
    );
    process.exit(1);
  }
  console.log(
    "[verify:api-nest-build] copied " +
      files.length +
      " src cjs files to dist",
  );
}

if (!copyOnly) {
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
}

copySrcCjsToDist();
console.log("[verify:api-nest-build] PASS (services/api-nest tsc build clean)");

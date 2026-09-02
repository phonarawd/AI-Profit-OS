/**
 * verify:next-major-pin — apps/web + apps/admin must pin next@16 (ADR-015)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const apps = ["apps/web", "apps/admin"];

for (const app of apps) {
  const pkgPath = path.join(root, app, "package.json");
  if (!fs.existsSync(pkgPath)) {
    fails.push(`missing ${app}/package.json`);
    continue;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const next = pkg.dependencies?.next || pkg.devDependencies?.next;
  if (!next) {
    fails.push(`${app}: next dependency missing`);
    continue;
  }
  const raw = String(next).replace(/^[\^~>=<\s]*/, "");
  const major = raw.split(".")[0];
  if (major !== "16") {
    fails.push(`${app}: next major must be 16 (got ${next})`);
  }
  const parts = raw.split(".").map((n) => Number(n));
  const minor = parts[1] || 0;
  const patch = parts[2] || 0;
  // August 2026 critical RCE floor: 16.3.3 (GHSA-p293-qw3h-jr36, GHSA-2xp9-vwfh-vxw4)
  if (minor < 3 || (minor === 3 && patch < 3)) {
    fails.push(`${app}: next must be >= 16.3.3 (got ${next})`);
  }
}

if (fails.length) {
  console.error("[verify:next-major-pin] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:next-major-pin] PASS (next@16 · >=16.3.3)");

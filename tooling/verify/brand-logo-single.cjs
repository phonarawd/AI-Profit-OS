/**
 * verify:brand-logo-single — Brand Kit wordmark/icon single source (ADR-011/013)
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "../..");
const fails = [];

const manPath = path.join(root, "packages/ui/brand/brand.manifest.json");
if (!fs.existsSync(manPath)) {
  console.error("[verify:brand-logo-single] FAIL missing brand.manifest.json");
  process.exit(1);
}

const m = JSON.parse(fs.readFileSync(manPath, "utf8"));
const brandRoot = path.join(root, "packages/ui/brand");
const assets = m.assets || {};

for (const key of ["appIcon", "wordmarkDark", "aiAvatar"]) {
  const a = assets[key];
  if (!a || a.status !== "ready") {
    fails.push(`assets.${key} must be status=ready`);
    continue;
  }
  const abs = path.join(brandRoot, a.path);
  if (!fs.existsSync(abs)) {
    fails.push(`missing ${a.path}`);
    continue;
  }
  const hash = crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
  if (hash.length !== 64) fails.push(`hash fail ${key}`);
}

// No alternate mark folders
const bannedDirs = [
  "packages/ui/brand/assets/alt",
  "packages/ui/brand/assets/archive",
  "packages/ui/brand/assets/_archive",
];
for (const d of bannedDirs) {
  if (fs.existsSync(path.join(root, d))) fails.push(`banned alt mark dir: ${d}`);
}

if (m.consumer?.name !== "퍼뜩" || m.ai?.name !== "퍼뜩") {
  fails.push("consumer/ai name must be 퍼뜩 (single brand)");
}

if (fails.length) {
  console.error("[verify:brand-logo-single] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:brand-logo-single] PASS (single Brand Kit marks)");

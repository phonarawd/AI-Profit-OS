/**
 * verify:rel-403-versioning — version rule + build id, no invented healthy version
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const doc = read("governance/release-master/VERSIONING.md");
const webId = read("apps/web/lib/release-id.ts");
const adminId = read("apps/admin/lib/release-id.ts");
const webLayout = read("apps/web/app/layout.tsx");
const adminLayout = read("apps/admin/app/layout.tsx");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");

for (const needle of [
  "Release id",
  "YYYY.MM.DD",
  "REL-602",
  "GITHUB_SHA",
  "없으면 배포 commit SHA 자체가 id다",
]) {
  if (!doc.includes(needle)) fails.push(`VERSIONING.md missing ${needle}`);
}
if (/0\.0\.0|latest|healthy/.test(doc) && /위조하지 않는다/.test(doc) === false) {
  fails.push("VERSIONING must not invent a default healthy version");
}

for (const [label, src] of [
  ["web release-id", webId],
  ["admin release-id", adminId],
]) {
  if (!src.includes("NEXT_PUBLIC_RELEASE_ID")) {
    fails.push(`${label} must read NEXT_PUBLIC_RELEASE_ID`);
  }
  if (!src.includes("return null")) {
    fails.push(`${label} must return null when missing`);
  }
}

if (webLayout.includes("data-release-id")) {
  fails.push("consumer Home layout must not take release-id attributes");
}
if (
  !adminLayout.includes("readReleaseId") ||
  !adminLayout.includes("data-release-id")
) {
  fails.push("admin layout must expose data-release-id");
}
if (!pkg.includes("verify:rel-403-versioning")) {
  fails.push("package.json missing verify:rel-403-versioning");
}
if (!catalog.includes("rel-403-versioning")) {
  fails.push("CATALOG.md missing rel-403-versioning");
}

if (fails.length) {
  console.error("[verify:rel-403-versioning] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-403-versioning] PASS");

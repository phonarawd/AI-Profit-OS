/**
 * verify:device-tier-system — REL-019
 * 기존 detectDeviceTier 승격 + 대형화면 안전 문서. Home geometry 변경 FAIL.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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

function sha256(rel) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(root, rel)))
    .digest("hex");
}

const required = [
  "packages/sdk/src/device-tier.ts",
  "packages/ui/tokens/device-tier-contract.ts",
  "governance/responsive/DEVICE_TIER.md",
  "governance/responsive/large-screen-safety.v1.json",
  // D1-S1C (2026-09-05): v1 is SUPERSEDED - see
  // governance/responsive/HOME-GEOMETRY-LOCK-SUPERSESSION.md. v1 still
  // exists on disk (its own "rewrite: FORBIDDEN" is honored, untouched) but
  // is no longer the active Home geometry authority; v2 is.
  "governance/responsive/home-geometry-lock.v2.json",
];
for (const rel of required) read(rel);

const owner = read("packages/sdk/src/device-tier.ts");
if (!owner.includes("export function detectDeviceTier")) {
  fails.push("detectDeviceTier owner missing");
}
if (!owner.includes("export type DeviceTier = \"S\" | \"A\" | \"B\"")) {
  fails.push("DeviceTier must be S|A|B");
}
for (const needle of [
  "hardwareConcurrency",
  "deviceMemory",
  "prefers-reduced-motion",
  "saveData",
]) {
  if (!owner.includes(needle)) fails.push(`detectDeviceTier missing signal ${needle}`);
}

const detectCount = (owner.match(/export function detectDeviceTier/g) || []).length;
if (detectCount !== 1) fails.push("exactly one detectDeviceTier export required");

const contract = read("packages/ui/tokens/device-tier-contract.ts");
if (!contract.includes('DEVICE_TIER_OWNER = "packages/sdk/src/device-tier.ts"')) {
  fails.push("contract must point at sdk device-tier owner");
}
if (!contract.includes("HOME_RETROACTIVE_VISUAL_REDESIGN = false")) {
  fails.push("contract must lock HOME_RETROACTIVE_VISUAL_REDESIGN=false");
}
for (const n of ["2560", "3440", "3840"]) {
  if (!contract.includes(n)) fails.push(`contract missing viewport ${n}`);
}
for (const c of [
  "overflow",
  "clip",
  "absurd-stretch",
  "interaction-break",
  "performance",
]) {
  if (!contract.includes(c)) fails.push(`contract missing safety check ${c}`);
}

const doc = read("governance/responsive/DEVICE_TIER.md");
if (!doc.includes("packages/sdk/src/device-tier.ts")) {
  fails.push("DEVICE_TIER.md must cite owner path");
}
if (!doc.includes("HOME_RETROACTIVE_VISUAL_REDESIGN")) {
  fails.push("DEVICE_TIER.md must state Home redesign lock");
}

let safety;
try {
  safety = JSON.parse(read("governance/responsive/large-screen-safety.v1.json"));
} catch (err) {
  fails.push(`large-screen-safety JSON: ${err.message}`);
  safety = { viewports: [], checks: [] };
}
const vps = (safety.viewports || []).join(",");
if (vps !== "2560,3440,3840") fails.push("safety viewports must be 2560,3440,3840");
const checkIds = (safety.checks || []).map((c) => c.id);
for (const id of [
  "overflow",
  "clip",
  "absurd-stretch",
  "interaction-break",
  "performance",
]) {
  if (!checkIds.includes(id)) fails.push(`safety missing check ${id}`);
}
if (safety.homeRetroactiveVisualRedesign !== false) {
  fails.push("safety.homeRetroactiveVisualRedesign must be false");
}

let lock;
try {
  lock = JSON.parse(read("governance/responsive/home-geometry-lock.v2.json"));
} catch (err) {
  fails.push(`home-geometry-lock JSON: ${err.message}`);
  lock = { files: {} };
}
const locked = lock.files || {};
if (Object.keys(locked).length < 10) {
  fails.push("home-geometry-lock too small");
}
for (const [rel, meta] of Object.entries(locked)) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    fails.push(`Home geometry missing: ${rel}`);
    continue;
  }
  const actual = sha256(rel);
  if (actual !== meta.sha256) {
    fails.push(`Home geometry changed: ${rel}`);
  }
}

const ux = spawnSync(process.execPath, [path.join(root, "tooling/verify/ux-design-system.cjs")], {
  encoding: "utf8",
  cwd: root,
  timeout: 30_000,
});
process.stdout.write(ux.stdout || "");
process.stderr.write(ux.stderr || "");
if (ux.status !== 0) fails.push("verify:ux-design-system reuse FAIL");

const pkg = read("package.json");
if (!pkg.includes('"verify:device-tier-system"')) {
  fails.push("package.json missing verify:device-tier-system");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("device-tier-system")) {
  fails.push("CATALOG.md must list device-tier-system");
}
const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("device-tier-system.cjs")) {
  fails.push("domain-by-path must trigger device-tier-system");
}

if (fails.length) {
  console.error("[verify:device-tier-system] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:device-tier-system] PASS (detectDeviceTier reused · large-screen docs · Home geometry lock)",
);

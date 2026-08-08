/** ADR-011 — Brand Kit visual assets registered + files exist (ready only) */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const manifestPath = path.join(root, "packages/ui/brand/brand.manifest.json");
const fails = [];

if (!fs.existsSync(manifestPath)) {
  console.error("[verify:brand-assets] FAIL missing brand.manifest.json");
  process.exit(1);
}

const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const brandRoot = path.join(root, "packages/ui/brand");

if (m.consumer?.name !== "퍼뜩" || m.ai?.name !== "퍼뜩") {
  fails.push("consumer/ai name must be 퍼뜩");
}

const assets = m.assets || {};
const requiredReady = [
  "appIcon",
  "maskableSource",
  "wordmarkDark",
  "aiAvatar",
  "ogDefault",
];

for (const key of requiredReady) {
  const a = assets[key];
  if (!a) {
    fails.push(`assets.${key} missing in manifest`);
    continue;
  }
  if (a.status === "archived") continue;
  if (a.status !== "ready") {
    fails.push(`assets.${key} status must be ready (got ${a.status})`);
  }
  const abs = path.join(brandRoot, a.path);
  if (!fs.existsSync(abs)) {
    fails.push(`missing file: ${a.path}`);
  } else {
    const st = fs.statSync(abs);
    if (st.size < 1024) fails.push(`file too small: ${a.path}`);
  }
}

// photo mockups / alternate marks must not reappear under brand/assets
const brandAssetsDir = path.join(brandRoot, "assets");
const bannedNameRe = /(mockup|metal-hex|_archive)/i;
if (fs.existsSync(brandAssetsDir)) {
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (bannedNameRe.test(ent.name)) fails.push(`banned brand asset: ${path.relative(brandRoot, p)}`);
    }
  };
  walk(brandAssetsDir);
}

if (fails.length) {
  console.error("[verify:brand-assets] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log("[verify:brand-assets] PASS (visual_kit_v1 ready assets)");

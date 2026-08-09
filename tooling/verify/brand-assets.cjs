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

// Market partner logos (§38.10) — tracked in assets/markets/manifest.json.
// Ready marks must exist on disk. Blocked marks are an explicit sub-deliverable
// (verify:market-partner-trust); do not invent unofficial trademark SVGs.
const marketsManifestPath = path.join(brandRoot, "assets/markets/manifest.json");
if (!fs.existsSync(marketsManifestPath)) {
  fails.push("missing assets/markets/manifest.json (market-partner-logo-svgs tracker)");
} else {
  if (!m.marketPartners?.manifest) {
    fails.push("brand.manifest.json missing marketPartners.manifest pointer");
  }
  let markets;
  try {
    markets = JSON.parse(fs.readFileSync(marketsManifestPath, "utf8"));
  } catch {
    fails.push("assets/markets/manifest.json invalid JSON");
  }
  if (markets) {
    const required = [
      "ebay.svg",
      "amazon.svg",
      "yahoo-jp.svg",
      "pokemontcg.svg",
      "ygoprodeck.svg",
      "coingecko.svg",
      "frankfurter.svg",
    ];
    const logos = markets.logos || [];
    const byFile = new Map(logos.map((l) => [l.file, l]));
    for (const f of required) {
      const entry = byFile.get(f);
      if (!entry) {
        fails.push(`markets/manifest missing tracked logo ${f}`);
        continue;
      }
      if (entry.status === "ready") {
        const abs = path.join(brandRoot, entry.path || `assets/markets/${f}`);
        if (!fs.existsSync(abs)) fails.push(`market logo ready but missing file: ${f}`);
      } else if (entry.status !== "blocked") {
        fails.push(`market logo ${f} status must be blocked|ready`);
      }
    }
  }
}

if (fails.length) {
  console.error("[verify:brand-assets] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const marketsBlocked =
  fs.existsSync(marketsManifestPath) &&
  (JSON.parse(fs.readFileSync(marketsManifestPath, "utf8")).logos || []).filter(
    (l) => l.status !== "ready",
  ).length;

console.log(
  marketsBlocked
    ? `[verify:brand-assets] PASS (visual_kit_v1 ready · market logos blocked=${marketsBlocked}/7 tracked)`
    : "[verify:brand-assets] PASS (visual_kit_v1 ready assets · market logos ready)",
);

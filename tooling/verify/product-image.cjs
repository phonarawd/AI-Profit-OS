/**
 * verify:product-image — UI audit §26/§37 · PART3 ProductImage
 * Source-agnostic · loading/loaded/error/missing · sizes · next/image hosts
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = [
  "packages/ui/components/product/ProductImage.tsx",
  "packages/ui/components/product/image-hosts.ts",
  "packages/ui/components/product/product-image-sizes.ts",
  "packages/ui/components/product/index.ts",
  "packages/ui/components/execution/ProductThumb.tsx",
  "packages/ui/components/execution/index.ts",
];
for (const f of files) mustExist(f);

const img = read("packages/ui/components/product/ProductImage.tsx");
const hosts = read("packages/ui/components/product/image-hosts.ts");
const sizes = read("packages/ui/components/product/product-image-sizes.ts");
const thumb = read("packages/ui/components/execution/ProductThumb.tsx");
const pkg = read("packages/ui/package.json");
const webCfg = read("apps/web/next.config.ts");
const adminCfg = read("apps/admin/next.config.ts");
const rootPkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");

// --- source-agnostic lock ---
for (const src of ["ebay", "pokemontcg", "ygoprodeck", "admin_r2"]) {
  if (!hosts.includes(`"${src}"`)) {
    fails.push(`image-hosts must list ASSET_IMAGE_SOURCES.${src}`);
  }
}
if (!img.includes("data-image-source")) {
  fails.push("ProductImage must expose data-image-source (telemetry only)");
}
// Must not branch render on imageSource (no if/switch on source for different media trees)
if (/if\s*\(\s*imageSource/.test(img) || /switch\s*\(\s*imageSource/.test(img)) {
  fails.push("ProductImage must not branch render on imageSource");
}
if (
  img.includes("imageSource ===") ||
  img.includes('imageSource ==') ||
  img.includes("imageSource!==") ||
  img.includes("imageSource !=")
) {
  fails.push("ProductImage must treat all imageSource values identically");
}

// --- states ---
for (const st of ["loading", "loaded", "error", "missing"]) {
  if (!img.includes(`"${st}"`) && !img.includes(`'${st}'`)) {
    fails.push(`ProductImage missing status ${st}`);
  }
}
if (!img.includes("product-image-fallback")) {
  fails.push("ProductImage must render fallback testid (error/missing)");
}
if (!img.includes("Skeleton")) {
  fails.push("ProductImage loading state must use Skeleton (CLS=0)");
}
if (!img.includes("lux-card-image")) {
  fails.push("ProductImage must use lux-card-image aspect token");
}

// --- performance contract ---
if (!img.includes('from "next/image"') && !img.includes("from 'next/image'")) {
  fails.push("ProductImage must use next/image");
}
if (!img.includes("priority")) {
  fails.push("ProductImage must support priority (Hero fetchPriority)");
}
if (!img.includes('"lazy"') && !img.includes("'lazy'")) {
  fails.push("ProductImage default loading must be lazy");
}
if (!img.includes("fetchPriority") && !img.includes("fetchpriority")) {
  fails.push("ProductImage must set fetchPriority for Hero");
}
if (!img.includes("unoptimized")) {
  fails.push("ProductImage Phase0 must set unoptimized (CF hotlink Day-1)");
}
if (!sizes.includes("FEED_COLUMNS") || !sizes.includes("productImageSizes")) {
  fails.push("product-image-sizes must use FEED_COLUMNS via productImageSizes");
}
if (!hosts.includes("PRODUCT_IMAGE_REMOTE_PATTERNS")) {
  fails.push("image-hosts must export PRODUCT_IMAGE_REMOTE_PATTERNS");
}
for (const host of [
  "i.ebayimg.com",
  "images.pokemontcg.io",
  "images.ygoprodeck.com",
  "asset-images.r2.dev",
]) {
  if (!hosts.includes(host)) {
    fails.push(`PRODUCT_IMAGE_REMOTE_PATTERNS missing ${host}`);
  }
}

// --- category icons (Engine mirror) ---
const wantIcons = { watch: "⌚", trading_card: "🃏", luxury_bag: "👜" };
for (const [cat, icon] of Object.entries(wantIcons)) {
  if (!hosts.includes(icon)) {
    fails.push(`ASSET_ICON_BY_CATEGORY missing ${cat}=${icon}`);
  }
}

// --- ProductThumb wrapper ---
if (!thumb.includes("ProductImage") || !thumb.includes('variant="thumb"')) {
  fails.push("ProductThumb must wrap ProductImage variant=thumb");
}

// --- package exports ---
for (const exp of [
  "./components/product",
  "./components/product/ProductImage",
  "./components/execution",
  "./components/execution/ProductThumb",
]) {
  if (!pkg.includes(exp)) {
    fails.push(`@aipo/ui package.json missing export ${exp}`);
  }
}

// --- next.config remotePatterns wiring ---
for (const [label, cfg] of [
  ["apps/web/next.config.ts", webCfg],
  ["apps/admin/next.config.ts", adminCfg],
]) {
  if (!cfg.includes("PRODUCT_IMAGE_REMOTE_PATTERNS")) {
    fails.push(`${label} must import PRODUCT_IMAGE_REMOTE_PATTERNS`);
  }
  if (!cfg.includes("remotePatterns")) {
    fails.push(`${label} must set images.remotePatterns`);
  }
}

// --- gate wiring ---
if (!rootPkg.includes('"verify:product-image"')) {
  fails.push("root package.json missing verify:product-image script");
}
if (!catalog.includes("product-image")) {
  fails.push("CATALOG.md must list product-image");
}

const stubs = read("tooling/verify/stubs/run-all.cjs");
if (!stubs.includes("product-image.cjs")) {
  fails.push("stubs/run-all.cjs must include product-image.cjs");
}

// --- no Engine ingest fix in UI ---
if (img.includes("query:") || img.includes("normalizeIngest")) {
  fails.push("ProductImage must not attempt Engine ingest/identity-match fixes");
}

if (fails.length) {
  console.error("[verify:product-image] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:product-image] PASS (source-agnostic · 4 states · sizes · remotePatterns · ProductThumb)",
);

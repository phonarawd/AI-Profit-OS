/**
 * verify:rel-407-price-override — 4 layers, missing != 0
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

const layers = read("services/api-nest/src/opportunities/price-layers.ts");
for (const name of [
  "SOURCE_OBSERVED",
  "OVERRIDE",
  "EFFECTIVE",
  "USER_VISIBLE",
]) {
  if (!layers.includes(name)) fails.push(`missing layer ${name}`);
}
if (!layers.includes("unavailable: true")) {
  fails.push("missing price must be unavailable, not 0");
}

const admin = read(
  "services/api-nest/src/opportunities/opportunities.admin.service.ts",
);
if (!admin.includes("resolvePriceLayers")) {
  fails.push("admin pricing must use resolvePriceLayers");
}
if (!admin.includes("PRICE_UNAVAILABLE")) {
  fails.push("missing effective price must not become 0");
}
if (!admin.includes("price.override")) {
  fails.push("override must write control-plane audit");
}
if (!admin.includes("changeReason required for override")) {
  fails.push("override requires reason");
}

const user = read(
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
);
if (!user.includes('layer: "USER_VISIBLE"')) {
  fails.push("user surface must expose USER_VISIBLE only");
}
if (user.includes("sourceObserved") && user.includes("internal.pricing = {")) {
  const block = user.slice(user.indexOf("internal.pricing = {"));
  if (block.includes("sourceObserved") || block.includes("adminBuyUsdt")) {
    fails.push("user pricing must not leak source/override");
  }
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
if (!pkg.includes("verify:rel-407-price-override")) {
  fails.push("package.json missing verify:rel-407-price-override");
}
if (!catalog.includes("rel-407-price-override")) {
  fails.push("CATALOG.md missing rel-407-price-override");
}

if (fails.length) {
  console.error("[verify:rel-407-price-override] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-407-price-override] PASS");

/**
 * verify:fashionphile-parser — Engine §0.0.2c
 * products.json extract → observation · listing-leg 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing ${rel}`);
    return null;
  }
  return fs.readFileSync(p, "utf8");
}

const mi = require(path.join(
  root,
  "services/market-intelligence/src/index.cjs",
));
const fixture = JSON.parse(
  fs.readFileSync(
    path.join(root, "tooling/verify/fixtures/fashionphile-products.v1.json"),
    "utf8",
  ),
);

const extracted = mi.extractFashionphileProducts({
  productsJson: fixture,
  observedAt: "2026-09-08T07:00:00.000Z",
});

if (extracted.persistToListingLeg !== false) {
  fails.push("extract persistToListingLeg must be false");
}
if (!Array.isArray(extracted.listingRows) || extracted.listingRows.length !== 0) {
  fails.push("extract must not emit listingRows");
}
if (extracted.accepted.length !== 2) {
  fails.push(`accepted want 2 got ${extracted.accepted.length}`);
}
if (extracted.rejected.length !== 2) {
  fails.push(`rejected want 2 got ${extracted.rejected.length}`);
}
const reasons = extracted.rejected.map((r) => r.reason).sort();
if (!reasons.includes("SUPPORTED_CATEGORY") || !reasons.includes("VALID_CURRENT_PRICE")) {
  fails.push(`rejected reasons want CATEGORY+PRICE got ${reasons.join(",")}`);
}
for (const row of extracted.accepted) {
  if (row.source !== "fashionphile") fails.push("accepted source must be fashionphile");
  if (row.persistToListingLeg !== false) fails.push("accepted persistToListingLeg must be false");
  if (row.meta.priceKind !== "listing_sale") fails.push("priceKind must be listing_sale");
  if (row.meta.categoryHint !== "luxury_bag") fails.push("categoryHint must be luxury_bag");
  if (!row.imageUrl || !row.nativeAmount || !row.externalItemId || !row.url) {
    fails.push("accepted missing observation fields");
  }
  const persist = mi.normalizeWebObservationForPersist(row);
  if (!persist.ok) fails.push(`persist normalize failed: ${persist.reason}`);
  if (persist.ok && persist.row.payload.persistToListingLeg !== false) {
    fails.push("persist payload must keep persistToListingLeg false");
  }
}

if (!mi.isIngestableAdapterId("fashionphile")) {
  fails.push("fashionphile must be ingestable");
}
if (!mi.isObservationAdapterId("fashionphile")) {
  fails.push("fashionphile must be observation adapter");
}
if (!mi.PUBLISH_GUARDS.listingLegsOnly.includes("ebay")) {
  fails.push("listingLegsOnly must still include ebay");
}
if (mi.PUBLISH_GUARDS.listingLegsOnly.includes("fashionphile")) {
  fails.push("fashionphile must not be a settlement listing leg");
}
if (!mi.OBSERVATION_SOURCES_ALLOWED.includes("fashionphile")) {
  fails.push("OBSERVATION_SOURCES_ALLOWED must include fashionphile");
}

for (const rel of [
  "workers/fashionphile-parser/src/index.ts",
  "workers/fashionphile-parser/src/client.ts",
  "workers/fashionphile-parser/wrangler.toml",
  "services/market-intelligence/src/fashionphile-observation.cjs",
]) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing ${rel}`);
}

const worker = read("workers/fashionphile-parser/src/index.ts") || "";
if (!/listings:\s*\[\]/.test(worker)) {
  fails.push("worker tick must send listings: []");
}
if (!/role:\s*"observation"/.test(worker)) {
  fails.push("worker must declare observation role");
}
const client = read("workers/fashionphile-parser/src/client.ts") || "";
if (!/www\.fashionphile\.com/.test(client)) {
  fails.push("client must pin fashionphile.com host");
}
if (!/ACCESS_BLOCKED/.test(client)) {
  fails.push("client must fail-closed on 403 without bypass");
}

const ingest = read("services/api-nest/src/adapters/adapters.admin.service.ts") || "";
if (!/persistSourceObservations/.test(ingest)) {
  fails.push("Nest ingest must persist source_observations");
}
if (!/isObservationAdapterId/.test(ingest)) {
  fails.push("Nest ingest must gate observation persist");
}

const manifest = JSON.parse(read("infra/workers.manifest.json") || "{}");
if (!Array.isArray(manifest.phase1) || !manifest.phase1.includes("fashionphile-parser")) {
  fails.push("workers.manifest phase1 must include fashionphile-parser");
}
if (Array.isArray(manifest.phase0) && manifest.phase0.includes("fashionphile-parser")) {
  fails.push("phase0 must not deploy fashionphile-parser");
}

const readme = read("workers/README.md") || "";
if (!/fashionphile-parser/.test(readme)) {
  fails.push("workers/README.md must document fashionphile-parser");
}

const catalog = read("tooling/verify/CATALOG.md") || "";
if (!/\| fashionphile-parser \|/.test(catalog)) {
  fails.push("CATALOG.md must list fashionphile-parser");
}
const pkg = read("package.json") || "";
if (!/"verify:fashionphile-parser"/.test(pkg)) {
  fails.push("package.json missing verify:fashionphile-parser");
}

if (fails.length) {
  console.error("[verify:fashionphile-parser] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:fashionphile-parser] PASS (products.json extract · observation persist · listing-leg 0)",
);

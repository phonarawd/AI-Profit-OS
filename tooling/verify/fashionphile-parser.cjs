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

const matched = mi.resolveObservationMatches({
  observations: extracted.accepted,
  now: "2026-09-08T07:00:00.000Z",
});
if (matched.persistToListingLeg !== false) {
  fails.push("observation match must not persist listing legs");
}
if (matched.matched.length !== 2) {
  fails.push("observation match want 2 got " + matched.matched.length);
}
const matchedIds = matched.matched.map((m) => m.assetId).sort();
if (!matchedIds.includes("lb_hermes_birkin_25_noir")) {
  fails.push("Birkin 25 Noir must exact-match seed");
}
if (!matchedIds.includes("lb_chanel_classic_flap_medium_black")) {
  fails.push("Classic Flap Medium must unique-size match seed");
}
for (const m of matched.matched) {
  if (m.persistToListingLeg !== false) {
    fails.push("matched observation persistToListingLeg must be false");
  }
  if (!mi.isFashionphileImageHost(m.imageUrl)) {
    fails.push("matched image host must be fashionphile shopify path");
  }
}

const conflictExtract = mi.extractFashionphileProducts({
  productsJson: {
    products: [
      {
        id: 9001,
        handle: "hermes-constance-18-gris-perle",
        title: "Chevre Mysore Constance 18 Gris Perle",
        vendor: "Hermes",
        product_type: "Bags",
        images: [
          {
            src: "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/gris.jpg",
          },
        ],
        variants: [{ id: 91, sku: "C18G", price: "12500.00" }],
      },
      {
        id: 9002,
        handle: "lv-speedy-30-multicolor",
        title: "Monogram Multicolor Speedy 30 White",
        vendor: "Louis Vuitton",
        product_type: "Bags",
        images: [
          {
            src: "https://cdn.shopify.com/s/files/1/0894/3186/7695/files/multi.jpg",
          },
        ],
        variants: [{ id: 92, sku: "SP30M", price: "1800.00" }],
      },
    ],
  },
  observedAt: "2026-09-08T07:00:00.000Z",
});
const conflictMatch = mi.resolveObservationMatches({
  observations: conflictExtract.accepted,
  now: "2026-09-08T07:00:00.000Z",
});
if (conflictMatch.matched.length !== 0) {
  fails.push(
    "color-conflict observations must not match seed (got " +
      conflictMatch.matched.map((m) => m.assetId).join(",") +
      ")",
  );
}

const urls = mi.fashionphileCatalogUrls(1);
if (!Array.isArray(urls) || urls.length !== 4) {
  fails.push("fashionphileCatalogUrls(1) want 4 collection pages");
}
for (const url of urls) {
  if (!mi.isFashionphileProductsUrl(url)) {
    fails.push("catalog url must stay on fashionphile allowlist: " + url);
  }
}
if (mi.isFashionphileProductsUrl("https://evil.example/products.json")) {
  fails.push("foreign host must not pass isFashionphileProductsUrl");
}
if (
  mi.isFashionphileProductsUrl(
    "https://www.fashionphile.com/collections/secret/products.json",
  )
) {
  fails.push("unknown collection handle must be denied");
}

for (const rel of [
  "workers/fashionphile-parser/src/index.ts",
  "workers/fashionphile-parser/src/client.ts",
  "workers/fashionphile-parser/wrangler.toml",
  "services/market-intelligence/src/fashionphile-observation.cjs",
  "services/market-intelligence/src/observation-identity-match.cjs",
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
if (!/attachObservationMatches/.test(ingest)) {
  fails.push("Nest ingest must auto-match observations");
}
if (!/identityMatch === "exact_identity"/.test(ingest)) {
  fails.push("observation image apply must require exact_identity");
}
const pull = read(
  "services/api-nest/src/adapters/fashionphile-observation-pull.service.ts",
) || "";
if (!/fetchFashionphileObservationCatalog/.test(pull)) {
  fails.push("Nest in-process pull must fetch fashionphile catalog");
}
if (!/listings:\s*\[\]/.test(pull)) {
  fails.push("Nest in-process pull must send listings: []");
}
const seed = read("services/api-nest/src/opportunities/catalog-runtime-seed.service.ts") || "";
if (!/applyObservationImageProvenance/.test(seed)) {
  fails.push("catalog seed must apply observation image provenance");
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

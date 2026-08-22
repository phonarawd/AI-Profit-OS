/**
 * verify:fashionphile-identity-forensic
 * owner-backed field ≠ V1-usable identity. parser enrichment 0 unless V1 useful.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(file, "utf8");
}

const files = [
  "services/market-intelligence/src/source-observation/adapters/fashionphile.cjs",
  "services/market-intelligence/src/source-observation/live-fashionphile-identity-forensic.cjs",
  "services/market-intelligence/src/source-observation/fixtures/fashionphile/confirmation-product.json",
  "services/market-intelligence/src/identity-matching/normalize.cjs",
  "schemas/source-observation.v1.json",
];
for (const rel of files) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing: ${rel}`);
}

const fashionSrc = read("services/market-intelligence/src/source-observation/adapters/fashionphile.cjs");
const forensicSrc = read(
  "services/market-intelligence/src/source-observation/live-fashionphile-identity-forensic.cjs",
);
const normalizeSrc = read("services/market-intelligence/src/identity-matching/normalize.cjs");

if (!forensicSrc.includes("variants[].barcode")) {
  fail("forensic must inspect all-variant barcode");
}
if (!forensicSrc.includes("variantCount")) {
  fail("forensic must record variantCount");
}
if (!forensicSrc.includes("BLOCKED_NO_V1_USABLE_OWNER")) {
  fail("forensic must separate NO_OWNER from NO_V1_USABLE_OWNER");
}
if (fashionSrc.includes("identityHints")) {
  fail("fashionphile adapter must not write identityHints in this CASE B2 slice");
}
if (fashionSrc.includes("categoryHint")) {
  fail("fashionphile adapter must not write categoryHint without V1-usable owner");
}
if (fashionSrc.includes("product_type")) {
  fail("fashionphile adapter must not map product_type");
}
if (fashionSrc.includes("barcode")) {
  fail("fashionphile adapter must not read barcode until manufacturer GTIN is proven");
}
if (!normalizeSrc.includes("hintsOf") || !normalizeSrc.includes("meta.identityHints")) {
  fail("canonical GTIN path must stay meta.identityHints via hintsOf");
}

const fixture = JSON.parse(
  read("services/market-intelligence/src/source-observation/fixtures/fashionphile/confirmation-product.json"),
);
const fixtureVariant = fixture.product && fixture.product.variants && fixture.product.variants[0];
if (!fixtureVariant || fixtureVariant.barcode !== "000019560540") {
  fail("confirmation fixture must keep live-proven sanitized barcode");
}
if (fixture.product.product_type !== "Bags") {
  fail("confirmation fixture must keep owner-backed product_type");
}

const so = require(path.join(root, "services/market-intelligence/src/source-observation/index.cjs"));
const forensic = require(path.join(
  root,
  "services/market-intelligence/src/source-observation/live-fashionphile-identity-forensic.cjs",
));

const classified = forensic.classifyFashionphileIdentityDocument(fixture);
if (!classified.ok) fail(`fixture classify failed: ${classified.reason}`);
if (classified.caseId !== "B2") fail(`fixture case must be B2 got ${classified.caseId}`);
if (classified.FASHIONPHILE_OWNER_BACKED_IDENTITY !== "PARTIAL") {
  fail("fixture owner status must be PARTIAL");
}
if (classified.FASHIONPHILE_V1_USABLE_IDENTITY !== "BLOCKED_NO_V1_USABLE_OWNER") {
  fail("fixture V1 status must be BLOCKED_NO_V1_USABLE_OWNER");
}
if (classified.canonicalPaths.gtin !== "meta.identityHints.gtin") {
  fail("canonical GTIN path must be meta.identityHints.gtin");
}

const barcodeRow = (classified.ownerMap || []).find((row) => row.fieldPath === "variants[].barcode");
if (!barcodeRow || barcodeRow.v1MatchUseful !== false) {
  fail("sku-derived barcode must not be V1 useful");
}
if (!barcodeRow || barcodeRow.classification !== "SOURCE_LOCAL_ONLY") {
  fail("sku-derived barcode must stay SOURCE_LOCAL_ONLY");
}

const typeRow = (classified.ownerMap || []).find((row) => row.fieldPath === "product.product_type");
if (!typeRow || typeRow.ownerBacked !== true || typeRow.v1MatchUseful !== false) {
  fail("product_type Bags must be owner-backed and not V1 useful");
}

const parsed = so.fashionphile.parseFashionphileDocument({
  document: fixture,
  purpose: "CONFIRMATION",
  url: "https://www.fashionphile.com/products/hermes-epsom-mini-kelly-sellier-20-black-1956054.json",
});
if (!parsed.ok || !parsed.observation) {
  fail(`confirmation parse must succeed: ${parsed.reason || "no-obs"}`);
} else {
  const lock = forensic.parserDidNotEnrich(parsed.observation);
  if (!lock.ok) fail(`parser unexpectedly enriched: ${(lock.failures || []).join(",")}`);
  if (parsed.observation.meta.sku !== "1956054") fail("sku must remain source-local 1956054");
  if (parsed.observation.meta.brand !== "Hermes") fail("brand must remain vendor");
  if (parsed.observation.nativeAmount !== "34995.00" || parsed.observation.nativeCurrency !== "USD") {
    fail("price regression");
  }
  if (parsed.observation.displayAuthorized !== false) fail("image authorization regression");
  if (parsed.observation.parserVersion !== "fashionphile.public-json.1") {
    fail("parserVersion must stay fashionphile.public-json.1 when enrichment is 0");
  }
}

const matching = require(path.join(root, "services/market-intelligence/src/identity-matching/index.cjs"));
const gtin = matching.validGtin
  ? matching.validGtin("000019560540")
  : require(path.join(root, "services/market-intelligence/src/identity-matching/normalize.cjs")).validGtin(
      "000019560540",
    );
if (!gtin) fail("shape-only validGtin must still accept 12 digits — parser must refuse promotion anyway");

const left = {
  ...parsed.observation,
  id: "obs_fp_forensic",
};
const right = {
  id: "obs_ebay_forensic",
  source: "ebay",
  externalItemId: "v1|310|0",
  url: "https://www.ebay.com/itm/310",
  title: "Some product",
  imageUrl: "https://i.ebayimg.com/images/g/abc/s-l1600.jpg",
  nativeAmount: "10.00",
  nativeCurrency: "USD",
  observedAt: "2026-08-19T00:00:00.000Z",
  fetchedAt: "2026-08-19T00:00:00.000Z",
  observationPurpose: "CONFIRMATION",
  sourceStatus: "SUCCESS",
  parserVersion: "ebay.browse-api.1",
  displayAuthorized: false,
  meta: { priceKind: "listing_sale", brand: "Hermes", modelNumber: "1956054" },
};
const judged = matching.matchSourceObservations(left, right, { now: "2026-08-19T12:00:00.000Z" });
if (judged.decision === "MATCH") {
  fail("Fashionphile SKU must not MATCH eBay MPN");
}

const pkg = read("package.json");
if (!pkg.includes("verify:fashionphile-identity-forensic")) {
  fail("package.json missing verify:fashionphile-identity-forensic");
}
if (!read("tooling/verify/CATALOG.md").includes("fashionphile-identity-forensic")) {
  fail("CATALOG.md missing fashionphile-identity-forensic");
}
if (!read("tooling/verify/domain-by-path.cjs").includes("fashionphile-identity-forensic.cjs")) {
  fail("domain-by-path.cjs missing fashionphile-identity-forensic");
}
if (!read("tooling/verify/stubs/run-all.cjs").includes("fashionphile-identity-forensic.cjs")) {
  fail("stubs/run-all.cjs missing fashionphile-identity-forensic.cjs");
}

const live = spawnSync(
  process.execPath,
  [path.join(root, "services/market-intelligence/src/source-observation/live-fashionphile-identity-forensic.cjs")],
  { cwd: root, encoding: "utf8", timeout: 20000 },
);
if (live.status === 0) {
  if (!live.stdout.includes("BLOCKED_NO_V1_USABLE_OWNER") && !live.stdout.includes('"CASE": "A"')) {
    fail("live forensic exit 0 without CASE status");
  }
  if (live.stdout.includes('"parserEnrichment": "UNEXPECTED"')) {
    fail("live parser must not enrich identity");
  }
} else if (live.status === 2) {
  // ACCESS_BLOCKED — fixture PASS를 live PASS로 쓰지 않음
} else {
  fail(`live forensic unexpected status ${live.status}: ${live.stderr || live.stdout}`);
}

if (fails.length) {
  console.error("[verify:fashionphile-identity-forensic] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:fashionphile-identity-forensic] PASS (all-variant forensic · SKU-derived barcode not GTIN · Bags != luxury_bag · parser enrichment 0)",
);

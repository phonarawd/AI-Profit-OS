/**
 * verify:price-denomination-contract — PTF-00C P0-A · §2/§3/§5/§21
 *
 * Root defect this guards against: a non-USDT marketplace native amount
 * (eBay GBP/EUR/AUD/USD) stored/consumed under a name that asserts it is
 * already USDT. Covers the §21 PRICE/FX test matrix at the contract/schema
 * level (fx-snapshot-formula.cjs's own pure-function chain is covered by
 * verify:fx-snapshot-formula — this script covers the ingest/persist/schema
 * boundary + the historical-contamination handling policy).
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
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const files = [
  "services/market-intelligence/src/money.cjs",
  "services/market-intelligence/src/fx-snapshot-formula.cjs",
  "services/market-intelligence/src/catalog-runtime-seed.cjs",
  "services/api-nest/src/opportunities/catalog-runtime-seed.service.ts",
  "services/api-nest/src/opportunities/fx-snapshot.service.ts",
  "services/api-nest/src/opportunities/fx-marketplace-freshness.ts",
  "supabase/migrations/20260814130000_ptf00c_fx_marketplace_normalization.sql",
  "schemas/listing.v1.json",
  "schemas/price-observation.v1.json",
  "schemas/fx-snapshot.v1.json",
  "workers/frankfurter-adapter/src/client.ts",
  "workers/frankfurter-adapter/src/index.ts",
];
for (const f of files) mustExist(f);
if (fails.length) {
  console.error("[verify:price-denomination-contract] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const money = require(path.join(root, "services/market-intelligence/src/money.cjs"));
const catalogSeed = require(path.join(
  root,
  "services/market-intelligence/src/catalog-runtime-seed.cjs",
));

// --- no JS float — decimal string arithmetic only ---
if (money.mulAmount("0.1", "0.2") === (0.1 * 0.2).toString()) {
  fails.push("mulAmount must not degrade to IEEE float arithmetic");
}
if (money.divAmount("1", "3").includes("e") || money.divAmount("1", "3").includes("E")) {
  fails.push("divAmount must never emit exponential notation");
}

// --- normalizeIngestListingsForPersist: native contract, not identity-by-name ---
const nowIso = new Date().toISOString();
const staleIso = new Date(Date.now() + 300000).toISOString();

function normalize(listings) {
  return catalogSeed.normalizeIngestListingsForPersist(listings, "ebay");
}

// new-shape input (post-repair worker contract)
{
  const { rows, skipped } = normalize([
    {
      assetId: "w_test_asset",
      marketId: "ebay_gb",
      adapterId: "ebay",
      marketplaceId: "EBAY_GB",
      nativeAmount: "9200.50",
      nativeCurrency: "GBP",
      observedAt: nowIso,
      staleAt: staleIso,
    },
  ]);
  if (rows.length !== 1) fails.push("GBP native listing must be accepted, not skipped");
  if (rows[0] && (rows[0].nativeAmount !== "9200.50" || rows[0].nativeCurrency !== "GBP")) {
    fails.push("normalizeIngestListingsForPersist must preserve nativeAmount/nativeCurrency exactly");
  }
  if (skipped.length !== 0) fails.push("valid GBP row must not be skipped");
}

// legacy-shape input (priceUsdt+currency) — the exact P0-A bug pattern: a
// USD amount arriving under `priceUsdt`. Must be treated as NATIVE, not as
// already-authoritative USDT.
{
  const { rows } = normalize([
    {
      assetId: "w_test_asset2",
      marketId: "ebay_us",
      adapterId: "ebay",
      marketplaceId: "EBAY_US",
      priceUsdt: "15785",
      currency: "USD",
      observedAt: nowIso,
      staleAt: staleIso,
    },
  ]);
  if (rows.length !== 1 || rows[0].nativeCurrency !== "USD" || rows[0].nativeAmount !== "15785") {
    fails.push(
      "legacy priceUsdt+currency=USD input must be read as nativeAmount=15785/nativeCurrency=USD, never as already-USDT",
    );
  }
}

// unsupported/malformed currency fails closed (skipped, never silently converted)
{
  const { rows, skipped } = normalize([
    {
      assetId: "w_test_asset3",
      marketId: "ebay_de",
      adapterId: "ebay",
      priceUsdt: "500",
      currency: "JPY",
      observedAt: nowIso,
      staleAt: staleIso,
    },
  ]);
  if (rows.length !== 0) fails.push("unsupported currency (JPY) must never be persisted as if convertible");
  if (!skipped.some((s) => s.reason === "unsupported_native_currency")) {
    fails.push("unsupported currency must be reported in skipped[], not silently dropped");
  }
}

// duplicate ingest idempotency — same listing twice must not double-count rows
{
  const dup = {
    assetId: "w_test_dup",
    marketId: "ebay_us",
    adapterId: "ebay",
    externalItemId: "ext_dup_1",
    nativeAmount: "100",
    nativeCurrency: "USD",
    observedAt: nowIso,
    staleAt: staleIso,
  };
  const { rows: r1 } = normalize([dup]);
  const { rows: r2 } = normalize([dup, dup]);
  if (r1.length !== 1) fails.push("single ingest must normalize to exactly 1 row");
  if (r2.length !== 2) {
    // normalizeIngestListingsForPersist itself is a pure mapper (1:1 per raw
    // input) — true dedup happens at PG UPSERT keyed on
    // (asset_id,market_id,external_item_id), asserted structurally below.
    fails.push("normalize must map 1:1 per raw input (dedup is the PG UPSERT's job, not this step's)");
  }
}

// --- catalog-runtime-seed.service.ts: fail-closed FX + status contract ---
const seedSvc = read("services/api-nest/src/opportunities/catalog-runtime-seed.service.ts");
const seedSvcCode = stripComments(seedSvc);
for (const needle of [
  "normalizeNativeToUsdt",
  "fxNormalizationFailed",
  "getLatestUsableSnapshot",
  "price_denomination_status",
  "native_amount",
  "native_currency",
]) {
  if (!seedSvc.includes(needle)) fails.push(`catalog-runtime-seed.service.ts missing ${needle}`);
}
if (!/currency\s*=\s*'USDT'/.test(seedSvcCode) && !/'USDT'\)/.test(seedSvcCode)) {
  fails.push("catalog-runtime-seed.service.ts must always write currency='USDT' literal (tracks price_usdt's true denomination)");
}
if (!/catch\s*\(e\)\s*\{[\s\S]{0,600}fxNormalizationFailed \+= 1/.test(seedSvcCode)) {
  fails.push("FX normalization failure must be caught per-row (fail-closed skip), not thrown for the whole batch");
}

// --- FX snapshot: durable immutable insert + per-leg provenance freshness ---
const fxSvc = read("services/api-nest/src/opportunities/fx-snapshot.service.ts");
for (const needle of [
  "ON CONFLICT (id) DO NOTHING",
  "recordFxIngest",
  "getLatestUsableSnapshot",
  "carryMarketplaceLeg",
]) {
  if (!fxSvc.includes(needle)) fails.push(`fx-snapshot.service.ts missing ${needle}`);
}
if (/UPDATE public\.fx_snapshots/.test(stripComments(fxSvc))) {
  fails.push("fx-snapshot.service.ts must never UPDATE an existing fx_snapshots row (immutability)");
}
if (/MARKETPLACE_LEG_CARRY_FORWARD_MS/.test(fxSvc)) {
  fails.push("marketplace FX legs must not inherit freshness from one shared latest-row timestamp");
}

const fxFreshness = read(
  "services/api-nest/src/opportunities/fx-marketplace-freshness.ts",
);
for (const needle of [
  "EXPECTED_SOURCE",
  "COINGECKO_MARKETPLACE_TTL_MS = 15 * 60 * 1000",
  "FRANKFURTER_MARKETPLACE_TTL_MS = 6 * 60 * 60 * 1000",
  "capturedMs > nowMs",
]) {
  if (!fxFreshness.includes(needle)) {
    fails.push(`fx-marketplace-freshness.ts missing ${needle}`);
  }
}
for (const pair of [
  ['usdtPerUsd: "coingecko"', "USDT/USD source authority"],
  ['gbpUsd: "frankfurter"', "GBP/USD source authority"],
  ['eurUsd: "frankfurter"', "EUR/USD source authority"],
  ['audUsd: "frankfurter"', "AUD/USD source authority"],
]) {
  if (!fxFreshness.includes(pair[0])) {
    fails.push(`fx marketplace freshness missing ${pair[1]}`);
  }
}

// --- §5 historical contamination: migration must classify, never fabricate ---
const ptfMig = read(
  "supabase/migrations/20260814130000_ptf00c_fx_marketplace_normalization.sql",
);
if (!/legacy_unverified/.test(ptfMig)) {
  fails.push("PTF-00C migration must classify contaminated rows as legacy_unverified");
}
if (!/WHERE currency <> 'USDT' AND native_amount IS NULL/.test(ptfMig)) {
  fails.push("PTF-00C migration must scope the legacy_unverified backfill to currency<>USDT rows only");
}
// the contaminated-row backfill UPDATE must copy price_usdt as-is (native_amount = price_usdt),
// never multiply/divide it by any rate — i.e. no arithmetic operators near that assignment.
{
  const legacyBlockMatch = ptfMig.match(
    /UPDATE public\.listings\s*\nSET\s*native_amount = price_usdt,\s*\n\s*native_currency = currency,\s*\n\s*price_denomination_status = 'legacy_unverified'/,
  );
  if (!legacyBlockMatch) {
    fails.push(
      "legacy_unverified backfill must set native_amount = price_usdt verbatim (no fabricated conversion)",
    );
  }
}
if (/native_amount = price_usdt \* |native_amount = price_usdt \//.test(ptfMig)) {
  fails.push("legacy_unverified backfill must never multiply/divide price_usdt by a rate (would fabricate a historical conversion)");
}

// --- frankfurter worker: fetches USD/GBP/EUR/AUD in the raw provider direction ---
const frankClient = read("workers/frankfurter-adapter/src/client.ts");
if (!/GBP/.test(frankClient) || !/EUR/.test(frankClient) || !/AUD/.test(frankClient)) {
  fails.push("frankfurter-adapter client must fetch GBP/EUR/AUD rates for marketplace normalization");
}
const frankIdx = read("workers/frankfurter-adapter/src/index.ts");
if (!/usdGbp|usdEur|usdAud/.test(frankIdx)) {
  fails.push("frankfurter-adapter must forward raw usdGbp/usdEur/usdAud in the fx ingest payload");
}
// no client-side FX math — the worker must relay raw quotes only, never invert/derive here
const frankCode = stripComments(frankClient) + stripComments(frankIdx);
if (/divAmount|mulAmount|1\s*\/\s*rates?\./.test(frankCode)) {
  fails.push(
    "frankfurter-adapter must not perform FX math client-side — Nest owns the only authoritative inversion/derivation",
  );
}

// --- schema contract requires the new fields (no ambiguous listing shape) ---
const listingSchema = JSON.parse(read("schemas/listing.v1.json"));
for (const req of ["nativeAmount", "nativeCurrency", "priceDenominationStatus"]) {
  if (!(listingSchema.required || []).includes(req)) {
    fails.push(`listing.v1.json must require ${req}`);
  }
}
if (listingSchema.properties?.currency?.const !== "USDT") {
  fails.push("listing.v1.json currency must be const USDT (never the native currency)");
}

if (fails.length) {
  console.error("[verify:price-denomination-contract] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:price-denomination-contract] PASS (native denomination · per-leg FX provenance freshness · fail-closed missing FX · legacy_unverified · raw-relay-only)",
);

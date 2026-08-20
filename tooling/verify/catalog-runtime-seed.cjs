/**
 * verify:catalog-runtime-seed — Engine §0.9 E-R6
 * Admin vertical seeds + ebay ingest-shaped listings → opportunities
 * Day-1 CHECK(ebay|admin) · amazon/yahoo INSERT 시도 0 · assetImageUrl 가드
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
  "services/market-intelligence/src/catalog-runtime-seed.cjs",
  "services/market-intelligence/src/pipeline.cjs",
  "services/api-nest/src/opportunities/catalog-runtime-seed.service.ts",
  "services/api-nest/src/opportunities/opportunity-reprice.service.ts",
  "supabase/migrations/20260809144814_catalog_runtime_day1_fx_bootstrap.sql",
  "services/market-intelligence/src/trading-card-seed.cjs",
  "services/market-intelligence/src/luxury-bag-seed.cjs",
  "services/market-intelligence/src/watch-seed.cjs",
];
for (const f of files) mustExist(f);

if (fails.length) {
  console.error("[verify:catalog-runtime-seed] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const mi = require(path.join(
  root,
  "services/market-intelligence/src/catalog-runtime-seed.cjs",
));
const pipeline = require(path.join(
  root,
  "services/market-intelligence/src/pipeline.cjs",
));
const svc = read(
  "services/api-nest/src/opportunities/catalog-runtime-seed.service.ts",
);
const reprice = read(
  "services/api-nest/src/opportunities/opportunity-reprice.service.ts",
);
const adminSvc = read(
  "services/api-nest/src/opportunities/opportunities.admin.service.ts",
);
const routes = read("services/api-nest/src/opportunities/opportunities.routes.ts");
const ctrl = read(
  "services/api-nest/src/opportunities/opportunities.admin.controller.ts",
);
const mod = read("services/api-nest/src/opportunities/opportunities.module.ts");
const adapters = read(
  "services/api-nest/src/adapters/adapters.admin.service.ts",
);
const adaptersMod = read("services/api-nest/src/adapters/adapters.module.ts");
const mig = read(
  "supabase/migrations/20260809144814_catalog_runtime_day1_fx_bootstrap.sql",
);
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");

// --- builder invariants ---
const plan = mi.buildMinCatalogRuntimeSeed();
if (!plan.assets || plan.assets.length < 1) {
  fails.push("listDay1AssetMasters must yield ≥1 asset");
}
if (!plan.bundles || plan.bundles.length < 1) {
  fails.push("bundles must be ≥1");
}
const crTrue = plan.bundles.filter(
  (b) => b.opportunity.pricing.compareReady === true,
).length;
const crFalse = plan.bundles.filter(
  (b) => b.opportunity.pricing.compareReady === false,
).length;
if (crTrue < 1) fails.push("compareReady true count must be ≥1");
if (crFalse < 1) fails.push("compareReady false count must be ≥1 (일부 true)");
const available = plan.bundles.filter(
  (b) => b.opportunity.status === "available",
).length;
if (available < 1) fails.push("available opportunities in plan must be ≥1");

for (const b of plan.bundles) {
  for (const L of b.listings) {
    if (L.adapterId !== "ebay" && L.adapterId !== "admin") {
      fails.push(`listing adapter must be ebay|admin got ${L.adapterId}`);
    }
    if (["amazon", "yahoo_jp"].includes(String(L.adapterId))) {
      fails.push(`FORBIDDEN listing adapter ${L.adapterId}`);
    }
    if (["amazon", "yahoo_jp"].includes(String(L.marketId))) {
      fails.push(`FORBIDDEN marketId ${L.marketId}`);
    }
  }
  if (b.opportunity.status === "available") {
    if (!b.opportunity.assetImageUrl) {
      fails.push("available opportunity missing assetImageUrl");
    }
    if (b.publishGuard.canPublish !== true) {
      fails.push("available must pass canAutoPublishAvailable");
    }
    if (b.publishGuard.imageGuard.ok !== true) {
      fails.push(
        `available imageGuard fails: ${b.publishGuard.imageGuard.fails}`,
      );
    }
  }
}

if (plan.forbiddenInsertAttempts.length !== 0) {
  fails.push("forbiddenInsertAttempts must be []");
}
if (plan.day1LegPair.buy !== "ebay_us" || plan.day1LegPair.sell !== "ebay_gb") {
  fails.push("Day-1 P0 leg must be ebay_us×ebay_gb");
}
if (plan.fx.fxSnapshotId !== mi.DAY1_FX_SNAPSHOT_ID) {
  fails.push("fx snapshot id drift");
}

// amazon/yahoo normalize must throw (INSERT 시도 0)
let amazonThrew = false;
try {
  mi.normalizeIngestListingsForPersist([], "amazon");
} catch {
  amazonThrew = true;
}
if (!amazonThrew) fails.push("amazon ingest persist must throw");
let yahooThrew = false;
try {
  mi.normalizeIngestListingsForPersist([], "yahoo_jp");
} catch {
  yahooThrew = true;
}
if (!yahooThrew) fails.push("yahoo_jp ingest persist must throw");

// preview query: placeholders skipped (no FK blow-up)
const { rows: skippedRows } = mi.normalizeIngestListingsForPersist(
  [
    {
      assetId: "query:rolex",
      marketId: "ebay_us",
      adapterId: "ebay",
      priceUsdt: "100",
    },
  ],
  "ebay",
);
if (skippedRows.length !== 0) {
  fails.push("query: asset placeholders must be skipped for PG persist");
}

// --- Nest wiring ---
if (!svc.includes("ensureMinCatalog")) {
  fails.push("CatalogRuntimeSeedService missing ensureMinCatalog");
}
if (!svc.includes("persistIngestListings")) {
  fails.push("CatalogRuntimeSeedService missing persistIngestListings");
}
if (!svc.includes("OnModuleInit")) {
  fails.push("CatalogRuntimeSeedService must OnModuleInit ensure");
}
if (!svc.includes("seedTradingCardAssets")) {
  fails.push("must reuse Admin seedTradingCardAssets");
}
if (!svc.includes("seedLuxuryBagAssets")) {
  fails.push("must reuse Admin seedLuxuryBagAssets");
}
if (!svc.includes("seedWatchAssets")) {
  fails.push("must reuse Admin seedWatchAssets");
}
if (!routes.includes('catalogRuntimeSeed: "opportunities/catalog/runtime-seed"')) {
  fails.push("OPPORTUNITY_ADMIN_ROUTES.catalogRuntimeSeed missing");
}
if (!ctrl.includes("catalogRuntimeSeed")) {
  fails.push("Admin controller missing catalogRuntimeSeed POST");
}
if (!mod.includes("CatalogRuntimeSeedService")) {
  fails.push("OpportunitiesModule must provide CatalogRuntimeSeedService");
}
if (!adapters.includes("persistIngestListings")) {
  fails.push("AdaptersAdminService ingest must call persistIngestListings");
}
if (!adaptersMod.includes("OpportunitiesModule")) {
  fails.push("AdaptersModule must import OpportunitiesModule for persist");
}
if (!mig.includes("fx_day1_runtime_seed")) {
  fails.push("migration must bootstrap fx_day1_runtime_seed");
}
if (!pkg.includes('"verify:catalog-runtime-seed"')) {
  fails.push("package.json missing verify:catalog-runtime-seed");
}
if (!catalog.includes("catalog-runtime-seed")) {
  fails.push("CATALOG.md missing catalog-runtime-seed");
}

if (!svc.includes("FORBIDDEN_INGEST_ADAPTERS")) {
  fails.push("catalog seed service must reject amazon/yahoo via FORBIDDEN_INGEST_ADAPTERS");
}

// --- seed AS-OF (listing 300s 유지 · opportunity expiry 복사 금지) ---
const observedAt = "2026-08-19T00:00:00.000Z";
const asOfPlan = mi.buildMinCatalogRuntimeSeed({ observedAt });
for (const b of asOfPlan.bundles) {
  if (b.opportunity.pricedAt !== observedAt) {
    fails.push("seed opportunity.pricedAt must be compute/observed as-of");
  }
  if (b.opportunity.staleAt !== b.opportunity.pricedAt) {
    fails.push("SEED: opportunity.staleAt must equal pricedAt (AS-OF)");
  }
  for (const L of b.listings) {
    const listingMs = Date.parse(L.staleAt);
    const observedMs = Date.parse(L.observedAt);
    if (listingMs - observedMs !== mi.LISTING_STALE_SEC * 1000) {
      fails.push("listing.staleAt must stay observedAt + LISTING_STALE_SEC (300s)");
    }
    if (L.staleAt === b.opportunity.staleAt) {
      fails.push("opportunity.staleAt must not copy listing expiry");
    }
  }
}

// --- resolver fixture ---
if (typeof pipeline.resolveStoredLegListingPrices !== "function") {
  fails.push("pipeline must export resolveStoredLegListingPrices");
} else {
  const unique = pipeline.resolveStoredLegListingPrices({
    listings: [
      { marketId: "ebay_us", priceUsdt: "100" },
      { marketId: "ebay_gb", priceUsdt: "160" },
    ],
    buyMarketId: "ebay_us",
    sellMarketId: "ebay_gb",
  });
  if (
    !unique.ok ||
    unique.buyPriceUsdt !== "100" ||
    unique.sellPriceUsdt !== "160"
  ) {
    fails.push("RESOLVER: unique pair must return buy/sell prices");
  }
  const extra = pipeline.resolveStoredLegListingPrices({
    listings: [
      { marketId: "ebay_us", priceUsdt: "100" },
      { marketId: "ebay_us", priceUsdt: "14995" },
      { marketId: "ebay_gb", priceUsdt: "160" },
    ],
    buyMarketId: "ebay_us",
    sellMarketId: "ebay_gb",
  });
  if (extra.ok) fails.push("RESOLVER: extra listing on a leg must fail-closed");
  const missing = pipeline.resolveStoredLegListingPrices({
    listings: [{ marketId: "ebay_us", priceUsdt: "100" }],
    buyMarketId: "ebay_us",
    sellMarketId: "ebay_gb",
  });
  if (missing.ok) fails.push("RESOLVER: missing sell leg must fail-closed");
}

// --- SOURCE: persist 후 canonical owner · ingest formula 복제 0 · seed skip 유지 ---
if (!svc.includes("repriceFromCurrentListings")) {
  fails.push("SOURCE: persistIngestListings must call repriceFromCurrentListings");
}
if (!mod.includes("OpportunityRepriceService")) {
  fails.push("SOURCE: OpportunitiesModule must provide OpportunityRepriceService");
}
if (svc.includes("computeOpportunityPricing")) {
  fails.push("SOURCE: catalog seed persist must not copy computeOpportunityPricing");
}
if (adapters.includes("computeOpportunityPricing")) {
  fails.push("SOURCE: adapters ingest must not copy computeOpportunityPricing");
}
if (adapters.includes("resolveStoredLegListingPrices")) {
  fails.push("SOURCE: adapters ingest must not resolve listing legs itself");
}
if (!svc.includes('reason: "min catalog already present"')) {
  fails.push("SEED skip: existing catalog must still short-circuit refresh");
}
if (!/if \(existing\.rows\[0\]\) return false/.test(svc)) {
  fails.push("SEED skip: existing opportunity row must not be overwritten");
}

// --- FAILURE: resolve fail → stale_at 미변경 ---
if (!reprice.includes("resolveStoredLegListingPrices")) {
  fails.push("FAILURE: reprice owner must use resolveStoredLegListingPrices");
}
if (!/if\s*\(\s*!resolved\.ok\s*\)\s*return null/.test(reprice)) {
  fails.push("FAILURE: resolve fail must skip persist (stale_at unchanged)");
}
{
  const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  if (
    /stale_at\s*=\s*now\(\)/.test(code(reprice)) ||
    /stale_at\s*=\s*now\(\)/.test(code(adminSvc))
  ) {
    fails.push("FAILURE: standalone stale_at = now() is forbidden");
  }
}

// --- ADMIN: compute 성공 시 stale_at === priced_at (같은 as-of bind) ---
if (!adminSvc.includes("persistComputedPricing")) {
  fails.push("ADMIN: patchPricing must persist via canonical owner");
}
if (!/priced_at = \$4::timestamptz,\s*stale_at = \$4::timestamptz/.test(reprice)) {
  fails.push("ADMIN: persist must write priced_at and stale_at as the same as-of");
}

if (fails.length) {
  console.error("[verify:catalog-runtime-seed] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:catalog-runtime-seed] PASS (Admin seeds · ebay ingest shape · compareReady mixed · Day-1 ebay|admin · amazon/yahoo INSERT 0)",
);

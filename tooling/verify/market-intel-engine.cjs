/**
 * verify:market-intel-engine — Engine §0.0 A/B/C contract surface
 * Asset Master · pipeline · FORBIDDEN0 · Admin opportunities · yahoo_jp0
 * (formula numerics covered by pricing-formula / fx-snapshot-formula)
 */
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

const files = [
  "services/market-intelligence/src/index.cjs",
  "services/market-intelligence/src/pipeline.cjs",
  "services/market-intelligence/src/asset-master.cjs",
  "services/market-intelligence/src/forbidden.cjs",
  "services/api-nest/src/opportunities/opportunities.module.ts",
  "services/api-nest/src/opportunities/opportunities.admin.controller.ts",
  "services/api-nest/src/opportunities/opportunities.admin.service.ts",
  "services/api-nest/src/opportunities/opportunities.routes.ts",
  "services/api-nest/src/opportunities/opportunities.events.ts",
  "schemas/asset-master.v1.json",
  "schemas/listing.v1.json",
  "schemas/price-observation.v1.json",
  "schemas/fx-snapshot.v1.json",
  "apps/admin/app/admin/opportunities/page.tsx",
];
for (const f of files) mustExist(f);

const pipeline = require(path.join(
  root,
  "services/market-intelligence/src/pipeline.cjs",
));
for (const stage of [
  "asset_master_seed",
  "listing_observe",
  "fx_snapshot",
  "spread_compute",
  "opportunity_publish",
]) {
  if (!pipeline.PIPELINE_STAGES.includes(stage)) {
    fails.push(`pipeline missing stage ${stage}`);
  }
}
if (!pipeline.PUBLISH_GUARDS.yahooJpForbidden) {
  fails.push("PUBLISH_GUARDS.yahooJpForbidden must be true");
}

const forbidden = require(path.join(
  root,
  "services/market-intelligence/src/forbidden.cjs",
));
if (forbidden.FORBIDDEN_MARKET_IDS.includes("yahoo_jp")) {
  fails.push("FORBIDDEN_MARKET_IDS must not include yahoo_jp (v7.22.41 partner)");
}
if (forbidden.isForbiddenAdapterId("yahoo_jp") || forbidden.isForbiddenAdapterId("amazon")) {
  fails.push("partner adapters yahoo_jp/amazon must not be forbidden");
}

const asset = require(path.join(
  root,
  "services/market-intelligence/src/asset-master.cjs",
));
const norm = asset.normalizeAssetMaster({
  assetId: "sku_test_1",
  category: "watch",
  assetLabel: "Rolex Test",
  imageUrl: "https://example.com/a.png",
  imageSource: "admin_r2",
});
if (norm.imageRightsNoteKo !== "시세 참고용") {
  fails.push("imageRightsNoteKo must be 시세 참고용");
}

// --- Admin contract ---
const routes = fs.readFileSync(
  path.join(
    root,
    "services/api-nest/src/opportunities/opportunities.routes.ts",
  ),
  "utf8",
);
for (const needle of [
  "opportunities/:id/pricing",
  "compareReady",
  "gradeMismatch",
  "image_missing",
  "capitalBand",
  "opportunities/assets",
]) {
  if (!routes.includes(needle)) {
    fails.push(`opportunities.routes missing ${needle}`);
  }
}

const ctrl = fs.readFileSync(
  path.join(
    root,
    "services/api-nest/src/opportunities/opportunities.admin.controller.ts",
  ),
  "utf8",
);
if (!ctrl.includes("patchPricing") || !ctrl.includes("@Patch")) {
  fails.push("admin controller must expose PATCH pricing");
}

const svc = fs.readFileSync(
  path.join(
    root,
    "services/api-nest/src/opportunities/opportunities.admin.service.ts",
  ),
  "utf8",
);
for (const needle of [
  "computeOpportunityPricing",
  "OPPORTUNITY_EVENTS.priceUpdated",
  "expectedPricingVersion",
  "PRICE_STALE",
]) {
  if (!svc.includes(needle)) {
    fails.push(`admin service missing ${needle}`);
  }
}
const events = fs.readFileSync(
  path.join(
    root,
    "services/api-nest/src/opportunities/opportunities.events.ts",
  ),
  "utf8",
);
if (!events.includes("opportunity.price.updated")) {
  fails.push("events must define opportunity.price.updated");
}

const appMod = fs.readFileSync(
  path.join(root, "services/api-nest/src/app.module.ts"),
  "utf8",
);
if (!appMod.includes("OpportunitiesModule")) {
  fails.push("AppModule must import OpportunitiesModule");
}

const nestPkg = JSON.parse(
  fs.readFileSync(path.join(root, "services/api-nest/package.json"), "utf8"),
);
if (!nestPkg.dependencies?.["@aipo/market-intelligence"]) {
  fails.push("api-nest must depend on @aipo/market-intelligence");
}

const adminPage = fs.readFileSync(
  path.join(root, "apps/admin/app/admin/opportunities/page.tsx"),
  "utf8",
);
for (const needle of [
  "compareReady",
  "gradeMismatch",
  "image_missing",
  "capitalBand",
  "tab=assets",
]) {
  if (!adminPage.includes(needle)) {
    fails.push(`admin opportunities page missing contract marker ${needle}`);
  }
}

const routesTs = fs.readFileSync(
  path.join(root, "apps/admin/routes.ts"),
  "utf8",
);
if (!routesTs.includes("/admin/opportunities?tab=assets")) {
  fails.push("ADMIN_CHILD_ROUTES must keep opportunities?tab=assets");
}
if (routesTs.includes('"/admin/assets"')) {
  fails.push("independent /admin/assets route FORBIDDEN");
}

const manifest = fs.readFileSync(
  path.join(root, "schemas/manifest.day1.json"),
  "utf8",
);
for (const f of [
  "fx-snapshot.v1.json",
  "listing.v1.json",
  "price-observation.v1.json",
  "asset-master.v1.json",
]) {
  if (!manifest.includes(f)) fails.push(`manifest.day1 missing ${f}`);
}

// Day-1 MARKET_IDS exclude partner markets (auto-publish)
const markets = require(path.join(
  root,
  "services/market-intelligence/src/markets.cjs",
));
if (markets.MARKET_IDS.includes("yahoo_jp") || markets.MARKET_IDS.includes("amazon_us")) {
  fails.push("Day-1 MARKET_IDS must not include yahoo_jp/amazon_*");
}

if (fails.length) {
  console.error("[verify:market-intel-engine] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:market-intel-engine] PASS (Asset Master·pipeline·Admin §36·Day-1 ebay|admin)",
);

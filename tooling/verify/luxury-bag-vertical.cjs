/**
 * verify:luxury-bag-vertical — Engine §0.0
 * luxury_bag seed 10~25 · Asset Master admin_r2 image ·
 * ebay multi|admin quotes · brand+model match · 필터칩 가방
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

mustExist("services/market-intelligence/src/luxury-bag-seed.cjs");
mustExist("services/market-intelligence/src/bag-match.cjs");
mustExist("apps/admin/app/admin/opportunities/page.tsx");
mustExist("workers/ebay-adapter/src/index.ts");
mustExist("packages/ui/copy/ko/opportunity.ts");

const mi = require(path.join(root, "services/market-intelligence/src/index.cjs"));

// --- seed invariants ---
const inv = mi.assertLuxuryBagSeedInvariants();
if (!inv.ok) {
  for (const f of inv.fails) fails.push(`seed: ${f}`);
}
if (inv.counts.total < 10 || inv.counts.total > 25) {
  fails.push(`seed count ${inv.counts.total} not in 10~25`);
}
for (const brand of ["Hermès", "Chanel", "Louis Vuitton"]) {
  if (!inv.counts.byBrand[brand]) {
    fails.push(`seed missing brand ${brand}`);
  }
}

const masters = mi.luxuryBagSeedsAsAssetMasters();
if (masters.length !== inv.counts.total) {
  fails.push("luxuryBagSeedsAsAssetMasters length drift");
}
for (const m of masters) {
  if (m.category !== "luxury_bag") fails.push(`${m.assetId} category≠luxury_bag`);
  if (m.imageSource !== "admin_r2") {
    fails.push(`${m.assetId} imageSource≠admin_r2`);
  }
  if (m.imageRightsNoteKo !== "시세 참고용") {
    fails.push(`${m.assetId} imageRightsNoteKo`);
  }
  if (mi.assetIconForCategory("luxury_bag") !== "👜") {
    fails.push("luxury_bag icon must be 👜");
  }
}

// --- bag match · fuzzy alone forbidden ---
const exact = mi.evaluateBagListingMatch({
  assetMeta: {
    brand: "Hermès",
    model: "Birkin",
    size: "30",
    color: "Gold",
  },
  listingMeta: {
    brand: "Hermes",
    model: "Birkin",
    size: "30",
    color: "Gold",
  },
});
if (!exact.canAutoPublish) {
  fails.push("exact brand+model+size+color must canAutoPublish");
}

const fuzzyOnly = mi.evaluateBagListingMatch({
  assetMeta: {
    brand: "Chanel",
    model: "Classic Flap",
    size: "Medium",
    color: "Black",
  },
  listingMeta: {
    brand: "Chanel",
    model: "Classic Flap",
    size: "Small",
    color: "Beige",
  },
});
if (fuzzyOnly.canAutoPublish) {
  fails.push("size/color diverge must NOT auto-publish");
}
if (!fuzzyOnly.fuzzyAloneForbidden) {
  fails.push("size/color diverge must set fuzzyAloneForbidden");
}

const brandMiss = mi.evaluateBagListingMatch({
  assetMeta: { brand: "Louis Vuitton", model: "Neverfull", size: "MM" },
  listingMeta: { brand: "Chanel", model: "Neverfull", size: "MM" },
});
if (brandMiss.canAutoPublish || brandMiss.identity.fuzzy) {
  fails.push("brand mismatch must not exact/fuzzy");
}

// --- ebay queries + adapter defaults ---
const ebayQs = mi.luxuryBagEbayQueries();
if (ebayQs.length < 8) fails.push(`ebay queries ${ebayQs.length} < 8`);

const ebayIdx = read("workers/ebay-adapter/src/index.ts");
for (const needle of [
  "Hermes Birkin",
  "Chanel Classic Flap",
  "Louis Vuitton Neverfull",
  "DEFAULT_SEARCH_QUERIES",
]) {
  if (!ebayIdx.includes(needle)) {
    fails.push(`ebay-adapter defaults missing ${needle}`);
  }
}

// --- filter chip 가방 (Engine SSOT + UI copy + Admin) ---
const catLabels = mi.CATEGORY_FILTER_CHIPS.map((c) => c.labelKo);
for (const label of ["전체", "시계", "카드", "가방"]) {
  if (!catLabels.includes(label)) {
    fails.push(`CATEGORY_FILTER_CHIPS missing ${label}`);
  }
}
const bagChip = mi.CATEGORY_FILTER_CHIPS.find((c) => c.key === "luxury_bag");
if (!bagChip || bagChip.labelKo !== "가방" || bagChip.category !== "luxury_bag") {
  fails.push("luxury_bag filter chip must be 가방");
}

const oppCopy = read("packages/ui/copy/ko/opportunity.ts");
for (const needle of [
  'filterCategoryBag: "가방"',
  'filterCategoryWatch: "시계"',
  'filterCategoryCard: "카드"',
  'filterCategoryAll: "전체"',
]) {
  if (!oppCopy.includes(needle)) {
    fails.push(`opportunity copy missing ${needle}`);
  }
}

const adminPage = read("apps/admin/app/admin/opportunities/page.tsx");
for (const needle of [
  'data-filter="category"',
  'data-category="luxury_bag"',
  "가방",
  "luxury_bag",
  "seed/luxury-bag",
]) {
  if (!adminPage.includes(needle)) {
    fails.push(`admin opportunities missing ${needle}`);
  }
}

const routes = read(
  "services/api-nest/src/opportunities/opportunities.routes.ts",
);
for (const needle of ["seedLuxuryBags", "evaluateBagMatch"]) {
  if (!routes.includes(needle)) {
    fails.push(`opportunities.routes missing ${needle}`);
  }
}

const ctrl = read(
  "services/api-nest/src/opportunities/opportunities.admin.controller.ts",
);
if (!ctrl.includes("seedLuxuryBags") || !ctrl.includes("evaluateBagMatch")) {
  fails.push("admin controller must expose seedLuxuryBags + evaluateBagMatch");
}

const svc = read(
  "services/api-nest/src/opportunities/opportunities.admin.service.ts",
);
for (const needle of [
  "seedLuxuryBagAssets",
  "evaluateBagMatch",
  "evaluateBagListingMatch",
  "luxuryBagSeedsAsAssetMasters",
]) {
  if (!svc.includes(needle)) {
    fails.push(`admin service missing ${needle}`);
  }
}

const schema = read("schemas/asset-master.v1.json");
for (const needle of [
  "luxury_bag",
  '"brand"',
  '"model"',
  "ebayQuery",
  "listingLegs",
  "admin_r2",
]) {
  if (!schema.includes(needle)) {
    fails.push(`asset-master.v1 missing ${needle}`);
  }
}

const pkg = read("package.json");
if (!pkg.includes('"verify:luxury-bag-vertical"')) {
  fails.push("package.json missing verify:luxury-bag-vertical script");
}

// Day-1 seeds must not use partner yahoo/amazon listing legs
for (const row of mi.listLuxuryBagSeeds()) {
  const legs = row.meta.listingLegs || [];
  if (
    legs.includes("yahoo_jp") ||
    legs.some((l) => String(l).startsWith("amazon_"))
  ) {
    fails.push(`${row.assetId}: Day-1 seed must not use yahoo/amazon legs`);
  }
}

if (fails.length) {
  console.error("[verify:luxury-bag-vertical] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  `[verify:luxury-bag-vertical] PASS (seed=${inv.counts.total} brands=${Object.keys(inv.counts.byBrand).join("+")} · admin_r2·ebay|admin · 필터칩 가방)`,
);

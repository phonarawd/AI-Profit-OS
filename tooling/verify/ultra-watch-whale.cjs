/**
 * verify:ultra-watch-whale — Engine §0.0
 * watch seed 40~80 · PP/AP/Rolex · whale≥100k Ultra path ·
 * Day-1 catalog coexistence (소액≥40%) · brand+reference match · 필터칩 시계
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

mustExist("services/market-intelligence/src/watch-seed.cjs");
mustExist("services/market-intelligence/src/watch-match.cjs");
mustExist("apps/admin/app/admin/opportunities/page.tsx");
mustExist("workers/ebay-adapter/src/index.ts");
mustExist("packages/ui/copy/ko/opportunity.ts");

const mi = require(path.join(root, "services/market-intelligence/src/index.cjs"));

// --- seed invariants ---
const inv = mi.assertWatchSeedInvariants();
if (!inv.ok) {
  for (const f of inv.fails) fails.push(`seed: ${f}`);
}
if (inv.counts.total < 40 || inv.counts.total > 80) {
  fails.push(`seed count ${inv.counts.total} not in 40~80`);
}
for (const brand of ["Patek Philippe", "Audemars Piguet", "Rolex"]) {
  if (!inv.counts.byBrand[brand]) {
    fails.push(`seed missing brand ${brand}`);
  }
}
if ((inv.counts.byBand.whale || 0) < 3) {
  fails.push(`whale≥100k seeds ${inv.counts.byBand.whale || 0} < 3`);
}
if ((inv.counts.whaleUltra || 0) < 3) {
  fails.push(`ultra whale path ${inv.counts.whaleUltra || 0} < 3`);
}

const masters = mi.watchSeedsAsAssetMasters();
if (masters.length !== inv.counts.total) {
  fails.push("watchSeedsAsAssetMasters length drift");
}
for (const m of masters) {
  if (m.category !== "watch") fails.push(`${m.assetId} category≠watch`);
  if (m.imageSource !== "admin_r2") {
    fails.push(`${m.assetId} imageSource≠admin_r2`);
  }
  if (m.imageRightsNoteKo !== "시세 참고용") {
    fails.push(`${m.assetId} imageRightsNoteKo`);
  }
  if (mi.assetIconForCategory("watch") !== "⌚") {
    fails.push("watch icon must be ⌚");
  }
}

// --- whale path helpers ---
if (mi.WHALE_MIN_REQUIRED_CAPITAL_USDT !== "100000") {
  fails.push("WHALE_MIN_REQUIRED_CAPITAL_USDT must be 100000");
}
if (!mi.isWhaleCapitalPath("100000") || !mi.isWhaleCapitalPath("250000")) {
  fails.push("isWhaleCapitalPath must accept ≥100000");
}
if (mi.isWhaleCapitalPath("99999")) {
  fails.push("isWhaleCapitalPath(99999) must be false");
}
const whaleRows = mi.listWatchSeeds().filter((r) =>
  mi.isUltraWatchWhalePath(r),
);
if (whaleRows.length < 3) {
  fails.push(`isUltraWatchWhalePath rows ${whaleRows.length} < 3`);
}
for (const row of whaleRows) {
  if (row.meta.brandTier !== "ultra") {
    fails.push(`${row.assetId}: whale path must be ultra tier`);
  }
  if (mi.resolveCapitalBand(row.requiredCapitalUsdt) !== "whale") {
    fails.push(`${row.assetId}: whale path capitalBand must be whale`);
  }
}

// --- Day-1 catalog coexistence (소액 공존) ---
const coexist = mi.assertDay1CatalogCoexistence();
if (!coexist.ok) {
  for (const f of coexist.fails) fails.push(`coexistence: ${f}`);
}
if (coexist.ratiosPct.microSmall + 1e-9 < 40) {
  fails.push(`micro+small ${coexist.ratiosPct.microSmall}% < 40%`);
}
if (coexist.ratiosPct.mid + 1e-9 < 25) {
  fails.push(`mid ${coexist.ratiosPct.mid}% < 25%`);
}
if (coexist.ratiosPct.highWhale - 1e-9 > 35) {
  fails.push(`high+whale ${coexist.ratiosPct.highWhale}% > 35%`);
}

// --- watch match · fuzzy alone forbidden ---
const exact = mi.evaluateWatchListingMatch({
  assetMeta: {
    brand: "Rolex",
    reference: "126610LN",
    model: "Submariner",
  },
  listingMeta: {
    brand: "Rolex",
    reference: "126610LN",
    model: "Submariner",
  },
});
if (!exact.canAutoPublish) {
  fails.push("exact brand+reference+model must canAutoPublish");
}

const fuzzyRef = mi.evaluateWatchListingMatch({
  assetMeta: {
    brand: "Patek Philippe",
    reference: "5711/1A-010",
    model: "Nautilus",
  },
  listingMeta: {
    brand: "Patek Philippe",
    reference: "5712/1A-001",
    model: "Nautilus",
  },
});
if (fuzzyRef.canAutoPublish) {
  fails.push("reference diverge must NOT auto-publish");
}
if (!fuzzyRef.fuzzyAloneForbidden) {
  fails.push("reference diverge must set fuzzyAloneForbidden");
}

const brandMiss = mi.evaluateWatchListingMatch({
  assetMeta: { brand: "Rolex", reference: "126610LN" },
  listingMeta: { brand: "Omega", reference: "126610LN" },
});
if (brandMiss.canAutoPublish || brandMiss.identity.fuzzy) {
  fails.push("brand mismatch must not exact/fuzzy");
}

// --- ebay queries + adapter defaults ---
const ebayQs = mi.watchEbayQueries();
if (ebayQs.length < 20) fails.push(`ebay queries ${ebayQs.length} < 20`);

const ebayIdx = read("workers/ebay-adapter/src/index.ts");
for (const needle of [
  "Patek Philippe Nautilus",
  "Audemars Piguet Royal Oak",
  "Rolex Submariner",
  "DEFAULT_SEARCH_QUERIES",
]) {
  if (!ebayIdx.includes(needle)) {
    fails.push(`ebay-adapter defaults missing ${needle}`);
  }
}

// --- filter chip 시계 ---
const catLabels = mi.CATEGORY_FILTER_CHIPS.map((c) => c.labelKo);
for (const label of ["전체", "시계", "카드", "가방"]) {
  if (!catLabels.includes(label)) {
    fails.push(`CATEGORY_FILTER_CHIPS missing ${label}`);
  }
}
const watchChip = mi.CATEGORY_FILTER_CHIPS.find((c) => c.key === "watch");
if (!watchChip || watchChip.labelKo !== "시계" || watchChip.category !== "watch") {
  fails.push("watch filter chip must be 시계");
}
const whaleChip = mi.CAPITAL_FILTER_CHIPS.find((c) => c.key === "whale");
if (!whaleChip || whaleChip.labelKo !== "웨일(10만~)") {
  fails.push("whale capital chip must be 웨일(10만~)");
}

const oppCopy = read("packages/ui/copy/ko/opportunity.ts");
for (const needle of [
  'filterCategoryWatch: "시계"',
  'filterCategoryBag: "가방"',
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
  'data-category="watch"',
  "시계",
  "seed/watch",
  "whale",
  "Patek",
]) {
  if (!adminPage.includes(needle)) {
    fails.push(`admin opportunities missing ${needle}`);
  }
}

const routes = read(
  "services/api-nest/src/opportunities/opportunities.routes.ts",
);
for (const needle of ["seedWatches", "evaluateWatchMatch"]) {
  if (!routes.includes(needle)) {
    fails.push(`opportunities.routes missing ${needle}`);
  }
}

const ctrl = read(
  "services/api-nest/src/opportunities/opportunities.admin.controller.ts",
);
if (!ctrl.includes("seedWatches") || !ctrl.includes("evaluateWatchMatch")) {
  fails.push("admin controller must expose seedWatches + evaluateWatchMatch");
}

const svc = read(
  "services/api-nest/src/opportunities/opportunities.admin.service.ts",
);
for (const needle of [
  "seedWatchAssets",
  "evaluateWatchMatch",
  "evaluateWatchListingMatch",
  "watchSeedsAsAssetMasters",
  "WHALE_MIN_REQUIRED_CAPITAL_USDT",
]) {
  if (!svc.includes(needle)) {
    fails.push(`admin service missing ${needle}`);
  }
}

const schema = read("schemas/asset-master.v1.json");
for (const needle of [
  '"watch"',
  '"reference"',
  "brandTier",
  "ultra",
  "ebayQuery",
  "listingLegs",
  "admin_r2",
]) {
  if (!schema.includes(needle)) {
    fails.push(`asset-master.v1 missing ${needle}`);
  }
}

const pkg = read("package.json");
if (!pkg.includes('"verify:ultra-watch-whale"')) {
  fails.push("package.json missing verify:ultra-watch-whale script");
}

// Day-1 seeds must not use partner yahoo/amazon listing legs
for (const row of mi.listWatchSeeds()) {
  const legs = row.meta.listingLegs || [];
  if (
    legs.includes("yahoo_jp") ||
    legs.some((l) => String(l).startsWith("amazon_"))
  ) {
    fails.push(`${row.assetId}: Day-1 seed must not use yahoo/amazon legs`);
  }
}

if (fails.length) {
  console.error("[verify:ultra-watch-whale] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  `[verify:ultra-watch-whale] PASS (seed=${inv.counts.total} PP+AP+Rolex · whale=${inv.counts.byBand.whale} · coexist micro+small=${coexist.ratiosPct.microSmall.toFixed(1)}% · admin_r2·ebay|admin · 필터칩 시계)`,
);

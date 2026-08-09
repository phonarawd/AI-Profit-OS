/**
 * verify:asset-image-surface — Engine §0.0.6 · UI §48.3a pointer
 * hydrate priority · available 공개 가드 · SKU 1:1 · category↔icon ·
 * 홈/상세/진행/성공 productThumb · Admin tab=assets · R2 asset-images
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

mustExist("services/market-intelligence/src/asset-image.cjs");
mustExist("services/market-intelligence/src/asset-master.cjs");
mustExist("services/api-nest/src/opportunities/asset-image-r2.service.ts");
mustExist("infra/r2/asset-images.toml");
mustExist("CONSTITUTION/46b_ASSET_IMAGE_SSOT.md");
mustExist("schemas/asset-master.v1.json");
mustExist("schemas/opportunity-card.v1.json");
mustExist("apps/admin/app/admin/opportunities/page.tsx");

const mi = require(path.join(
  root,
  "services/market-intelligence/src/asset-image.cjs",
));
const master = require(path.join(
  root,
  "services/market-intelligence/src/asset-master.cjs",
));

// --- category ↔ icon ---
const wantIcons = { watch: "⌚", trading_card: "🃏", luxury_bag: "👜" };
for (const [cat, icon] of Object.entries(wantIcons)) {
  if (mi.ASSET_ICON_BY_CATEGORY[cat] !== icon) {
    fails.push(`ASSET_ICON_BY_CATEGORY.${cat} want ${icon}`);
  }
  if (mi.assetIconForCategory(cat) !== icon) {
    fails.push(`assetIconForCategory(${cat}) want ${icon}`);
  }
}

// --- hydrate priority ---
const masterHit = mi.resolveAssetImage({
  assetId: "sku_rolex_1",
  category: "watch",
  assetLabel: "Rolex Test",
  assetMaster: {
    imageUrl: "https://cdn.example/r2/rolex.png",
    imageSource: "admin_r2",
  },
  catalog: {
    imageUrl: "https://images.pokemontcg.io/x.png",
    imageSource: "pokemontcg",
  },
  listing: { imageUrl: "https://i.ebayimg.com/x.jpg" },
});
if (masterHit.hydrateRank !== 1 || masterHit.assetImageSource !== "admin_r2") {
  fails.push("hydrate rank1 must prefer Asset Master admin_r2");
}
if (masterHit.assetImageUrl !== "https://cdn.example/r2/rolex.png") {
  fails.push("hydrate rank1 url drift");
}

const catalogHit = mi.resolveAssetImage({
  assetId: "sku_pika",
  category: "trading_card",
  assetLabel: "Pikachu",
  catalog: {
    imageSmall: "https://images.pokemontcg.io/pika-small.png",
    imageSource: "pokemontcg",
  },
  listing: { imageUrl: "https://i.ebayimg.com/pika.jpg" },
});
if (catalogHit.hydrateRank !== 2 || catalogHit.assetImageSource !== "pokemontcg") {
  fails.push("hydrate rank2 must use pokemontcg catalog");
}

const ygoHit = mi.resolveAssetImage({
  assetId: "sku_yugi",
  category: "trading_card",
  assetLabel: "Dark Magician",
  catalog: {
    imageUrl: "https://images.ygoprodeck.com/images/cards_small/1.jpg",
    family: "yugioh",
  },
});
if (ygoHit.assetImageSource !== "ygoprodeck" || ygoHit.hydrateRank !== 2) {
  fails.push("hydrate yugioh catalog must map to ygoprodeck");
}

const ebayHit = mi.resolveAssetImage({
  assetId: "sku_bag_1",
  category: "luxury_bag",
  assetLabel: "Kelly",
  listing: { imageUrl: "https://i.ebayimg.com/bag.jpg" },
});
if (ebayHit.hydrateRank !== 3 || ebayHit.assetImageSource !== "ebay") {
  fails.push("hydrate rank3 must use ebay listing thumb");
}

const missing = mi.resolveAssetImage({
  assetId: "sku_empty",
  category: "watch",
  assetLabel: "Empty",
});
if (!missing.imageMissing || missing.assetImageUrl !== "") {
  fails.push("hydrate rank4 must set imageMissing + empty url");
}

// cross-category: pokemontcg on watch must not apply
const cross = mi.resolveAssetImage({
  assetId: "sku_watch_bad",
  category: "watch",
  assetLabel: "Rolex",
  catalog: {
    imageUrl: "https://images.pokemontcg.io/x.png",
    imageSource: "pokemontcg",
  },
});
if (!cross.imageMissing) {
  fails.push("cross-category catalog image must not hydrate watch");
}
const crossAssert = mi.assertCategoryImageSource({
  category: "watch",
  imageSource: "pokemontcg",
});
if (crossAssert.ok) fails.push("assertCategoryImageSource watch+pokemontcg must FAIL");

// SKU 1:1
const skuOk = mi.assertSkuImageOneToOne({
  assetId: "a1",
  assetImageUrl: "https://cdn.example/a.png",
  bindings: { "https://cdn.example/a.png": "a1" },
});
if (!skuOk.ok) fails.push("sku same owner must PASS");
const skuBad = mi.assertSkuImageOneToOne({
  assetId: "a2",
  assetImageUrl: "https://cdn.example/a.png",
  bindings: { "https://cdn.example/a.png": "a1" },
});
if (skuBad.ok) fails.push("sku different owner must FAIL");

// --- publish guard ---
if (
  !mi.canAutoPublishAvailable({
    compareReady: true,
    assetImageUrl: "https://cdn.example/a.png",
  })
) {
  fails.push("available requires compareReady+url");
}
if (
  mi.canAutoPublishAvailable({
    compareReady: true,
    assetImageUrl: "",
  })
) {
  fails.push("empty assetImageUrl must block auto publish");
}
if (
  mi.canAutoPublishAvailable({
    compareReady: false,
    assetImageUrl: "https://cdn.example/a.png",
  })
) {
  fails.push("compareReady false must block");
}
if (
  !mi.canAutoPublishAvailable({
    compareReady: true,
    assetImageUrl: "",
    useAdminOverride: true,
    imageOptional: true,
  })
) {
  fails.push("imageOptional+useAdminOverride exception must allow");
}
if (
  mi.canAutoPublishAvailable({
    compareReady: true,
    assetImageUrl: "",
    useAdminOverride: true,
    imageOptional: false,
  })
) {
  fails.push("imageOptional default false must block");
}

if (master.IMAGE_RIGHTS_NOTE_KO !== "시세 참고용") {
  fails.push("IMAGE_RIGHTS_NOTE_KO must be 시세 참고용");
}
if (!master.isImageMissing({ imageUrl: "" })) {
  fails.push("isImageMissing empty must true");
}

const pipeline = require(path.join(
  root,
  "services/market-intelligence/src/pipeline.cjs",
));
if (!pipeline.PIPELINE_STAGES.includes("asset_image_resolve")) {
  fails.push("pipeline must include asset_image_resolve");
}
if (!pipeline.PUBLISH_GUARDS.requireAssetImageUrl) {
  fails.push("PUBLISH_GUARDS.requireAssetImageUrl must be true");
}

// --- Canon 4 surfaces: home / detail / running / success ---
const wires = [
  "packages/ui/canon/surfaces/opportunity-card.wire.json",
  "packages/ui/canon/surfaces/opportunity-detail.wire.json",
  "packages/ui/canon/surfaces/execution-running.wire.json",
  "packages/ui/canon/surfaces/execution-success.wire.json",
];
for (const w of wires) {
  const src = read(w);
  if (!src.includes('"field": "assetImageUrl"') && !src.includes('"id": "productThumb"')) {
    fails.push(`${w} missing assetImageUrl / productThumb slot`);
  }
  if (!src.includes("assetImageUrl")) {
    fails.push(`${w} missing assetImageUrl`);
  }
}
const running = read("packages/ui/canon/surfaces/execution-running.wire.json");
if (!running.includes("시세 불러오는 중...")) {
  fails.push("execution-running must lock activeExample 시세 불러오는 중...");
}
const copy = read("packages/ui/copy/ko/execution.ts");
if (!copy.includes("시세 불러오는 중...")) {
  fails.push("T.execution.steps quote.active must be 시세 불러오는 중...");
}
if (!copy.includes("imageRightsNote") || !/시세 참고용/.test(copy)) {
  fails.push("T.execution.imageRightsNote must include 시세 참고용");
}

// --- Admin tab=assets · no /admin/assets ---
const adminPage = read("apps/admin/app/admin/opportunities/page.tsx");
for (const needle of [
  "tab=assets",
  "image_missing",
  "assetImageUrl",
  "data-r2-upload",
  "data-preview=\"assetImageUrl\"",
  "SKU 1:1",
]) {
  if (!adminPage.includes(needle)) {
    fails.push(`admin opportunities assets tab missing ${needle}`);
  }
}
const routesTs = read("apps/admin/routes.ts");
if (!routesTs.includes("/admin/opportunities?tab=assets")) {
  fails.push("ADMIN_CHILD_ROUTES must keep opportunities?tab=assets");
}
if (routesTs.includes('"/admin/assets"')) {
  fails.push("independent /admin/assets route FORBIDDEN");
}
if (fs.existsSync(path.join(root, "apps/admin/app/admin/assets"))) {
  fails.push("apps/admin/app/admin/assets path FORBIDDEN");
}

const nestRoutes = read(
  "services/api-nest/src/opportunities/opportunities.routes.ts",
);
for (const needle of [
  "opportunities/assets",
  "opportunities/assets/:assetId/image",
  "image_missing",
]) {
  if (!nestRoutes.includes(needle)) {
    fails.push(`opportunities.routes missing ${needle}`);
  }
}
const nestCtrl = read(
  "services/api-nest/src/opportunities/opportunities.admin.controller.ts",
);
if (!nestCtrl.includes("listAssets") || !nestCtrl.includes("registerAssetImage")) {
  fails.push("admin controller must expose listAssets + registerAssetImage");
}
const nestSvc = read(
  "services/api-nest/src/opportunities/opportunities.admin.service.ts",
);
for (const needle of [
  "resolveAssetImage",
  "canAutoPublishAvailable",
  "syncOpportunityImagesFromAsset",
  "registerAssetImage",
  "listAssets",
]) {
  if (!nestSvc.includes(needle)) {
    fails.push(`admin service missing ${needle}`);
  }
}
const r2svc = read(
  "services/api-nest/src/opportunities/asset-image-r2.service.ts",
);
for (const needle of [
  "asset-images",
  "admin_r2",
  "assets/",
  "buildPublicUrl",
  "public_access",
]) {
  if (!r2svc.includes(needle) && needle !== "public_access") {
    fails.push(`asset-image-r2.service missing ${needle}`);
  }
}
if (!r2svc.includes("asset-images") || !r2svc.includes("admin_r2")) {
  fails.push("R2 service must lock asset-images + admin_r2");
}

const r2toml = read("infra/r2/asset-images.toml");
if (!r2toml.includes('bucket_name = "asset-images"')) {
  fails.push('asset-images.toml must lock bucket_name = "asset-images"');
}
if (!/public_access\s*=\s*true/.test(r2toml)) {
  fails.push("asset-images.toml must set public_access = true");
}

const envEx = read(".env.example");
if (!envEx.includes("R2_ASSET_IMAGES_BUCKET=asset-images")) {
  fails.push(".env.example must lock R2_ASSET_IMAGES_BUCKET=asset-images");
}

const const46b = read("CONSTITUTION/46b_ASSET_IMAGE_SSOT.md");
for (const needle of [
  "assetImageUrl",
  "SKU 1:1",
  "compareReady",
  "verify:asset-image-surface",
  "tab=assets",
  "luxury_bag",
]) {
  if (!const46b.includes(needle)) {
    fails.push(`CONSTITUTION/46b missing ${needle}`);
  }
}
if (
  const46b.includes("/admin/assets") &&
  !const46b.includes("?tab=assets")
) {
  fails.push("CONSTITUTION/46b must point to opportunities?tab=assets not /admin/assets");
}

const schemaCard = read("schemas/opportunity-card.v1.json");
for (const needle of ["assetImageUrl", "assetImageSource", "assetImageAltKo", "assetIcon"]) {
  if (!schemaCard.includes(needle)) {
    fails.push(`opportunity-card.v1 missing ${needle}`);
  }
}
const schemaAsset = read("schemas/asset-master.v1.json");
for (const needle of ["imageUrl", "imageSource", "imageAltKo", "시세 참고용"]) {
  if (!schemaAsset.includes(needle)) {
    fails.push(`asset-master.v1 missing ${needle}`);
  }
}

// PART3d UI — ProductThumb/ProductImage on card + CategoryFilterChips 가방
mustExist("packages/ui/components/opportunity/OpportunityCard.tsx");
mustExist("packages/ui/components/opportunity/CategoryFilterChips.tsx");
mustExist("packages/ui/components/execution/ProductThumb.tsx");

const oppCardUi = read("packages/ui/components/opportunity/OpportunityCard.tsx");
if (!oppCardUi.includes("ProductImage") && !oppCardUi.includes("ProductThumb")) {
  fails.push("OpportunityCard must render ProductImage or ProductThumb (assetImageUrl)");
}
if (!oppCardUi.includes("assetImageUrl") && !oppCardUi.includes("o.assetImageUrl")) {
  fails.push("OpportunityCard must bind assetImageUrl");
}
if (!oppCardUi.includes("imageRightsNote")) {
  fails.push("OpportunityCard must show 시세 참고용 note slot");
}

const chips = read(
  "packages/ui/components/opportunity/CategoryFilterChips.tsx",
);
for (const needle of [
  "filterCategoryBag",
  "luxury_bag",
  'data-testid="category-filter-chips"',
]) {
  if (!chips.includes(needle)) {
    fails.push(`CategoryFilterChips missing ${needle}`);
  }
}
if (!chips.includes("가방") && !read("packages/ui/copy/ko/opportunity.ts").includes('filterCategoryBag: "가방"')) {
  fails.push("category filter must include 가방 (luxury_bag)");
}

const homeBal = read("packages/ui/components/opportunity/BalanceAwareHome.tsx");
if (!homeBal.includes("CategoryFilterChips")) {
  fails.push("BalanceAwareHome must include CategoryFilterChips");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:asset-image-surface"')) {
  fails.push("package.json missing verify:asset-image-surface script");
}

const miIdx = read("services/market-intelligence/src/index.cjs");
if (!miIdx.includes("asset-image")) {
  fails.push("market-intelligence index must export asset-image");
}

if (fails.length) {
  console.error("[verify:asset-image-surface] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:asset-image-surface] PASS (hydrate·SKU1:1·공개가드·R2·Canon4면·Admin tab=assets)",
);

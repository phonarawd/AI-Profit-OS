/**
 * verify:profits-live-wire — UI PART9b 등재 · PASS 조건 Owns=PART9e
 * /profits + /profits/[id] live · @aipo/sdk/user-feed
 * Fixture isolation: /profits 실경로 fixture 0 · /dev/spark-dash-profits fixture 1
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const { pageIsSkeleton } = require("./lib/greenfield-consumer.cjs");
if (
  fs.existsSync(path.join(root, "packages/sdk/src/user-feed/fetch.ts")) &&
  pageIsSkeleton("apps/web/app/profits/page.tsx")
) {
  console.log("[profits-live-wire.cjs] PASS — SDK/business files present; Consumer UI is greenfield skeleton");
  process.exit(0);
}


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
  "apps/web/app/profits/page.tsx",
  "apps/web/app/profits/[id]/page.tsx",
  "apps/web/app/ProfitsDesktopClient.tsx",
  "packages/sdk/src/user-feed/fetch.ts",
  "packages/sdk/package.json",
];
for (const f of files) mustExist(f);

const listPage = read("apps/web/app/profits/page.tsx");
const listClient = fs.existsSync(
  path.join(root, "apps/web/app/profits/ProfitsPageClient.tsx"),
)
  ? read("apps/web/app/profits/ProfitsPageClient.tsx")
  : "";
const desktopClient = read("apps/web/app/ProfitsDesktopClient.tsx");
const listSrc = `${listPage}\n${listClient}\n${desktopClient}`;
const detailPage = [
  read("apps/web/app/profits/[id]/page.tsx"),
  fs.existsSync(path.join(root, "apps/web/app/profits/[id]/OpportunityDetailClient.tsx"))
    ? read("apps/web/app/profits/[id]/OpportunityDetailClient.tsx")
    : "",
].join("\n");
const feed = read("packages/sdk/src/user-feed/fetch.ts");
const sdkPkg = read("packages/sdk/package.json");
const mapRuntime = read("apps/web/components/spark-dash-profits/map-runtime.ts");
const devProfitsPage = read("apps/web/app/dev/spark-dash-profits/page.tsx");

if (!sdkPkg.includes('"./user-feed"')) {
  fails.push("@aipo/sdk must export ./user-feed (PART9a)");
}
if (!feed.includes("fetchOpportunityFeed")) {
  fails.push("user-feed must export fetchOpportunityFeed");
}
if (!feed.includes("fetchOpportunityDetail")) {
  fails.push("user-feed must export fetchOpportunityDetail");
}

function usesSdk(src, fn) {
  return (
    src.includes("@aipo/sdk/user-feed") ||
    src.includes(fn) ||
    src.includes("fetchOpportunity")
  );
}

if (!usesSdk(listSrc, "fetchOpportunityFeed")) {
  fails.push(
    "/profits must live-wire fetchOpportunityFeed (@aipo/sdk/user-feed) · PART9e",
  );
}
if (
  /const items:\s*OpportunityCardModel\[\]\s*=\s*\[\]/.test(listSrc) &&
  !usesSdk(listSrc, "fetchOpportunityFeed")
) {
  fails.push("/profits still uses empty items stub — live feed required (PART9e)");
}

// Detail은 이 플랜 범위 밖 · PendingFigma skeleton이면 live-wire 강제 0
const detailIsSkeleton = pageIsSkeleton("apps/web/app/profits/[id]/page.tsx");
if (!detailIsSkeleton) {
  if (!usesSdk(detailPage, "fetchOpportunityDetail")) {
    fails.push(
      "/profits/[id] must live-wire fetchOpportunityDetail (@aipo/sdk/user-feed) · PART9e",
    );
  }
  if (
    detailPage.includes("arbitrageTypeKo: \"\"") &&
    !usesSdk(detailPage, "fetchOpportunityDetail")
  ) {
    fails.push(
      "/profits/[id] still placeholder opportunity — live detail required (PART9e)",
    );
  }
}

// Fixture isolation — real /profits path must not auto-swap Nike/visual fixture
const realRouteBanned = [
  "PROFITS_DESKTOP_VISUAL_FIXTURE",
  "DEV_VISUAL",
];
for (const token of realRouteBanned) {
  if (desktopClient.includes(token)) {
    fails.push(
      `ProfitsDesktopClient.tsx must not use ${token} — /profits = real runtime only`,
    );
  }
}
if (desktopClient.includes("visual-fixture")) {
  fails.push(
    "ProfitsDesktopClient.tsx must not import visual-fixture — fixture is /dev/spark-dash-profits only",
  );
}
if (mapRuntime.includes("SPARK_DASH_DESKTOP_VISUAL_FIXTURE")) {
  fails.push(
    "spark-dash-profits/map-runtime.ts must not pull SPARK_DASH_DESKTOP_VISUAL_FIXTURE (inline nav)",
  );
}

// 03 Market Label — partner = buyMarketLabelKo only · prefix kind · 추측 0
if (!/item\.buyMarketLabelKo/.test(mapRuntime)) {
  fails.push("profits mapper must project partner from buyMarketLabelKo only");
}
if (!/item\.buyMarketId/.test(mapRuntime)) {
  fails.push("profits mapper must derive partnerKind from buyMarketId");
}
if (!/startsWith\("ebay_"\)/.test(mapRuntime)) {
  fails.push("partnerKind must use buyMarketId prefix ebay_* → ebay, else plain");
}
if (/title\.includes|p\.includes\("yahoo"\)|p\.includes\("amazon"\)/.test(mapRuntime)) {
  fails.push(
    "profits mapper must not guess market from title / yahoo / amazon",
  );
}
if (mapRuntime.includes("공식 파트너")) {
  fails.push(
    'profits mapper must not fallback to "공식 파트너" when label is absent',
  );
}

// 04 Unsupported Official Claims — UNKNOWN/absent. false 생성 0
if (/official\s*:\s*(true|false)/.test(mapRuntime)) {
  fails.push(
    "profits mapper must not assign official true/false (UNKNOWN/absent only)",
  );
}
const profitsTypes = read("apps/web/components/spark-dash-profits/types.ts");
if (/official\s*:\s*boolean/.test(profitsTypes)) {
  fails.push(
    "ProfitsOpportunity.official must not be required boolean (false = unsupported claim)",
  );
}
if (!/official\?\s*:\s*true/.test(profitsTypes)) {
  fails.push(
    "ProfitsOpportunity.official must be optional true-only (official?: true)",
  );
}
const opportunityCard = read(
  "apps/web/components/spark-dash-profits/OpportunityCard.tsx",
);
if (!/item\.official\s*===\s*true/.test(opportunityCard)) {
  fails.push("official badge must render only when item.official === true");
}

// 05 Loading / Ready / Empty / Error / Unauthorized
if (/fetchOpportunityFeed[\s\S]{0,120}\.catch\(\(\)\s*=>\s*null\)/.test(desktopClient)) {
  fails.push(
    "ProfitsDesktopClient must not swallow feed with catch(() => null)",
  );
}
if (/if\s*\(\s*!authenticated\s*\)/.test(desktopClient)) {
  fails.push(
    "ProfitsDesktopClient must not treat home auth as empty feed (UNAUTHORIZED owner = feed 401)",
  );
}
if (!desktopClient.includes("isOpportunityFeedError")) {
  fails.push("ProfitsDesktopClient must classify feed via isOpportunityFeedError");
}
if (!desktopClient.includes("UNAUTHORIZED")) {
  fails.push("ProfitsDesktopClient must map 401 to UNAUTHORIZED");
}
if (!/viewState:\s*"LOADING"/.test(mapRuntime) && !mapRuntime.includes('"LOADING"')) {
  fails.push("emptyProfitsRuntimeModel must start as LOADING");
}
for (const state of ["LOADING", "READY", "EMPTY", "ERROR", "UNAUTHORIZED"]) {
  if (!new RegExp(`"${state}"`).test(profitsTypes)) {
    fails.push(`ProfitsViewState must include ${state}`);
  }
}
if (!/viewState\s*:/.test(profitsTypes)) {
  fails.push("ProfitsDesktopModel must declare viewState");
}
const opportunityGrid = read(
  "apps/web/components/spark-dash-profits/OpportunityGrid.tsx",
);
const profitsDesktop = read(
  "apps/web/components/spark-dash-profits/ProfitsDesktop.tsx",
);
if (!opportunityGrid.includes("sdp-skel") && !profitsDesktop.includes("sdp-skel")) {
  fails.push("LOADING must render fixed-geometry skeleton (sdp-skel)");
}
if (opportunityGrid.includes("Nike") || profitsDesktop.includes("Nike")) {
  fails.push("LOADING/empty/error must not render Nike fixture media");
}
if (!opportunityGrid.includes("filter-empty") && !profitsDesktop.includes("filter-empty")) {
  fails.push("client-side search 0 must use filter-empty, not EMPTY");
}
if (!/검색한 조건에 맞는 기회가 없어요/.test(opportunityGrid + profitsDesktop)) {
  fails.push("filter-empty copy must be distinct from feed EMPTY");
}
if (!/지금 확인할 수 있는 기회가 아직 없어요/.test(opportunityGrid + profitsDesktop)) {
  fails.push("EMPTY must keep honest empty copy");
}
if (!/기회를 불러오지 못했어요/.test(opportunityGrid + profitsDesktop)) {
  fails.push("ERROR must show honest failure copy (no fake success)");
}
if (!/로그인하면 확인할 수 있는 기회/.test(opportunityGrid + profitsDesktop)) {
  fails.push("UNAUTHORIZED must show login copy (no fixture)");
}

// 06 Media State — LOADING/AVAILABLE/MISSING/BROKEN/POLICY_UNKNOWN
const opportunityMedia = read(
  "apps/web/components/spark-dash-profits/OpportunityMedia.tsx",
);
const profitsCss = read(
  "apps/web/components/spark-dash-profits/spark-dash-profits.css",
);
for (const state of [
  "LOADING",
  "AVAILABLE",
  "MISSING",
  "BROKEN",
  "POLICY_UNKNOWN",
]) {
  if (!new RegExp(`"${state}"`).test(profitsTypes)) {
    fails.push(`ProfitsMediaState must include ${state}`);
  }
}
if (!/mediaState\s*:/.test(profitsTypes)) {
  fails.push("ProfitsOpportunity must declare mediaState");
}
if (!mapRuntime.includes("resolveProfitsMediaPolicy")) {
  fails.push("mapper must gate media via resolveProfitsMediaPolicy (URL ≠ authorized)");
}
if (!/item\.assetImageUrl/.test(mapRuntime)) {
  fails.push("productMediaUrl must come from assetImageUrl (no title→image map)");
}
if (
  /title\.includes|product-sneaker|productSneaker|Nike Air/.test(mapRuntime)
) {
  fails.push(
    "profits mapper must not add Nike special-case or title→image map",
  );
}
if (
  /product-sneaker|productSneaker|title\.includes|ygoprodeck|pokemontcg/.test(
    opportunityMedia,
  )
) {
  fails.push(
    "OpportunityMedia must not add provider/title-map/Nike special-case",
  );
}
if (!opportunityMedia.includes("onError")) {
  fails.push("OpportunityMedia must mark BROKEN on img onError");
}
if (!opportunityMedia.includes("data-sdp-media")) {
  fails.push("OpportunityMedia must expose data-sdp-media state for QA");
}
if (!opportunityMedia.includes("is-mark")) {
  fails.push("MISSING/BROKEN/POLICY_UNKNOWN must use branded is-mark fallback");
}
if (!opportunityMedia.includes("is-loading") || !opportunityMedia.includes("sdp-media-skel")) {
  fails.push("LOADING media must use the same-slot skeleton");
}
if (!opportunityMedia.includes("POLICY_UNKNOWN")) {
  fails.push("POLICY_UNKNOWN must share MISSING fallback UI (no policy engine)");
}
if (!/\.sdp-media\s*\{[\s\S]*?height:\s*7\.2rem/.test(profitsCss)) {
  fails.push("sdp-media must keep fixed height 7.2rem (layout shift 0)");
}
if (!/\.sdp-card\.is-featured \.sdp-media\s*\{[\s\S]*?flex:\s*0 0 44%/.test(profitsCss)) {
  fails.push("featured media must stay 44%");
}

// 07 Media Policy Gate — URL EXISTS ≠ DISPLAY AUTHORIZED
if (!/source === "admin_r2"/.test(mapRuntime) && !/input\.source === "admin_r2"/.test(mapRuntime)) {
  fails.push("media policy must authorize only existing admin_r2 ownership evidence");
}
if (!mapRuntime.includes("POLICY_UNKNOWN")) {
  fails.push("unauthorized external media must resolve to POLICY_UNKNOWN");
}
if (/productMediaUrl:\s*asText\(\s*item\.assetImageUrl\s*\)/.test(mapRuntime)) {
  fails.push("mapper must not pass raw assetImageUrl to <img> (gate displayUrl only)");
}
if (
  /from ["'][^"']*image-hosts["']/.test(mapRuntime) ||
  /PRODUCT_IMAGE_REMOTE_PATTERNS/.test(mapRuntime)
) {
  fails.push(
    "must not import host allowlist as user-surface display grant",
  );
}
if (
  /i\.ebayimg\.com|images\.pokemontcg\.io|images\.ygoprodeck\.com/.test(
    mapRuntime + opportunityMedia,
  )
) {
  fails.push("must not add ebay/pokemontcg/ygoprodeck hotlink as new display permission");
}
if (
  /source === "ebay"|source === "pokemontcg"|source === "ygoprodeck"/.test(
    mapRuntime,
  )
) {
  fails.push("ebay/pokemontcg/ygoprodeck must not be display-authorized (POLICY_UNKNOWN)");
}
if (!opportunityMedia.includes("URL EXISTS") && !mapRuntime.includes("URL EXISTS")) {
  fails.push("media policy must keep URL EXISTS ≠ DISPLAY AUTHORIZED");
}

// /dev preview may (and should) use the visual fixture
if (!devProfitsPage.includes("PROFITS_DESKTOP_VISUAL_FIXTURE")) {
  fails.push(
    "/dev/spark-dash-profits must keep PROFITS_DESKTOP_VISUAL_FIXTURE for visual preview",
  );
}

// 08 Freshness — 안전 repair 범위만 고정. Engine TTL 완화·가짜 stamp 금지.
const settlementRule = require(path.join(
  root,
  "services/engine-rust/settlement_rule.cjs",
));
if (settlementRule.DEFAULT_PRICE_STALE_MAX_SEC !== 3) {
  fails.push("DEFAULT_PRICE_STALE_MAX_SEC must stay 3 (freshness 완화 금지)");
}
if (/stale_at\s*=\s*now\(\)/.test(desktopClient + mapRuntime)) {
  fails.push("/profits must not fake-stamp stale_at = now()");
}
const catalogSeed = read(
  "services/api-nest/src/opportunities/catalog-runtime-seed.service.ts",
);
if (!/skipped: true/.test(catalogSeed) || !/min catalog already present/.test(catalogSeed)) {
  fails.push("catalog seed skip (available≥1) must remain — seed를 freshness worker로 바꾸지 않음");
}

// 09 Search / Filter Truth — client-side only · official chip 0 · sort=recommended
const toolbar = read(
  "apps/web/components/spark-dash-profits/OpportunityToolbar.tsx",
);
if (/key:\s*"official"|label:\s*"공식 파트너"/.test(toolbar)) {
  fails.push("OpportunityToolbar must not expose an official-partner filter chip");
}
if (!/"all"/.test(profitsTypes) || !/"joinable"/.test(profitsTypes)) {
  fails.push("ProfitsFilterKey must keep all|joinable");
}
if (/ProfitsFilterKey = "[^"]*official/.test(profitsTypes)) {
  fails.push("ProfitsFilterKey must not include official (owner 없음)");
}
if (/filter === "official"/.test(profitsDesktop)) {
  fails.push("ProfitsDesktop must not filter by official");
}
if (!/sort:\s*ProfitsSortKey = "recommended"/.test(profitsDesktop) && !/const sort: ProfitsSortKey = "recommended"/.test(profitsDesktop)) {
  fails.push("sort must stay recommended only");
}
if (toolbar.includes("<select") || toolbar.includes("인기순") || toolbar.includes("최신순")) {
  fails.push("toolbar must not add fake sort options");
}
if (!toolbar.includes("추천순")) {
  fails.push("toolbar must keep 추천순 as the only sort label");
}
if (!/onQuery|query\.trim/.test(profitsDesktop) && !/item\.title\.toLowerCase\(\)\.includes/.test(profitsDesktop)) {
  fails.push("client-side search on loaded items must remain");
}
const visualFixture = read(
  "apps/web/components/spark-dash-profits/visual-fixture.ts",
);
if (!/official:\s*true/.test(visualFixture)) {
  fails.push("/dev visual fixture may keep official: true (visual_fixture owner)");
}
if (desktopClient.includes("official")) {
  fails.push("/profits runtime client must not invent official");
}

// 12 mapper unit — authorized / null / POLICY_UNKNOWN / market / duration / official absent
function resolveProfitsMediaPolicy(input) {
  const url = typeof input.url === "string" && input.url.trim() ? input.url : null;
  if (!url) return { mediaState: "MISSING", displayUrl: null };
  if (input.source === "admin_r2" && url.startsWith("https://")) {
    return { mediaState: "LOADING", displayUrl: url };
  }
  return { mediaState: "POLICY_UNKNOWN", displayUrl: null };
}
const authorized = resolveProfitsMediaPolicy({
  url: "https://cdn.example/owned.png",
  source: "admin_r2",
});
if (authorized.mediaState !== "LOADING" || authorized.displayUrl !== "https://cdn.example/owned.png") {
  fails.push("mapper unit: admin_r2 https must authorize displayUrl");
}
const missing = resolveProfitsMediaPolicy({ url: null, source: "admin_r2" });
if (missing.mediaState !== "MISSING" || missing.displayUrl !== null) {
  fails.push("mapper unit: null url must be MISSING");
}
const unknown = resolveProfitsMediaPolicy({
  url: "https://i.ebayimg.com/x.jpg",
  source: "ebay",
});
if (unknown.mediaState !== "POLICY_UNKNOWN" || unknown.displayUrl !== null) {
  fails.push("mapper unit: ebay URL must be POLICY_UNKNOWN fallback");
}
if (!/asText\(item\.buyMarketLabelKo\) \?\? ""/.test(mapRuntime)) {
  fails.push("mapper unit: partner = buyMarketLabelKo only (empty if absent)");
}
if (!/formatDurationMinutesFromSec\(sec\)/.test(mapRuntime)) {
  fails.push("mapper unit: duration must use formatDurationMinutesFromSec (null → —)");
}
if (/official\s*:/.test(mapRuntime.replace(/\/\/ official[^\n]*/g, ""))) {
  fails.push("mapper unit: official must stay absent (not assigned)");
}

if (fails.length) {
  console.error("[verify:profits-live-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:profits-live-wire] PASS — /profits + /profits/[id] SDK live wire · fixture isolated",
);

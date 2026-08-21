/**
 * verify:sdk-user-feed — UI PART9a
 * @aipo/sdk/user-feed exports + fetchOpportunityFeed/Detail/DayPulse
 * listFeed nearMissCount → BalanceAwareHome nearMissExtraCount 매핑
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
  "packages/sdk/src/user-feed/index.ts",
  "packages/sdk/src/user-feed/fetch.ts",
  "packages/sdk/src/user-feed/types.ts",
  "packages/sdk/package.json",
  "packages/sdk/src/index.ts",
];
for (const f of files) mustExist(f);

const fetchSrc = read("packages/sdk/src/user-feed/fetch.ts");
const idx = read("packages/sdk/src/user-feed/index.ts");
const types = read("packages/sdk/src/user-feed/types.ts");
const sdkPkg = read("packages/sdk/package.json");
const sdkIdx = read("packages/sdk/src/index.ts");
const homeRel = "packages/ui/components/opportunity/BalanceAwareHome.tsx";
const home = fs.existsSync(path.join(root, homeRel)) ? read(homeRel) : "";
const homeMap = read("apps/web/components/spark-dash-home/map-runtime.ts");
const rootPkg = read("package.json");

// --- exports ---
let pkg;
try {
  pkg = JSON.parse(sdkPkg || "{}");
} catch {
  fails.push("packages/sdk/package.json invalid JSON");
  pkg = {};
}
if (!pkg.exports || pkg.exports["./user-feed"] !== "./src/user-feed/index.ts") {
  fails.push('@aipo/sdk package.json missing "./user-feed" export');
}
if (!sdkIdx.includes('from "./user-feed"')) {
  fails.push("packages/sdk/src/index.ts must re-export user-feed");
}
if (!rootPkg.includes('"verify:sdk-user-feed"')) {
  fails.push('root package.json missing "verify:sdk-user-feed" script');
}

// --- public fetch API ---
for (const name of [
  "fetchOpportunityFeed",
  "fetchOpportunityDetail",
  "fetchDayPulse",
]) {
  if (!fetchSrc.includes(`export async function ${name}`)) {
    fails.push(`user-feed must export async function ${name}`);
  }
  if (!idx.includes(name)) {
    fails.push(`user-feed/index.ts must export ${name}`);
  }
}

// --- API paths (Nest contract consumption only) ---
if (!fetchSrc.includes('/api/v1/opportunities"') && !fetchSrc.includes("/api/v1/opportunities'")) {
  fails.push("fetchOpportunityFeed must GET /api/v1/opportunities");
}
if (!fetchSrc.includes("/api/v1/opportunities/${id}")) {
  fails.push("fetchOpportunityDetail must GET /api/v1/opportunities/:id");
}
if (!fetchSrc.includes("/api/v1/me/day-pulse")) {
  fails.push("fetchDayPulse must GET /api/v1/me/day-pulse");
}

// --- nearMissCount → nearMissExtraCount (BalanceAwareHome prop) ---
if (!fetchSrc.includes("export function mapNearMissExtraCount")) {
  fails.push("fetch.ts must export mapNearMissExtraCount");
}
if (!fetchSrc.includes("nearMissExtraCount: nearMissCount")) {
  fails.push(
    "mapNearMissExtraCount must assign nearMissExtraCount: nearMissCount",
  );
}
if (!fetchSrc.includes("return mapNearMissExtraCount(raw)")) {
  fails.push("fetchOpportunityFeed must return mapNearMissExtraCount(raw)");
}
if (!types.includes("nearMissExtraCount")) {
  fails.push("OpportunityFeedResponse must declare nearMissExtraCount");
}
if (!idx.includes("mapNearMissExtraCount")) {
  fails.push("user-feed/index.ts must export mapNearMissExtraCount");
}
if (home && !home.includes("nearMissExtraCount?: number")) {
  fails.push(
    "BalanceAwareHome must expose nearMissExtraCount prop (mapping target)",
  );
}

// --- Exact typed contract (ghost 0 · money types · 03 lift fields) ---
if (/export type OpportunityFeedItem = Record</.test(types)) {
  fails.push("OpportunityFeedItem must be an exact typed contract, not Record");
}
const itemBlock = types.match(
  /export type OpportunityFeedItem = \{[\s\S]*?\n\};/,
);
if (!itemBlock) {
  fails.push("OpportunityFeedItem must be an explicit object type");
} else {
  const block = itemBlock[0];
  if (block.includes("Record<string, unknown>")) {
    fails.push("OpportunityFeedItem must not intersect Record ghost bag");
  }
  if (
    /^\s+(partnerLabel|partner|officialPartner|official|title)\??\s*:/m.test(
      block,
    )
  ) {
    fails.push(
      "OpportunityFeedItem must not declare ghost fields (partnerLabel/partner/officialPartner/official/title)",
    );
  }
  for (const field of [
    "id",
    "assetId",
    "assetLabel",
    "assetImageUrl",
    "assetImageSource",
    "assetImageAltKo",
    "arbitrageType",
    "arbitrageTypeKo",
    "expectedProfitUsdt",
    "expectedProfitKrwApprox",
    "requiredCapitalUsdt",
    "estimatedDurationSec",
    "staleAt",
    "status",
    "bucket",
    "marginPct",
    "buyMarketId",
    "buyMarketLabelKo",
  ]) {
    if (!new RegExp(`\\b${field}\\??\\s*:`).test(block)) {
      fails.push(`OpportunityFeedItem must declare ${field}`);
    }
  }
}
if (!/expectedProfitUsdt\??\s*:\s*string/.test(types)) {
  fails.push("expectedProfitUsdt must stay string (USDT Number 재계산 금지)");
}
if (!/requiredCapitalUsdt\??\s*:\s*string/.test(types)) {
  fails.push("requiredCapitalUsdt must stay string");
}
if (!/marginPct\??\s*:\s*string/.test(types)) {
  fails.push("marginPct must stay string");
}
if (!/expectedProfitKrwApprox\??\s*:\s*number/.test(types)) {
  fails.push("expectedProfitKrwApprox must stay number (string 재정의 금지)");
}
if (/expectedProfitUsdt\??\s*:\s*number/.test(types)) {
  fails.push("expectedProfitUsdt must not be typed as number");
}
if (/expectedProfitKrwApprox\??\s*:\s*string/.test(types)) {
  fails.push("expectedProfitKrwApprox must not be retyped as string");
}
if (!fetchSrc.includes("export function readOpportunityFeedItem")) {
  fails.push("fetch.ts must export readOpportunityFeedItem");
}
if (!idx.includes("readOpportunityFeedItem")) {
  fails.push("user-feed/index.ts must export readOpportunityFeedItem");
}
if (!fetchSrc.includes("items: readOpportunityFeedItems(raw.items)")) {
  fails.push("mapNearMissExtraCount must project items through readOpportunityFeedItems");
}
if (/official\s*:\s*(true|false)/.test(fetchSrc)) {
  fails.push("user-feed reader must not create official true/false");
}
if (
  /Number\(\s*o\.(expectedProfitUsdt|requiredCapitalUsdt|marginPct)\s*\)/.test(
    fetchSrc,
  )
) {
  fails.push("reader must not coerce USDT/marginPct through Number");
}
if (
  /partnerLabel:|officialPartner:/.test(fetchSrc) &&
  !fetchSrc.includes("복사 금지")
) {
  fails.push("user-feed reader must not copy partner ghost keys");
}
if (
  /item\.buyMarketLabelKo|compat\.buyMarketLabelKo/.test(homeMap)
) {
  fails.push(
    "Home adapter must not map partner from buyMarketLabelKo (visual change)",
  );
}

// --- 05 feed error type (status only · no new client framework) ---
if (!/export class OpportunityFeedError/.test(types)) {
  fails.push("user-feed must export class OpportunityFeedError");
}
if (!/readonly status:\s*number/.test(types) && !/\bstatus:\s*number/.test(types)) {
  fails.push("OpportunityFeedError must carry numeric status");
}
if (!idx.includes("OpportunityFeedError")) {
  fails.push("user-feed/index.ts must export OpportunityFeedError");
}
if (!idx.includes("isOpportunityFeedError")) {
  fails.push("user-feed/index.ts must export isOpportunityFeedError");
}
if (!fetchSrc.includes("throw new OpportunityFeedError")) {
  fails.push("fetchOpportunityFeed must throw OpportunityFeedError");
}
if (/throw new Error\(`opportunity_feed_\$\{res\.status\}`\)/.test(fetchSrc)) {
  fails.push(
    "fetchOpportunityFeed must not throw bare Error for HTTP status",
  );
}

if (fails.length) {
  console.error("[verify:sdk-user-feed] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:sdk-user-feed] PASS — exact typed contract · money strings · ghost 0",
);

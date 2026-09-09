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
// NOTE (2026-09-04): the "BalanceAwareHome must expose nearMissExtraCount
// prop" assertion was removed here (and BalanceAwareHome.tsx dropped from the
// mustExist list above). BalanceAwareHome.tsx is unreachable dead code
// (governance/runtime-surfaces.v1.json surfaces.home.legacyOwners), and the
// near-miss suggest-deposit UI feature it implemented is Owner-retired
// (surfaces.home.retiredFeatures) - do not reintroduce a live consumer for
// it. This SDK-level mapNearMissExtraCount export is left in place as
// existing shared-library surface area, not as proof any UI still shows it.

if (fails.length) {
  console.error("[verify:sdk-user-feed] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:sdk-user-feed] PASS — exports+fetchOpportunity*+nearMissExtraCount map",
);

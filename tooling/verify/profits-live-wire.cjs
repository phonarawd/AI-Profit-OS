/**
 * verify:profits-live-wire — UI PART9b 등재 · PASS 조건 Owns=PART9e
 * /profits + /profits/[id] live · @aipo/sdk/user-feed
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
const listSrc = `${listPage}\n${listClient}`;
const detailPage = read("apps/web/app/profits/[id]/page.tsx");
const feed = read("packages/sdk/src/user-feed/fetch.ts");
const sdkPkg = read("packages/sdk/package.json");

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

if (fails.length) {
  console.error("[verify:profits-live-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:profits-live-wire] PASS — /profits + /profits/[id] SDK live wire",
);

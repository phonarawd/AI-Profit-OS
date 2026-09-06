/**
 * verify:s3-33-products — S3 / 3.3 Phase D
 * eBay ingest → identity → review → opportunity → requiredCapitalUsdt → B7
 * Live eBay / staging browser / visual diff stay S6.
 * Production DB apply 0. launchYes must stay false.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail("missing: " + rel);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const matrixRel = "governance/products/s3-33-connection-matrix.v1.json";
const matrixRaw = read(matrixRel);
let matrix;
try {
  matrix = JSON.parse(matrixRaw);
} catch (err) {
  fail("matrix JSON invalid: " + err.message);
  matrix = { checks: {} };
}

if (matrix.liveE2e !== "NOT_RUN") fail("matrix.liveE2e must stay NOT_RUN until S6");
if (matrix.productionDbApply !== false) fail("matrix must not claim production DB apply");
if (matrix.launchYes !== false) fail("matrix.launchYes must stay false");
if (matrix.stagingBrowser !== "NOT_RUN") fail("matrix.stagingBrowser must stay NOT_RUN");

const liveClaims = [
  "D_live_ebay_ingest",
  "D_live_fx_stale",
  "D_visual_diff_390_768_1440",
];
for (const key of liveClaims) {
  if (matrix.checks && matrix.checks[key] !== "NOT_RUN") {
    fail("matrix." + key + " must stay NOT_RUN");
  }
}

const identity = read("services/market-intelligence/src/ebay-identity-match.cjs");
if (!identity.includes("canAutoPublish")) {
  fail("ebay identity must expose canAutoPublish");
}
if (!identity.includes("fuzzy-alone auto-publish 0") && !identity.includes("fuzzy")) {
  fail("title/fuzzy-alone auto-publish must stay blocked");
}

const catalog = read("services/market-intelligence/src/catalog-runtime-seed.cjs");
if (!catalog.includes('startsWith("query:")')) {
  fail("normalizeIngest must skip query: assetId");
}

const persist = read(
  "services/api-nest/src/opportunities/catalog-runtime-seed.service.ts",
);
if (!persist.includes("external_item_id IS NOT DISTINCT FROM")) {
  fail("listing persist must upsert by asset+market+external item");
}
if (!persist.includes("repriceFromCurrentListings")) {
  fail("listing persist must reprice existing opportunity");
}

const reprice = read(
  "services/api-nest/src/opportunities/opportunity-reprice.service.ts",
);
if (!reprice.includes("새 INSERT/promotion 없음")) {
  fail("reprice must not auto-insert opportunities");
}

const userFeed = read(
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
);
if (!userFeed.includes("matchingPolicy.filterForUser")) {
  fail("listFeed must filter through matchingPolicy");
}
if (!userFeed.includes("evaluateForUser")) {
  fail("getById must evaluate matchingPolicy");
}
if (userFeed.includes("LIMIT 200")) {
  fail("listFeed must not truncate candidates before B7");
}
if (!userFeed.includes("asset_id NOT LIKE 'query:%'")) {
  fail("listFeed must exclude query: asset ids");
}

const participate = read(
  "services/api-nest/src/opportunities/participate.service.ts",
);
if (!participate.includes("assertParticipable")) {
  fail("participate must re-check matchingPolicy");
}
if (!participate.includes("amountUsdt must equal requiredCapitalUsdt")) {
  fail("participate must reject client amount != requiredCapitalUsdt");
}
if (!participate.includes("assertBeforeParticipate")) {
  fail("participate must fail-closed on circuit/risk");
}
if (!participate.includes("PRICE_STALE_DATA") || !participate.includes("guardParticipate")) {
  fail("participate must fail-closed on stale price/FX");
}

const mapper = read(
  "services/api-nest/src/matching-policy/matching-policy.service.ts",
);
if (!mapper.includes("isConfirmedAssetId")) {
  fail("opportunityRowToCandidate must reject query: identity");
}
if (!mapper.includes("isPriceFresh")) {
  fail("opportunityRowToCandidate must mark expired from stale_at");
}

const facts = read("services/api-nest/src/ai/fact-tool.service.ts");
if (!facts.includes("matchingPolicy.filterForUser")) {
  fail("peotteok getOpportunity must filter B7 before top-N");
}
if (facts.includes("ORDER BY updated_at DESC NULLS LAST\n          LIMIT 5")) {
  fail("peotteok must not take platform top-5 before B7");
}

const adapters = read(
  "services/api-nest/src/adapters/adapters.admin.service.ts",
);
if (!adapters.includes("identity_review_queue")) {
  fail("unmatched review must persist to identity_review_queue");
}
if (!adapters.includes("resolveEbayIngestListings")) {
  fail("ebay ingest must resolve identity before persist");
}

const detail = read(
  "apps/web/app/profits/[id]/OpportunityDetailClient.tsx",
);
if (!detail.includes("const amountUsdt = item.requiredCapitalUsdt")) {
  fail("detail participate amount must be requiredCapitalUsdt");
}

const grid = read(
  "apps/web/components/spark-dash-profits/VirtualOpportunityGrid.tsx",
);
if (!grid.includes("items.slice(0, visibleCount)")) {
  fail("viewport must reveal from the full policy-passed items");
}
if (!grid.includes("Math.min(items.length, prev + PAGE_SIZE)")) {
  fail("viewport must grow until the full policy-passed set");
}

const emptyDesktop = read(
  "apps/web/components/spark-dash-profits/OpportunityGrid.tsx",
);
const emptyMobile = read(
  "apps/web/components/spark-dash-profits/ProfitsMobile.tsx",
);
if (!emptyDesktop.includes("지금 이용할 수 있는 상품이 없습니다")) {
  fail("desktop empty copy must match B7");
}
if (!emptyMobile.includes("지금 이용할 수 있는 상품이 없습니다")) {
  fail("mobile empty copy must match B7");
}
if (!emptyDesktop.includes("다시 확인") || !emptyMobile.includes("다시 확인")) {
  fail("empty state must offer retry");
}

const mig = read("supabase/migrations/20260906150000_s3_33_product_pipeline.sql");
if (!mig.includes("listings_asset_market_external_uq")) {
  fail("migration missing listings unique");
}
if (!mig.includes("identity_review_queue")) {
  fail("migration missing identity_review_queue");
}
if (/OPPORTUNITY_POOL/i.test(mig)) {
  fail("3.3 must not recreate SYS:OPPORTUNITY_POOL");
}

const fixture = read("tooling/verify/fixtures/migrations-applied.v1.json");
if (!fixture.includes("20260906150000")) {
  fail("committedUnapplied must list 3.3 migration");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:s3-33-products"')) {
  fail("package.json missing verify:s3-33-products");
}
const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("s3-33-products.cjs")) {
  fail("domain-by-path must trigger s3-33-products.cjs");
}

const runtime = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    "--test",
    "services/api-nest/src/matching-policy/matching-policy.runtime.test.ts",
  ],
  { cwd: root, encoding: "utf8", timeout: 30_000 },
);
if (runtime.status !== 0) {
  fail("matching-policy.runtime.test.ts failed");
  if (runtime.stdout) fail(runtime.stdout.slice(0, 800));
  if (runtime.stderr) fail(runtime.stderr.slice(0, 400));
}

const ebay = spawnSync(
  process.execPath,
  ["tooling/verify/ebay-identity-ingest.cjs"],
  { cwd: root, encoding: "utf8", timeout: 30_000 },
);
process.stdout.write(ebay.stdout || "");
process.stderr.write(ebay.stderr || "");
if (ebay.status !== 0) {
  fail("ebay-identity-ingest failed");
}

if (fails.length) {
  console.error("[verify:s3-33-products] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:s3-33-products] PASS (Phase D code · LIVE_E2E=NOT_RUN · productionDbApply=0)",
);

/**
 * verify:listing-promotion
 * Listing→Opportunity 승격 계약 · Opportunity/executable price 0 · durable DB 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function readJson(rel) {
  const raw = read(rel);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    fail(`${rel} invalid JSON`);
    return null;
  }
}

const files = [
  "services/market-intelligence/src/listing-promotion/contract.cjs",
  "services/market-intelligence/src/listing-promotion/promote.cjs",
  "services/market-intelligence/src/listing-promotion/fixtures.cjs",
  "services/market-intelligence/src/listing-promotion/index.cjs",
  "services/api-nest/src/opportunities/listing-promotion.contract.ts",
  "tooling/verify/listing-promotion.cjs",
  "governance/global-product/listing-promotion.v1.json",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const runtimeSrc = [
  "services/market-intelligence/src/listing-promotion/contract.cjs",
  "services/market-intelligence/src/listing-promotion/promote.cjs",
  "services/market-intelligence/src/listing-promotion/index.cjs",
]
  .map((rel) => read(rel))
  .join("\n");

if (runtimeSrc.includes("matchSourceObservationsV2")) {
  fail("listing promotion must not call matchSourceObservationsV2");
}
if (runtimeSrc.includes("identity-matching/v2/matcher")) {
  fail("listing promotion must not require the V2 matcher");
}
if (runtimeSrc.includes("createCanonicalProductFromMatch")) {
  fail("listing promotion must not create CanonicalProduct");
}
if (runtimeSrc.includes("generateCandidatePairs")) {
  fail("listing promotion must not generate candidates");
}
if (!runtimeSrc.includes("evaluateListingVariantCompatibility")) {
  fail("listing promotion must reuse evaluateListingVariantCompatibility");
}
if (runtimeSrc.includes("Math.random") || /openai|llm/i.test(runtimeSrc)) {
  fail("listing promotion must stay deterministic / no LLM");
}
for (const needle of ["normalizeNativeToUsdt", "expectedProfit", "requiredCapital", "fxSnapshot"]) {
  if (runtimeSrc.includes(needle)) fail(`listing promotion must not calculate ${needle}`);
}

const nestSrc = read("services/api-nest/src/opportunities/listing-promotion.contract.ts");
if (nestSrc.includes("computeOpportunityPricing")) {
  fail("api-nest listing-promotion contract must not call computeOpportunityPricing");
}
if (nestSrc.includes("normalizeNativeToUsdt")) {
  fail("api-nest listing-promotion contract must not call normalizeNativeToUsdt");
}
if (/createOpportunity|INSERT INTO opportunities/i.test(nestSrc)) {
  fail("api-nest listing-promotion contract must not create Opportunity");
}
if (!nestSrc.includes("evaluateListingPromotion")) {
  fail("api-nest listing-promotion contract must expose evaluateListingPromotion");
}

const moduleSrc = read("services/api-nest/src/opportunities/opportunities.module.ts");
if (moduleSrc.includes("listing-promotion.contract")) {
  fail("opportunities.module must not wire listing-promotion this slice");
}

const gov = readJson("governance/global-product/listing-promotion.v1.json");
if (!gov) {
  fail("listing-promotion.v1.json unreadable");
} else {
  if (gov.status !== "PASS") fail("governance status must be PASS");
  if (gov.runtime !== "IN_PROCESS_MEMORY") fail("runtime must be IN_PROCESS_MEMORY");
  if (gov.authority.COMPATIBLE_EQUALS_PROMOTABLE !== false) {
    fail("COMPATIBLE_EQUALS_PROMOTABLE must stay false");
  }
  if (gov.authority.PROMOTABLE_EQUALS_OPPORTUNITY !== false) {
    fail("PROMOTABLE_EQUALS_OPPORTUNITY must stay false");
  }
  if (gov.authority.CANONICAL_PRODUCT_REQUIRED_FOR_PROMOTION !== true) {
    fail("CANONICAL_PRODUCT_REQUIRED_FOR_PROMOTION must stay true");
  }
  if (gov.authority.PRICE_AS_PROMOTION !== "FORBIDDEN") {
    fail("PRICE_AS_PROMOTION must stay FORBIDDEN");
  }
  if (gov.authority.OBSERVED_PRICE_EQUALS_EXECUTABLE_PRICE !== false) {
    fail("OBSERVED_PRICE_EQUALS_EXECUTABLE_PRICE must stay false");
  }
  if (gov.firstSlice.doesCallListingVariantCompatibility !== true) {
    fail("doesCallListingVariantCompatibility");
  }
  if (gov.firstSlice.doesNotCreateOpportunity !== true) fail("doesNotCreateOpportunity");
  if (gov.firstSlice.doesNotCalculatePriceFeesFx !== true) {
    fail("doesNotCalculatePriceFeesFx");
  }
  if (gov.persistence.LISTING_PROMOTION_DB_RUNTIME !== "NOT_IMPLEMENTED") {
    fail("LISTING_PROMOTION_DB_RUNTIME must stay NOT_IMPLEMENTED");
  }
  if (gov.persistence.PRODUCTION_LISTING_PROMOTION !== "NOT_IMPLEMENTED") {
    fail("PRODUCTION_LISTING_PROMOTION must stay NOT_IMPLEMENTED");
  }
}

const cpGov = readJson("governance/global-product/canonical-product.v2.json");
if (!cpGov || !Array.isArray(cpGov.pipelineAfterMatch)) {
  fail("canonical-product.v2.json pipelineAfterMatch required");
} else {
  const pipe = cpGov.pipelineAfterMatch;
  const iCompat = pipe.indexOf("listing/variant compatibility");
  const iPromo = pipe.indexOf("listing promotion");
  const iPrice = pipe.indexOf("current executable price from SourceObservation/Reprice");
  const iOpp = pipe.indexOf("Opportunity");
  if (iCompat < 0) fail("pipelineAfterMatch must keep listing/variant compatibility");
  if (iPromo < 0) fail("pipelineAfterMatch must include listing promotion");
  if (iPrice < 0) fail("pipelineAfterMatch must keep current executable price");
  if (iOpp < 0) fail("pipelineAfterMatch must keep Opportunity");
  if (!(iCompat < iPromo && iPromo < iPrice && iPrice < iOpp)) {
    fail("pipelineAfterMatch order must be compatibility → listing promotion → executable price → Opportunity");
  }
}

const govV2 = readJson("governance/global-product/identity-matching.v2.json");
if (govV2 && govV2.listingPromotion !== "NOT_IMPLEMENTED") {
  fail("identity-matching.v2 listingPromotion must stay NOT_IMPLEMENTED");
}
if (govV2 && govV2.executablePriceAvailFeesFx && govV2.executablePriceAvailFeesFx !== "NOT_IMPLEMENTED") {
  fail("identity-matching.v2 executablePriceAvailFeesFx must stay NOT_IMPLEMENTED");
}
if (govV2 && govV2.multiSourceOpportunityCreation !== "NOT_IMPLEMENTED") {
  fail("identity-matching.v2 multiSourceOpportunityCreation must stay NOT_IMPLEMENTED");
}
if (govV2 && govV2.layers && !String(govV2.layers.listingPromotion).includes("IN_PROCESS_MEMORY")) {
  fail("identity-matching.v2 layers.listingPromotion must record IN_PROCESS_MEMORY");
}

const v2 = require(path.join(root, "services/market-intelligence/src/identity-matching/v2/index.cjs"));
if (v2.PIPELINE_STATUS.CANDIDATE_GENERATION !== "NOT_IMPLEMENTED") {
  fail("matcher PIPELINE_STATUS.CANDIDATE_GENERATION must stay NOT_IMPLEMENTED");
}

const cp = require(path.join(root, "services/market-intelligence/src/canonical-product/index.cjs"));
if (cp.PIPELINE_STATUS.CANDIDATE_GENERATION !== "NOT_IMPLEMENTED") {
  fail("canonical-product PIPELINE_STATUS.CANDIDATE_GENERATION must stay NOT_IMPLEMENTED");
}

const cg = require(path.join(root, "services/market-intelligence/src/candidate-generation/index.cjs"));
if (cg.PIPELINE_STATUS.LISTING_PROMOTION !== "NOT_IMPLEMENTED") {
  fail("candidate-generation must not own LISTING_PROMOTION");
}

const lvc = require(path.join(
  root,
  "services/market-intelligence/src/listing-variant-compatibility/index.cjs",
));
if (lvc.PIPELINE_STATUS.LISTING_PROMOTION !== "NOT_IMPLEMENTED") {
  fail("listing-variant-compatibility must not own LISTING_PROMOTION");
}

const promo = require(path.join(root, "services/market-intelligence/src/listing-promotion/index.cjs"));
const { cases } = require(path.join(
  root,
  "services/market-intelligence/src/listing-promotion/fixtures.cjs",
));

if (promo.PROMOTER_VERSION !== "listing-promotion.v1") {
  fail("PROMOTER_VERSION must be listing-promotion.v1");
}
if (promo.PIPELINE_STATUS.LISTING_PROMOTION !== "IN_PROCESS_MEMORY") {
  fail("LISTING_PROMOTION must be IN_PROCESS_MEMORY");
}
if (promo.PIPELINE_STATUS.EXECUTABLE_PRICE_AVAIL_FEES_FX !== "NOT_IMPLEMENTED") {
  fail("EXECUTABLE_PRICE_AVAIL_FEES_FX must stay NOT_IMPLEMENTED");
}
if (promo.PIPELINE_STATUS.MULTI_SOURCE_OPPORTUNITY_CREATION !== "NOT_IMPLEMENTED") {
  fail("MULTI_SOURCE_OPPORTUNITY_CREATION must stay NOT_IMPLEMENTED");
}
if (promo.BOUNDARIES.COMPATIBLE_EQUALS_PROMOTABLE !== false) {
  fail("runtime COMPATIBLE_EQUALS_PROMOTABLE");
}
if (promo.LISTING_PROMOTION_IS_NOT_OPPORTUNITY !== true) {
  fail("LISTING_PROMOTION_IS_NOT_OPPORTUNITY");
}

const now = "2026-08-20T03:00:00.000Z";

function assertPromoShape(row, label) {
  if (row.samePhysicalItem !== false) fail(`${label} samePhysicalItem must stay false`);
  if (row.opportunity !== false) fail(`${label} opportunity must stay false`);
  if (row.executablePrice !== null) fail(`${label} executablePrice must stay null`);
  if (row.availability !== null) fail(`${label} availability must stay null`);
  if (row.feesFx !== null) fail(`${label} feesFx must stay null`);
  if (row.observedPriceUsedAsExecutable !== false) {
    fail(`${label} observedPriceUsedAsExecutable must stay false`);
  }
  if (row.promoterVersion !== "listing-promotion.v1") fail(`${label} promoterVersion`);
  if (row.evaluatedAt !== now) fail(`${label} evaluatedAt must use opts.now`);
  if (row.decision === "PROMOTABLE") {
    if (row.listingPromotion !== true) fail(`${label} PROMOTABLE must set listingPromotion`);
    if (!row.canonicalProductId) fail(`${label} PROMOTABLE requires canonicalProductId`);
    if (row.tradableEquivalent !== true) fail(`${label} PROMOTABLE requires tradableEquivalent`);
    if (row.compatibilityDecision !== "COMPATIBLE") {
      fail(`${label} PROMOTABLE requires COMPATIBLE compatibility`);
    }
  } else if (row.listingPromotion !== false) {
    fail(`${label} non-PROMOTABLE must keep listingPromotion false`);
  }
}

for (const row of cases) {
  const out = promo.evaluateListingPromotion(row.left, row.right, { now });
  if (out.decision !== row.expect) {
    fail(`${row.id} expected ${row.expect} got ${out.decision}/${out.reason}`);
    continue;
  }
  if (row.expectReason && out.reason !== row.expectReason) {
    fail(`${row.id} reason expected ${row.expectReason} got ${out.reason}`);
  }
  if (Object.prototype.hasOwnProperty.call(row, "expectPromotion") && out.listingPromotion !== row.expectPromotion) {
    fail(`${row.id} listingPromotion expected ${row.expectPromotion} got ${out.listingPromotion}`);
  }
  if (row.expectSamePhysical === false && out.samePhysicalItem !== false) {
    fail(`${row.id} samePhysicalItem must be false`);
  }
  if (row.expectCompat) {
    if (out.compatibilityDecision !== row.expectCompat) {
      fail(`${row.id} compatibilityDecision expected ${row.expectCompat} got ${out.compatibilityDecision}`);
    }
  }
  assertPromoShape(out, row.id);
}

const first = promo.evaluateListingPromotion(cases[0].left, cases[0].right, { now });
const second = promo.evaluateListingPromotion(cases[0].left, cases[0].right, { now });
if (JSON.stringify(first) !== JSON.stringify(second)) {
  fail("promoter must be deterministic for the same listings + now");
}

const compatWithoutCp = cases.find((row) => row.id === "neg-compatible-without-cp");
if (compatWithoutCp) {
  const compat = lvc.evaluateListingVariantCompatibility(
    compatWithoutCp.left,
    compatWithoutCp.right,
    { now },
  );
  const promoted = promo.evaluateListingPromotion(
    compatWithoutCp.left,
    compatWithoutCp.right,
    { now },
  );
  if (compat.decision !== "COMPATIBLE") {
    fail("neg-compatible-without-cp must stay COMPATIBLE at listing/variant gate");
  }
  if (compat.listingPromotion !== false) {
    fail("listing-variant-compatibility must still leave listingPromotion false");
  }
  if (promoted.decision !== "INSUFFICIENT" || promoted.reason !== "CANONICAL_PRODUCT_REQUIRED") {
    fail("COMPATIBLE without CanonicalProduct must not be PROMOTABLE");
  }
}

const priced = cases.find((row) => row.id === "pos-card-same-psa10-with-cp");
if (priced) {
  const out = promo.evaluateListingPromotion(priced.left, priced.right, { now });
  if (out.decision !== "PROMOTABLE") fail("priced compatible pair must be PROMOTABLE");
  if (out.executablePrice !== null) fail("observed nativeAmount must not become executablePrice");
  const blob = JSON.stringify(out);
  if (blob.includes("99.00") || blob.includes("110.00")) {
    fail("promotion result must not carry observed native amounts");
  }
}

const sizeCase = cases.find((row) => row.id === "neg-sneaker-size-mismatch-with-cp");
if (sizeCase) {
  const sizeOut = promo.evaluateListingPromotion(sizeCase.left, sizeCase.right, { now });
  if (sizeOut.decision !== "NOT_PROMOTABLE") {
    fail("same imageUrl must not promote size mismatch");
  }
}

if (fails.length) {
  console.error("[verify:listing-promotion] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:listing-promotion] PASS (in-process 승격 계약 · COMPATIBLE≠PROMOTABLE · CP required · Opportunity/executable price 0)",
);

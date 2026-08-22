/**
 * verify:multi-source-opportunity
 * EXECUTABLE 교차 소스 쌍 → in-process Opportunity row
 * Money/Engine owner 재사용 · 새 formula 0 · production INSERT 0 · durable 0
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
  "services/market-intelligence/src/multi-source-opportunity/contract.cjs",
  "services/market-intelligence/src/multi-source-opportunity/create.cjs",
  "services/market-intelligence/src/multi-source-opportunity/fixtures.cjs",
  "services/market-intelligence/src/multi-source-opportunity/index.cjs",
  "services/api-nest/src/opportunities/multi-source-opportunity.contract.ts",
  "tooling/verify/multi-source-opportunity.cjs",
  "governance/global-product/multi-source-opportunity.v1.json",
  "services/market-intelligence/src/pricing-formula.cjs",
  "services/market-intelligence/src/executable-economics/evaluate.cjs",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const runtimeSrc = [
  "services/market-intelligence/src/multi-source-opportunity/contract.cjs",
  "services/market-intelligence/src/multi-source-opportunity/create.cjs",
  "services/market-intelligence/src/multi-source-opportunity/index.cjs",
]
  .map((rel) => read(rel))
  .join("\n");

if (runtimeSrc.includes("matchSourceObservationsV2")) {
  fail("multi-source opportunity must not call matchSourceObservationsV2");
}
if (runtimeSrc.includes("createCanonicalProductFromMatch")) {
  fail("multi-source opportunity must not create CanonicalProduct");
}
if (runtimeSrc.includes("generateCandidatePairs")) {
  fail("multi-source opportunity must not generate candidates");
}
if (!runtimeSrc.includes("evaluateExecutableEconomics")) {
  fail("multi-source opportunity must reuse evaluateExecutableEconomics");
}
if (!runtimeSrc.includes("computeOpportunityPricing")) {
  fail("multi-source opportunity must reuse computeOpportunityPricing");
}
if (runtimeSrc.includes("Math.random") || /openai|anthropic|\bllm\b/i.test(runtimeSrc)) {
  fail("multi-source opportunity must stay deterministic / no LLM");
}
if (/INSERT INTO(?: public\.)?opportunities/i.test(runtimeSrc)) {
  fail("multi-source opportunity must not INSERT Opportunity");
}
if (runtimeSrc.includes("DEFAULT_FEE_PCT")) {
  fail("multi-source opportunity must not redefine DEFAULT_FEE_PCT");
}
if (/"0\.135"/.test(runtimeSrc) || runtimeSrc.includes("tcgplayerFee")) {
  fail("multi-source opportunity must not invent a fee table");
}

const marketsSrc = read("services/market-intelligence/src/markets.cjs");
if (marketsSrc.includes("tcgplayer") || marketsSrc.includes("chrono24") || marketsSrc.includes("stockx")) {
  fail("markets.cjs must not gain Track A source marketIds this slice");
}

const nestSrc = read("services/api-nest/src/opportunities/multi-source-opportunity.contract.ts");
if (!nestSrc.includes("createMultiSourceOpportunity")) {
  fail("api-nest multi-source-opportunity contract must expose createMultiSourceOpportunity");
}
if (/INSERT INTO(?: public\.)?opportunities/i.test(nestSrc)) {
  fail("api-nest multi-source-opportunity contract must not INSERT Opportunity");
}

const moduleSrc = read("services/api-nest/src/opportunities/opportunities.module.ts");
if (moduleSrc.includes("multi-source-opportunity.contract")) {
  fail("opportunities.module must not wire multi-source-opportunity this slice");
}

const pkg = readJson("services/market-intelligence/package.json");
if (!pkg || !pkg.exports || pkg.exports["./multi-source-opportunity"] !== "./src/multi-source-opportunity/index.cjs") {
  fail("market-intelligence package must export ./multi-source-opportunity");
}
const rootPkg = readJson("package.json");
if (!rootPkg || rootPkg.scripts["verify:multi-source-opportunity"] !== "node tooling/verify/multi-source-opportunity.cjs") {
  fail("root package.json missing verify:multi-source-opportunity");
}

const gov = readJson("governance/global-product/multi-source-opportunity.v1.json");
if (!gov) {
  fail("multi-source-opportunity.v1.json unreadable");
} else {
  if (gov.status !== "PASS") fail("governance status must be PASS");
  if (gov.runtime !== "IN_PROCESS_MEMORY") fail("runtime must be IN_PROCESS_MEMORY");
  if (gov.authority.EXECUTABLE_EQUALS_OPPORTUNITY !== false) {
    fail("EXECUTABLE_EQUALS_OPPORTUNITY must stay false");
  }
  if (gov.authority.OBSERVED_PRICE_EQUALS_EXECUTABLE_PRICE !== false) {
    fail("OBSERVED_PRICE_EQUALS_EXECUTABLE_PRICE must stay false");
  }
  if (gov.authority.CANONICAL_PRODUCT_EQUALS_ASSET !== false) {
    fail("CANONICAL_PRODUCT_EQUALS_ASSET must stay false");
  }
  if (gov.authority.PRODUCTION_INSERT_THIS_SLICE !== "FORBIDDEN") {
    fail("PRODUCTION_INSERT_THIS_SLICE must stay FORBIDDEN");
  }
  if (gov.authority.NEW_PRICING_FORMULA !== "FORBIDDEN") fail("NEW_PRICING_FORMULA");
  if (gov.firstSlice.doesCallExecutableEconomics !== true) fail("doesCallExecutableEconomics");
  if (gov.firstSlice.doesCreateOpportunity !== true) fail("doesCreateOpportunity");
  if (gov.firstSlice.doesInsertProductionOpportunity !== false) {
    fail("doesInsertProductionOpportunity must stay false");
  }
  if (gov.firstSlice.doesNotMapAssetIdToCanonicalProduct !== true) {
    fail("doesNotMapAssetIdToCanonicalProduct");
  }
  if (gov.persistence.MULTI_SOURCE_OPPORTUNITY_DB_RUNTIME !== "NOT_IMPLEMENTED") {
    fail("MULTI_SOURCE_OPPORTUNITY_DB_RUNTIME must stay NOT_IMPLEMENTED");
  }
  if (gov.persistence.PRODUCTION_MULTI_SOURCE_OPPORTUNITY !== "NOT_IMPLEMENTED") {
    fail("PRODUCTION_MULTI_SOURCE_OPPORTUNITY must stay NOT_IMPLEMENTED");
  }
}

const cpGov = readJson("governance/global-product/canonical-product.v2.json");
if (!cpGov || !Array.isArray(cpGov.pipelineAfterMatch)) {
  fail("canonical-product.v2.json pipelineAfterMatch required");
} else {
  const pipe = cpGov.pipelineAfterMatch;
  const iFees = pipe.indexOf("fees/FX");
  const iElig = pipe.indexOf("Opportunity eligibility");
  const iOpp = pipe.indexOf("Opportunity");
  if (iFees < 0 || iElig < 0 || iOpp < 0) {
    fail("pipelineAfterMatch must keep fees/FX → Opportunity eligibility → Opportunity");
  } else if (!(iFees < iElig && iElig < iOpp)) {
    fail("pipelineAfterMatch order must stay fees/FX → Opportunity eligibility → Opportunity");
  }
}

const govV2 = readJson("governance/global-product/identity-matching.v2.json");
if (govV2 && govV2.listingPromotion !== "NOT_IMPLEMENTED") {
  fail("identity-matching.v2 listingPromotion must stay NOT_IMPLEMENTED");
}
if (govV2 && govV2.executablePriceAvailFeesFx !== "NOT_IMPLEMENTED") {
  fail("identity-matching.v2 executablePriceAvailFeesFx must stay NOT_IMPLEMENTED");
}
if (govV2 && govV2.multiSourceOpportunityCreation !== "NOT_IMPLEMENTED") {
  fail("identity-matching.v2 multiSourceOpportunityCreation must stay NOT_IMPLEMENTED");
}
if (
  govV2 &&
  govV2.layers &&
  !String(govV2.layers.multiSourceOpportunityCreation).includes("IN_PROCESS_MEMORY")
) {
  fail("identity-matching.v2 layers.multiSourceOpportunityCreation must record IN_PROCESS_MEMORY");
}

const exec = require(path.join(root, "services/market-intelligence/src/executable-economics/index.cjs"));
if (exec.PIPELINE_STATUS.MULTI_SOURCE_OPPORTUNITY_CREATION !== "NOT_IMPLEMENTED") {
  fail("executable-economics must not own MULTI_SOURCE_OPPORTUNITY_CREATION");
}
if (exec.DOES_NOT_CREATE_OPPORTUNITY !== true) {
  fail("executable-economics DOES_NOT_CREATE_OPPORTUNITY must stay true");
}

const promo = require(path.join(root, "services/market-intelligence/src/listing-promotion/index.cjs"));
if (promo.PIPELINE_STATUS.MULTI_SOURCE_OPPORTUNITY_CREATION !== "NOT_IMPLEMENTED") {
  fail("listing-promotion must not own MULTI_SOURCE_OPPORTUNITY_CREATION");
}

const v2 = require(path.join(root, "services/market-intelligence/src/identity-matching/v2/index.cjs"));
if (v2.PIPELINE_STATUS.CANDIDATE_GENERATION !== "NOT_IMPLEMENTED") {
  fail("matcher PIPELINE_STATUS.CANDIDATE_GENERATION must stay NOT_IMPLEMENTED");
}

const ms = require(path.join(root, "services/market-intelligence/src/multi-source-opportunity/index.cjs"));
const { cases, NOW, FX_SNAPSHOT } = require(path.join(
  root,
  "services/market-intelligence/src/multi-source-opportunity/fixtures.cjs",
));
const { computeOpportunityPricing, withinTolerance } = require(path.join(
  root,
  "services/market-intelligence/src/pricing-formula.cjs",
));
const { normalizeNativeToUsdt, approxKrwFromSnapshot } = require(path.join(
  root,
  "services/market-intelligence/src/fx-snapshot-formula.cjs",
));

if (ms.EVALUATOR_VERSION !== "multi-source-opportunity.v1") {
  fail("EVALUATOR_VERSION must be multi-source-opportunity.v1");
}
if (ms.PIPELINE_STATUS.MULTI_SOURCE_OPPORTUNITY_CREATION !== "IN_PROCESS_MEMORY") {
  fail("MULTI_SOURCE_OPPORTUNITY_CREATION must be IN_PROCESS_MEMORY");
}
if (ms.PIPELINE_STATUS.PRODUCTION_MULTI_SOURCE_OPPORTUNITY !== "NOT_IMPLEMENTED") {
  fail("PRODUCTION_MULTI_SOURCE_OPPORTUNITY must stay NOT_IMPLEMENTED");
}
if (ms.BOUNDARIES.EXECUTABLE_EQUALS_OPPORTUNITY !== false) {
  fail("runtime EXECUTABLE_EQUALS_OPPORTUNITY");
}
if (ms.EXECUTABLE_IS_NOT_OPPORTUNITY !== true) {
  fail("EXECUTABLE_IS_NOT_OPPORTUNITY");
}
if (ms.DOES_NOT_INSERT_PRODUCTION_OPPORTUNITY !== true) {
  fail("DOES_NOT_INSERT_PRODUCTION_OPPORTUNITY");
}

function assertIssuedShape(row, label) {
  if (row.samePhysicalItem !== false) fail(`${label} samePhysicalItem must stay false`);
  if (row.observedPriceUsedAsExecutable !== false) {
    fail(`${label} observedPriceUsedAsExecutable must stay false`);
  }
  if (row.productionPersisted !== false) fail(`${label} productionPersisted must stay false`);
  if (row.evaluatorVersion !== "multi-source-opportunity.v1") fail(`${label} evaluatorVersion`);
  if (row.evaluatedAt !== NOW) fail(`${label} evaluatedAt must use opts.now`);
  if (row.decision === "ISSUED") {
    if (row.issued !== true) fail(`${label} ISSUED must set issued`);
    if (!row.opportunity) fail(`${label} ISSUED requires opportunity row`);
    const opp = row.opportunity;
    if (!opp.opportunityId) fail(`${label} opportunityId missing`);
    if (!opp.canonicalProductId) fail(`${label} canonicalProductId required`);
    if (opp.assetId !== null) fail(`${label} assetId must stay null`);
    if (opp.canonicalProductId === opp.assetId) {
      fail(`${label} CanonicalProduct must not equal assetId`);
    }
    if (opp.productionPersisted !== false) fail(`${label} row productionPersisted`);
    if (opp.pricedAt !== opp.staleAt) fail(`${label} staleAt must bind as-of pricedAt`);
    if (opp.leftSource === opp.rightSource) fail(`${label} ISSUED must be multi-source`);
    if (!opp.observedPrice || !opp.executablePrice) {
      fail(`${label} must keep observed and executable prices`);
    }
    if (opp.observedPrice.buy.amount === opp.executablePrice.buyUsdt) {
      fail(`${label} observed buy native must not equal executable buy USDT`);
    }
    if (opp.expectedProfitUsdt !== opp.pricing.expectedProfitUsdt) {
      fail(`${label} row profit must reuse pricing SSOT`);
    }
  } else if (row.issued !== false || row.opportunity !== null) {
    fail(`${label} non-ISSUED must keep opportunity null`);
  }
}

for (const row of cases) {
  const out = ms.createMultiSourceOpportunity(row.left, row.right, row.opts);
  if (out.decision !== row.expect) {
    fail(`${row.id} expected ${row.expect} got ${out.decision}/${out.reason}`);
    continue;
  }
  if (row.expectReason && out.reason !== row.expectReason) {
    fail(`${row.id} reason expected ${row.expectReason} got ${out.reason}`);
  }
  assertIssuedShape(out, row.id);
}

const first = ms.createMultiSourceOpportunity(cases[0].left, cases[0].right, cases[0].opts);
const second = ms.createMultiSourceOpportunity(cases[0].left, cases[0].right, cases[0].opts);
if (JSON.stringify(first) !== JSON.stringify(second)) {
  fail("issuer must be deterministic for the same listings + now + snapshot");
}
if (first.decision === "ISSUED" && first.opportunity.opportunityId !== second.opportunity.opportunityId) {
  fail("same pair must reuse the same opportunityId");
}

const wired = ms.createMultiSourceOpportunity(cases[0].left, cases[0].right, cases[0].opts);
if (wired.decision === "ISSUED") {
  const buyFx = normalizeNativeToUsdt({
    nativeAmount: cases[0].left.nativeAmount,
    nativeCurrency: cases[0].left.nativeCurrency,
    snapshot: FX_SNAPSHOT,
  });
  const sellFx = normalizeNativeToUsdt({
    nativeAmount: cases[0].right.nativeAmount,
    nativeCurrency: cases[0].right.nativeCurrency,
    snapshot: FX_SNAPSHOT,
  });
  const pricing = computeOpportunityPricing({
    buyMarketId: "ebay_us",
    sellMarketId: "admin",
    buyPriceUsdt: buyFx.normalizedUsdt,
    sellPriceUsdt: sellFx.normalizedUsdt,
    legsFresh: true,
  });
  if (wired.opportunity.executablePrice.buyUsdt !== buyFx.normalizedUsdt) {
    fail("issued buyUsdt must equal normalizeNativeToUsdt");
  }
  if (wired.opportunity.pricing.feesUsdt !== pricing.feesUsdt) {
    fail("issued feesUsdt must equal computeOpportunityPricing");
  }
  if (wired.opportunity.expectedProfitUsdt !== pricing.expectedProfitUsdt) {
    fail("issued expectedProfitUsdt must equal computeOpportunityPricing");
  }
  const krw = approxKrwFromSnapshot(pricing.expectedProfitUsdt, {
    usdtKrw: FX_SNAPSHOT.usdtKrw,
  });
  if (!withinTolerance(wired.opportunity.expectedProfitKrwApprox, krw)) {
    fail("issued KRW approx must reuse approxKrwFromSnapshot");
  }
  if (wired.opportunity.opportunityId !== `opp_${wired.opportunity.canonicalProductId}__l_exec_buy_ebay_us__l_exec_sell_admin`) {
    fail("issued opportunityId must be deterministic from CP + buy + sell");
  }
}

const sameSource = cases.find((row) => row.id === "neg-same-source-ebay-us-gb");
if (sameSource) {
  const econ = exec.evaluateExecutableEconomics(sameSource.left, sameSource.right, sameSource.opts);
  const issued = ms.createMultiSourceOpportunity(sameSource.left, sameSource.right, sameSource.opts);
  if (econ.decision !== "NOT_EXECUTABLE" || econ.reason !== "SAME_SOURCE") {
    fail("same-source ebay_us×ebay_gb must stay NOT_EXECUTABLE/SAME_SOURCE at economics");
  }
  if (econ.opportunity !== false) {
    fail("executable economics must still keep opportunity=false");
  }
  if (issued.decision !== "NOT_ISSUED" || issued.reason !== "SAME_SOURCE") {
    fail("same-source pair must not become an Opportunity");
  }
}

if (wired.decision === "ISSUED") {
  const econWired = exec.evaluateExecutableEconomics(cases[0].left, cases[0].right, cases[0].opts);
  if (econWired.decision !== "EXECUTABLE" || econWired.opportunity !== false) {
    fail("EXECUTABLE economics result must stay opportunity=false");
  }
  if (wired.opportunity == null) {
    fail("ISSUED must materialize a separate Opportunity row");
  }
}

const tcg = cases.find((row) => row.id === "neg-promotable-tcg-ebay-no-day1-market");
if (tcg) {
  const promoted = promo.evaluateListingPromotion(tcg.left, tcg.right, { now: NOW });
  const issued = ms.createMultiSourceOpportunity(tcg.left, tcg.right, tcg.opts);
  if (promoted.decision !== "PROMOTABLE") {
    fail("tcg×ebay fixture must stay PROMOTABLE at listing promotion");
  }
  if (issued.decision !== "INSUFFICIENT" || issued.reason !== "MARKET_ID_UNRESOLVED") {
    fail("PROMOTABLE tcgplayer pair must not become an Opportunity without a Day-1 market owner");
  }
  if (issued.opportunity !== null) {
    fail("tcgplayer observed 99.00 must not become an Opportunity row");
  }
}

const cheapest = ms.createMultiSourceOpportunity(cases[0].left, cases[0].right, {
  now: NOW,
  fxSnapshot: FX_SNAPSHOT,
});
if (cheapest.decision !== "INSUFFICIENT" || cheapest.reason !== "LEG_ASSIGNMENT_REQUIRED") {
  fail("missing buy/sell assignment must not pick cheapest as buy or issue Opportunity");
}

if (fails.length) {
  console.error("[verify:multi-source-opportunity] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:multi-source-opportunity] PASS (in-process row · EXECUTABLE≠Opportunity · multi-source only · observed≠executable · production INSERT 0)",
);

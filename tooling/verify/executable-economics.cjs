/**
 * verify:executable-economics
 * PROMOTABLE 이후 executable price/availability/fees/FX wiring
 * Money/Engine owner 재사용 · 새 formula 0 · Opportunity 0 · durable 0
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
  "services/market-intelligence/src/executable-economics/contract.cjs",
  "services/market-intelligence/src/executable-economics/extract.cjs",
  "services/market-intelligence/src/executable-economics/evaluate.cjs",
  "services/market-intelligence/src/executable-economics/fixtures.cjs",
  "services/market-intelligence/src/executable-economics/index.cjs",
  "services/api-nest/src/opportunities/executable-economics.contract.ts",
  "tooling/verify/executable-economics.cjs",
  "governance/global-product/executable-economics.v1.json",
  "services/market-intelligence/src/pricing-formula.cjs",
  "services/market-intelligence/src/fx-snapshot-formula.cjs",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const runtimeSrc = [
  "services/market-intelligence/src/executable-economics/contract.cjs",
  "services/market-intelligence/src/executable-economics/extract.cjs",
  "services/market-intelligence/src/executable-economics/evaluate.cjs",
  "services/market-intelligence/src/executable-economics/index.cjs",
]
  .map((rel) => read(rel))
  .join("\n");

if (runtimeSrc.includes("matchSourceObservationsV2")) {
  fail("executable economics must not call matchSourceObservationsV2");
}
if (runtimeSrc.includes("createCanonicalProductFromMatch")) {
  fail("executable economics must not create CanonicalProduct");
}
if (runtimeSrc.includes("generateCandidatePairs")) {
  fail("executable economics must not generate candidates");
}
if (!runtimeSrc.includes("evaluateListingPromotion")) {
  fail("executable economics must reuse evaluateListingPromotion");
}
if (!runtimeSrc.includes("computeOpportunityPricing")) {
  fail("executable economics must reuse computeOpportunityPricing");
}
if (!runtimeSrc.includes("normalizeNativeToUsdt")) {
  fail("executable economics must reuse normalizeNativeToUsdt");
}
if (!runtimeSrc.includes("LISTING_STALE_SEC")) {
  fail("executable economics must reuse LISTING_STALE_SEC");
}
if (!runtimeSrc.includes("MARKETPLACE_BY_MARKET")) {
  fail("executable economics must reuse MARKETPLACE_BY_MARKET");
}
if (!runtimeSrc.includes("evaluateStaleListings")) {
  fail("executable economics must reuse evaluateStaleListings");
}
if (runtimeSrc.includes("Math.random") || /openai|anthropic|\bllm\b/i.test(runtimeSrc)) {
  fail("executable economics must stay deterministic / no LLM");
}
if (/INSERT INTO opportunities/i.test(runtimeSrc)) {
  fail("executable economics must not INSERT Opportunity");
}
if (runtimeSrc.includes("DEFAULT_FEE_PCT")) {
  fail("executable economics must not redefine DEFAULT_FEE_PCT");
}
if (/"0\.135"/.test(runtimeSrc) || runtimeSrc.includes("tcgplayerFee")) {
  fail("executable economics must not invent a fee table");
}

const marketsSrc = read("services/market-intelligence/src/markets.cjs");
if (marketsSrc.includes("tcgplayer") || marketsSrc.includes("chrono24") || marketsSrc.includes("stockx")) {
  fail("markets.cjs must not gain Track A source marketIds this slice");
}

const pricingSrc = read("services/market-intelligence/src/pricing-formula.cjs");
const fxSrc = read("services/market-intelligence/src/fx-snapshot-formula.cjs");
if (!pricingSrc.includes("function computeOpportunityPricing")) {
  fail("pricing-formula owner missing");
}
if (!fxSrc.includes("function normalizeNativeToUsdt")) {
  fail("fx-snapshot-formula owner missing");
}

const nestSrc = read("services/api-nest/src/opportunities/executable-economics.contract.ts");
if (!nestSrc.includes("evaluateExecutableEconomics")) {
  fail("api-nest executable-economics contract must expose evaluateExecutableEconomics");
}
if (/INSERT INTO opportunities/i.test(nestSrc)) {
  fail("api-nest executable-economics contract must not create Opportunity");
}

const moduleSrc = read("services/api-nest/src/opportunities/opportunities.module.ts");
if (moduleSrc.includes("executable-economics.contract")) {
  fail("opportunities.module must not wire executable-economics this slice");
}

const pkg = readJson("services/market-intelligence/package.json");
if (!pkg || !pkg.exports || pkg.exports["./executable-economics"] !== "./src/executable-economics/index.cjs") {
  fail("market-intelligence package must export ./executable-economics");
}
const rootPkg = readJson("package.json");
if (!rootPkg || rootPkg.scripts["verify:executable-economics"] !== "node tooling/verify/executable-economics.cjs") {
  fail("root package.json missing verify:executable-economics");
}

const gov = readJson("governance/global-product/executable-economics.v1.json");
if (!gov) {
  fail("executable-economics.v1.json unreadable");
} else {
  if (gov.status !== "PASS") fail("governance status must be PASS");
  if (gov.runtime !== "IN_PROCESS_MEMORY") fail("runtime must be IN_PROCESS_MEMORY");
  if (gov.authority.PROMOTABLE_EQUALS_EXECUTABLE !== false) {
    fail("PROMOTABLE_EQUALS_EXECUTABLE must stay false");
  }
  if (gov.authority.EXECUTABLE_EQUALS_OPPORTUNITY !== false) {
    fail("EXECUTABLE_EQUALS_OPPORTUNITY must stay false");
  }
  if (gov.authority.OBSERVED_PRICE_EQUALS_EXECUTABLE_PRICE !== false) {
    fail("OBSERVED_PRICE_EQUALS_EXECUTABLE_PRICE must stay false");
  }
  if (gov.authority.STALE_PRICE_EQUALS_CURRENT_PRICE !== false) {
    fail("STALE_PRICE_EQUALS_CURRENT_PRICE must stay false");
  }
  if (gov.authority.NEW_PRICING_FORMULA !== "FORBIDDEN") fail("NEW_PRICING_FORMULA");
  if (gov.authority.NEW_FX_FORMULA !== "FORBIDDEN") fail("NEW_FX_FORMULA");
  if (gov.firstSlice.doesCallListingPromotion !== true) fail("doesCallListingPromotion");
  if (gov.firstSlice.doesReuseComputeOpportunityPricing !== true) {
    fail("doesReuseComputeOpportunityPricing");
  }
  if (gov.firstSlice.doesNotCreateOpportunity !== true) fail("doesNotCreateOpportunity");
  if (gov.firstSlice.doesNotInventFeeTable !== true) fail("doesNotInventFeeTable");
  if (gov.persistence.EXECUTABLE_ECONOMICS_DB_RUNTIME !== "NOT_IMPLEMENTED") {
    fail("EXECUTABLE_ECONOMICS_DB_RUNTIME must stay NOT_IMPLEMENTED");
  }
  if (gov.persistence.PRODUCTION_EXECUTABLE_ECONOMICS !== "NOT_IMPLEMENTED") {
    fail("PRODUCTION_EXECUTABLE_ECONOMICS must stay NOT_IMPLEMENTED");
  }
}

const cpGov = readJson("governance/global-product/canonical-product.v2.json");
if (!cpGov || !Array.isArray(cpGov.pipelineAfterMatch)) {
  fail("canonical-product.v2.json pipelineAfterMatch required");
} else {
  const pipe = cpGov.pipelineAfterMatch;
  const iPromo = pipe.indexOf("listing promotion");
  const iPrice = pipe.indexOf("current executable price from SourceObservation/Reprice");
  const iAvail = pipe.indexOf("availability");
  const iFees = pipe.indexOf("fees/FX");
  const iOpp = pipe.indexOf("Opportunity");
  if (iPromo < 0 || iPrice < 0 || iAvail < 0 || iFees < 0 || iOpp < 0) {
    fail("pipelineAfterMatch must keep promotion → executable price → availability → fees/FX → Opportunity");
  } else if (!(iPromo < iPrice && iPrice < iAvail && iAvail < iFees && iFees < iOpp)) {
    fail("pipelineAfterMatch order must stay promotion → executable price → availability → fees/FX → Opportunity");
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
  !String(govV2.layers.executablePriceAvailFeesFx).includes("IN_PROCESS_MEMORY")
) {
  fail("identity-matching.v2 layers.executablePriceAvailFeesFx must record IN_PROCESS_MEMORY");
}

const promo = require(path.join(root, "services/market-intelligence/src/listing-promotion/index.cjs"));
if (promo.PIPELINE_STATUS.EXECUTABLE_PRICE_AVAIL_FEES_FX !== "NOT_IMPLEMENTED") {
  fail("listing-promotion must not own EXECUTABLE_PRICE_AVAIL_FEES_FX");
}

const v2 = require(path.join(root, "services/market-intelligence/src/identity-matching/v2/index.cjs"));
if (v2.PIPELINE_STATUS.CANDIDATE_GENERATION !== "NOT_IMPLEMENTED") {
  fail("matcher PIPELINE_STATUS.CANDIDATE_GENERATION must stay NOT_IMPLEMENTED");
}

const exec = require(path.join(root, "services/market-intelligence/src/executable-economics/index.cjs"));
const { cases, NOW, FX_SNAPSHOT } = require(path.join(
  root,
  "services/market-intelligence/src/executable-economics/fixtures.cjs",
));
const { computeOpportunityPricing, withinTolerance } = require(path.join(
  root,
  "services/market-intelligence/src/pricing-formula.cjs",
));
const { normalizeNativeToUsdt, approxKrwFromSnapshot } = require(path.join(
  root,
  "services/market-intelligence/src/fx-snapshot-formula.cjs",
));
const { LISTING_STALE_SEC } = require(path.join(
  root,
  "services/market-intelligence/src/catalog-runtime-seed.cjs",
));

if (exec.EVALUATOR_VERSION !== "executable-economics.v1") {
  fail("EVALUATOR_VERSION must be executable-economics.v1");
}
if (exec.PIPELINE_STATUS.EXECUTABLE_PRICE_AVAIL_FEES_FX !== "IN_PROCESS_MEMORY") {
  fail("EXECUTABLE_PRICE_AVAIL_FEES_FX must be IN_PROCESS_MEMORY");
}
if (exec.PIPELINE_STATUS.MULTI_SOURCE_OPPORTUNITY_CREATION !== "NOT_IMPLEMENTED") {
  fail("MULTI_SOURCE_OPPORTUNITY_CREATION must stay NOT_IMPLEMENTED");
}
if (exec.BOUNDARIES.OBSERVED_PRICE_EQUALS_EXECUTABLE_PRICE !== false) {
  fail("runtime OBSERVED_PRICE_EQUALS_EXECUTABLE_PRICE");
}
if (exec.EXECUTABLE_IS_NOT_OPPORTUNITY !== true) {
  fail("EXECUTABLE_IS_NOT_OPPORTUNITY");
}
if (LISTING_STALE_SEC !== 300) {
  fail("LISTING_STALE_SEC must stay 300");
}

function assertExecShape(row, label) {
  if (row.samePhysicalItem !== false) fail(`${label} samePhysicalItem must stay false`);
  if (row.opportunity !== false) fail(`${label} opportunity must stay false`);
  if (row.observedPriceUsedAsExecutable !== false) {
    fail(`${label} observedPriceUsedAsExecutable must stay false`);
  }
  if (row.evaluatorVersion !== "executable-economics.v1") fail(`${label} evaluatorVersion`);
  if (row.evaluatedAt !== NOW) fail(`${label} evaluatedAt must use opts.now`);
  if (row.staleAllowanceSec !== 300) fail(`${label} staleAllowanceSec must reuse 300`);
  if (row.decision === "EXECUTABLE") {
    if (row.executable !== true) fail(`${label} EXECUTABLE must set executable`);
    if (!row.executablePrice) fail(`${label} EXECUTABLE requires executablePrice`);
    if (!row.feesFx) fail(`${label} EXECUTABLE requires feesFx`);
    if (!row.canonicalProductId) fail(`${label} EXECUTABLE requires canonicalProductId`);
    if (row.listingPromotion !== true) fail(`${label} EXECUTABLE requires listingPromotion`);
    if (!row.observedPrice || !row.observedPrice.buy || !row.observedPrice.sell) {
      fail(`${label} EXECUTABLE must keep observedPrice separate`);
    }
    if (row.observedPrice.buy.amount === row.executablePrice.buyUsdt) {
      fail(`${label} observed buy native must not equal executable buy USDT`);
    }
  } else {
    if (row.executable !== false) fail(`${label} non-EXECUTABLE must keep executable false`);
    if (row.executablePrice !== null) fail(`${label} executablePrice must stay null`);
    if (row.feesFx !== null) fail(`${label} feesFx must stay null`);
  }
}

for (const row of cases) {
  const out = exec.evaluateExecutableEconomics(row.left, row.right, row.opts);
  if (out.decision !== row.expect) {
    fail(`${row.id} expected ${row.expect} got ${out.decision}/${out.reason}`);
    continue;
  }
  if (row.expectReason && out.reason !== row.expectReason) {
    fail(`${row.id} reason expected ${row.expectReason} got ${out.reason}`);
  }
  if (row.expectPromotion && out.promotionDecision !== row.expectPromotion) {
    fail(`${row.id} promotionDecision expected ${row.expectPromotion} got ${out.promotionDecision}`);
  }
  assertExecShape(out, row.id);
}

const first = exec.evaluateExecutableEconomics(cases[0].left, cases[0].right, cases[0].opts);
const second = exec.evaluateExecutableEconomics(cases[0].left, cases[0].right, cases[0].opts);
if (JSON.stringify(first) !== JSON.stringify(second)) {
  fail("evaluator must be deterministic for the same listings + now + snapshot");
}

const wired = exec.evaluateExecutableEconomics(cases[0].left, cases[0].right, cases[0].opts);
if (wired.decision === "EXECUTABLE") {
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
  if (wired.executablePrice.buyUsdt !== buyFx.normalizedUsdt) {
    fail("wired buyUsdt must equal normalizeNativeToUsdt");
  }
  if (wired.executablePrice.sellUsdt !== sellFx.normalizedUsdt) {
    fail("wired sellUsdt must equal normalizeNativeToUsdt");
  }
  if (wired.feesFx.feesUsdt !== pricing.feesUsdt) {
    fail("wired feesUsdt must equal computeOpportunityPricing");
  }
  if (wired.feesFx.expectedProfitUsdt !== pricing.expectedProfitUsdt) {
    fail("wired expectedProfitUsdt must equal computeOpportunityPricing");
  }
  const krw = approxKrwFromSnapshot(pricing.expectedProfitUsdt, {
    usdtKrw: FX_SNAPSHOT.usdtKrw,
  });
  if (!withinTolerance(wired.feesFx.expectedProfitKrwApprox, krw)) {
    fail("wired KRW approx must reuse approxKrwFromSnapshot");
  }
  if (wired.observedPrice.buy.amount === "1000.00" && wired.executablePrice.buyUsdt === "1000.00") {
    fail("USD observed 1000.00 must not be copied as executable USDT");
  }
}

const tcg = cases.find((row) => row.id === "neg-promotable-tcg-ebay-no-day1-market");
if (tcg) {
  const promoted = promo.evaluateListingPromotion(tcg.left, tcg.right, { now: NOW });
  const econ = exec.evaluateExecutableEconomics(tcg.left, tcg.right, tcg.opts);
  if (promoted.decision !== "PROMOTABLE") {
    fail("tcg×ebay fixture must stay PROMOTABLE at listing promotion");
  }
  if (econ.decision !== "INSUFFICIENT" || econ.reason !== "MARKET_ID_UNRESOLVED") {
    fail("PROMOTABLE tcgplayer pair must not become EXECUTABLE without a Day-1 market owner");
  }
  if (econ.executablePrice !== null) {
    fail("tcgplayer observed 99.00 must not become executablePrice");
  }
}

const cheapest = exec.evaluateExecutableEconomics(cases[0].left, cases[0].right, {
  now: NOW,
  fxSnapshot: FX_SNAPSHOT,
});
if (cheapest.decision !== "INSUFFICIENT" || cheapest.reason !== "LEG_ASSIGNMENT_REQUIRED") {
  fail("missing buy/sell assignment must not pick cheapest as buy");
}

if (fails.length) {
  console.error("[verify:executable-economics] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:executable-economics] PASS (in-process wiring · Money/Engine reuse · PROMOTABLE≠EXECUTABLE · observed≠executable · stale≠current · Opportunity 0)",
);

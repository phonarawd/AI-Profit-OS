/**
 * verify:listing-variant-compatibility
 * Opportunity 전 변형 호환 게이트 · MATCH/Opportunity 0 · durable DB 0
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
  "services/market-intelligence/src/listing-variant-compatibility/contract.cjs",
  "services/market-intelligence/src/listing-variant-compatibility/extract.cjs",
  "services/market-intelligence/src/listing-variant-compatibility/evaluate.cjs",
  "services/market-intelligence/src/listing-variant-compatibility/fixtures.cjs",
  "services/market-intelligence/src/listing-variant-compatibility/index.cjs",
  "tooling/verify/listing-variant-compatibility.cjs",
  "governance/global-product/listing-variant-compatibility.v1.json",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const runtimeSrc = [
  "services/market-intelligence/src/listing-variant-compatibility/contract.cjs",
  "services/market-intelligence/src/listing-variant-compatibility/extract.cjs",
  "services/market-intelligence/src/listing-variant-compatibility/evaluate.cjs",
  "services/market-intelligence/src/listing-variant-compatibility/index.cjs",
]
  .map((rel) => read(rel))
  .join("\n");

if (runtimeSrc.includes("matchSourceObservationsV2")) {
  fail("listing/variant gate must not call matchSourceObservationsV2");
}
if (runtimeSrc.includes("identity-matching/v2/matcher")) {
  fail("listing/variant gate must not require the V2 matcher");
}
if (runtimeSrc.includes("createCanonicalProductFromMatch")) {
  fail("listing/variant gate must not create CanonicalProduct");
}
if (runtimeSrc.includes("generateCandidatePairs")) {
  fail("listing/variant gate must not generate candidates");
}
if (runtimeSrc.includes("Math.random") || /openai|llm/i.test(runtimeSrc)) {
  fail("listing/variant gate must stay deterministic / no LLM");
}
for (const needle of ["normalizeNativeToUsdt", "expectedProfit", "requiredCapital", "fxSnapshot"]) {
  if (runtimeSrc.includes(needle)) fail(`listing/variant gate must not calculate ${needle}`);
}

const gov = readJson("governance/global-product/listing-variant-compatibility.v1.json");
if (!gov) {
  fail("listing-variant-compatibility.v1.json unreadable");
} else {
  if (gov.status !== "PASS") fail("governance status must be PASS");
  if (gov.runtime !== "IN_PROCESS_MEMORY") fail("runtime must be IN_PROCESS_MEMORY");
  if (gov.authority.SAME_PHYSICAL_ITEM_NEVER_INFERRED !== true) {
    fail("SAME_PHYSICAL_ITEM_NEVER_INFERRED must stay true");
  }
  if (gov.authority.PRICE_AS_COMPATIBILITY !== "FORBIDDEN") {
    fail("PRICE_AS_COMPATIBILITY must stay FORBIDDEN");
  }
  if (gov.authority.TITLE_AS_COMPATIBILITY_OWNER !== "FORBIDDEN") {
    fail("TITLE_AS_COMPATIBILITY_OWNER must stay FORBIDDEN");
  }
  if (gov.authority.IMAGE_AS_COMPATIBILITY_OWNER !== "FORBIDDEN") {
    fail("IMAGE_AS_COMPATIBILITY_OWNER must stay FORBIDDEN");
  }
  if (gov.authority.MVP_OPPORTUNITY_REQUIRES_GRADE_EQUIVALENT !== true) {
    fail("MVP_OPPORTUNITY_REQUIRES_GRADE_EQUIVALENT must stay true");
  }
  if (gov.firstSlice.doesNotCallMatcher !== true) fail("doesNotCallMatcher");
  if (gov.firstSlice.doesNotCreateOpportunity !== true) fail("doesNotCreateOpportunity");
  if (gov.persistence.LISTING_VARIANT_COMPATIBILITY_DB_RUNTIME !== "NOT_IMPLEMENTED") {
    fail("LISTING_VARIANT_COMPATIBILITY_DB_RUNTIME must stay NOT_IMPLEMENTED");
  }
  if (gov.persistence.PRODUCTION_LISTING_VARIANT_COMPATIBILITY !== "NOT_IMPLEMENTED") {
    fail("PRODUCTION_LISTING_VARIANT_COMPATIBILITY must stay NOT_IMPLEMENTED");
  }
}

const cpGov = readJson("governance/global-product/canonical-product.v2.json");
if (!cpGov || !cpGov.boundaries || !cpGov.vocabulary) {
  fail("canonical-product.v2.json boundaries/vocabulary required");
} else {
  if (cpGov.boundaries.CanonicalProduct !== "internal same-product SSOT after MATCH") {
    fail("CanonicalProduct boundary must stay internal same-product SSOT after MATCH");
  }
  if (!String(cpGov.vocabulary.SAME_VARIANT).includes("tradable variant")) {
    fail("SAME_VARIANT vocabulary must stay tradable variant");
  }
  if (!String(cpGov.vocabulary.TRADABLE_EQUIVALENT).includes("Opportunity eligibility")) {
    fail("TRADABLE_EQUIVALENT vocabulary must stay Opportunity eligibility");
  }
  if (!String(cpGov.vocabulary.SAME_PHYSICAL_ITEM).includes("never inferred")) {
    fail("SAME_PHYSICAL_ITEM must stay never inferred");
  }
  if (!Array.isArray(cpGov.pipelineAfterMatch) || !cpGov.pipelineAfterMatch.includes("listing/variant compatibility")) {
    fail("pipelineAfterMatch must keep listing/variant compatibility");
  }
}

const govV2 = readJson("governance/global-product/identity-matching.v2.json");
if (govV2 && govV2.listingPromotion !== "NOT_IMPLEMENTED") {
  fail("identity-matching.v2 listingPromotion must stay NOT_IMPLEMENTED");
}
if (govV2 && govV2.multiSourceOpportunityCreation !== "NOT_IMPLEMENTED") {
  fail("identity-matching.v2 multiSourceOpportunityCreation must stay NOT_IMPLEMENTED");
}
if (
  govV2 &&
  govV2.layers &&
  !String(govV2.layers.listingVariantCompatibility).includes("IN_PROCESS_MEMORY")
) {
  fail("identity-matching.v2 layers.listingVariantCompatibility must record IN_PROCESS_MEMORY");
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
if (cg.PIPELINE_STATUS.LISTING_VARIANT_COMPATIBILITY !== "NOT_IMPLEMENTED") {
  fail("candidate-generation must not own LISTING_VARIANT_COMPATIBILITY");
}

const lvc = require(path.join(
  root,
  "services/market-intelligence/src/listing-variant-compatibility/index.cjs",
));
const { cases } = require(path.join(
  root,
  "services/market-intelligence/src/listing-variant-compatibility/fixtures.cjs",
));

if (lvc.EVALUATOR_VERSION !== "listing-variant-compatibility.v1") {
  fail("EVALUATOR_VERSION must be listing-variant-compatibility.v1");
}
if (lvc.PIPELINE_STATUS.LISTING_VARIANT_COMPATIBILITY !== "IN_PROCESS_MEMORY") {
  fail("LISTING_VARIANT_COMPATIBILITY must be IN_PROCESS_MEMORY");
}
if (lvc.PIPELINE_STATUS.LISTING_PROMOTION !== "NOT_IMPLEMENTED") {
  fail("LISTING_PROMOTION must stay NOT_IMPLEMENTED");
}
if (lvc.BOUNDARIES.SAME_PHYSICAL_ITEM_NEVER_INFERRED !== true) {
  fail("runtime SAME_PHYSICAL_ITEM_NEVER_INFERRED");
}

const now = "2026-08-20T02:00:00.000Z";

function assertGateShape(row, label) {
  if (row.samePhysicalItem !== false) fail(`${label} samePhysicalItem must stay false`);
  if (row.listingPromotion !== false) fail(`${label} listingPromotion must stay false`);
  if (row.opportunity !== false) fail(`${label} opportunity must stay false`);
  if (row.evaluatorVersion !== "listing-variant-compatibility.v1") {
    fail(`${label} evaluatorVersion`);
  }
  if (row.evaluatedAt !== now) fail(`${label} evaluatedAt must use opts.now`);
  if (row.decision === "COMPATIBLE" && row.tradableEquivalent !== true) {
    fail(`${label} COMPATIBLE must be tradableEquivalent`);
  }
  if (row.decision !== "COMPATIBLE" && row.tradableEquivalent !== false) {
    fail(`${label} non-COMPATIBLE must not be tradableEquivalent`);
  }
  if (row.comparedFields.some((item) => item.field === "condition" && item.role === "VARIANT")) {
    fail(`${label} condition must not be a VARIANT compared field`);
  }
  if (row.comparedFields.some((item) => item.field === "price" || item.field === "nativeAmount")) {
    fail(`${label} price must not be a compared field`);
  }
  if (row.comparedFields.some((item) => item.field === "title" || item.field === "imageUrl")) {
    fail(`${label} title/image must not be compared fields`);
  }
}

for (const row of cases) {
  const out = lvc.evaluateListingVariantCompatibility(row.left, row.right, { now });
  if (out.decision !== row.expect) {
    fail(`${row.id} expected ${row.expect} got ${out.decision}/${out.reason}`);
    continue;
  }
  if (row.expectReason && out.reason !== row.expectReason) {
    fail(`${row.id} reason expected ${row.expectReason} got ${out.reason}`);
  }
  if (Object.prototype.hasOwnProperty.call(row, "expectSameVariant") && out.sameVariant !== row.expectSameVariant) {
    fail(`${row.id} sameVariant expected ${row.expectSameVariant} got ${out.sameVariant}`);
  }
  if (
    Object.prototype.hasOwnProperty.call(row, "expectSameCanonical") &&
    out.sameCanonicalProduct !== row.expectSameCanonical
  ) {
    fail(`${row.id} sameCanonicalProduct expected ${row.expectSameCanonical} got ${out.sameCanonicalProduct}`);
  }
  if (Object.prototype.hasOwnProperty.call(row, "expectTradable") && out.tradableEquivalent !== row.expectTradable) {
    fail(`${row.id} tradableEquivalent expected ${row.expectTradable} got ${out.tradableEquivalent}`);
  }
  if (row.expectSamePhysical === false && out.samePhysicalItem !== false) {
    fail(`${row.id} samePhysicalItem must be false`);
  }
  assertGateShape(out, row.id);
}

const first = lvc.evaluateListingVariantCompatibility(cases[0].left, cases[0].right, { now });
const second = lvc.evaluateListingVariantCompatibility(cases[0].left, cases[0].right, { now });
if (JSON.stringify(first) !== JSON.stringify(second)) {
  fail("evaluator must be deterministic for the same listings + now");
}

const watchCase = cases.find((row) => row.id === "pos-watch-condition-ignored");
if (watchCase) {
  const watchOut = lvc.evaluateListingVariantCompatibility(watchCase.left, watchCase.right, { now });
  if (watchOut.decision !== "COMPATIBLE") {
    fail("watch condition must not block SAME_VARIANT");
  }
}

const sizeCase = cases.find((row) => row.id === "neg-sneaker-size-mismatch");
if (sizeCase) {
  const sizeOut = lvc.evaluateListingVariantCompatibility(sizeCase.left, sizeCase.right, { now });
  if (sizeOut.decision !== "INCOMPATIBLE") {
    fail("same imageUrl must not override size mismatch");
  }
}

if (fails.length) {
  console.error("[verify:listing-variant-compatibility] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:listing-variant-compatibility] PASS (in-process variant gate · SAME_VARIANT≠CP · grade/size fail-closed · samePhysicalItem 0 · Opportunity 0)",
);

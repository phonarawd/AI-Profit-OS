/**
 * verify:identity-matching-v1
 * pairwise SourceObservation same-product authority · listing promotion 0 · Opportunity 0
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

const files = [
  "services/market-intelligence/src/identity-matching/contract.cjs",
  "services/market-intelligence/src/identity-matching/normalize.cjs",
  "services/market-intelligence/src/identity-matching/matcher.cjs",
  "services/market-intelligence/src/identity-matching/index.cjs",
  "services/market-intelligence/src/identity-matching/profiles/fashion.cjs",
  "services/market-intelligence/src/identity-matching/profiles/watch.cjs",
  "services/market-intelligence/src/identity-matching/profiles/unknown.cjs",
  "services/market-intelligence/src/identity-matching/fixtures/cases.cjs",
  "services/market-intelligence/src/identity-matching/live-overlap-audit.cjs",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const identitySrc = [
  "services/market-intelligence/src/identity-matching/contract.cjs",
  "services/market-intelligence/src/identity-matching/normalize.cjs",
  "services/market-intelligence/src/identity-matching/matcher.cjs",
  "services/market-intelligence/src/identity-matching/index.cjs",
  "services/market-intelligence/src/identity-matching/profiles/fashion.cjs",
  "services/market-intelligence/src/identity-matching/profiles/watch.cjs",
  "services/market-intelligence/src/identity-matching/profiles/unknown.cjs",
]
  .map((rel) => read(rel))
  .join("\n");

if (identitySrc.includes("finalTruthEligible")) {
  fail("finalTruthEligible is forbidden — use matchingDecisionEligible");
}
if (!identitySrc.includes("matchingDecisionEligible")) {
  fail("matchingDecisionEligible must exist");
}
if (!identitySrc.includes("raw meta.modelNumber equality alone")) {
  fail("must lock raw modelNumber equality != strong match");
}
for (const needle of ["normalizeNativeToUsdt", "expectedProfit", "requiredCapital", "fxSnapshot"]) {
  if (identitySrc.includes(needle)) fail(`identity matching must not calculate ${needle}`);
}
if (identitySrc.includes("Math.random") || identitySrc.includes("openai") || identitySrc.includes("llm")) {
  fail("identity matching must stay deterministic / no LLM decision");
}

const so = require(path.join(root, "services/market-intelligence/src/source-observation/index.cjs"));
try {
  so.discoverCandidates({});
  fail("discoverCandidates must stay NOT_IMPLEMENTED");
} catch (err) {
  if (!String(err.message || err).includes("NOT_IMPLEMENTED")) {
    fail("discoverCandidates must throw NOT_IMPLEMENTED");
  }
}

const matching = require(path.join(
  root,
  "services/market-intelligence/src/identity-matching/index.cjs",
));
const { cases } = require(path.join(
  root,
  "services/market-intelligence/src/identity-matching/fixtures/cases.cjs",
));

if (matching.MATCHER_VERSION !== "identity-matching.v1") {
  fail("MATCHER_VERSION must be identity-matching.v1");
}

const now = "2026-08-19T12:00:00.000Z";
const byId = {};
for (const row of cases) {
  const result = matching.matchSourceObservations(row.left, row.right, { now });
  byId[row.id] = result;
  if (result.decision !== row.expect) {
    fail(`${row.id} expected ${row.expect} got ${result.decision}`);
  }
  if (result.matcherVersion !== "identity-matching.v1") {
    fail(`${row.id} matcherVersion`);
  }
  if (result.evaluatedAt !== now) fail(`${row.id} evaluatedAt must use opts.now`);
  if (result.finalTruthEligible != null) fail(`${row.id} leaked finalTruthEligible`);
  if (typeof result.matchingDecisionEligible !== "boolean") {
    fail(`${row.id} matchingDecisionEligible missing`);
  }
  if (row.expectEligible === false && result.matchingDecisionEligible !== false) {
    fail(`${row.id} must not be matchingDecisionEligible`);
  }
  if (row.expect === "MATCH" && result.matchingDecisionEligible !== true) {
    fail(`${row.id} MATCH requires matchingDecisionEligible`);
  }
}

if (byId["F-external-item-id-namespace"]) {
  const f = byId["F-external-item-id-namespace"];
  if (f.leftSource === f.rightSource) fail("F must be cross-source");
  if (cases.find((c) => c.id === "F-external-item-id-namespace").left.externalItemId ===
    cases.find((c) => c.id === "F-external-item-id-namespace").right.externalItemId) {
    fail("F externalItemId must differ");
  }
}

if (byId["K-fashionphile-sku-not-ebay-mpn"] && byId["K-fashionphile-sku-not-ebay-mpn"].decision === "MATCH") {
  fail("Fashionphile sku must not match eBay MPN");
}

if (byId["L-raw-model-number-type-mismatch"] && byId["L-raw-model-number-type-mismatch"].decision === "MATCH") {
  fail("raw modelNumber equality across MPN vs WATCH_REFERENCE must not MATCH");
}

if (byId["J-discovery-not-eligible"] && byId["J-discovery-not-eligible"].decision === "MATCH") {
  fail("Discovery-only pair must not MATCH");
}

const first = matching.matchSourceObservations(cases[0].left, cases[0].right, { now });
const second = matching.matchSourceObservations(cases[0].left, cases[0].right, { now });
if (JSON.stringify(first) !== JSON.stringify(second)) {
  fail("matcher must be deterministic for the same observations + now");
}

const runtime = JSON.parse(read("governance/global-product/source-observation-runtime.v1.json"));
if (runtime.persistence.PRODUCTION_OBSERVATION_PERSISTENCE !== "NOT_IMPLEMENTED") {
  fail("PRODUCTION_OBSERVATION_PERSISTENCE must stay NOT_IMPLEMENTED");
}
const ebayRow = (runtime.sourceMatrix || []).find((r) => r.source === "ebay");
if (!ebayRow || ebayRow.persistToListingLeg !== false) {
  fail("ebay persistToListingLeg must stay false");
}

const pkg = read("package.json");
if (!pkg.includes("verify:identity-matching-v1")) {
  fail("package.json missing verify:identity-matching-v1");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("identity-matching-v1")) {
  fail("CATALOG.md missing identity-matching-v1");
}
const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("identity-matching-v1.cjs")) {
  fail("domain-by-path.cjs missing identity-matching-v1");
}
const stubs = read("tooling/verify/stubs/run-all.cjs");
if (!stubs.includes("identity-matching-v1.cjs")) {
  fail("stubs/run-all.cjs missing identity-matching-v1.cjs");
}

if (fails.length) {
  console.error("[verify:identity-matching-v1] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:identity-matching-v1] PASS (typed identifiers · NO_MATCH/CONFLICT · matchingDecisionEligible · fail-closed profile · fixtures)",
);

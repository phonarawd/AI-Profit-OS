/**
 * verify:identity-matching-v2
 * pairwise V2 memory runtime · V1 freeze · CanonicalProduct/Opportunity 0
 * 글로벌 package.json / CATALOG / domain-by-path / stubs 훅 배선은 DEFER
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

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

const v2Files = [
  "services/market-intelligence/src/identity-matching/v2/index.cjs",
  "services/market-intelligence/src/identity-matching/v2/matcher.cjs",
  "services/market-intelligence/src/identity-matching/v2/evidence.cjs",
  "services/market-intelligence/src/identity-matching/v2/profiles.cjs",
  "services/market-intelligence/src/identity-matching/v2/fixtures.cjs",
  "tooling/verify/identity-matching-v2.cjs",
];
for (const f of v2Files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const runtimeSrc = [
  "services/market-intelligence/src/identity-matching/v2/matcher.cjs",
  "services/market-intelligence/src/identity-matching/v2/evidence.cjs",
  "services/market-intelligence/src/identity-matching/v2/profiles.cjs",
  "services/market-intelligence/src/identity-matching/v2/index.cjs",
]
  .map((rel) => read(rel))
  .join("\n");

if (!runtimeSrc.includes("OWNER_BACKED_STRUCTURED")) {
  fail("EVIDENCE_OWNER_RUNTIME missing OWNER_BACKED_STRUCTURED");
}
if (!runtimeSrc.includes("DERIVED_STRUCTURED")) fail("DERIVED_STRUCTURED missing");
if (!runtimeSrc.includes("PRESENTATION_ONLY")) fail("PRESENTATION_ONLY missing");
if (!runtimeSrc.includes("provenanceFamily")) fail("PROVENANCE_FAMILY missing");
if (!runtimeSrc.includes("owner_anchored_exact_phrase")) {
  fail("owner-anchored derivation missing");
}
if (/KNOWN_SETS|closedSetList|generations["']\s*,/.test(runtimeSrc)) {
  fail("set closed dictionary / generations hardcode forbidden in runtime");
}
for (const needle of ["normalizeNativeToUsdt", "expectedProfit", "requiredCapital", "fxSnapshot"]) {
  if (runtimeSrc.includes(needle)) fail(`V2 must not calculate ${needle}`);
}
if (runtimeSrc.includes("Math.random") || runtimeSrc.includes("openai") || runtimeSrc.includes("llm")) {
  fail("V2 must stay deterministic / no LLM decision");
}
if (runtimeSrc.includes("require(\"../card-match.cjs\")") || runtimeSrc.includes("ebay-identity-match")) {
  fail("V2 must not use Asset Master card-match / ebay-identity-match as MATCH owner");
}
if (/\bnativeAmount\b/.test(runtimeSrc)) {
  fail("PRICE_IDENTITY_BLOCK — V2 runtime must not read nativeAmount");
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

const v1 = spawnSync(process.execPath, [path.join(root, "tooling/verify/identity-matching-v1.cjs")], {
  cwd: root,
  encoding: "utf8",
});
process.stdout.write(v1.stdout || "");
process.stderr.write(v1.stderr || "");
if (v1.status !== 0) fail("V1_REGRESSION — identity-matching-v1 failed");

const v2 = require(path.join(root, "services/market-intelligence/src/identity-matching/v2/index.cjs"));
const { cases } = require(path.join(
  root,
  "services/market-intelligence/src/identity-matching/v2/fixtures.cjs",
));

if (v2.MATCHER_VERSION !== "identity-matching.v2") {
  fail("MATCHER_VERSION must be identity-matching.v2");
}
if (v2.PIPELINE_STATUS.TCGPLAYER_AUTOMATED_SOURCE_OBSERVATION !== "NOT_IMPLEMENTED") {
  fail("TCGPLAYER_AUTOMATED_SOURCE_OBSERVATION must stay NOT_IMPLEMENTED");
}
if (v2.PIPELINE_STATUS.REAL_AUTOMATED_CROSS_SOURCE_MATCH !== "BLOCKED_UNTIL_SOURCE_RUNTIME") {
  fail("REAL_AUTOMATED_CROSS_SOURCE_MATCH must stay BLOCKED_UNTIL_SOURCE_RUNTIME");
}
if (v2.PIPELINE_STATUS.CANONICAL_PRODUCT_CREATION !== "NOT_IMPLEMENTED") {
  fail("CANONICAL_PRODUCT_CREATION must stay NOT_IMPLEMENTED");
}
if (v2.PIPELINE_STATUS.CANDIDATE_GENERATION !== "NOT_IMPLEMENTED") {
  fail("CANDIDATE_GENERATION must stay NOT_IMPLEMENTED");
}

const now = "2026-08-19T12:00:00.000Z";
const byId = {};

for (const row of cases) {
  const opts = { now };
  if (row.allowSyntheticImageEvidence) opts.allowSyntheticImageEvidence = true;
  if (row.imageCorroboration) opts.imageCorroboration = true;
  const result = v2.matchSourceObservationsV2(row.left, row.right, opts);
  byId[row.id] = result;
  if (result.decision !== row.expect) {
    fail(`${row.id} expected ${row.expect} got ${result.decision} path=${result.matchPath}`);
  }
  if (result.matcherVersion !== "identity-matching.v2") fail(`${row.id} matcherVersion`);
  if (result.evaluatedAt !== now) fail(`${row.id} evaluatedAt must use opts.now`);
  if (result.finalTruthEligible !== false) fail(`${row.id} finalTruthEligible must be false`);
  if (typeof result.matchingDecisionEligible !== "boolean") {
    fail(`${row.id} matchingDecisionEligible missing`);
  }
  if (row.expectEligible === false && result.matchingDecisionEligible !== false) {
    fail(`${row.id} must not be matchingDecisionEligible`);
  }
  if (row.expect === "MATCH" && result.matchingDecisionEligible !== true) {
    fail(`${row.id} MATCH requires matchingDecisionEligible`);
  }
  if (row.expectPath && result.matchPath !== row.expectPath) {
    fail(`${row.id} matchPath expected ${row.expectPath} got ${result.matchPath}`);
  }
}

const first = v2.matchSourceObservationsV2(cases[0].left, cases[0].right, { now });
const second = v2.matchSourceObservationsV2(cases[0].left, cases[0].right, { now });
if (JSON.stringify(first) !== JSON.stringify(second)) {
  fail("matcher must be deterministic for the same observations + now");
}

if (byId["A-composite-owner-vs-derived"]) {
  const a = byId["A-composite-owner-vs-derived"];
  if (a.decision !== "MATCH" || a.matchPath !== "COMPOSITE_STRONG") {
    fail("COMPOSITE_MATCH A failed");
  }
  const setRow = a.evidence.find((e) => e.field === "set");
  const numRow = a.evidence.find((e) => e.field === "cardNumber");
  if (!setRow || setRow.left.evidenceOwner !== "OWNER_BACKED_STRUCTURED") {
    fail("A left set must stay OWNER_BACKED_STRUCTURED");
  }
  if (!setRow || setRow.right.evidenceOwner !== "DERIVED_STRUCTURED") {
    fail("A right set must stay DERIVED_STRUCTURED");
  }
  if (!numRow || numRow.right.derivedFrom !== "title") {
    fail("A right cardNumber derivedFrom must be title");
  }
  if (a.evidence.some((e) => e.field === "imageCorroboration")) {
    fail("A must MATCH without synthetic image evidence");
  }
}

const aWithoutImage = v2.matchSourceObservationsV2(cases[0].left, cases[0].right, {
  now,
  imageCorroboration: true,
});
if (aWithoutImage.decision !== "MATCH") {
  fail("real runtime must ignore imageCorroboration boolean without fixture flag");
}
if (aWithoutImage.evidence.some((e) => e.field === "imageCorroboration")) {
  fail("synthetic image must not enter real runtime evidence");
}

const cReal = v2.matchSourceObservationsV2(
  cases.find((c) => c.id === "C-image-only").left,
  cases.find((c) => c.id === "C-image-only").right,
  { now, imageCorroboration: true },
);
if (cReal.decision === "MATCH") fail("IMAGE_ONLY_BLOCK — real runtime image boolean must not MATCH");

if (byId["B-title-derived-only"] && byId["B-title-derived-only"].decision === "MATCH") {
  fail("TITLE_ONLY_MATCH_BLOCK");
}

if (byId["C-image-only"] && byId["C-image-only"].decision === "MATCH") {
  fail("IMAGE_ONLY_MATCH_BLOCK even with fixture synthetic image");
}

if (byId["F-fashionphile-sku-not-ebay-mpn"]) {
  const f = byId["F-fashionphile-sku-not-ebay-mpn"];
  if (f.decision === "MATCH") fail("SOURCE_LOCAL_ID_BLOCK");
  if (!f.evidence.some((e) => e.strength === "NOT_COMPARABLE")) {
    fail("F must record NOT_COMPARABLE sku vs MPN");
  }
}

if (byId["H-same-title-not-four-independents"]) {
  const h = byId["H-same-title-not-four-independents"];
  const rightDerived = h.evidence
    .map((e) => e.right)
    .filter((side) => side && side.evidenceOwner === "DERIVED_STRUCTURED");
  const families = new Set(rightDerived.map((side) => side.provenanceFamily));
  if (rightDerived.length >= 2 && families.size !== 1) {
    fail("H same-title derived fields must share one provenanceFamily");
  }
  if (families.size > 1 && [...families][0] !== "title") {
    fail("H derived provenanceFamily must be title");
  }
  if (rightDerived.some((side) => side.provenanceFamily !== "title")) {
    fail("H derived fields must stay provenanceFamily=title");
  }
}

if (byId["I-discovery-plus-confirmation"] && byId["I-discovery-plus-confirmation"].decision === "MATCH") {
  fail("DISCOVERY_MATCH_BLOCK");
}

const evidenceMod = require(path.join(
  root,
  "services/market-intelligence/src/identity-matching/v2/evidence.cjs",
));

if (byId["L-ebay-ccg-taxonomy-composite"]) {
  const l = byId["L-ebay-ccg-taxonomy-composite"];
  const lCase = cases.find((c) => c.id === "L-ebay-ccg-taxonomy-composite");
  const assembledL = evidenceMod.assemblePairEvidence(lCase.left, lCase.right, {});
  const independentL = evidenceMod.independentStructuredCorroboration(assembledL);
  const setRow = l.evidence.find((e) => e.field === "set");
  const numRow = l.evidence.find((e) => e.field === "cardNumber");
  if (l.decision !== "MATCH" || l.matchPath !== "COMPOSITE_STRONG") {
    fail("L must MATCH COMPOSITE_STRONG");
  }
  if (l.categoryProfile !== "trading_card") fail("L pairProfile must be trading_card");
  if (!assembledL.left.owner.game || assembledL.left.owner.game.evidenceOwner !== "OWNER_BACKED_STRUCTURED") {
    fail("L left game must stay OWNER_BACKED_STRUCTURED");
  }
  if (assembledL.left.owner.category) {
    fail("L left category must stay null — DERIVED_PROFILE routing only");
  }
  if (!setRow || setRow.left.evidenceOwner !== "OWNER_BACKED_STRUCTURED") {
    fail("L left set must stay OWNER_BACKED_STRUCTURED");
  }
  if (!setRow || setRow.right.evidenceOwner !== "DERIVED_STRUCTURED") {
    fail("L right set must stay DERIVED_STRUCTURED");
  }
  if (!numRow || numRow.left.evidenceOwner !== "OWNER_BACKED_STRUCTURED") {
    fail("L left cardNumber must stay OWNER_BACKED_STRUCTURED");
  }
  if (!numRow || numRow.right.evidenceOwner !== "DERIVED_STRUCTURED") {
    fail("L right cardNumber must stay DERIVED_STRUCTURED");
  }
  if (independentL.field !== "CROSS_SIDE_STRUCTURED_PROFILE_CORROBORATION") {
    fail("L independent must be CROSS_SIDE_STRUCTURED_PROFILE_CORROBORATION");
  }
  if (independentL.field === "set" || independentL.field === "cardNumber") {
    fail("L must not reuse set/cardNumber as independent corroboration");
  }
  if (
    evidenceMod.resolveSingleProfileV2(lCase.right) !== "trading_card" ||
    !evidenceMod.isTradingCardCategoryHint(lCase.right.meta.categoryHint)
  ) {
    fail("L eBay Collectible Card Games|CCG Individual Cards must resolve trading_card");
  }
}

if (byId["M-generic-collectible-not-trading-card"]) {
  const m = byId["M-generic-collectible-not-trading-card"];
  const mCase = cases.find((c) => c.id === "M-generic-collectible-not-trading-card");
  if (m.decision === "MATCH") fail("M generic collectible must not MATCH");
  if (evidenceMod.resolveSingleProfileV2(mCase.right) === "trading_card") {
    fail("M Collectibles|Decorative Collectibles must not resolve trading_card");
  }
  if (evidenceMod.isTradingCardCategoryHint(mCase.right.meta.categoryHint)) {
    fail("M generic collectible categoryHint must not be trading-card taxonomy");
  }
  if (evidenceMod.isTradingCardCategoryHint("Collectibles")) {
    fail("collectible/collectibles alone must not be trading_card");
  }
  if (evidenceMod.isTradingCardCategoryHint("cards")) {
    fail("card/cards alone must not be trading_card");
  }
}

const gov = JSON.parse(read("governance/global-product/identity-matching.v2.json"));
if (!gov.categoryProfiles || gov.categoryProfiles.genericProductProfile !== "PASS") {
  fail("categoryProfiles.genericProductProfile must be PASS");
}
if (gov.categoryProfiles.genericArchitecture !== "UNIVERSAL_FIELDS_PLUS_CATEGORY_PLUGINS") {
  fail("genericArchitecture must stay UNIVERSAL_FIELDS_PLUS_CATEGORY_PLUGINS");
}
if (JSON.stringify(gov.categoryProfiles.mvp) !== JSON.stringify(["sneakers", "trading_card", "watch", "luxury_bag"])) {
  fail("categoryProfiles.mvp must stay sneakers/trading_card/watch/luxury_bag");
}
if (JSON.stringify(gov.categoryProfiles.deferred) !== JSON.stringify(["electronics", "general_goods"])) {
  fail("categoryProfiles.deferred must stay electronics/general_goods");
}
if (gov.persistence.IDENTITY_MATCHING_V2_DB_RUNTIME !== "NOT_IMPLEMENTED") {
  fail("IDENTITY_MATCHING_V2_DB_RUNTIME must stay NOT_IMPLEMENTED");
}
if (gov.listingPromotion !== "NOT_IMPLEMENTED") fail("listingPromotion must stay NOT_IMPLEMENTED");
if (gov.multiSourceOpportunityCreation !== "NOT_IMPLEMENTED") {
  fail("multiSourceOpportunityCreation must stay NOT_IMPLEMENTED");
}

if (fails.length) {
  console.error("[verify:identity-matching-v2] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:identity-matching-v2] PASS (pairwise V2 · DERIVED_STRUCTURED · provenance family · composite · conflict-first · V1 regression · hooks deferred)",
);

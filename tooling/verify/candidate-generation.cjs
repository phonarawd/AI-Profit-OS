/**
 * verify:candidate-generation
 * 교차 소스 후보 쌍 탐색 첫 슬라이스 · MATCH/Opportunity 0 · durable DB 0
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

function pairToken(leftId, rightId) {
  return leftId < rightId ? `${leftId}|${rightId}` : `${rightId}|${leftId}`;
}

const files = [
  "services/market-intelligence/src/candidate-generation/contract.cjs",
  "services/market-intelligence/src/candidate-generation/keys.cjs",
  "services/market-intelligence/src/candidate-generation/generate.cjs",
  "services/market-intelligence/src/candidate-generation/fixtures.cjs",
  "services/market-intelligence/src/candidate-generation/index.cjs",
  "tooling/verify/candidate-generation.cjs",
  "governance/global-product/candidate-generation.v1.json",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const runtimeSrc = [
  "services/market-intelligence/src/candidate-generation/contract.cjs",
  "services/market-intelligence/src/candidate-generation/keys.cjs",
  "services/market-intelligence/src/candidate-generation/generate.cjs",
  "services/market-intelligence/src/candidate-generation/index.cjs",
]
  .map((rel) => read(rel))
  .join("\n");

if (runtimeSrc.includes("matchSourceObservationsV2")) {
  fail("candidate generation must not call matchSourceObservationsV2");
}
if (runtimeSrc.includes("identity-matching/v2/matcher")) {
  fail("candidate generation must not require the V2 matcher");
}
if (runtimeSrc.includes("createCanonicalProductFromMatch")) {
  fail("candidate generation must not create CanonicalProduct");
}
if (runtimeSrc.includes("Math.random") || /openai|llm/i.test(runtimeSrc)) {
  fail("candidate generation must stay deterministic / no LLM");
}
for (const needle of ["normalizeNativeToUsdt", "expectedProfit", "requiredCapital", "fxSnapshot"]) {
  if (runtimeSrc.includes(needle)) fail(`candidate generation must not calculate ${needle}`);
}
if (/family:\s*["']nativeAmount["']/.test(runtimeSrc)) {
  fail("nativeAmount must not be a blocking family");
}
if (/family:\s*["']fashionphileSku["']/.test(runtimeSrc)) {
  fail("fashionphile sku must not be a blocking family");
}

const gov = readJson("governance/global-product/candidate-generation.v1.json");
if (!gov) {
  fail("candidate-generation.v1.json unreadable");
} else {
  if (gov.status !== "PASS") fail("governance status must be PASS");
  if (gov.runtime !== "IN_PROCESS_MEMORY") fail("runtime must be IN_PROCESS_MEMORY");
  if (gov.authority.CANDIDATE_IS_NOT_MATCH_TRUTH !== true) {
    fail("CANDIDATE_IS_NOT_MATCH_TRUTH must stay true");
  }
  if (gov.authority.WATCH_REFERENCE_EQUALS_EBAY_MPN !== false) {
    fail("WATCH_REFERENCE_EQUALS_EBAY_MPN must stay false");
  }
  if (gov.firstSlice.doesNotCallMatcher !== true) fail("doesNotCallMatcher");
  if (gov.persistence.CANDIDATE_GENERATION_DB_RUNTIME !== "NOT_IMPLEMENTED") {
    fail("CANDIDATE_GENERATION_DB_RUNTIME must stay NOT_IMPLEMENTED");
  }
  if (gov.persistence.PRODUCTION_CANDIDATE_GENERATION !== "NOT_IMPLEMENTED") {
    fail("PRODUCTION_CANDIDATE_GENERATION must stay NOT_IMPLEMENTED");
  }
}

const govV2 = readJson("governance/global-product/identity-matching.v2.json");
if (govV2 && govV2.layers && !String(govV2.layers.candidateGeneration).includes("IN_PROCESS_MEMORY")) {
  fail("identity-matching.v2 layers.candidateGeneration must record IN_PROCESS_MEMORY");
}
if (govV2 && govV2.candidateIsNotMatchTruth !== true) {
  fail("identity-matching.v2 candidateIsNotMatchTruth must stay true");
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

const v2 = require(path.join(root, "services/market-intelligence/src/identity-matching/v2/index.cjs"));
if (v2.PIPELINE_STATUS.CANDIDATE_GENERATION !== "NOT_IMPLEMENTED") {
  fail("matcher PIPELINE_STATUS.CANDIDATE_GENERATION must stay NOT_IMPLEMENTED");
}

const cp = require(path.join(root, "services/market-intelligence/src/canonical-product/index.cjs"));
if (cp.PIPELINE_STATUS.CANDIDATE_GENERATION !== "NOT_IMPLEMENTED") {
  fail("canonical-product PIPELINE_STATUS.CANDIDATE_GENERATION must stay NOT_IMPLEMENTED");
}

const cg = require(path.join(root, "services/market-intelligence/src/candidate-generation/index.cjs"));
const { cases, mixedPool, PINNED_TCG, PINNED_EBAY } = require(path.join(
  root,
  "services/market-intelligence/src/candidate-generation/fixtures.cjs",
));

if (cg.GENERATOR_VERSION !== "candidate-generation.v1") {
  fail("GENERATOR_VERSION must be candidate-generation.v1");
}
if (cg.PIPELINE_STATUS.CANDIDATE_GENERATION !== "IN_PROCESS_MEMORY") {
  fail("candidate PIPELINE_STATUS.CANDIDATE_GENERATION must be IN_PROCESS_MEMORY");
}
if (cg.CANDIDATE_IS_NOT_MATCH_TRUTH !== true) fail("CANDIDATE_IS_NOT_MATCH_TRUTH");

const now = "2026-08-20T01:00:00.000Z";

function assertCandidateShape(row, label) {
  if (row.isMatchTruth !== false) fail(`${label} isMatchTruth must be false`);
  if (row.matchingDecision !== null) fail(`${label} matchingDecision must stay null`);
  if (row.matchPath !== null) fail(`${label} matchPath must stay null`);
  if (row.listingPromotion !== false) fail(`${label} listingPromotion must be false`);
  if (row.opportunity !== false) fail(`${label} opportunity must be false`);
  if (row.generatorVersion !== "candidate-generation.v1") fail(`${label} generatorVersion`);
  if (row.generatedAt !== now) fail(`${label} generatedAt must use opts.now`);
  if (row.leftSource === row.rightSource) fail(`${label} must stay cross-source`);
  if (!Array.isArray(row.blockingKeys) || row.blockingKeys.length === 0) {
    fail(`${label} blockingKeys required`);
  }
  const blob = JSON.stringify(row.blockingKeys);
  for (const forbidden of ["113669", "377416817781", "nativeAmount", "fashionphile"]) {
    if (blob.includes(forbidden) && forbidden !== "fashionphile") {
      fail(`${label} blockingKeys must not embed ${forbidden}`);
    }
  }
}

for (const row of cases) {
  const out = cg.generateCandidatePairs(row.observations, { now });
  if (out.candidates.length !== row.expectCount) {
    fail(
      `${row.id} expected ${row.expectCount} candidate(s) got ${out.candidates.length}`,
    );
    continue;
  }
  if (row.expectCount === 1 && row.expectPair) {
    const got = pairToken(out.candidates[0].leftObservationId, out.candidates[0].rightObservationId);
    const exp = pairToken(row.expectPair[0], row.expectPair[1]);
    if (got !== exp) fail(`${row.id} pair expected ${exp} got ${got}`);
    assertCandidateShape(out.candidates[0], row.id);
  }
  if (row.expectMatchDecision) {
    const match = v2.matchSourceObservationsV2(row.observations[0], row.observations[1], { now });
    if (match.decision !== row.expectMatchDecision) {
      fail(`${row.id} matcher expected ${row.expectMatchDecision} got ${match.decision}`);
    }
    if (out.candidates[0] && out.candidates[0].isMatchTruth !== false) {
      fail(`${row.id} candidate must remain not-match-truth after matcher check`);
    }
  }
}

const first = cg.generateCandidatePairs(cases[0].observations, { now });
const second = cg.generateCandidatePairs(cases[0].observations, { now });
if (JSON.stringify(first) !== JSON.stringify(second)) {
  fail("generator must be deterministic for the same observations + now");
}

const mixed = cg.generateCandidatePairs(mixedPool.observations, { now });
const mixedTokens = mixed.candidates.map((row) =>
  pairToken(row.leftObservationId, row.rightObservationId),
);
const expectMixed = mixedPool.expectPairs.map((pair) => pairToken(pair[0], pair[1]));
if (mixedTokens.length !== expectMixed.length) {
  fail(`mixed pool expected ${expectMixed.length} got ${mixedTokens.length} (${mixedTokens.join(",")})`);
}
for (const token of expectMixed) {
  if (!mixedTokens.includes(token)) fail(`mixed pool missing ${token}`);
}

const pinned = cg.generateCandidatePairs([PINNED_TCG, PINNED_EBAY], { now });
if (pinned.candidates.length !== 1) {
  fail("pinned TCG 113669 / eBay 377416817781 geometry must emit one candidate");
} else {
  const keys = JSON.stringify(pinned.candidates[0].blockingKeys);
  if (keys.includes("113669") || keys.includes("377416817781")) {
    fail("pinned source-local ids must not become blocking keys");
  }
  if (pinned.candidates[0].categoryProfile !== "trading_card") {
    fail("pinned geometry categoryProfile must be trading_card");
  }
}

if (fails.length) {
  console.error("[verify:candidate-generation] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:candidate-generation] PASS (in-process pair search · candidate≠MATCH · cross-source · fail-closed title/image/price/sku · pinned geometry)",
);

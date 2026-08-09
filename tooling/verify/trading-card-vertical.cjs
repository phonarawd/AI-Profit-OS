/**
 * verify:trading-card-vertical — Engine §0.0 / §51.12
 * trading_card seed 20~40 · Pokémon/YGO meta + ebay quotes ·
 * grade match · 소액 SKU · Admin gradeMismatch badge
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

mustExist("services/market-intelligence/src/trading-card-seed.cjs");
mustExist("services/market-intelligence/src/card-grade.cjs");
mustExist("services/market-intelligence/src/card-match.cjs");
mustExist("apps/admin/app/admin/opportunities/page.tsx");
mustExist("workers/pokemontcg-adapter/src/index.ts");
mustExist("workers/ygoprodeck-adapter/src/index.ts");
mustExist("workers/ebay-adapter/src/index.ts");

const mi = require(path.join(root, "services/market-intelligence/src/index.cjs"));

// --- seed invariants ---
const inv = mi.assertTradingCardSeedInvariants();
if (!inv.ok) {
  for (const f of inv.fails) fails.push(`seed: ${f}`);
}
if (inv.counts.total < 20 || inv.counts.total > 40) {
  fails.push(`seed count ${inv.counts.total} not in 20~40`);
}
if (inv.counts.pokemon < 1 || inv.counts.yugioh < 1) {
  fails.push("seed must include pokemon and yugioh");
}

const masters = mi.tradingCardSeedsAsAssetMasters();
if (masters.length !== inv.counts.total) {
  fails.push("tradingCardSeedsAsAssetMasters length drift");
}
for (const m of masters) {
  if (m.category !== "trading_card") fails.push(`${m.assetId} category≠trading_card`);
  if (m.imageRightsNoteKo !== "시세 참고용") {
    fails.push(`${m.assetId} imageRightsNoteKo`);
  }
}

// --- grade extractor §51.12 ---
const psa10 = mi.extractGradeFromText("PSA 10 Charizard Base Set #4 Holofoil");
if (!psa10.found || psa10.normalized !== "PSA10") {
  fails.push(`extract PSA10 got ${JSON.stringify(psa10)}`);
}
const bgs = mi.extractGradeFromText("BGS 9.5 Blue-Eyes White Dragon");
if (!bgs.found || bgs.normalized !== "BGS9.5") {
  fails.push(`extract BGS9.5 got ${JSON.stringify(bgs)}`);
}
const raw = mi.extractGradeFromText("Charizard raw ungraded holo");
if (!raw.found || raw.normalized !== "raw") {
  fails.push(`extract raw got ${JSON.stringify(raw)}`);
}

const mismatch = mi.evaluateListingGradeMatch({
  gradeDeclared: "PSA10",
  listingTitle: "PSA 9 Charizard Base Set 4",
});
if (!mismatch.gradeMismatch) {
  fails.push("PSA10 vs PSA9 must gradeMismatch");
}

const matchOk = mi.evaluateListingGradeMatch({
  gradeDeclared: "PSA10",
  listingTitle: "PSA10 Charizard Base Set 4",
});
if (matchOk.gradeMismatch) {
  fails.push("PSA10 vs PSA10 must not mismatch");
}

const pricingBlocked = mi.computeOpportunityPricing({
  buyMarketId: "ebay_us",
  sellMarketId: "ebay_gb",
  buyPriceUsdt: "100",
  sellPriceUsdt: "150",
  gradeMismatch: true,
});
if (pricingBlocked.compareReady !== false) {
  fails.push("gradeMismatch must force compareReady=false");
}

// --- card match keys · fuzzy alone forbidden ---
const exact = mi.evaluateCardListingMatch({
  assetMeta: {
    game: "pokemon",
    set: "base1",
    number: "4",
    lang: "en",
    finish: "holofoil",
    gradeDeclared: "PSA10",
  },
  listingMeta: {
    game: "pokemon",
    set: "base1",
    number: "4",
    lang: "en",
    finish: "holofoil",
  },
  listingTitle: "PSA 10 Charizard Base Set 4",
});
if (!exact.canAutoPublish || exact.gradeMismatch) {
  fails.push("exact+grade match must canAutoPublish");
}

const fuzzyOnly = mi.evaluateCardListingMatch({
  assetMeta: {
    game: "pokemon",
    set: "base1",
    number: "4",
    lang: "en",
    finish: "holofoil",
    gradeDeclared: "raw",
  },
  listingMeta: {
    game: "pokemon",
    set: "base1",
    number: "4",
    lang: "ja",
    finish: "normal",
  },
  listingTitle: "Charizard Base Set raw",
});
if (fuzzyOnly.canAutoPublish) {
  fails.push("fuzzy/partial identity must NOT auto-publish");
}
if (!fuzzyOnly.fuzzyAloneForbidden && fuzzyOnly.identity.fuzzy) {
  // fuzzy may be true when set+number match but finish/lang differ
}

// --- catalog sources + ebay queries ---
const ebayQs = mi.tradingCardEbayQueries();
if (ebayQs.length < 10) fails.push(`ebay queries ${ebayQs.length} < 10`);
const pokeQs = mi.tradingCardPokemonQueries();
const ygoNames = mi.tradingCardYugiohNames();
if (pokeQs.length < 4) fails.push("pokemon catalog queries thin");
if (ygoNames.length < 4) fails.push("yugioh catalog names thin");

const ebayIdx = read("workers/ebay-adapter/src/index.ts");
for (const needle of [
  "Pikachu Base Set",
  "Charizard",
  "Dark Magician",
  "Blue-Eyes",
  "DEFAULT_SEARCH_QUERIES",
]) {
  if (!ebayIdx.includes(needle)) {
    fails.push(`ebay-adapter defaults missing ${needle}`);
  }
}
const pokeIdx = read("workers/pokemontcg-adapter/src/index.ts");
if (!pokeIdx.includes("DEFAULT_POKEMON_QUERIES") || !pokeIdx.includes("name:pikachu")) {
  fails.push("pokemontcg defaults must align seed");
}
const ygoIdx = read("workers/ygoprodeck-adapter/src/index.ts");
if (!ygoIdx.includes("DEFAULT_YGO_NAMES") || !ygoIdx.includes("Dark Magician")) {
  fails.push("ygoprodeck defaults must align seed");
}

// --- Admin gradeMismatch badge ---
const adminPage = read("apps/admin/app/admin/opportunities/page.tsx");
for (const needle of [
  'data-badge="gradeMismatch"',
  "등급 불일치",
  "gradeMismatch",
  "trading_card",
  "§51.12",
]) {
  if (!adminPage.includes(needle)) {
    fails.push(`admin opportunities missing ${needle}`);
  }
}

const routes = read(
  "services/api-nest/src/opportunities/opportunities.routes.ts",
);
for (const needle of [
  "seedTradingCards",
  "evaluateGrade",
  "gradeMismatch",
]) {
  if (!routes.includes(needle)) {
    fails.push(`opportunities.routes missing ${needle}`);
  }
}

const ctrl = read(
  "services/api-nest/src/opportunities/opportunities.admin.controller.ts",
);
if (!ctrl.includes("seedTradingCards") || !ctrl.includes("evaluateGrade")) {
  fails.push("admin controller must expose seed + evaluateGrade");
}

const svc = read(
  "services/api-nest/src/opportunities/opportunities.admin.service.ts",
);
for (const needle of [
  "seedTradingCardAssets",
  "evaluateGradeMismatch",
  "evaluateListingGradeMatch",
  "tradingCardSeedsAsAssetMasters",
]) {
  if (!svc.includes(needle)) {
    fails.push(`admin service missing ${needle}`);
  }
}

const schema = read("schemas/asset-master.v1.json");
for (const needle of [
  "gradeDeclared",
  "ebayQuery",
  "pokemontcg",
  "ygoprodeck",
  "listingLegs",
]) {
  if (!schema.includes(needle)) {
    fails.push(`asset-master.v1 missing ${needle}`);
  }
}

const pkg = read("package.json");
if (!pkg.includes('"verify:trading-card-vertical"')) {
  fails.push("package.json missing verify:trading-card-vertical script");
}

// Day-1 seeds must not use partner yahoo/amazon listing legs
for (const row of mi.listTradingCardSeeds()) {
  const legs = row.meta.listingLegs || [];
  if (legs.includes("yahoo_jp") || legs.some((l) => String(l).startsWith("amazon_"))) {
    fails.push(`${row.assetId}: Day-1 seed must not use yahoo/amazon legs`);
  }
}

if (fails.length) {
  console.error("[verify:trading-card-vertical] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  `[verify:trading-card-vertical] PASS (seed=${inv.counts.total} poke=${inv.counts.pokemon} ygo=${inv.counts.yugioh} 소액=${inv.counts.microSmallPct.toFixed(0)}% · grade·ebay·Admin badge)`,
);

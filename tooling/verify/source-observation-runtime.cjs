/**
 * verify:source-observation-runtime
 * purpose-split SourceObservation + FASHIONPHILE PUBLIC_JSON + Chrono24 Confirmation parser + listing-leg 비확장
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}
function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing: ${rel}`);
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
  "schemas/source-observation.v1.json",
  "governance/global-product/source-observation-runtime.v1.json",
  "services/market-intelligence/src/source-observation/contract.cjs",
  "services/market-intelligence/src/source-observation/validate.cjs",
  "services/market-intelligence/src/source-observation/observe.cjs",
  "services/market-intelligence/src/source-observation/adapters/fashionphile.cjs",
  "services/market-intelligence/src/source-observation/adapters/chrono24.cjs",
  "services/market-intelligence/src/source-observation/adapters/ebay.cjs",
  "services/market-intelligence/src/source-observation/adapters/tcgplayer.cjs",
  "services/market-intelligence/src/source-observation/acquire/ebay-browse.cjs",
  "services/market-intelligence/src/source-observation/acquire/browser-rendered.cjs",
  "services/market-intelligence/src/source-observation/live-ebay.cjs",
  "services/market-intelligence/src/source-observation/repository.memory.cjs",
  "services/market-intelligence/src/source-observation/persistence-mapper.cjs",
  "services/market-intelligence/src/source-observation/repository.postgres.cjs",
  "services/market-intelligence/src/source-observation/cli.cjs",
  "services/market-intelligence/src/source-observation/live-fashionphile-identity-forensic.cjs",
];
for (const f of files) mustExist(f);

const schema = readJson("schemas/source-observation.v1.json");
const runtime = readJson("governance/global-product/source-observation-runtime.v1.json");
const listing = readJson("schemas/listing.v1.json");
const priceObs = readJson("schemas/price-observation.v1.json");
const pricing = readJson("schemas/opportunity-pricing.v1.json");

const INVARIANTS = [
  "PARTNER_LABEL != DATA_SOURCE",
  "SOURCE_OBSERVATION != LISTING_LEG",
  "SOURCE_OBSERVATION != OPPORTUNITY_TRUTH",
  "SOURCE_ITEM != ASSET",
  "DISCOVERY_OBSERVATION != CONFIRMED_MARKET_TRUTH",
  "DISCOVERY_PRICE != OPPORTUNITY_PRICE",
  "OBSERVED_IMAGE != DISPLAY_AUTHORIZED",
  "SOURCE_NATIVE_LISTING_PRICE != LOCALIZED_VIEWER_DISPLAY_PRICE",
];

const contractSrc = read("services/market-intelligence/src/source-observation/contract.cjs");
const fashionSrc = read("services/market-intelligence/src/source-observation/adapters/fashionphile.cjs");
const observeSrc = read("services/market-intelligence/src/source-observation/observe.cjs");
const validateSrc = read("services/market-intelligence/src/source-observation/validate.cjs");
const schemaRaw = read("schemas/source-observation.v1.json");
const runtimeRaw = read("governance/global-product/source-observation-runtime.v1.json");

for (const inv of INVARIANTS) {
  if (!contractSrc.includes(inv) || !runtimeRaw.includes(inv)) {
    fail(`invariant missing: ${inv}`);
  }
}

if (!schemaRaw.includes("CONFIRMATION") || !schemaRaw.includes("allOf") || !schemaRaw.includes('"if"')) {
  fail("schema must express purpose-split with allOf/if");
}
if (!schemaRaw.includes("PUBLIC_JSON")) fail("schema must include PUBLIC_JSON");
if (!schemaRaw.includes("EXISTING_API")) fail("schema must include EXISTING_API");
if (schema.properties && schema.properties.displayAuthorized && schema.properties.displayAuthorized.const !== false) {
  fail("displayAuthorized must be const false");
}
if (Array.isArray(schema.properties?.source?.enum) && schema.properties.source.enum.includes("yahoo_jp")) {
  fail("source-observation source enum must not include yahoo_jp");
}

if (!fashionSrc.includes("PUBLIC_JSON")) fail("fashionphile must be PUBLIC_JSON");
if (/HTTP_HTML/.test(fashionSrc)) fail("fashionphile must not be classified HTTP_HTML");
if (/compare_at_price/.test(fashionSrc) === false) {
  fail("fashionphile must explicitly reject compare_at_price fallback");
}
if (!fashionSrc.includes("AMBIGUOUS")) fail("fashionphile must fail-closed on variant ambiguity");
if (!/US tag|USD 추정|price_currency만/.test(fashionSrc)) {
  fail("fashionphile must document no USD guess from US tag");
}

for (const needle of ["normalizeNativeToUsdt", "requiredCapital", "fxSnapshot"]) {
  if (fashionSrc.includes(needle) || observeSrc.includes(needle)) {
    fail(`parser must not calculate ${needle}`);
  }
}
if (/expectedProfit\s*=/.test(fashionSrc) || /expectedProfit\s*=/.test(observeSrc)) {
  fail("parser must not calculate expectedProfit");
}

if (observeSrc.includes("yahoo") && /yahoo_jp/.test(observeSrc) === false) {
  /* ok if forbidden check */
}
if (!observeSrc.includes("YAHOO_SOURCE_ZERO") && !observeSrc.includes("yahoo")) {
  fail("observe must reject Yahoo");
}

const listingAdapters = listing?.properties?.adapterId?.enum || [];
if (listingAdapters.includes("fashionphile") || listingAdapters.includes("chrono24")) {
  fail("listing.v1 adapterId must not expand for web sources");
}
const listingMarkets = listing?.properties?.marketId?.enum || [];
if (listingMarkets.includes("fashionphile") || listingMarkets.includes("chrono24")) {
  fail("listing.v1 marketId must not expand for web sources");
}
const priceSources = priceObs?.properties?.source?.enum || [];
if (priceSources.includes("fashionphile") || priceSources.includes("chrono24")) {
  fail("price-observation.v1 source enum must not expand this slice");
}
for (const key of ["buyMarketId", "sellMarketId"]) {
  const en = pricing?.properties?.[key]?.enum || [];
  if (en.includes("fashionphile") || en.includes("chrono24")) {
    fail(`${key} must not add observation sources`);
  }
}

const pipeline = require(path.join(root, "services/market-intelligence/src/pipeline.cjs"));
if (
  !Array.isArray(pipeline.PUBLISH_GUARDS.listingLegsOnly) ||
  pipeline.PUBLISH_GUARDS.listingLegsOnly.join(",") !== "ebay,admin"
) {
  fail("PUBLISH_GUARDS.listingLegsOnly must stay ebay|admin");
}
if (!pipeline.PUBLISH_GUARDS.yahooJpForbidden) fail("yahooJpForbidden must stay true");

const settlement = require(path.join(root, "services/engine-rust/settlement_rule.cjs"));
if (settlement.DEFAULT_PRICE_STALE_MAX_SEC !== 3) {
  fail("DEFAULT_PRICE_STALE_MAX_SEC must stay 3");
}

if (!runtime.persistence || runtime.persistence.OBSERVATION_DB_RUNTIME !== "PASS") {
  fail("OBSERVATION_DB_RUNTIME must be PASS after isolated local Postgres proof");
}
if (runtime.persistence.DURABLE_DB_RUNTIME_VERIFIED_ENVIRONMENT !== "CURSOR_CREATED_LOCAL_TEST_POSTGRES") {
  fail("DURABLE_DB_RUNTIME_VERIFIED_ENVIRONMENT must stay CURSOR_CREATED_LOCAL_TEST_POSTGRES");
}
if (runtime.persistence.PRODUCTION_OBSERVATION_PERSISTENCE !== "NOT_IMPLEMENTED") {
  fail("PRODUCTION_OBSERVATION_PERSISTENCE must be NOT_IMPLEMENTED");
}
if (runtime.persistence.remoteWrite !== false || runtime.persistence.supabaseMigrationThisSlice !== false) {
  fail("remote write / supabaseMigrationThisSlice must be false");
}
if (runtime.persistence.supabaseMigrationApplied !== false) {
  fail("supabaseMigrationApplied must stay false until remote apply");
}
if (runtime.persistence.supabaseMigrationFileCreated !== true) {
  fail("supabaseMigrationFileCreated must be true for durable file-only slice");
}

const unverified = [
  "mercari_jp",
  "kream",
  "stockx",
  "goat",
  "bunjang",
];
for (const src of unverified) {
  const row = (runtime.sourceMatrix || []).find((r) => r.source === src);
  if (!row) {
    fail(`matrix missing ${src}`);
    continue;
  }
  if (row.LIVE_RUNTIME_STATUS !== "NOT_VERIFIED") {
    fail(`${src} LIVE_RUNTIME_STATUS must be NOT_VERIFIED`);
  }
  if (row.NEXT_ACTION !== "LIVE_REVALIDATION") {
    fail(`${src} NEXT_ACTION must be LIVE_REVALIDATION`);
  }
  if (row.LIVE_RUNTIME_STATUS === "READY_FOR_IMPLEMENTATION" || row.LIVE_RUNTIME_STATUS === "LIVE_READY") {
    fail(`${src} must not be pre-declared READY`);
  }
}
const vestiaire = (runtime.sourceMatrix || []).find((r) => r.source === "vestiaire");
if (!vestiaire || vestiaire.PARSER_CONTRACT_STATUS !== "BLOCKED") {
  fail("vestiaire PARSER_CONTRACT_STATUS must stay BLOCKED");
}
const yahoo = (runtime.sourceMatrix || []).find((r) => r.source === "yahoo_jp");
if (!yahoo || yahoo.PARSER_CONTRACT_STATUS !== "PERMANENTLY_FORBIDDEN") {
  fail("yahoo_jp must remain PERMANENTLY_FORBIDDEN");
}
const fp = (runtime.sourceMatrix || []).find((r) => r.source === "fashionphile");
if (!fp || fp.ACQUISITION_MODE !== "PUBLIC_JSON") {
  fail("fashionphile ACQUISITION_MODE must be PUBLIC_JSON");
}
const chronoRow = (runtime.sourceMatrix || []).find((r) => r.source === "chrono24");
if (!chronoRow) {
  fail("matrix missing chrono24");
} else {
  if (chronoRow.DOCUMENT_STRUCTURE_STATUS !== "PROVEN") fail("chrono24 DOCUMENT_STRUCTURE_STATUS");
  if (chronoRow.GENERIC_PRODUCT_DETAIL_PARSER !== "IMPLEMENTED") {
    fail("chrono24 GENERIC_PRODUCT_DETAIL_PARSER must be IMPLEMENTED");
  }
  if (chronoRow.CONFIRMATION_PARSER_LOGIC !== "PASS") fail("chrono24 CONFIRMATION_PARSER_LOGIC");
  if (chronoRow.CONFIRMATION_MARKET_TRUTH !== "BLOCKED_NATIVE_PRICE") {
    fail("chrono24 CONFIRMATION_MARKET_TRUTH must stay BLOCKED_NATIVE_PRICE");
  }
  if (chronoRow.AUTOMATED_HTTP_ACQUISITION !== "BLOCKED_CURRENT_ENV") {
    fail("chrono24 AUTOMATED_HTTP_ACQUISITION");
  }
  if (chronoRow.AUTOMATED_PLAYWRIGHT_ACQUISITION !== "BLOCKED_CURRENT_ENV") {
    fail("chrono24 AUTOMATED_PLAYWRIGHT_ACQUISITION");
  }
  if (chronoRow.AUTOMATED_DISCOVERY !== "NOT_IMPLEMENTED") fail("chrono24 AUTOMATED_DISCOVERY");
  if (chronoRow.CHRONO24_PRODUCTION_AUTOMATION !== "NOT_COMPLETE") {
    fail("chrono24 production automation must stay NOT_COMPLETE");
  }
  if (chronoRow.playwrightAcquisitionImplemented) {
    fail("chrono24 must not implement Playwright acquisition");
  }
  if (chronoRow.LIVE_RUNTIME_STATUS === "LIVE_PROVEN") {
    fail("chrono24 must not claim LIVE_PROVEN");
  }
  if (chronoRow.manualFounderCopyPasteRequiredInProduction !== false) {
    fail("manual Founder copy-paste must not be a production path");
  }
}

const so = require(path.join(root, "services/market-intelligence/src/source-observation/index.cjs"));
for (const inv of INVARIANTS) {
  if (!so.INVARIANTS.includes(inv)) fail(`runtime INVARIANTS missing ${inv}`);
}

try {
  so.discoverCandidates({});
  fail("discoverCandidates must stay NOT_IMPLEMENTED");
} catch (err) {
  if (!String(err.message || err).includes("NOT_IMPLEMENTED")) {
    fail("discoverCandidates must throw NOT_IMPLEMENTED");
  }
}

const fixtureDir = path.join(
  root,
  "services/market-intelligence/src/source-observation/fixtures/fashionphile",
);
function fixture(name) {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, name), "utf8"));
}

const catalogUrl = "https://www.fashionphile.com/products.json";
const productUrl =
  "https://www.fashionphile.com/products/hermes-epsom-mini-kelly-sellier-20-black-1956054.json";

{
  const out = so.fashionphile.parseFashionphileDocument({
    document: fixture("discovery-catalog.json"),
    purpose: "DISCOVERY",
    url: catalogUrl,
  });
  if (!out.ok || !out.candidates || !out.candidates[0] || !out.candidates[0].ok) {
    fail("discovery catalog must parse");
  } else {
    const obs = out.candidates[0].observation;
    if (obs.nativeCurrency != null) fail("DISCOVERY must not invent nativeCurrency from US tag");
    if (obs.nativeAmount !== "34995.00") fail("DISCOVERY may keep evidenced nativeAmount");
    if (obs.observationPurpose !== "DISCOVERY") fail("discovery purpose");
    if (obs.displayAuthorized !== false) fail("discovery displayAuthorized");
    const v = so.validateObservation(obs);
    if (!v.ok) fail(`discovery validate: ${v.reason}`);
  }
}

{
  const out = so.fashionphile.parseFashionphileDocument({
    document: fixture("confirmation-product.json"),
    purpose: "CONFIRMATION",
    url: productUrl,
  });
  if (!out.ok || !out.observation) {
    fail(`confirmation fixture must PASS got ${out.reason || "no-obs"}`);
  } else {
    const obs = out.observation;
    if (obs.nativeAmount !== "34995.00" || obs.nativeCurrency !== "USD") {
      fail("confirmation must observe real amount+currency");
    }
    if (!obs.imageUrl || !obs.externalItemId || !obs.observedAt || !obs.parserVersion) {
      fail("confirmation missing required identity/image/time");
    }
    if (obs.meta.priceKind !== "listing_sale") fail("confirmation priceKind");
    if (so.validateObservation(obs).ok !== true) fail("confirmation validate");
    if (obs.meta.identityHints && obs.meta.identityHints.gtin) {
      fail("Fashionphile SKU-derived barcode must not become meta.identityHints.gtin");
    }
    if (obs.meta.categoryHint) fail("Fashionphile product_type must not become categoryHint");
    if (obs.meta.model || obs.meta.modelNumber) fail("Fashionphile must not invent model/modelNumber");
    if (obs.displayAuthorized !== false) fail("confirmation displayAuthorized");
  }
}

{
  const out = so.fashionphile.parseFashionphileDocument({
    document: fixture("ambiguous-variants.json"),
    purpose: "CONFIRMATION",
    url: productUrl,
  });
  if (out.ok || out.sourceStatus !== "AMBIGUOUS") {
    fail("different variant prices must be AMBIGUOUS");
  }
}

{
  const out = so.fashionphile.parseFashionphileDocument({
    document: fixture("identical-variants.json"),
    purpose: "CONFIRMATION",
    url: productUrl,
  });
  if (!out.ok || !out.observation || out.observation.meta.variantResolution !== "identical_multi") {
    fail("identical multi-variant must confirm with evidence");
  }
}

{
  const out = so.fashionphile.parseFashionphileDocument({
    document: fixture("compare-at-only.json"),
    purpose: "CONFIRMATION",
    url: productUrl,
  });
  if (out.ok) fail("compare_at_price must not become current price");
}

{
  const out = so.fashionphile.parseFashionphileDocument({
    document: fixture("missing-image.json"),
    purpose: "CONFIRMATION",
    url: productUrl,
  });
  if (out.ok) fail("missing image must fail");
}

{
  const out = so.fashionphile.parseFashionphileDocument({
    document: fixture("missing-id.json"),
    purpose: "CONFIRMATION",
    url: productUrl,
  });
  if (out.ok) fail("missing source item id must fail");
}

{
  const out = so.fashionphile.parseFashionphileDocument({
    document: fixture("missing-currency.json"),
    purpose: "CONFIRMATION",
    url: productUrl,
  });
  if (out.ok) fail("confirmation missing currency must fail even with US tag");
}

{
  const out = so.fashionphile.parseFashionphileDocument({
    document: fixture("malformed-timestamp-price.json"),
    purpose: "CONFIRMATION",
    url: productUrl,
  });
  if (out.ok) fail("timestamp-like price must fail");
}

{
  const out = so.fashionphile.parseFashionphileDocument({
    document: fixture("confirmation-product.json"),
    purpose: "CONFIRMATION",
    url: catalogUrl,
  });
  if (out.ok) fail("CONFIRMATION on catalog URL must fail");
}

{
  const repo = so.createMemoryRepository();
  const parsed = so.fashionphile.parseFashionphileDocument({
    document: fixture("confirmation-product.json"),
    purpose: "CONFIRMATION",
    url: productUrl,
  });
  const first = repo.appendObservation(parsed.observation);
  const second = repo.appendObservation(parsed.observation);
  const listed = repo.listObservations("fashionphile", parsed.observation.externalItemId);
  if (!first.stored || listed.length !== 1) fail("memory append/read-back");
  if (second.stored !== false) fail("identical fingerprint+observedAt must be idempotent");
  if (repo.getSourceItem("fashionphile", parsed.observation.externalItemId) == null) {
    fail("source item master missing");
  }
  if (listed[0].assetId) fail("memory row must not assign assetId");
}

{
  const chrono = so.gateObserveSource("chrono24");
  if (!chrono.ok) fail("chrono24 observe must be implemented");
  const ebayGate = so.gateObserveSource("ebay");
  if (!ebayGate.ok) fail("ebay observe must be implemented");
  const tcgGate = so.gateObserveSource("tcgplayer");
  if (!tcgGate.ok) fail("tcgplayer observe must be implemented");
  const yahooGate = so.gateObserveSource("yahoo_jp");
  if (yahooGate.ok || yahooGate.reason !== "YAHOO_SOURCE_ZERO") {
    fail("yahoo_jp observe must be YAHOO_SOURCE_ZERO");
  }
}

const otherAdapters = [
  "mercari_jp.cjs",
  "kream.cjs",
  "stockx.cjs",
  "goat.cjs",
  "bunjang.cjs",
  "vestiaire.cjs",
  "yahoo.cjs",
];
for (const name of otherAdapters) {
  if (fs.existsSync(path.join(root, "services/market-intelligence/src/source-observation/adapters", name))) {
    fail(`other source adapter must not exist this slice: ${name}`);
  }
}
if (fs.existsSync(path.join(root, "workers/fashionphile-adapter"))) {
  fail("do not add fashionphile as listing adapter worker");
}
if (fs.existsSync(path.join(root, "workers/chrono24-adapter"))) {
  fail("chrono24-adapter listing worker remains FORBIDDEN");
}

if (fs.existsSync(path.join(root, "supabase/migrations"))) {
  const migs = fs.readdirSync(path.join(root, "supabase/migrations")).filter((n) => n.endsWith(".sql"));
  const soMigs = migs.filter((n) => /source_observations\.sql$/.test(n));
  if (soMigs.length !== 1) {
    fail("exactly one source_observations migration file required");
  } else {
    const stamp = soMigs[0].match(/^(\d{14})_source_observations\.sql$/);
    if (!stamp) {
      fail(`bad source_observations filename: ${soMigs[0]}`);
    } else {
      const HISTORICAL_BASELINE = "20260818010000";
      if (stamp[1] <= HISTORICAL_BASELINE) {
        fail("source_observations timestamp must be after production baseline");
      }
      const sameStamp = migs.filter((n) => n.startsWith(`${stamp[1]}_`));
      if (sameStamp.length !== 1) {
        fail("source_observations timestamp must be unique");
      }
    }
    const sql = read(`supabase/migrations/${soMigs[0]}`);
    if (/UPDATE\s+public\.source_observations\s+SET/i.test(sql)) {
      fail("source_observations migration must not UPDATE rows");
    }
    if (/DELETE\s+FROM\s+public\.source_observations/i.test(sql)) {
      fail("source_observations migration must not DELETE rows");
    }
    if (/REFERENCES\s+public\.(assets|listings|opportunities|price_observations)/i.test(sql)) {
      fail("source_observations must not FK listing-leg / money tables");
    }
    if (/UNIQUE\s*\(\s*source\s*,\s*external_item_id/i.test(sql)) {
      fail("source + external_item_id UNIQUE overwrite path forbidden");
    }
    if (!/ENABLE ROW LEVEL SECURITY/i.test(sql)) fail("source_observations RLS required");
    if (!/append-only|forbid_mutation/i.test(sql)) fail("source_observations append-only trigger required");
  }
}

if (so.PERSISTENCE_VERDICT.OBSERVATION_DB_RUNTIME !== "PASS") {
  fail("PERSISTENCE_VERDICT DB runtime");
}

const chronoSrc = read("services/market-intelligence/src/source-observation/adapters/chrono24.cjs");
const observeSrcNow = read("services/market-intelligence/src/source-observation/observe.cjs");
if (
  /require\s*\(\s*['"]playwright['"]\s*\)/i.test(chronoSrc) ||
  /require\s*\(\s*['"]playwright['"]\s*\)/i.test(observeSrcNow) ||
  /browser\.launch|chromium\.launch/i.test(chronoSrc)
) {
  fail("chrono24 acquisition must stay HTTP-only · browser launch forbidden");
}
if (/stealth|turnstile.?solver|captcha.?solver|proxy.?rotation/i.test(chronoSrc)) {
  fail("chrono24 must not implement bypass");
}
for (const hard of ["46423475", "13750", "10499", "9070", "Rolex", "1680"]) {
  if (chronoSrc.includes(hard)) fail(`chrono24 parser must not hardcode ${hard}`);
}

const chronoFixDir = path.join(
  root,
  "services/market-intelligence/src/source-observation/fixtures/chrono24",
);
function chronoFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(chronoFixDir, name), "utf8"));
}

{
  const fx = chronoFixture("confirmation-product.sanitized.json");
  const out = so.chrono24.parseChrono24ProductDocument({
    html: fx.html,
    url: fx.url,
    purpose: "CONFIRMATION",
  });
  if (out.ok || out.sourceStatus !== "AMBIGUOUS") {
    fail("chrono24 founder fixture must stay AMBIGUOUS / not SUCCESS");
  } else if (!out.observation) {
    fail("chrono24 parser logic must still extract observation fields");
  } else {
    const obs = out.observation;
    if (obs.externalItemId !== "46423475") fail("chrono24 ID extraction");
    if (!String(obs.imageUrl).includes("img.chrono24.com/images/uhren/")) {
      fail("chrono24 JSON-LD primary image");
    }
    if (obs.nativeAmount != null || obs.meta.priceKind) {
      fail("chrono24 must not promote unresolved native to SUCCESS fields");
    }
    if (obs.meta.localizedAmount !== "13750" || obs.meta.localizedCurrency !== "SGD") {
      fail("chrono24 must keep localized offer separate");
    }
    if (obs.meta.priceSemantics !== "native_unresolved") fail("chrono24 priceSemantics");
    if (obs.meta.modelNumber !== "1680") fail("chrono24 reference maps to modelNumber not sku");
    if (obs.meta.sku) fail("chrono24 must not store reference as sku");
    if (obs.displayAuthorized !== false) fail("chrono24 displayAuthorized");
    if (out.confirmationParserLogic !== "PASS") fail("CONFIRMATION_PARSER_LOGIC");
    if (out.confirmationMarketTruth !== "BLOCKED_NATIVE_PRICE") {
      fail("CONFIRMATION_MARKET_TRUTH");
    }
    if (so.validateObservation(obs).ok !== true) fail("chrono24 ambiguous observation validate");
  }
}

{
  const fx = chronoFixture("missing-image.json");
  const out = so.chrono24.parseChrono24ProductDocument({
    html: fx.html,
    url: fx.url,
    purpose: "CONFIRMATION",
  });
  if (out.ok || out.sourceStatus === "SUCCESS") fail("chrono24 missing image must fail");
}
{
  const fx = chronoFixture("missing-product-id.json");
  const out = so.chrono24.parseChrono24ProductDocument({
    html: fx.html,
    url: fx.url,
    purpose: "CONFIRMATION",
  });
  if (out.ok || out.reason !== "product_id_missing") fail("chrono24 missing Product ID must fail");
}
{
  const fx = chronoFixture("malformed-jsonld.json");
  const out = so.chrono24.parseChrono24ProductDocument({
    html: fx.html,
    url: fx.url,
    purpose: "CONFIRMATION",
  });
  if (out.ok || out.reason !== "malformed_jsonld") fail("chrono24 malformed JSON-LD must fail");
}
{
  const fx = chronoFixture("conflicting-id.json");
  const out = so.chrono24.parseChrono24ProductDocument({
    html: fx.html,
    url: fx.url,
    purpose: "CONFIRMATION",
  });
  if (out.ok || out.reason !== "conflicting_id") fail("chrono24 conflicting ID must fail");
}
{
  const fx = chronoFixture("challenge-only.json");
  const out = so.chrono24.parseChrono24ProductDocument({
    html: fx.html,
    url: fx.url,
    purpose: "CONFIRMATION",
  });
  if (out.ok || out.sourceStatus !== "ACCESS_BLOCKED") {
    fail("chrono24 challenge-only must be ACCESS_BLOCKED");
  }
}
{
  const fx = chronoFixture("analytics-watchprice-only.json");
  const out = so.chrono24.parseChrono24ProductDocument({
    html: fx.html,
    url: fx.url,
    purpose: "CONFIRMATION",
  });
  if (out.ok) fail("chrono24 analytics watchPrice must not become current price");
  if (out.observation && out.observation.nativeAmount === "9070") {
    fail("chrono24 must not use watchPrice as nativeAmount");
  }
  if (out.observation && out.observation.meta && out.observation.meta.localizedAmount === "9070") {
    fail("chrono24 must not use watchPrice as localizedAmount");
  }
}

{
  const repo = so.createMemoryRepository();
  const fx = chronoFixture("confirmation-product.sanitized.json");
  const parsed = so.chrono24.parseChrono24ProductDocument({
    html: fx.html,
    url: fx.url,
    purpose: "CONFIRMATION",
  });
  if (parsed.observation) {
    const first = repo.appendObservation(parsed.observation);
    const listed = repo.listObservations("chrono24", parsed.observation.externalItemId);
    if (!first.stored || listed.length !== 1) fail("chrono24 memory append/read-back");
    if (listed[0].assetId) fail("chrono24 memory must not assign assetId");
  }
}

const live = spawnSync(
  process.execPath,
  [path.join(root, "services/market-intelligence/src/source-observation/live-fashionphile.cjs")],
  { cwd: root, encoding: "utf8", timeout: 20000 },
);
if (live.status === 0) {
  if (!/httpLive.: .PASS/.test(live.stdout) && !live.stdout.includes('"httpLive": "PASS"')) {
    fail("live script exit 0 without PASS");
  }
} else if (live.status === 2) {
  // ACCESS_BLOCKED — fixture PASS를 live PASS로 쓰지 않음. verifier는 계약만 PASS.
} else {
  fail(`live fashionphile unexpected status ${live.status}: ${live.stderr || live.stdout}`);
}

const liveChrono = spawnSync(
  process.execPath,
  [path.join(root, "services/market-intelligence/src/source-observation/live-chrono24.cjs")],
  { cwd: root, encoding: "utf8", timeout: 20000 },
);
if (liveChrono.status === 0) {
  fail("live chrono24 must not report acquire PASS in this environment");
} else if (liveChrono.status === 2) {
  if (
    !liveChrono.stdout.includes("BLOCKED") &&
    !String(liveChrono.stderr || "").includes("BLOCKED")
  ) {
    fail("live chrono24 exit 2 without BLOCKED");
  }
} else {
  fail(`live chrono24 unexpected status ${liveChrono.status}: ${liveChrono.stderr || liveChrono.stdout}`);
}

const ebaySrc = read("services/market-intelligence/src/source-observation/adapters/ebay.cjs");
const ebayAcquireSrc = read("services/market-intelligence/src/source-observation/acquire/ebay-browse.cjs");
const ebayObserveSrc = read("services/market-intelligence/src/source-observation/observe.cjs");
const workerBrowse = read("workers/ebay-adapter/src/browse-api.ts");
const workerIndex = read("workers/ebay-adapter/src/index.ts");
if (!ebayAcquireSrc.includes("buyingOptions:{FIXED_PRICE}")) {
  fail("ebay discovery must send explicit FIXED_PRICE filter");
}
if (!ebayAcquireSrc.includes("/item_summary/search") || !ebayAcquireSrc.includes("/item/")) {
  fail("ebay acquire must call search + getItem");
}
if (/require\s*\(\s*['"]playwright['"]\s*\)/i.test(ebaySrc) || /browser\.launch/i.test(ebaySrc)) {
  fail("ebay observation must not use Playwright");
}
for (const hard of ["Rolex", "Hermes", "Hermès", "126610LN", "Birkin"]) {
  if (ebaySrc.includes(hard) || ebayAcquireSrc.includes(hard)) {
    fail(`ebay observation must not hardcode ${hard}`);
  }
}
if (!workerBrowse.includes("item_summary/search")) fail("listing-leg browse search owner missing");
if (!workerIndex.includes("lst_ebay_")) fail("listing-leg identity owner missing");
if (workerIndex.includes("source-observation")) {
  fail("listing-leg worker must not import source-observation");
}
if (!ebayObserveSrc.includes("discoverSourceItems")) fail("discoverSourceItems must exist");
if (ebaySrc.includes("requiredCapital") || ebayAcquireSrc.includes("normalizeNativeToUsdt")) {
  fail("ebay observation must not calculate Money/FX");
}

const ebayRow = (runtime.sourceMatrix || []).find((r) => r.source === "ebay");
if (!ebayRow) {
  fail("matrix missing ebay");
} else {
  if (ebayRow.ACQUISITION_MODE !== "API" && ebayRow.EBAY_ACQUISITION_MODE !== "API") {
    fail("ebay ACQUISITION_MODE must be API");
  }
  if (ebayRow.EBAY_PRODUCT_NORMALIZER !== "IMPLEMENTED") fail("EBAY_PRODUCT_NORMALIZER");
  if (ebayRow.persistToListingLeg !== false) fail("ebay observation persistToListingLeg must be false");
  if (ebayRow.EBAY_LIVE_PROVEN === true && ebayRow.EBAY_DISCOVERY_RUNTIME !== "PASS") {
    fail("EBAY_LIVE_PROVEN cannot be true without live discovery PASS");
  }
  const allowedRuntime = ["PASS", "BLOCKED_CREDENTIALS", "FAIL"];
  if (!allowedRuntime.includes(ebayRow.EBAY_DISCOVERY_RUNTIME)) fail("EBAY_DISCOVERY_RUNTIME");
  if (!allowedRuntime.includes(ebayRow.EBAY_CONFIRMATION_RUNTIME)) fail("EBAY_CONFIRMATION_RUNTIME");
}

const tcg = (runtime.sourceMatrix || []).find((r) => r.source === "tcgplayer");
if (!tcg) {
  fail("matrix missing tcgplayer");
} else {
  if (tcg.TCGPLAYER_API_INTEGRATION !== false) fail("TCGPLAYER_API_INTEGRATION must be false");
  if (tcg.ACQUISITION_MODE !== "PUBLIC_PRODUCT_PAGE_PARSER") {
    fail("tcgplayer ACQUISITION_MODE must be PUBLIC_PRODUCT_PAGE_PARSER");
  }
  if (tcg.PARSER_CONTRACT_STATUS !== "READY") {
    fail("tcgplayer PARSER_CONTRACT_STATUS must be READY");
  }
  if (tcg.GENERIC_PRODUCT_DETAIL_PARSER !== "IMPLEMENTED") {
    fail("tcgplayer GENERIC_PRODUCT_DETAIL_PARSER");
  }
  if (!["PARSER_READY", "LIVE_PROVEN"].includes(tcg.LIVE_RUNTIME_STATUS)) {
    fail("tcgplayer LIVE_RUNTIME_STATUS");
  }
  if (!Array.isArray(tcg.acquisition) || tcg.acquisition.join(",") !== "HTTP_HTML,BROWSER_RENDERED") {
    fail("tcgplayer acquisition must be HTTP_HTML → BROWSER_RENDERED");
  }
  if (!Array.isArray(tcg.extraction) || tcg.extraction.join(",") !== "STRUCTURED_DATA,EMBEDDED_STATE,DOM") {
    fail("tcgplayer extraction must be STRUCTURED_DATA → EMBEDDED_STATE → DOM");
  }
  if ((tcg.extraction || []).includes("BROWSER_RENDERED")) {
    fail("tcgplayer must not mix BROWSER_RENDERED into extraction");
  }
  if ((tcg.acquisition || []).includes("STRUCTURED_DATA")) {
    fail("tcgplayer must not mix STRUCTURED_DATA into acquisition");
  }
}

const tcgSrc = read("services/market-intelligence/src/source-observation/adapters/tcgplayer.cjs");
const tcgBrowserSrc = read("services/market-intelligence/src/source-observation/acquire/browser-rendered.cjs");
if (!so.IMPLEMENTED_PARSERS.includes("tcgplayer")) fail("IMPLEMENTED_PARSERS must include tcgplayer");
if (so.TCGPLAYER_PARSER_VERSION !== "tcgplayer.public-page.1") fail("TCGPLAYER_PARSER_VERSION");
for (const banned of ["113669", "Charizard", "Generations", "11/83", "Pokémon"]) {
  if (tcgSrc.includes(banned)) fail(`tcgplayer parser must not hardcode ${banned}`);
}
for (const api of ["mp-search-api", "infinite-api", "mpapi.tcgplayer.com", "api.tcgplayer.com"]) {
  if (tcgSrc.includes(api) || tcgBrowserSrc.includes(api)) {
    fail(`tcgplayer must not call ${api}`);
  }
}
if (/stealth|turnstile.?solver|captcha.?solver|proxy.?rotation/i.test(tcgSrc + tcgBrowserSrc)) {
  fail("tcgplayer must not implement bypass");
}
if (/require\s*\(\s*['"]playwright['"]\s*\)/i.test(observeSrc) || /browser\.launch/i.test(observeSrc)) {
  fail("observe.cjs must not launch browser — TCG acquire owner is separate");
}

const tcgFixDir = path.join(root, "services/market-intelligence/src/source-observation/fixtures/tcgplayer");
function tcgFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(tcgFixDir, name), "utf8"));
}

{
  const fx = tcgFixture("confirmation-product.sanitized.json");
  const out = so.tcgplayer.parseTcgplayerProductDocument({
    html: fx.html,
    url: fx.url,
    purpose: "CONFIRMATION",
    acquisitionMode: "HTTP_HTML",
  });
  if (!out.ok || !out.observation) {
    fail(`tcgplayer sanitized fixture must PASS got ${out.reason || "no-obs"}`);
  } else {
    const obs = out.observation;
    if (obs.externalItemId !== "999001") fail("tcgplayer fixture product id");
    if (obs.meta.identityHints.game !== "Example Game") fail("tcgplayer fixture game owner");
    if (obs.meta.identityHints.set !== "Example Set") fail("tcgplayer fixture set owner");
    if (obs.meta.identityHints.cardNumber !== "4/102") fail("tcgplayer fixture cardNumber owner");
    if (obs.meta.categoryHint) fail("tcgplayer must not invent categoryHint");
    if (obs.nativeAmount !== "12.34" || obs.nativeCurrency !== "USD") fail("tcgplayer fixture listing price");
    if (obs.meta.priceKind !== "listing_sale") fail("tcgplayer fixture priceKind");
    if (obs.meta.observationMode !== "AUTOMATED_LIVE") fail("tcgplayer observationMode");
    if (obs.observationPurpose !== "CONFIRMATION" || obs.sourceStatus !== "SUCCESS") {
      fail("tcgplayer fixture confirmation success");
    }
    if (obs.displayAuthorized !== false) fail("tcgplayer displayAuthorized");
    if (!String(obs.imageUrl).includes("tcgplayer-cdn.tcgplayer.com/product/999001")) {
      fail("tcgplayer fixture product image");
    }
    if (so.validateObservation(obs).ok !== true) fail("tcgplayer fixture validate");
  }
}

{
  const promo = tcgFixture("promo-set-link-ignored.json");
  const out = so.tcgplayer.parseTcgplayerProductDocument({
    html: promo.html,
    url: promo.url,
    purpose: "CONFIRMATION",
  });
  if (!out.ok || !out.observation) {
    fail(`tcgplayer promo-set fixture must PASS got ${out.reason || "no-obs"}`);
  } else if (out.observation.meta.identityHints.set !== "Example Set") {
    fail("tcgplayer must ignore page-wide promo set links and keep product breadcrumb set");
  } else if (out.observation.meta.identityHints.set === "Unrelated Promo Set") {
    fail("tcgplayer must not take the first page-wide set link");
  }
}

{
  const shell = tcgFixture("generic-shell.json");
  const out = so.tcgplayer.parseTcgplayerProductDocument({
    html: shell.html,
    url: shell.url,
    purpose: "CONFIRMATION",
  });
  if (out.ok || out.reason !== "generic_shell") fail("tcgplayer shell must fail-closed generic_shell");
}

{
  const titleOnly = tcgFixture("title-only-not-enough.json");
  const out = so.tcgplayer.parseTcgplayerProductDocument({
    html: titleOnly.html,
    url: titleOnly.url,
    purpose: "CONFIRMATION",
  });
  if (out.ok || out.sourceStatus === "SUCCESS") {
    fail("tcgplayer title-only must not become SUCCESS");
  }
  if (out.reason !== "required_identity_structure_missing") {
    fail(`tcgplayer title-only reason expected required_identity_structure_missing got ${out.reason}`);
  }
}

{
  const challenge = tcgFixture("challenge-only.json");
  const out = so.tcgplayer.parseTcgplayerProductDocument({
    html: challenge.html,
    url: challenge.url,
    purpose: "CONFIRMATION",
  });
  if (out.ok || out.sourceStatus !== "ACCESS_BLOCKED") fail("tcgplayer challenge must be ACCESS_BLOCKED");
}

const ebayFixDir = path.join(root, "services/market-intelligence/src/source-observation/fixtures/ebay");
function ebayFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(ebayFixDir, name), "utf8"));
}
function parseEbay(name, purpose) {
  return so.ebay.parseEbayBrowseItem({
    item: ebayFixture(name),
    purpose: purpose || "CONFIRMATION",
    requestContext: { marketplaceId: "EBAY_US" },
  });
}

{
  const out = parseEbay("fixed-price-available.json");
  if (!out.ok || !out.observation) {
    fail(`ebay fixed-price must PASS got ${out.reason || "no-obs"}`);
  } else {
    const obs = out.observation;
    if (obs.externalItemId !== "v1|110000000001|0") fail("ebay externalItemId");
    if (obs.nativeAmount !== "42.00" || obs.nativeCurrency !== "USD") fail("ebay native price");
    if (obs.meta.priceSemantics !== "native_proven") fail("ebay native_proven");
    if (obs.meta.priceKind !== "listing_sale") fail("ebay priceKind");
    if (obs.displayAuthorized !== false) fail("ebay displayAuthorized");
    if (!String(obs.imageUrl).includes("i.ebayimg.com")) fail("ebay item.image.imageUrl");
    if (obs.meta.brand !== "ExampleBrand") fail("ebay direct brand");
    if (obs.meta.identityHints.epid !== "223344556") fail("ebay epid");
    if (so.validateObservation(obs).ok !== true) fail("ebay fixed-price validate");
  }
}
{
  const out = parseEbay("missing-image.json");
  if (out.ok || out.reason !== "primary_image_missing") fail("ebay missing image must fail");
}
{
  const out = parseEbay("missing-item-id.json");
  if (out.ok || out.reason !== "item_id_missing") fail("ebay missing itemId must fail");
}
{
  const out = parseEbay("missing-price.json");
  if (out.ok || out.reason !== "price_missing") fail("ebay missing price must fail");
}
{
  const out = parseEbay("auction.json");
  if (out.ok || out.sourceStatus !== "AMBIGUOUS") fail("ebay auction must fail-closed");
}
{
  const out = parseEbay("auction-with-bin.json");
  if (out.ok || out.sourceStatus !== "AMBIGUOUS") fail("ebay auction+BIN must fail-closed");
}
{
  const out = parseEbay("unavailable-ended.json");
  if (out.ok || out.sourceStatus !== "UNAVAILABLE") fail("ebay ended listing must be UNAVAILABLE");
}
{
  const out = parseEbay("malformed-money.json");
  if (out.ok) fail("ebay malformed money must fail");
}
{
  const out = parseEbay("unsupported-currency.json");
  if (out.ok) fail("ebay unsupported currency must fail");
}
{
  const out = so.ebay.parseEbayBrowseItem({
    item: ebayFixture("converted-from-native.json"),
    purpose: "CONFIRMATION",
    requestContext: { marketplaceId: "EBAY_US" },
  });
  if (!out.ok || !out.observation) {
    fail(`ebay convertedFrom must PASS got ${out.reason || "no-obs"}`);
  } else {
    if (out.observation.nativeAmount !== "40.00" || out.observation.nativeCurrency !== "GBP") {
      fail("ebay convertedFrom native");
    }
    if (out.observation.meta.localizedAmount !== "50.00") fail("ebay convertedFrom localized");
  }
}
{
  const out = parseEbay("no-conversion-no-marketplace.json");
  if (out.ok || out.sourceStatus !== "AMBIGUOUS" || out.reason !== "native_unproven") {
    fail("ebay OBSERVED_API_PRICE without marketplace must not be native_proven");
  }
}
{
  const out = parseEbay("identity-direct-fields.json");
  if (!out.ok || !out.observation) {
    fail("ebay identity fixture must PASS");
  } else {
    if (out.observation.meta.brand !== "DirectBrand") fail("ebay brand must prefer direct field");
    if (out.observation.meta.identityHints.epid !== "998877") fail("ebay epid owner");
    if (out.observation.meta.identityHints.epid === "should-not-win") fail("inferredEpid promoted");
    if (out.observation.meta.identityHints.inferredEpid !== "should-not-win") {
      fail("inferredEpid must stay labeled inferred");
    }
    if (out.observation.meta.model !== "AspectModel") fail("ebay model from localizedAspects");
  }
}
{
  const out = parseEbay("inferred-epid-only.json");
  if (!out.ok || !out.observation) {
    fail("ebay inferred-epid-only should still confirm if price/image ok");
  } else if (out.observation.meta.identityHints.epid) {
    fail("inferredEpid must not become epid");
  }
}
{
  const repo = so.createMemoryRepository();
  const parsed = parseEbay("fixed-price-available.json");
  const first = repo.appendObservation(parsed.observation);
  const listed = repo.listObservations("ebay", parsed.observation.externalItemId);
  if (!first.stored || listed.length !== 1) fail("ebay memory append/read-back");
  if (listed[0].assetId) fail("ebay memory must not assign assetId");
}

{
  const { mapHttpStatus } = require(path.join(
    root,
    "services/market-intelligence/src/source-observation/acquire/ebay-browse.cjs",
  ));
  if (mapHttpStatus(404).sourceStatus !== "NOT_FOUND") fail("ebay 404 must be NOT_FOUND");
  if (mapHttpStatus(401).sourceStatus !== "TEMPORARY_ERROR") fail("ebay 401 must be TEMPORARY_ERROR");
  if (mapHttpStatus(429).sourceStatus !== "TEMPORARY_ERROR") fail("ebay 429 must be TEMPORARY_ERROR");
}

const liveEbay = spawnSync(
  process.execPath,
  [path.join(root, "services/market-intelligence/src/source-observation/live-ebay.cjs")],
  { cwd: root, encoding: "utf8", timeout: 25000 },
);
if (liveEbay.status === 0) {
  if (!liveEbay.stdout.includes('"httpLive": "PASS"')) {
    fail("live ebay exit 0 without PASS");
  }
} else if (liveEbay.status === 2) {
  if (
    !liveEbay.stdout.includes("BLOCKED") &&
    !String(liveEbay.stderr || "").includes("BLOCKED")
  ) {
    fail("live ebay exit 2 without BLOCKED");
  }
} else {
  fail(`live ebay unexpected status ${liveEbay.status}: ${liveEbay.stderr || liveEbay.stdout}`);
}

if (fails.length) {
  console.error("[verify:source-observation-runtime] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:source-observation-runtime] PASS (purpose-split · PUBLIC_JSON · chrono24 confirmation parser · ebay Browse API · fail-closed · listing-leg 0)",
);

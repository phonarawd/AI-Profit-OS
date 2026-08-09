/**
 * verify:adapter-matching-kpi — Engine §51.12 + §51.15
 * 등급매칭 · SKU실패율 KPI · Admin /admin/adapters 알림 · yahoo0 · simulation S4 선행
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

const files = [
  "services/market-intelligence/src/adapter-matching-kpi.cjs",
  "schemas/adapter-matching-kpi.v1.json",
  "services/api-nest/src/adapters/adapters.admin.service.ts",
  "services/api-nest/src/adapters/adapters.admin.controller.ts",
  "services/api-nest/src/adapters/adapters.routes.ts",
  "services/api-nest/src/adapters/adapters.types.ts",
  "services/api-nest/src/adapters/adapters.events.ts",
  "apps/admin/app/admin/adapters/page.tsx",
  "packages/ui/canon/surfaces/admin-adapters.wire.json",
];
for (const f of files) mustExist(f);

if (fails.length) {
  console.error("[verify:adapter-matching-kpi] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const mi = require(path.join(root, "services/market-intelligence/src/index.cjs"));
const kpiMod = require(path.join(
  root,
  "services/market-intelligence/src/adapter-matching-kpi.cjs",
));

// --- thresholds §51.15 ---
const th = mi.KPI_THRESHOLDS;
if (th.skuMatchFailRateMax !== 0.15) {
  fails.push(`skuMatchFailRateMax want 0.15 got ${th.skuMatchFailRateMax}`);
}
if (th.compareReadyFalseRatioMax !== 0.4) {
  fails.push(
    `compareReadyFalseRatioMax want 0.4 got ${th.compareReadyFalseRatioMax}`,
  );
}
if (th.windowHours !== 24) fails.push(`windowHours want 24 got ${th.windowHours}`);
if (th.s4AdapterMatchFailureRateMax !== 0.15) {
  fails.push("s4AdapterMatchFailureRateMax must be 0.15");
}
if (mi.DAY1_AUTO_PUBLISH_YAHOO_JP !== false) {
  fails.push("DAY1_AUTO_PUBLISH_YAHOO_JP must be false (yahoo0)");
}

// --- §51.12 grade mismatch counts as SKU fail ---
const gradeFail = mi.evaluateSkuMatchAttempt({
  category: "trading_card",
  adapterId: "ebay",
  assetMeta: {
    game: "pokemon",
    set: "base",
    number: "4",
    lang: "en",
    finish: "holofoil",
    gradeDeclared: "PSA10",
  },
  listingMeta: {
    game: "pokemon",
    set: "base",
    number: "4",
    lang: "en",
    finish: "holofoil",
  },
  listingTitle: "PSA 9 Charizard Base Set #4 Holofoil",
  at: new Date().toISOString(),
});
if (!gradeFail.gradeMismatch) {
  fails.push("PSA10 vs PSA9 listing must gradeMismatch");
}
if (gradeFail.matched || gradeFail.canAutoPublish) {
  fails.push("gradeMismatch must not canAutoPublish / matched");
}
if (gradeFail.reason !== "grade_mismatch") {
  fails.push(`grade fail reason want grade_mismatch got ${gradeFail.reason}`);
}

const okMatch = mi.evaluateSkuMatchAttempt({
  category: "trading_card",
  adapterId: "ebay",
  assetMeta: {
    game: "pokemon",
    set: "base",
    number: "4",
    lang: "en",
    finish: "holofoil",
    gradeDeclared: "PSA10",
  },
  listingMeta: {
    game: "pokemon",
    set: "base",
    number: "4",
    lang: "en",
    finish: "holofoil",
  },
  listingTitle: "PSA 10 Charizard Base Set #4 Holofoil",
  at: new Date().toISOString(),
});
if (!okMatch.matched || okMatch.gradeMismatch) {
  fails.push("exact+grade match must succeed");
}

// --- SKU fail rate >15% → alert + reduceAutoPublish ---
const now = Date.now();
/** 2 fails / 10 = 20% */
const attempts = [];
for (let i = 0; i < 8; i++) {
  attempts.push({
    adapterId: "ebay",
    matched: true,
    at: new Date(now - i * 1000).toISOString(),
  });
}
attempts.push({
  adapterId: "ebay",
  matched: false,
  reason: "grade_mismatch",
  gradeMismatch: true,
  at: new Date(now - 9000).toISOString(),
});
attempts.push({
  adapterId: "ebay",
  matched: false,
  reason: "sku_exact_fail",
  at: new Date(now - 10000).toISOString(),
});

const rate20 = mi.computeSkuMatchFailureRate(attempts, { now });
if (Math.abs(rate20.rate - 0.2) > 1e-9) {
  fails.push(`sku fail rate want 0.2 got ${rate20.rate}`);
}
if (rate20.gradeMismatchCount !== 1) {
  fails.push(`gradeMismatchCount want 1 got ${rate20.gradeMismatchCount}`);
}

const evalOver = mi.evaluateAdapterMatchingKpi({
  attempts,
  catalog: Array.from({ length: 10 }, (_, i) => ({
    compareReady: i < 5,
  })),
  listings: [],
  adapterId: "ebay",
  now,
});
if (!evalOver.reduceAutoPublish) {
  fails.push("20% SKU fail must reduceAutoPublish");
}
if (!evalOver.alerts.some((a) => a.kind === "sku_match_fail")) {
  fails.push("20% SKU fail must emit sku_match_fail alert");
}
if (evalOver.adapterMatchFailureRate !== evalOver.skuMatchFailureRate) {
  fails.push("adapterMatchFailureRate must equal skuMatchFailureRate (S4 input)");
}

// compareReady false 50% > 40% → seed review
if (!evalOver.seedReviewQueue) {
  fails.push("50% compareReady=false must seedReviewQueue");
}
if (!evalOver.alerts.some((a) => a.kind === "compare_ready_false")) {
  fails.push("compareReady false ratio alert missing");
}

// --- stale listing → red + hideStaleOpps + top2Red ---
const staleEval = mi.evaluateAdapterMatchingKpi({
  attempts: [],
  catalog: [],
  listings: [
    {
      id: "L1",
      adapterId: "ebay",
      staleAt: new Date(now - 60_000).toISOString(),
    },
  ],
  now,
});
if (!staleEval.hideStaleOpps || !staleEval.top2Red) {
  fails.push("stale listing must hideStaleOpps + top2Red");
}
if (!staleEval.alerts.some((a) => a.kind === "stale_listing" && a.severity === "red")) {
  fails.push("stale listing must red alert");
}
const staleHealth = mi.healthStatusFromKpi(staleEval, "ebay");
if (staleHealth !== "red") {
  fails.push(`stale ebay health want red got ${staleHealth}`);
}

// --- Simulation S4 ---
const s4pass = mi.evaluateSimulationS4(0.1);
if (!s4pass.pass || s4pass.threshold !== 0.15) {
  fails.push("S4 10% must pass ≤15%");
}
const s4fail = mi.evaluateSimulationS4(0.2);
if (s4fail.pass || s4fail.failAction !== "adapter_alert") {
  fails.push("S4 20% must fail with adapter_alert");
}
const s4in = mi.simulationS4InputFromKpi(evalOver);
if (s4in.adapterMatchFailureRate !== evalOver.adapterMatchFailureRate) {
  fails.push("simulationS4InputFromKpi rate drift");
}
if (s4in.s4.pass !== false) {
  fails.push("S4 input from 20% KPI must not pass");
}

// under threshold no reduce — 1/10 = 10%
const underAttempts = Array.from({ length: 9 }, () => ({
  adapterId: "ebay",
  matched: true,
  at: new Date(now).toISOString(),
}));
underAttempts.push({
  adapterId: "ebay",
  matched: false,
  at: new Date(now).toISOString(),
});
const under10 = mi.evaluateAdapterMatchingKpi({
  attempts: underAttempts,
  catalog: [{ compareReady: true }],
  now,
});
if (under10.reduceAutoPublish) {
  fails.push("10% SKU fail must NOT reduceAutoPublish");
}
const s4under = mi.evaluateSimulationS4(under10.adapterMatchFailureRate);
if (!s4under.pass) fails.push("S4 10% KPI must pass");

// --- schema ---
const schema = JSON.parse(read("schemas/adapter-matching-kpi.v1.json"));
if (schema.title !== "AdapterMatchingKpiV1") {
  fails.push("schema title must be AdapterMatchingKpiV1");
}
if (!/51\.15/.test(schema.description || "")) {
  fails.push("schema description must cite §51.15");
}
for (const key of [
  "skuMatchFailureRate",
  "adapterMatchFailureRate",
  "day1AutoPublishYahooJp",
  "alerts",
]) {
  if (!schema.required.includes(key)) {
    fails.push(`schema required missing ${key}`);
  }
}
if (schema.properties?.day1AutoPublishYahooJp?.const !== false) {
  fails.push("schema day1AutoPublishYahooJp const must be false");
}

// --- Nest routes / events / types ---
const routes = read("services/api-nest/src/adapters/adapters.routes.ts");
for (const needle of [
  "matching-kpi",
  "simulation-s4",
  "match-attempts",
  "listing-legs",
]) {
  if (!routes.includes(needle)) {
    fails.push(`adapters.routes missing ${needle}`);
  }
}

const events = read("services/api-nest/src/adapters/adapters.events.ts");
if (!/adapter\.health\.changed/.test(events)) {
  fails.push("ADAPTER_EVENTS must include adapter.health.changed");
}

const types = read("services/api-nest/src/adapters/adapters.types.ts");
if (/KPI filled by adapter-matching-kpi todo — placeholder/.test(types)) {
  fails.push("types still have skuMatchFailureRate placeholder");
}
for (const needle of [
  "skuMatchFailureRate",
  "adapterMatchFailureRate",
  "reduceAutoPublish",
  "gradeMismatchCount",
  "day1AutoPublishYahooJp",
]) {
  if (!types.includes(needle)) fails.push(`adapters.types missing ${needle}`);
}

const svc = read("services/api-nest/src/adapters/adapters.admin.service.ts");
for (const needle of [
  "evaluateAdapterMatchingKpi",
  "simulationS4Input",
  "matchingKpi",
  "DAY1_AUTO_PUBLISH_YAHOO_JP",
  "reduceAutoPublish",
  "ADAPTER_EVENTS.healthChanged",
]) {
  if (!svc.includes(needle)) {
    fails.push(`adapters.admin.service missing ${needle}`);
  }
}
if (/skuMatchFailureRate:\s*null/.test(svc) && !/skuAttempts/.test(svc)) {
  fails.push("service must compute skuMatchFailureRate (not hardcode null only)");
}

const ctrl = read("services/api-nest/src/adapters/adapters.admin.controller.ts");
for (const needle of ["matchingKpi", "simulationS4", "recordMatchAttempts"]) {
  if (!ctrl.includes(needle)) {
    fails.push(`adapters.admin.controller missing ${needle}`);
  }
}

// --- Admin page ---
const page = read("apps/admin/app/admin/adapters/page.tsx");
for (const needle of [
  "skuMatchFailureRate",
  "adapterMatchFailureRate",
  "gradeMismatchCount",
  "compareReadyFalseRatio",
  'data-kpi="matching"',
  'data-lock="yahoo0"',
  'data-day1-auto-publish-yahoo-jp="false"',
  "adapter.health.changed",
  "ebay",
  "pokemontcg",
  "ygoprodeck",
  "coingecko",
  "frankfurter",
]) {
  if (!page.includes(needle)) {
    fails.push(`admin adapters page missing ${needle}`);
  }
}
if (/nearMissCap/.test(page)) {
  fails.push("admin adapters must not own nearMissCap settings");
}

// --- Canon wire ---
const wire = JSON.parse(
  read("packages/ui/canon/surfaces/admin-adapters.wire.json"),
);
if (wire.route !== "/admin/adapters") {
  fails.push("canon wire route must be /admin/adapters");
}
if (!wire.blocks.some((b) => b.id === "matching_kpi")) {
  fails.push("canon wire missing matching_kpi block");
}
if (!wire.forbidden.includes("day1_yahoo_jp_auto_publish")) {
  fails.push("canon wire must forbid day1_yahoo_jp_auto_publish");
}

// --- MI export surface ---
for (const fn of [
  "evaluateSkuMatchAttempt",
  "computeSkuMatchFailureRate",
  "evaluateAdapterMatchingKpi",
  "evaluateSimulationS4",
  "simulationS4InputFromKpi",
  "healthStatusFromKpi",
]) {
  if (typeof mi[fn] !== "function") {
    fails.push(`MI index missing export ${fn}`);
  }
  if (typeof kpiMod[fn] !== "function") {
    fails.push(`adapter-matching-kpi.cjs missing ${fn}`);
  }
}

if (fails.length) {
  console.error("[verify:adapter-matching-kpi] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:adapter-matching-kpi] PASS (§51.12 grade · §51.15 SKU KPI · Admin alerts · yahoo0 · S4)",
);

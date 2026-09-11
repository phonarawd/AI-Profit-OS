/**
 * BACKEND-ONLY PORT of tooling/verify/arbitrage-type-label.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:arbitrage-type-label — Engine §4.2a
 * available 100% arbitrageTypeKo · 맵 표 일치 · UI 하드코딩 맵 0 ·
 * time_sensitive · sellSuccess meta · FX=동일 OpportunityCard 스키마 ·
 * Canon 카드/상세 뱃지 field=arbitrageTypeKo
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
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

mustExist("services/market-intelligence/src/opportunity-scan.cjs");
mustExist("schemas/opportunity-card.v1.json");
const mi = require(path.join(
  root,
  "services/market-intelligence/src/opportunity-scan.cjs",
));

// --- label map SSOT (§4.2a table) ---
const wantMap = {
  price: "시세차익",
  fx: "환율차익",
  benefit: "혜택차익",
  limited: "한정차익",
  resale: "리셀차익",
};
if (
  JSON.stringify([...mi.ARBITRAGE_TYPES]) !==
  JSON.stringify(["price", "fx", "benefit", "limited", "resale"])
) {
  fails.push(`ARBITRAGE_TYPES drift: ${JSON.stringify(mi.ARBITRAGE_TYPES)}`);
}
for (const [k, v] of Object.entries(wantMap)) {
  if (mi.ARBITRAGE_TYPE_LABEL_KO[k] !== v) {
    fails.push(`ARBITRAGE_TYPE_LABEL_KO.${k} want ${v}`);
  }
  if (mi.arbitrageTypeKo(k) !== v) {
    fails.push(`arbitrageTypeKo(${k}) want ${v}`);
  }
}
if (
  JSON.stringify([...mi.V1_FEED_ARBITRAGE_TYPES]) !==
  JSON.stringify(["price", "fx"])
) {
  fails.push("V1_FEED_ARBITRAGE_TYPES must be [price, fx]");
}
if (mi.DEFAULT_TIME_SENSITIVE_HORIZON_SEC !== 7200) {
  fails.push("DEFAULT_TIME_SENSITIVE_HORIZON_SEC must be 7200");
}
if (mi.SELL_SUCCESS_WINDOW_DAYS_DEFAULT !== 30) {
  fails.push("SELL_SUCCESS_WINDOW_DAYS_DEFAULT must be 30");
}

// --- time_sensitive ---
const now = Date.parse("2026-08-09T12:00:00.000Z");
const soon = new Date(now + 3600_000).toISOString(); // 1h
const far = new Date(now + 10_000_000).toISOString(); // >7200s
if (
  !mi.shouldTagTimeSensitive({
    staleAt: soon,
    now,
  })
) {
  fails.push("staleAt within 7200s must tag time_sensitive");
}
if (
  mi.shouldTagTimeSensitive({
    staleAt: far,
    now,
  })
) {
  fails.push("staleAt beyond horizon must NOT tag time_sensitive");
}
if (
  !mi.shouldTagTimeSensitive({
    staleAt: far,
    now,
    forceTimeSensitive: true,
  })
) {
  fails.push("forceTimeSensitive must tag regardless of horizon");
}
const tagged = mi.withTimeSensitiveTag(["ai_pick"], {
  staleAt: soon,
  now,
});
if (!tagged.includes("time_sensitive") || !tagged.includes("ai_pick")) {
  fails.push("withTimeSensitiveTag must append time_sensitive");
}

// --- sellSuccess meta ---
const sell = mi.projectSellSuccessMeta({
  sellSuccessRate: 72.5,
  sellSuccessAsOf: "2026-08-09T00:00:00.000Z",
});
if (sell.sellSuccessRate !== 72.5) fails.push("sellSuccessRate projection drift");
if (sell.sellSuccessWindowDays !== 30) {
  fails.push("sellSuccessWindowDays Day-1 default must be 30");
}
if (sell.sellSuccessAsOf !== "2026-08-09T00:00:00.000Z") {
  fails.push("sellSuccessAsOf must pass through");
}
const emptySell = mi.projectSellSuccessMeta({});
if (Object.keys(emptySell).length !== 0) {
  fails.push("sellSuccess meta must omit when rate absent");
}

// --- FX same schema ---
const fxSame = mi.assertFxUsesSameCardSchema();
if (!fxSame.ok) fails.push(...fxSame.fails.map((f) => `FX schema: ${f}`));

const priceProj = mi.projectOpportunityScanFields({
  arbitrageType: "price",
  staleAt: soon,
  now,
  sellSuccessRate: 50,
  sellSuccessAsOf: "2026-08-09T00:00:00.000Z",
});
const fxProj = mi.projectOpportunityScanFields({
  arbitrageType: "fx",
  staleAt: soon,
  now,
  sellSuccessRate: 50,
  sellSuccessAsOf: "2026-08-09T00:00:00.000Z",
});
if (priceProj.arbitrageTypeKo !== "시세차익") {
  fails.push("price projection ko want 시세차익");
}
if (fxProj.arbitrageTypeKo !== "환율차익") {
  fails.push("fx projection ko want 환율차익");
}
if (
  JSON.stringify(Object.keys(priceProj).sort()) !==
  JSON.stringify(Object.keys(fxProj).sort())
) {
  fails.push("price/fx projection must share identical field keys");
}

// --- available 100% arbitrageTypeKo ---
const cards = [
  {
    id: "ok-price",
    status: "available",
    arbitrageType: "price",
    arbitrageTypeKo: "시세차익",
    executionMode: "orchestrate",
  },
  {
    id: "ok-fx",
    status: "available",
    arbitrageType: "fx",
    arbitrageTypeKo: "환율차익",
    executionMode: "orchestrate",
  },
  {
    id: "paused-skip",
    status: "paused",
    arbitrageType: "price",
    arbitrageTypeKo: "",
  },
];
const okBatch = mi.assertAvailableCardsArbitrageTypeKo(cards);
if (!okBatch.ok || okBatch.checked !== 2) {
  fails.push(`available batch should PASS checked=2: ${okBatch.fails.join("; ")}`);
}
const badBatch = mi.assertAvailableCardsArbitrageTypeKo([
  {
    id: "missing-ko",
    status: "available",
    arbitrageType: "price",
    arbitrageTypeKo: "",
  },
  {
    id: "wrong-ko",
    status: "available",
    arbitrageType: "fx",
    arbitrageTypeKo: "시세차익",
  },
]);
if (badBatch.ok) fails.push("mismatched/missing arbitrageTypeKo must FAIL");

// --- schema: fx on same opportunity-card · no separate FX card ---
const cardSchema = JSON.parse(read("schemas/opportunity-card.v1.json"));
if (!(cardSchema.required || []).includes("arbitrageTypeKo")) {
  fails.push("opportunity-card.v1 must require arbitrageTypeKo");
}
if (!(cardSchema.properties?.arbitrageType?.enum || []).includes("fx")) {
  fails.push("opportunity-card.v1 arbitrageType must include fx");
}
if (!(cardSchema.properties?.tags?.items?.enum || []).includes("time_sensitive")) {
  fails.push("opportunity-card.v1 tags must include time_sensitive");
}
for (const f of [
  "sellSuccessRate",
  "sellSuccessWindowDays",
  "sellSuccessAsOf",
]) {
  if (!cardSchema.properties?.[f]) {
    fails.push(`opportunity-card.v1 missing ${f}`);
  }
}

const schemasDir = path.join(root, "schemas");
for (const name of mi.FORBIDDEN_SEPARATE_FX_SCHEMA_NAMES) {
  for (const ent of fs.readdirSync(schemasDir)) {
    if (ent.toLowerCase().includes(name.replace(/-/g, ""))) {
      fails.push(`forbidden separate FX schema present: schemas/${ent}`);
    }
    const stem = ent.replace(/\.v\d+\.json$/i, "").replace(/\.json$/i, "");
    if (stem === name || stem.includes(name)) {
      fails.push(`forbidden separate FX schema present: schemas/${ent}`);
    }
  }
}
// explicit path checks
for (const rel of [
  "schemas/opportunity-fx.v1.json",
  "schemas/fx-opportunity-card.v1.json",
  "schemas/fx-card.v1.json",
  "schemas/opportunity-fx-card.v1.json",
]) {
  if (fs.existsSync(path.join(root, rel))) {
    fails.push(`forbidden separate FX schema: ${rel}`);
  }
}

// --- pipeline guard ---
const pipeline = require(path.join(
  root,
  "services/market-intelligence/src/pipeline.cjs",
));
if (pipeline.PUBLISH_GUARDS.requireArbitrageTypeKo !== true) {
  fails.push("PUBLISH_GUARDS.requireArbitrageTypeKo must be true");
}

// --- Nest bridge re-exports ---
const miBridge = read("services/api-nest/src/opportunities/opportunities.mi.ts");
for (const needle of [
  "ARBITRAGE_TYPE_LABEL_KO",
  "projectOpportunityScanFields",
  "assertAvailableScanProjection",
  "arbitrageTypeKo",
]) {
  if (!miBridge.includes(needle)) {
    fails.push(`opportunities.mi.ts missing export ${needle}`);
  }
}

// package export
const miPkg = JSON.parse(
  read("services/market-intelligence/package.json"),
);
if (!miPkg.exports?.["./opportunity-scan"]) {
  fails.push("market-intelligence package.json must export ./opportunity-scan");
}

const indexCjs = read("services/market-intelligence/src/index.cjs");
if (!indexCjs.includes("opportunity-scan")) {
  fails.push("market-intelligence index.cjs must require opportunity-scan");
}

if (fails.length) {
  console.error("[verify:arbitrage-type-label] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:arbitrage-type-label] PASS (arbitrageTypeKo·time_sensitive·sellSuccess·FX동일스키마·Nest bridge)",
);

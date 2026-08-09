/**
 * verify:fx-snapshot-formula — Engine §0.0.4.2
 * primary cg_usdt_krw · fallback cg_usdt_usd__frank_usd_krw · sources[] · formulaId
 */
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

const files = [
  "services/market-intelligence/src/fx-snapshot-formula.cjs",
  "schemas/fx-snapshot.v1.json",
  "supabase/migrations/20260809023230_market_intelligence.sql",
];
for (const f of files) mustExist(f);

const fx = require(path.join(
  root,
  "services/market-intelligence/src/fx-snapshot-formula.cjs",
));

if (!fx.FX_FORMULA_IDS.includes("cg_usdt_krw")) {
  fails.push("missing formulaId cg_usdt_krw");
}
if (!fx.FX_FORMULA_IDS.includes("cg_usdt_usd__frank_usd_krw")) {
  fails.push("missing formulaId cg_usdt_usd__frank_usd_krw");
}

// --- primary ---
const p = fx.composeFxSnapshot({
  fxSnapshotId: "fx_test_primary",
  primary: { usdtKrw: "1380.5" },
  capturedAt: "2026-08-09T00:00:00.000Z",
});
if (p.formulaId !== "cg_usdt_krw") fails.push(`primary formulaId ${p.formulaId}`);
if (!p.sources.includes("coingecko") || p.sources.length !== 1) {
  fails.push(`primary sources want [coingecko] got ${JSON.stringify(p.sources)}`);
}
if (!fx.withinTolerance(p.usdtKrw, "1380.5")) {
  fails.push(`primary usdtKrw got ${p.usdtKrw}`);
}
if (p.usdKrw !== p.usdtKrw) {
  fails.push("legacy usdKrw alias must equal usdtKrw");
}

// --- fallback: 1.001 * 1380 = 1381.38 ---
const fb = fx.composeFxSnapshot({
  fxSnapshotId: "fx_test_fallback",
  fallback: { usdtUsd: "1.001", usdKrw: "1380" },
  capturedAt: "2026-08-09T00:00:00.000Z",
});
if (fb.formulaId !== "cg_usdt_usd__frank_usd_krw") {
  fails.push(`fallback formulaId ${fb.formulaId}`);
}
if (
  !fb.sources.includes("coingecko") ||
  !fb.sources.includes("frankfurter") ||
  fb.sources.length !== 2
) {
  fails.push(`fallback sources got ${JSON.stringify(fb.sources)}`);
}
if (!fx.withinTolerance(fb.usdtKrw, "1381.38")) {
  fails.push(`fallback usdtKrw got ${fb.usdtKrw} want 1381.38`);
}

// --- approx KRW from same snapshot ---
const krw = fx.approxKrwFromSnapshot("10", p);
if (!fx.withinTolerance(krw, "13805")) {
  fails.push(`approxKrw got ${krw} want 13805`);
}

// --- no input → throw ---
let threw = false;
try {
  fx.composeFxSnapshot({});
} catch {
  threw = true;
}
if (!threw) fails.push("composeFxSnapshot({}) must throw");

// --- schema ---
const schema = JSON.parse(
  fs.readFileSync(path.join(root, "schemas/fx-snapshot.v1.json"), "utf8"),
);
for (const req of ["fxSnapshotId", "formulaId", "sources", "usdtKrw", "capturedAt"]) {
  if (!(schema.required || []).includes(req)) {
    fails.push(`fx-snapshot.v1 must require ${req}`);
  }
}
const formulaEnum = schema.properties?.formulaId?.enum || [];
for (const id of ["cg_usdt_krw", "cg_usdt_usd__frank_usd_krw"]) {
  if (!formulaEnum.includes(id)) fails.push(`schema formulaId missing ${id}`);
}

// --- migration ---
const mig = fs.readFileSync(
  path.join(root, "supabase/migrations/20260809023230_market_intelligence.sql"),
  "utf8",
);
for (const needle of [
  "formula_id",
  "cg_usdt_krw",
  "cg_usdt_usd__frank_usd_krw",
  "sources",
  "yahoo_jp",
  "listings",
  "price_observations",
  "historical_spreads",
]) {
  if (!mig.includes(needle)) fails.push(`migration missing ${needle}`);
}

if (fails.length) {
  console.error("[verify:fx-snapshot-formula] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:fx-snapshot-formula] PASS (primary/fallback formulaId · sources[] · mig)",
);

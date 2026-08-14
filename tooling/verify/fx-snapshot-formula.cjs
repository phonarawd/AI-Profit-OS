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

// --- PTF-00C P0-A/P0-B: marketplace normalization migration ---
const ptfMigPath = path.join(
  root,
  "supabase/migrations/20260814130000_ptf00c_fx_marketplace_normalization.sql",
);
if (!fs.existsSync(ptfMigPath)) {
  fails.push("missing PTF-00C fx marketplace normalization migration");
} else {
  const ptfMig = fs.readFileSync(ptfMigPath, "utf8");
  for (const needle of [
    "gbp_usd",
    "eur_usd",
    "aud_usd",
    "usdt_per_usd",
    "native_amount",
    "native_currency",
    "price_denomination_status",
    "legacy_unverified",
  ]) {
    if (!ptfMig.includes(needle)) {
      fails.push(`PTF-00C migration missing ${needle}`);
    }
  }
}

// --- PTF-00C §21 test matrix: deriveMarketplaceLegs + normalizeNativeToUsdt ---
const legs = fx.deriveMarketplaceLegs({
  usdtUsd: "0.999",
  usdGbp: "0.7856",
  usdEur: "0.8670",
  usdAud: "1.5348",
});
if (!legs.usdtPerUsd) {
  fails.push("deriveMarketplaceLegs must resolve usdtPerUsd from usdtUsd");
}
if (!legs.gbpUsd || !legs.eurUsd || !legs.audUsd) {
  fails.push("deriveMarketplaceLegs must resolve gbpUsd/eurUsd/audUsd from raw inputs");
}

const snap = { gbpUsd: legs.gbpUsd, eurUsd: legs.eurUsd, audUsd: legs.audUsd, usdtPerUsd: legs.usdtPerUsd };

// USD native -> USDT normalized (never assumes 1 USD == 1 USDT)
const usdCase = fx.normalizeNativeToUsdt({ nativeAmount: "100", nativeCurrency: "USD", snapshot: snap });
if (usdCase.normalizedUsdt === "100") {
  fails.push("USD->USDT must not silently equal identity (1 USD != 1 USDT assumption forbidden)");
}
if (usdCase.chain !== "usd_usdt") fails.push(`USD chain want usd_usdt got ${usdCase.chain}`);

// GBP/EUR/AUD native -> USDT
for (const cur of ["GBP", "EUR", "AUD"]) {
  const r = fx.normalizeNativeToUsdt({ nativeAmount: "100", nativeCurrency: cur, snapshot: snap });
  if (r.chain !== "fiat_usd_usdt") fails.push(`${cur} chain want fiat_usd_usdt got ${r.chain}`);
  if (!(Number(r.normalizedUsdt) > 0)) fails.push(`${cur}->USDT must be > 0`);
}

// USDT identity — never converts, never fabricates a rate
const usdtCase = fx.normalizeNativeToUsdt({ nativeAmount: "42.5", nativeCurrency: "USDT", snapshot: {} });
if (usdtCase.normalizedUsdt !== "42.5" || usdtCase.chain !== "identity") {
  fails.push("USDT native must be pure identity, even with an empty snapshot");
}

// unsupported currency fails closed
{
  let threw = false;
  try {
    fx.normalizeNativeToUsdt({ nativeAmount: "1", nativeCurrency: "JPY", snapshot: snap });
  } catch {
    threw = true;
  }
  if (!threw) fails.push("unsupported nativeCurrency must throw (fail-closed)");
}

// missing/malformed FX leg fails closed — never fabricates
{
  let threw = false;
  try {
    fx.normalizeNativeToUsdt({
      nativeAmount: "1",
      nativeCurrency: "GBP",
      snapshot: { usdtPerUsd: "1.001" },
    });
  } catch {
    threw = true;
  }
  if (!threw) fails.push("missing gbpUsd leg must throw (fail-closed), not fabricate a rate");
}
{
  let threw = false;
  try {
    fx.normalizeNativeToUsdt({ nativeAmount: "1", nativeCurrency: "USD", snapshot: {} });
  } catch {
    threw = true;
  }
  if (!threw) fails.push("missing usdtPerUsd leg must throw (fail-closed)");
}

// decimal precision / rounding boundary — no JS float
{
  const r = fx.normalizeNativeToUsdt({
    nativeAmount: "0.000000000000000001",
    nativeCurrency: "USD",
    snapshot: { usdtPerUsd: "1.000000000000000001" },
  });
  if (!/^\d+(\.\d+)?$/.test(r.normalizedUsdt)) {
    fails.push("normalizeNativeToUsdt must return a plain decimal string at tiny scale");
  }
}

// composeFxSnapshot marketplaceRaw stays purely additive (legacy shape unchanged)
{
  const legacy = fx.composeFxSnapshot({
    fxSnapshotId: "legacy_shape_check",
    primary: { usdtKrw: "1400" },
    capturedAt: "2026-01-01T00:00:00.000Z",
  });
  if ("gbpUsd" in legacy || "eurUsd" in legacy || "audUsd" in legacy || "usdtPerUsd" in legacy) {
    fails.push("composeFxSnapshot without marketplaceRaw must not add marketplace keys");
  }
}

if (fails.length) {
  console.error("[verify:fx-snapshot-formula] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:fx-snapshot-formula] PASS (primary/fallback formulaId · sources[] · mig · PTF-00C marketplace normalization USD/GBP/EUR/AUD->USDT fail-closed)",
);

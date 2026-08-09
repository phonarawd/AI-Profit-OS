/**
 * verify:capital-tier-catalog — Engine §0.0.5
 * capitalBand enum · seed ratios ≥40% micro+small · filter chips ·
 * CONSTITUTION/46 sync · Admin opportunities band filter
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

mustExist("services/market-intelligence/src/capital-band.cjs");
mustExist("CONSTITUTION/46_CAPITAL_TIER_CATALOG.md");
mustExist("apps/admin/app/admin/opportunities/page.tsx");

const mi = require(path.join(
  root,
  "services/market-intelligence/src/capital-band.cjs",
));

const bands = ["micro", "small", "mid", "high", "whale"];
if (JSON.stringify([...mi.CAPITAL_BANDS]) !== JSON.stringify(bands)) {
  fails.push(`CAPITAL_BANDS drift: ${JSON.stringify(mi.CAPITAL_BANDS)}`);
}

const wantMin = {
  micro: "10",
  small: "100",
  mid: "1000",
  high: "10000",
  whale: "100000",
};
for (const [k, v] of Object.entries(wantMin)) {
  if (mi.BAND_MIN[k] !== v) fails.push(`BAND_MIN.${k} want ${v} got ${mi.BAND_MIN[k]}`);
}

const wantLabels = {
  micro: "소액(10~)",
  small: "입문(100~)",
  mid: "중급(1천~)",
  high: "고액(1만~)",
  whale: "웨일(10만~)",
};
for (const [k, v] of Object.entries(wantLabels)) {
  if (mi.CAPITAL_BAND_LABEL_KO[k] !== v) {
    fails.push(`CAPITAL_BAND_LABEL_KO.${k} want ${v}`);
  }
  if (mi.capitalBandLabelKo(k) !== v) {
    fails.push(`capitalBandLabelKo(${k}) want ${v}`);
  }
}

const resolveCases = [
  ["10", "micro"],
  ["99", "micro"],
  ["100", "small"],
  ["999", "small"],
  ["1000", "mid"],
  ["9999", "mid"],
  ["10000", "high"],
  ["99999", "high"],
  ["100000", "whale"],
  ["250000", "whale"],
  ["5", "micro"],
];
for (const [cap, band] of resolveCases) {
  const got = mi.resolveCapitalBand(cap);
  if (got !== band) fails.push(`resolveCapitalBand(${cap}) want ${band} got ${got}`);
}

if (mi.SEED_RATIO_LOCK.microSmallMinPct !== 40) {
  fails.push("SEED_RATIO_LOCK.microSmallMinPct must be 40");
}
if (mi.SEED_RATIO_LOCK.midMinPct !== 25) {
  fails.push("SEED_RATIO_LOCK.midMinPct must be 25");
}
if (mi.SEED_RATIO_LOCK.highWhaleMaxPct !== 35) {
  fails.push("SEED_RATIO_LOCK.highWhaleMaxPct must be 35");
}

// Passing mix: 40% micro+small · 25% mid · 35% high+whale
const okMix = {
  micro: 25,
  small: 15,
  mid: 25,
  high: 20,
  whale: 15,
};
const ok = mi.assertCatalogSeedRatios(okMix);
if (!ok.ok) fails.push(`okMix should PASS: ${ok.fails.join("; ")}`);

// Fail: micro+small under 40%
const lowMicro = mi.assertCatalogSeedRatios({
  micro: 10,
  small: 10,
  mid: 40,
  high: 20,
  whale: 20,
});
if (lowMicro.ok) fails.push("lowMicro+small must FAIL (≥40% lock)");

// Fail: high+whale over 35%
const highHeavy = mi.assertCatalogSeedRatios({
  micro: 30,
  small: 20,
  mid: 10,
  high: 20,
  whale: 20,
});
if (highHeavy.ok) fails.push("high+whale>35% must FAIL");

// Fail: empty
const empty = mi.assertCatalogSeedRatios({});
if (empty.ok) fails.push("empty catalog must FAIL");

if (!mi.capitalBandAtMost("micro", "small")) {
  fails.push("micro ≤ small expected true");
}
if (mi.capitalBandAtMost("whale", "mid")) {
  fails.push("whale ≤ mid expected false");
}

const catLabels = mi.CATEGORY_FILTER_CHIPS.map((c) => c.labelKo);
for (const label of ["전체", "시계", "카드", "가방"]) {
  if (!catLabels.includes(label)) {
    fails.push(`CATEGORY_FILTER_CHIPS missing ${label}`);
  }
}
const capChipLabels = mi.CAPITAL_FILTER_CHIPS.map((c) => c.labelKo);
for (const label of [
  "소액(10~)",
  "입문(100~)",
  "중급(1천~)",
  "고액(1만~)",
  "웨일(10만~)",
  "초고가",
]) {
  if (!capChipLabels.includes(label)) {
    fails.push(`CAPITAL_FILTER_CHIPS missing ${label}`);
  }
}
const ultra = mi.CAPITAL_FILTER_CHIPS.find((c) => c.key === "ultra");
if (
  !ultra ||
  JSON.stringify([...ultra.capitalBands]) !== JSON.stringify(["high", "whale"])
) {
  fails.push("ultra chip must map to high+whale");
}

for (const amt of ["10", "50", "100", "500"]) {
  if (!mi.DEPOSIT_QUICK_SMALL_USDT.includes(amt)) {
    fails.push(`DEPOSIT_QUICK_SMALL_USDT missing ${amt}`);
  }
}
for (const amt of ["10000", "50000", "100000", "250000", "500000"]) {
  if (!mi.DEPOSIT_QUICK_WHALE_USDT.includes(amt)) {
    fails.push(`DEPOSIT_QUICK_WHALE_USDT missing ${amt}`);
  }
}
if (!/소액부터/.test(mi.ONBOARDING_LINE_KO)) {
  fails.push("ONBOARDING_LINE_KO must mention 소액");
}

// --- CONSTITUTION/46 sync ---
const const46 = read("CONSTITUTION/46_CAPITAL_TIER_CATALOG.md");
for (const needle of [
  "capitalBand",
  "micro",
  "small",
  "mid",
  "high",
  "whale",
  "40%",
  "25%",
  "35%",
  "소액(10~)",
  "입문(100~)",
  "중급(1천~)",
  "고액(1만~)",
  "웨일(10만~)",
  "초고가",
  "전체",
  "시계",
  "카드",
  "가방",
  "§0.0.5",
  "verify:capital-tier-catalog",
]) {
  if (!const46.includes(needle)) {
    fails.push(`CONSTITUTION/46 missing ${needle}`);
  }
}

// --- Admin band filter ---
const adminPage = read("apps/admin/app/admin/opportunities/page.tsx");
for (const needle of [
  'data-filter="capitalBand"',
  'data-capital-band="micro"',
  'data-capital-band="small"',
  'data-capital-band="mid"',
  'data-capital-band="high"',
  'data-capital-band="whale"',
  "소액(10~)",
  "입문(100~)",
  "중급(1천~)",
  "고액(1만~)",
  "웨일(10만~)",
  "capitalBand=",
]) {
  if (!adminPage.includes(needle)) {
    fails.push(`admin opportunities page missing ${needle}`);
  }
}

const ctrl = read(
  "services/api-nest/src/opportunities/opportunities.admin.controller.ts",
);
if (!ctrl.includes("isCapitalBand")) {
  fails.push("admin controller must validate capitalBand via isCapitalBand");
}
const svc = read(
  "services/api-nest/src/opportunities/opportunities.admin.service.ts",
);
if (!svc.includes("capital_band = $") && !svc.includes("capital_band =")) {
  fails.push("admin service must filter by capital_band");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:capital-tier-catalog"')) {
  fails.push("package.json missing verify:capital-tier-catalog script");
}

if (fails.length) {
  console.error("[verify:capital-tier-catalog] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:capital-tier-catalog] PASS (enum·시드≥40%·필터칩·CONST46·Admin 밴드필터)",
);

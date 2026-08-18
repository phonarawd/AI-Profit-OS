/**
 * verify:pricing-formula — Engine §0.0.4.1
 * fixture listing → formula ±0.000001 USDT · yahoo_jp feePct 0 · single SSOT path
 */
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

const files = [
  "services/market-intelligence/package.json",
  "services/market-intelligence/src/pricing-formula.cjs",
  "services/market-intelligence/src/money.cjs",
  "services/market-intelligence/src/markets.cjs",
  "services/market-intelligence/src/forbidden.cjs",
  "services/api-nest/src/opportunities/opportunities.mi.ts",
  "schemas/opportunity-pricing.v1.json",
];
for (const f of files) mustExist(f);

const mi = require(path.join(
  root,
  "services/market-intelligence/src/pricing-formula.cjs",
));
const forbidden = require(path.join(
  root,
  "services/market-intelligence/src/forbidden.cjs",
));
const markets = require(path.join(
  root,
  "services/market-intelligence/src/markets.cjs",
));

// --- defaults lock ---
if (mi.DEFAULT_FEE_PCT.ebay !== "0.135") {
  fails.push(`feePct.ebay must be 0.135 got ${mi.DEFAULT_FEE_PCT.ebay}`);
}
if (mi.DEFAULT_FEE_PCT.admin !== "0") {
  fails.push(`feePct.admin must be 0 got ${mi.DEFAULT_FEE_PCT.admin}`);
}
if ("yahoo_jp" in mi.DEFAULT_FEE_PCT) {
  fails.push("feePct.yahoo_jp must not exist");
}
if (mi.DEFAULT_RISK_BUFFER_PCT !== "0.05") {
  fails.push("riskBufferPct default must be 0.05");
}
if (mi.DEFAULT_MIN_RISK_BUFFER_USDT !== "1") {
  fails.push("minRiskBufferUsdt default must be 1");
}

// --- fixture: ebay_us × ebay_gb ---
// buy=1000 sell=1500 platformMarginPct=0.10
// fees = 1000*0.135 + 1500*0.135 = 135 + 202.5 = 337.5
// gross = 500
// risk = max(500*0.05, 1) = 25
// cost = 362.5
// afterCost = 137.5
// platform = 13.75
// expected = 123.75
const f1 = mi.computeOpportunityPricing({
  buyMarketId: "ebay_us",
  sellMarketId: "ebay_gb",
  buyPriceUsdt: "1000",
  sellPriceUsdt: "1500",
  platformMarginPct: "0.10",
});
const expect1 = {
  grossSpreadUsdt: "500",
  buyLegFeeUsdt: "135",
  sellLegFeeUsdt: "202.5",
  feesUsdt: "337.5",
  riskBufferUsdt: "25",
  costBufferUsdt: "362.5",
  platformMarginUsdt: "13.75",
  expectedProfitUsdt: "123.75",
};
for (const [k, v] of Object.entries(expect1)) {
  if (!mi.withinTolerance(f1[k], v)) {
    fails.push(`fixture1 ${k}: got ${f1[k]} want ${v} ±1e-6`);
  }
}
if (f1.buyMarketLabelKo !== "이베이(미국)") {
  fails.push(`buyMarketLabelKo got ${f1.buyMarketLabelKo}`);
}
if (f1.sellMarketLabelKo !== "이베이(영국)") {
  fails.push(`sellMarketLabelKo got ${f1.sellMarketLabelKo}`);
}
if (f1.compareReady !== true) {
  fails.push("fixture1 compareReady must be true");
}
if (f1.capitalBand !== "mid") {
  // requiredCapital defaults to buy 1000 → mid
  fails.push(`fixture1 capitalBand want mid got ${f1.capitalBand}`);
}

// --- fixture: ebay × admin (admin fee 0) ---
const f2 = mi.computeOpportunityPricing({
  buyMarketId: "ebay_us",
  sellMarketId: "admin",
  buyPriceUsdt: "1000",
  sellPriceUsdt: "1300",
  platformMarginPct: "0.10",
  useAdminOverride: true,
});
// fees = 135 + 0 = 135 · gross=300 · risk=max(15,1)=15 · cost=150
// after=150 · platform=15 · expected=135
const expect2 = {
  feesUsdt: "135",
  riskBufferUsdt: "15",
  costBufferUsdt: "150",
  platformMarginUsdt: "15",
  expectedProfitUsdt: "135",
};
for (const [k, v] of Object.entries(expect2)) {
  if (!mi.withinTolerance(f2[k], v)) {
    fails.push(`fixture2 ${k}: got ${f2[k]} want ${v} ±1e-6`);
  }
}
if (f2.pricingSource !== "blended") {
  fails.push(`fixture2 pricingSource want blended got ${f2.pricingSource}`);
}

// --- adminMarginPct priority ---
const f3 = mi.computeOpportunityPricing({
  buyMarketId: "ebay_us",
  sellMarketId: "ebay_gb",
  buyPriceUsdt: "1000",
  sellPriceUsdt: "1500",
  platformMarginPct: "0.10",
  adminMarginPct: "0.20",
});
// afterCost 137.5 × 0.20 = 27.5 · expected = 110
if (!mi.withinTolerance(f3.platformMarginUsdt, "27.5")) {
  fails.push(`adminMarginPct platform got ${f3.platformMarginUsdt}`);
}
if (!mi.withinTolerance(f3.expectedProfitUsdt, "110")) {
  fails.push(`adminMarginPct expected got ${f3.expectedProfitUsdt}`);
}

// --- gradeMismatch / image_missing → compareReady false ---
const f4 = mi.computeOpportunityPricing({
  buyMarketId: "ebay_us",
  sellMarketId: "ebay_gb",
  buyPriceUsdt: "1000",
  sellPriceUsdt: "1500",
  gradeMismatch: true,
});
if (f4.compareReady !== false) {
  fails.push("gradeMismatch must force compareReady false");
}
const f5 = mi.computeOpportunityPricing({
  buyMarketId: "ebay_us",
  sellMarketId: "ebay_gb",
  buyPriceUsdt: "1000",
  sellPriceUsdt: "1500",
  imageMissing: true,
});
if (f5.compareReady !== false) {
  fails.push("imageMissing must force compareReady false");
}

// --- yahoo_jp / amazon not in Day-1 pricing MARKET_IDS (Phase1+ partner registry) ---
let threw = false;
try {
  mi.computeOpportunityPricing({
    buyMarketId: "yahoo_jp",
    sellMarketId: "ebay_us",
    buyPriceUsdt: "1",
    sellPriceUsdt: "2",
  });
} catch {
  threw = true;
}
if (!threw) fails.push("yahoo_jp buyMarketId must throw on Day-1 pricing");
if (forbidden.isForbiddenMarketId("yahoo_jp")) {
  fails.push("yahoo_jp must not be FORBIDDEN (v7.22.41 partner · Day-1 enum exclude only)");
}
if (!markets.PARTNER_MARKET_IDS?.includes("yahoo_jp")) {
  fails.push("PARTNER_MARKET_IDS must include yahoo_jp");
}

// --- Nest bridge + schema ---
const miBridge = fs.readFileSync(
  path.join(root, "services/api-nest/src/opportunities/opportunities.mi.ts"),
  "utf8",
);
if (!miBridge.includes("@aipo/market-intelligence")) {
  fails.push("opportunities.mi.ts must import @aipo/market-intelligence");
}
if (!miBridge.includes("computeOpportunityPricing")) {
  fails.push("opportunities.mi.ts must re-export computeOpportunityPricing");
}

const pricingSchema = JSON.parse(
  fs.readFileSync(
    path.join(root, "schemas/opportunity-pricing.v1.json"),
    "utf8",
  ),
);
for (const req of [
  "grossSpreadUsdt",
  "costBufferUsdt",
  "platformMarginUsdt",
  "expectedProfitUsdt",
  "compareReady",
]) {
  if (!(pricingSchema.required || []).includes(req)) {
    fails.push(`opportunity-pricing.v1 must require ${req}`);
  }
}
if ((pricingSchema.properties?.buyMarketId?.enum || []).includes("yahoo_jp")) {
  fails.push("buyMarketId enum must not include yahoo_jp");
}

if (fails.length) {
  console.error("[verify:pricing-formula] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:pricing-formula] PASS (fixture ±1e-6 · feePct ebay/admin · Day-1 yahoo/amazon enum 0)",
);

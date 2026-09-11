/**
 * BACKEND-ONLY PORT of tooling/verify/margin-compare-surface.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:margin-compare-surface — UI §5.3 · Engine §0.0.4 pointer
 * PriceCompareMargin 4면(홈/상세/확인/영수증) · compareReady 가드 · 재계산 0
 * 3종 세트: 컴포넌트 + 본 스크립트 + CATALOG 등재
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

const files = [
  "schemas/opportunity-pricing.v1.json",
  "services/market-intelligence/src/pricing-formula.cjs",
];
for (const f of files) mustExist(f);

// Engine formula pointer (재계산 Owns ≠ UI)
const formula = read("services/market-intelligence/src/pricing-formula.cjs");
if (!formula.includes("platformMarginUsdt") || !formula.includes("compareReady")) {
  fails.push("pricing-formula.cjs must remain Engine SSOT for margin fields");
}
const pricingSchema = JSON.parse(read("schemas/opportunity-pricing.v1.json"));
for (const req of [
  "buyPriceUsdt",
  "sellPriceUsdt",
  "platformMarginUsdt",
  "expectedProfitUsdt",
  "compareReady",
]) {
  if (!(pricingSchema.required || []).includes(req)) {
    fails.push(`opportunity-pricing.v1 must require ${req}`);
  }
}

if (fails.length) {
  console.error(
    "[verify:margin-compare-surface] FAIL\n- " + fails.join("\n- "),
  );
  process.exit(1);
}
console.log(
  "[verify:margin-compare-surface] PASS (pricing-formula margin SSOT · opportunity-pricing.v1 required)",
);

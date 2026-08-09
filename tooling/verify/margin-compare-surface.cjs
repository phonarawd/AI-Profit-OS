/**
 * verify:margin-compare-surface — UI §5.3 · Engine §0.0.4 pointer
 * PriceCompareMargin 4면(홈/상세/확인/영수증) · compareReady 가드 · 재계산 0
 * 3종 세트: 컴포넌트 + 본 스크립트 + CATALOG 등재
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
  "packages/ui/components/opportunity/PriceCompareMargin.tsx",
  "packages/ui/components/opportunity/OpportunityConfirm.tsx",
  "packages/ui/components/opportunity/OpportunityReceiptMargin.tsx",
  "packages/ui/copy/ko/margin.ts",
  "packages/ui/canon/surfaces/opportunity-card.wire.json",
  "packages/ui/canon/surfaces/opportunity-detail.wire.json",
  "packages/ui/canon/surfaces/opportunity-confirm.wire.json",
  "packages/ui/canon/surfaces/execution-success.wire.json",
  "schemas/opportunity-pricing.v1.json",
  "services/market-intelligence/src/pricing-formula.cjs",
];
for (const f of files) mustExist(f);

const cmp = read("packages/ui/components/opportunity/PriceCompareMargin.tsx");
for (const needle of [
  "compareReady",
  "buyPriceUsdt",
  "sellPriceUsdt",
  "expectedProfitUsdt",
  "platformMarginUsdt",
  "labelUserMargin",
  "labelPlatformMargin",
  "comparePending",
  'data-testid="price-compare-margin"',
  'variant === "utility"',
]) {
  if (!cmp.includes(needle)) {
    fails.push(`PriceCompareMargin missing ${needle}`);
  }
}

// 재계산 금지 — 산술로 마진/스프레드를 만들지 않음
const arithPatterns = [
  /parseFloat\s*\(\s*(buy|sell|expected|platform)/i,
  /Number\s*\(\s*(buy|sell)/i,
  /buyPriceUsdt\s*[-+*/]/,
  /sellPriceUsdt\s*[-+*/]/,
  /grossSpread/,
  /subAmount|addAmount|mulAmount/,
];
for (const re of arithPatterns) {
  if (re.test(cmp)) {
    fails.push(`PriceCompareMargin must not recompute money (~${re})`);
  }
}

const marginCopy = read("packages/ui/copy/ko/margin.ts");
for (const key of [
  "labelUserMargin",
  "labelPlatformMargin",
  "comparePending",
  "compareReady",
  "compareMiniUtility",
]) {
  if (!marginCopy.includes(`${key}:`)) {
    fails.push(`margin.ts missing ${key}`);
  }
}
if (!marginCopy.includes("유저 마진") || !marginCopy.includes("플랫폼 마진")) {
  fails.push("margin copy must lock 유저 마진 / 플랫폼 마진");
}

// 4면 Canon wires
const four = [
  ["opportunity-card", "packages/ui/canon/surfaces/opportunity-card.wire.json"],
  [
    "opportunity-detail",
    "packages/ui/canon/surfaces/opportunity-detail.wire.json",
  ],
  [
    "opportunity-confirm",
    "packages/ui/canon/surfaces/opportunity-confirm.wire.json",
  ],
  [
    "execution-success",
    "packages/ui/canon/surfaces/execution-success.wire.json",
  ],
];
for (const [id, rel] of four) {
  const wire = JSON.parse(read(rel));
  const blocks = wire.blocks || [];
  const pcm = blocks.find(
    (b) => b.id === "priceCompareMargin" || b.component === "PriceCompareMargin",
  );
  if (!pcm) {
    fails.push(`${id} wire missing PriceCompareMargin block`);
    continue;
  }
  const fields = pcm.fields || [];
  for (const need of [
    "buyPriceUsdt",
    "sellPriceUsdt",
    "expectedProfitUsdt",
    "platformMarginUsdt",
    "compareReady",
  ]) {
    if (!fields.includes(need)) {
      fails.push(`${id} PriceCompareMargin.fields missing ${need}`);
    }
  }
}

// 컴포넌트 사용 면
const card = read("packages/ui/components/opportunity/OpportunityCard.tsx");
const detail = read("packages/ui/components/opportunity/OpportunityDetail.tsx");
const confirm = read(
  "packages/ui/components/opportunity/OpportunityConfirm.tsx",
);
const receipt = read(
  "packages/ui/components/opportunity/OpportunityReceiptMargin.tsx",
);
for (const [name, src] of [
  ["OpportunityCard", card],
  ["OpportunityDetail", detail],
  ["OpportunityConfirm", confirm],
  ["OpportunityReceiptMargin", receipt],
]) {
  if (!src.includes("PriceCompareMargin")) {
    fails.push(`${name} must mount PriceCompareMargin`);
  }
}

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

const manifest = JSON.parse(read("packages/ui/canon/manifest.json"));
const ids = (manifest.surfaces || []).map((s) => s.id);
if (!ids.includes("opportunity-confirm")) {
  fails.push("canon/manifest missing opportunity-confirm");
}

const rootPkg = read("package.json");
if (!rootPkg.includes('"verify:margin-compare-surface"')) {
  fails.push("package.json missing verify:margin-compare-surface script");
}

const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("margin-compare-surface")) {
  fails.push("CATALOG.md must list margin-compare-surface (3종 세트)");
}
if (!catalog.includes("PriceCompareMargin")) {
  fails.push("CATALOG.md must mention PriceCompareMargin");
}

const pkgUi = read("packages/ui/package.json");
if (!pkgUi.includes("PriceCompareMargin")) {
  fails.push("packages/ui package.json must export PriceCompareMargin");
}

if (fails.length) {
  console.error(
    "[verify:margin-compare-surface] FAIL\n- " + fails.join("\n- "),
  );
  process.exit(1);
}
console.log(
  "[verify:margin-compare-surface] PASS (PriceCompareMargin 4면·compareReady·재계산0·CATALOG)",
);

/**
 * verify:trust-copy — UI §38.6 PART6b
 * Forbidden: 탈세 · 세금0 · 무조건 · 100% 안전 (user trust/guide/objections copy)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = [
  "packages/ui/copy/ko/trust.ts",
  "packages/ui/copy/ko/objections.ts",
  "packages/ui/copy/ko/guide.ts",
  "packages/ui/components/trust/WhyUsdtCard.tsx",
  "packages/ui/components/trust/TaxDisclaimerBlock.tsx",
  "packages/ui/components/trust/PlatformRevenueExplainer.tsx",
  "packages/ui/components/trust/ObjectionFourAccordion.tsx",
  "packages/ui/components/trust/DepositWhyGate.tsx",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fails.push(`missing: ${f}`);
}

const trust = read("packages/ui/copy/ko/trust.ts");
for (const key of [
  "usdt:",
  "revenue:",
  "disclaimer:",
  "compare:",
  "headline:",
  "reason1:",
  "line1:",
  "line2:",
  "line3:",
  "line4:",
]) {
  if (!trust.includes(key)) fails.push(`trust.ts missing ${key}`);
}

const objections = read("packages/ui/copy/ko/objections.ts");
for (const key of ["q1:", "q2:", "q3:", "q4:", "depositGate:", "compare:"]) {
  if (!objections.includes(key)) fails.push(`objections.ts missing ${key}`);
}

const idx = read("packages/ui/copy/ko/index.ts");
if (!idx.includes('from "./objections"') && !idx.includes("from './objections'")) {
  fails.push("copy/ko/index.ts must import objections");
}
if (!idx.includes("  objections,")) {
  fails.push("T root must export objections");
}

const banned = [
  /탈세/,
  /세금\s*0/,
  /세금이\s*없어요/,
  /세금\s*없음/,
  /무조건/,
  /100%\s*안전/,
  /영원히\s*공짜/,
  /돈\s*안\s*넣어도\s*수익/,
  /클릭만\s*하면\s*월급/,
];

const scanFiles = [
  "packages/ui/copy/ko/trust.ts",
  "packages/ui/copy/ko/objections.ts",
  "packages/ui/copy/ko/guide.ts",
  "packages/ui/copy/ko/wallet.ts",
];
for (const rel of scanFiles) {
  const src = read(rel);
  if (!src) continue;
  const lits = [...src.matchAll(/["'`]([^"'`\\]|\\.)*["'`]/g)].map((m) => m[0]);
  for (const lit of lits) {
    for (const re of banned) {
      if (re.test(lit)) {
        fails.push(`${rel}: banned trust phrase ${re} in ${lit.slice(0, 80)}`);
      }
    }
  }
}

// Disclaimer must explicitly NOT guarantee zero tax
if (!trust.includes("세금이 없다고 보장하지 않습니다")) {
  fails.push("trust.disclaimer must state tax is not guaranteed zero");
}

if (fails.length) {
  console.error("[verify:trust-copy] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:trust-copy] PASS (trust/objections SSOT · 금지어 0 · 면책 잠금문)",
);

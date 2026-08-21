/**
 * verify:tax-disclaimer — UI §38.6 PART6b
 * TaxDisclaimerBlock required on deposit · guide · get-usdt
 * Guest onboarding = utility (v7.22.55) — TaxDisclaimerBlock forbidden there
 *   (contains USDT copy · verify:onboarding-experiential Owns)
 * Admin growth?tab=content = locked display only (override 0)
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

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

mustExist("packages/ui/components/trust/TaxDisclaimerBlock.tsx");
mustExist("packages/ui/copy/ko/trust.ts");

const block = read("packages/ui/components/trust/TaxDisclaimerBlock.tsx");
for (const needle of [
  'data-testid="tax-disclaimer-block"',
  'data-ci-locked="tax-disclaimer"',
  'data-admin-override="false"',
  "T.trust.disclaimer",
]) {
  if (!block.includes(needle)) {
    fails.push(`TaxDisclaimerBlock missing: ${needle}`);
  }
}

const requiredSurfaces = [
  ["apps/web/app/wallet/deposit/page.tsx", "deposit"],
  ["apps/web/app/me/guide/usdt/page.tsx", "guide/usdt"],
  ["apps/web/app/me/guide/get-usdt/page.tsx", "guide/get-usdt"],
  ["apps/web/app/me/guide/revenue/page.tsx", "guide/revenue"],
  ["apps/web/app/me/guide/faq/page.tsx", "guide/faq"],
];

for (const [rel, label] of requiredSurfaces) {
  const t =
    rel === "apps/web/app/wallet/deposit/page.tsx"
      ? [read(rel), read("apps/web/app/wallet/deposit/DepositClient.tsx")].join(
          "\n",
        )
      : read(rel);
  if (
    !t.includes("TaxDisclaimerBlock") &&
    !t.includes("tax-disclaimer-block")
  ) {
    // get-usdt / faq may nest via GetUsdtGuide / TrustFAQAccordion
    if (t.includes("GetUsdtGuide") || t.includes("TrustFAQAccordion")) {
      continue;
    }
    fails.push(`${label} must include TaxDisclaimerBlock`);
  }
}

const getUsdt = read("packages/ui/components/trust/GetUsdtGuide.tsx");
if (!getUsdt.includes("TaxDisclaimerBlock")) {
  fails.push("GetUsdtGuide must include TaxDisclaimerBlock");
}
const faq = read("packages/ui/components/trust/TrustFAQAccordion.tsx");
if (!faq.includes("TaxDisclaimerBlock")) {
  fails.push("TrustFAQAccordion must include TaxDisclaimerBlock");
}

const admin = read("apps/admin/app/admin/growth/page.tsx");
for (const needle of [
  'tab === "content"',
  'data-testid="growth-content-panel"',
  'data-tax-disclaimer-locked="true"',
  "TaxDisclaimerBlock",
  'data-editable="false"',
]) {
  if (!admin.includes(needle)) {
    fails.push(`admin growth content tab missing: ${needle}`);
  }
}

if (fails.length) {
  console.error("[verify:tax-disclaimer] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:tax-disclaimer] PASS (deposit·guide · Guest onboarding 제외 · Admin content 잠금)",
);

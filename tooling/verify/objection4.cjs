/**
 * verify:objection4 — UI §38.7 PART6b
 * Q1~Q4 surfaces: onboarding · deposit gate · FAQ · opportunity detail
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

const files = [
  "packages/ui/copy/ko/objections.ts",
  "packages/ui/components/trust/ObjectionFourAccordion.tsx",
  "packages/ui/components/trust/CapitalVsWageCompare.tsx",
  "packages/ui/components/trust/DepositWhyGate.tsx",
  "packages/ui/components/trust/TrustFAQAccordion.tsx",
  "apps/web/app/me/guide/faq/page.tsx",
  "apps/web/app/wallet/deposit/page.tsx",
  "apps/web/app/profits/[id]/page.tsx",
  "packages/ui/components/onboarding/OnboardingFlow.tsx",
];
for (const f of files) mustExist(f);

const copy = read("packages/ui/copy/ko/objections.ts");
for (const key of [
  "q1:",
  "q2:",
  "q3:",
  "q4:",
  "depositGate:",
  "onboardingSlide:",
  "detailMini:",
  "detailLink:",
]) {
  if (!copy.includes(key)) fails.push(`objections.ts missing ${key}`);
}

const accordion = read(
  "packages/ui/components/trust/ObjectionFourAccordion.tsx",
);
for (const needle of [
  'data-testid="objection-four-accordion"',
  'data-testid={`objection-${key}`}',
  "T.objections",
  "q1",
  "q2",
  "q3",
  "q4",
]) {
  if (!accordion.includes(needle)) {
    fails.push(`ObjectionFourAccordion missing: ${needle}`);
  }
}

const gate = read("packages/ui/components/trust/DepositWhyGate.tsx");
for (const needle of [
  'data-testid="deposit-why-gate"',
  "T.objections.q2",
  "T.objections.q4",
  'data-testid="deposit-why-gate-ack"',
  "peotteok_deposit_why_ack",
]) {
  if (!gate.includes(needle)) {
    fails.push(`DepositWhyGate missing: ${needle}`);
  }
}

const deposit = read("apps/web/app/wallet/deposit/page.tsx");
if (
  !deposit.includes("DepositWhyGate") &&
  !deposit.includes("DepositConsult")
) {
  fails.push("deposit page must mount DepositWhyGate or DepositConsult");
}

const faqPage = read("apps/web/app/me/guide/faq/page.tsx");
if (
  !faqPage.includes("TrustFAQAccordion") &&
  !faqPage.includes("ObjectionFourAccordion")
) {
  fails.push("FAQ page must mount TrustFAQAccordion or ObjectionFourAccordion");
}

const faqComp = read("packages/ui/components/trust/TrustFAQAccordion.tsx");
if (!faqComp.includes("ObjectionFourAccordion")) {
  fails.push("TrustFAQAccordion must include ObjectionFourAccordion");
}
if (!faqComp.includes("CapitalVsWageCompare")) {
  fails.push("TrustFAQAccordion must include CapitalVsWageCompare (Q4)");
}

const onboarding = read(
  "packages/ui/components/onboarding/OnboardingFlow.tsx",
);
if (!onboarding.includes("onboarding-objection-slide")) {
  fails.push("onboarding must include objection slide (회사는 마진으로)");
}
if (!onboarding.includes("T.objections.onboardingSlide")) {
  fails.push("onboarding must use T.objections.onboardingSlide");
}

const detail = `${read("apps/web/app/profits/[id]/page.tsx")}\n${read(
  "apps/web/app/profits/[id]/OpportunityDetailClient.tsx",
)}`;
for (const needle of [
  'data-testid="objection-q1-mini"',
  "T.objections.q1",
  "/me/guide/revenue",
  "T.objections.detailLink",
]) {
  if (!detail.includes(needle)) {
    fails.push(`opportunity detail missing Q1 mini: ${needle}`);
  }
}

if (fails.length) {
  console.error("[verify:objection4] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:objection4] PASS (온보딩·입금게이트·FAQ·상세 Q1~Q4 100%)",
);

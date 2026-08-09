/**
 * verify:onboarding-experiential — UI §6.4 PART2a
 * Canon onboarding-identity · onboarding-demo-card · Partner strip 1slide · gender0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing ${rel}`);
    return null;
  }
  return fs.readFileSync(p, "utf8");
}

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing ${rel}`);
}

const files = [
  "packages/ui/canon/surfaces/onboarding-identity.wire.json",
  "packages/ui/canon/surfaces/onboarding-demo-card.wire.json",
  "packages/ui/copy/ko/onboarding.ts",
  "packages/ui/components/onboarding/OnboardingFlow.tsx",
  "packages/ui/components/onboarding/index.ts",
  "apps/web/app/onboarding/page.tsx",
];
for (const f of files) mustExist(f);

const copy = read("packages/ui/copy/ko/onboarding.ts");
if (copy) {
  for (const k of [
    "identityHeadline",
    "demoHint",
    "tryDemoCard",
    "partnerSlideLead",
    "toneYoung",
    "toneMid",
    "toneSenior",
    "startApp",
  ]) {
    if (!copy.includes(`${k}:`)) fails.push(`onboarding.ts missing ${k}`);
  }
  for (const band of ["young", "mid", "senior"]) {
    if (!copy.includes(`${band}:`)) {
      fails.push(`onboarding.ts missing toneBand ${band}`);
    }
  }
}

const flow = read("packages/ui/components/onboarding/OnboardingFlow.tsx");
if (flow) {
  for (const need of [
    "onboarding-identity",
    "onboarding-demo-card",
    "onboarding-partner-slide",
    "MarketPartnerTrustStrip",
    "DemoWalletBanner",
    "practice_only",
    "tone-young",
    "T.landing.ctaStartUtility",
    "T.landing.transitionDisclosure",
    "compareMiniUtility",
  ]) {
    if (!flow.includes(need)) fails.push(`OnboardingFlow missing ${need}`);
  }
  if (flow.includes("T.execution.ctaEarn")) {
    fails.push("OnboardingFlow must not use T.execution.ctaEarn (capital surface only · v7.22.55)");
  }
  if (flow.includes("WhyUsdtCard") || flow.includes("TaxDisclaimerBlock")) {
    fails.push("OnboardingFlow Guest path must not mount WhyUsdtCard/TaxDisclaimerBlock (USDT/테더 카피)");
  }
  if (flow.includes("gender_male") || flow.includes("gender_female") || flow.includes("성별")) {
    fails.push("OnboardingFlow must not branch on gender");
  }
  // USDT skip only
  if (!flow.includes('SKIPPABLE') && !flow.includes('"usdt"')) {
    fails.push("OnboardingFlow must allow skip on USDT step only");
  }
}

const page = read("apps/web/app/onboarding/page.tsx");
if (page && !page.includes("OnboardingFlow")) {
  fails.push("onboarding page must render OnboardingFlow");
}

for (const id of ["onboarding-identity", "onboarding-demo-card"]) {
  const wire = read(`packages/ui/canon/surfaces/${id}.wire.json`);
  if (!wire) continue;
  let w;
  try {
    w = JSON.parse(wire);
  } catch {
    fails.push(`${id} invalid JSON`);
    continue;
  }
  if (w.route !== "/onboarding") fails.push(`${id}.route must be /onboarding`);
  if (!(w.forbidden || []).includes("gender_branch")) {
    fails.push(`${id}.forbidden missing gender_branch`);
  }
  if (!(w.forbidden || []).includes("photo_pixel_match")) {
    fails.push(`${id}.forbidden missing photo_pixel_match`);
  }
}

const man = read("packages/ui/canon/manifest.json");
if (man) {
  const ids = JSON.parse(man).surfaces.map((s) => s.id);
  for (const id of ["onboarding-identity", "onboarding-demo-card"]) {
    if (!ids.includes(id)) fails.push(`canon/manifest missing ${id}`);
  }
}

if (fails.length) {
  console.error("[verify:onboarding-experiential] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:onboarding-experiential] PASS (identity · demo · partner slide · toneBand · gender0)",
);

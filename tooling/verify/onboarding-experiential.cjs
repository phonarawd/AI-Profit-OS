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
  if (flow.includes("T.execution.ctaEarn") || /["'`]수익 벌기["'`]/.test(flow)) {
    fails.push("OnboardingFlow must not use capital CTA 「수익 벌기」(v7.22.55)");
  }
  if (/T\.margin\.compareMini[^U]/.test(flow) || /\{T\.margin\.compareMini\}/.test(flow)) {
    fails.push("OnboardingFlow must use T.margin.compareMiniUtility (차익 라벨 0)");
  }
  if (flow.includes("WhyUsdtCard") || flow.includes("TaxDisclaimerBlock")) {
    fails.push("OnboardingFlow Guest path must not mount WhyUsdtCard/TaxDisclaimerBlock (USDT/테더 카피)");
  }
  if (flow.includes("gender_male") || flow.includes("gender_female") || flow.includes("성별")) {
    fails.push("OnboardingFlow must not branch on gender");
  }
  if (!flow.includes("demoPriceExample")) {
    fails.push("OnboardingFlow demo must use T.onboarding.demoPriceExample (not +$ profit tease)");
  }
  if (/\+\s*\$|\+\$/.test(flow)) {
    fails.push("OnboardingFlow must not tease demo profit with +$ amounts");
  }
  if (/practiceUsdt\s*=/.test(flow) || flow.includes("usdtSuffix")) {
    fails.push(
      "OnboardingFlow Guest DemoWalletBanner must omit practiceUsdt/usdtSuffix (USDT ticker 0)",
    );
  }
  if (
    !flow.includes("T.landing.ctaStartUtility") &&
    !flow.includes("T.landing.ctaContinueUtility")
  ) {
    fails.push(
      "OnboardingFlow ACTION must use T.landing.ctaStartUtility or ctaContinueUtility",
    );
  }
  // USDT skip only
  if (!flow.includes('SKIPPABLE') && !flow.includes('"usdt"')) {
    fails.push("OnboardingFlow must allow skip on USDT step only");
  }
}

// practice banner — Guest-facing strings · 수익|USDT 0 (CLOSE)
const practice = read("packages/ui/copy/ko/practice.ts");
if (practice) {
  const guestBanned = /수익|투자|USDT|테더|보장|차익|괴리율/;
  for (const key of ["bannerTitle", "bannerBody", "notWithdrawable", "badge"]) {
    const m = practice.match(new RegExp(`${key}:\\s*"([^"]*)"`));
    if (!m) {
      fails.push(`practice.ts missing ${key}`);
      continue;
    }
    if (guestBanned.test(m[1])) {
      fails.push(`practice.${key} Guest banned token in "${m[1]}"`);
    }
  }
}

const idWire = read("packages/ui/canon/surfaces/onboarding-identity.wire.json");
if (idWire) {
  if (
    idWire.includes("T.trust.expectedNotGuaranteed") ||
    /"copyKey"\s*:\s*"T\.trust\.expectedNotGuaranteed"/.test(idWire)
  ) {
    fails.push("onboarding-identity.wire must not use expectedNotGuaranteed (Guest · use utilityDisclaimer)");
  }
  if (!idWire.includes("compareMiniUtility")) {
    fails.push("onboarding-identity.wire missing compareMiniUtility");
  }
  if (!idWire.includes("utilityDisclaimer")) {
    fails.push("onboarding-identity.wire missing utilityDisclaimer");
  }
  if (/T\.margin\.compareMini"/.test(idWire)) {
    fails.push("onboarding-identity.wire must not use capital compareMini copyKey");
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

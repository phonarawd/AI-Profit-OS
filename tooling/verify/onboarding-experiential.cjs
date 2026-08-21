/**
 * verify:onboarding-experiential — Automation Story 7단
 * Figma 237:1813 / 237:2155 · 구 tone-first/demo/practice 경험 금지
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
  "packages/ui/copy/ko/onboarding.ts",
  "packages/ui/components/onboarding/OnboardingFlow.tsx",
  "packages/ui/components/onboarding/OnboardingStoryVisual.tsx",
  "packages/ui/components/onboarding/onboarding-automation.css",
  "packages/ui/components/onboarding/onboarding-experience-gate.ts",
  "packages/ui/components/onboarding/index.ts",
  "apps/web/app/onboarding/page.tsx",
  "supabase/migrations/20260822080000_beginner_onboarding_experience.sql",
];
for (const f of files) mustExist(f);

const copy = read("packages/ui/copy/ko/onboarding.ts");
if (copy) {
  for (const label of ["탐색", "매칭", "계산", "검증", "준비", "결정", "실행"]) {
    if (!copy.includes(`label: "${label}"`)) {
      fails.push(`onboarding.ts missing story label ${label}`);
    }
  }
  for (const cta of [
    "자동 매칭 보기",
    "수익 계산 보기",
    "검증 과정 보기",
    "참여 준비 보기",
    "방법 확인했어요",
    "나중에 알아볼게요",
    "첫 기회 둘러보기",
  ]) {
    if (!copy.includes(cta)) fails.push(`onboarding.ts missing CTA ${cta}`);
  }
  if (!copy.includes("실제 결과는 기회 조건에 따라 달라질 수 있어요")) {
    fails.push("onboarding.ts missing step7 uncertainty");
  }
  if (copy.includes("toneYoung") || copy.includes("tonePickTitle")) {
    fails.push("onboarding.ts must not keep tone-selection-first copy");
  }
}

const flow = read("packages/ui/components/onboarding/OnboardingFlow.tsx");
if (flow) {
  for (const need of [
    "OnboardingStoryVisual",
    "onboarding-next",
    "onboarding-back",
    "onboarding-skip",
    "onboarding-start",
    "SKIPPABLE",
    '"usdt"',
    "decideOnboardingGate",
    "/api/v1/auth/session",
    "/api/v1/auth/onboarding/complete",
  ]) {
    if (!flow.includes(need)) fails.push(`OnboardingFlow missing ${need}`);
  }
  for (const banned of [
    "tone-young",
    "DemoWalletBanner",
    "MarketPartnerTrustStrip",
    "MatchConfidenceCard",
    "BuyingPowerMeter",
    "OpportunityDemoCard",
    "T.landing.ctaStartUtility",
    "T.landing.transitionDisclosure",
    "compareMiniUtility",
    "COMPOSITE_STRONG",
    "WhyUsdtCard",
    "gender_male",
    "gender_female",
    "수익 벌기",
    "webgl",
    "WebGL",
    "THREE",
    "gsap",
    "requestAnimationFrame",
  ]) {
    if (flow.includes(banned)) {
      fails.push(`OnboardingFlow must not keep superseded ${banned}`);
    }
  }
}

const visual = read("packages/ui/components/onboarding/OnboardingStoryVisual.tsx");
if (visual) {
  for (const need of ["explore", "match", "calc", "validate", "prepare", "decide", "run"]) {
    if (!visual.includes(`data-story="${need}"`)) {
      fails.push(`OnboardingStoryVisual missing ${need}`);
    }
  }
  if (visual.includes("COMPOSITE_STRONG")) {
    fails.push("OnboardingStoryVisual must not expose identity jargon");
  }
}

const css = read("packages/ui/components/onboarding/onboarding-automation.css");
if (css) {
  if (css.includes("spark-dash-home") || css.includes("HomeDesktop") || css.includes("home-approval")) {
    fails.push("onboarding CSS must not mutate/import Home frozen presentation");
  }
  if (!css.includes("#ff2e63") || !css.includes("#08111f")) {
    fails.push("onboarding CSS missing Spark ink/fuchsia tokens");
  }
}

const page = read("apps/web/app/onboarding/page.tsx");
if (page) {
  if (!page.includes("OnboardingFlow")) {
    fails.push("onboarding page must render OnboardingFlow");
  }
  if (!page.includes('layout="viewport"')) {
    fails.push("onboarding page must use GuestChrome viewport (not max-w-lg)");
  }
  if (page.includes("OnboardingFlowV2") || page.includes("AutomationOnboarding")) {
    fails.push("must not create a parallel onboarding owner");
  }
}

const gate = read("packages/ui/components/onboarding/onboarding-experience-gate.ts");
if (gate) {
  if (!gate.includes('return "unknown"')) {
    fails.push("gate must treat unknown separately from new user");
  }
  if (gate.includes("balance") || gate.includes("available")) {
    fails.push("gate must not infer from balance");
  }
}

const nest = read("services/api-nest/src/auth/auth.service.ts");
if (nest) {
  if (!nest.includes("beginner_onboarding_completed_at")) {
    fails.push("auth.service missing durable beginner_onboarding_completed_at");
  }
  if (!nest.includes("status = 'approved'") || !nest.includes("ledger_credited")) {
    fails.push("auth.service must only count completed KRW/USDT funding");
  }
}

if (fails.length) {
  console.error("[verify:onboarding-experiential] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:onboarding-experiential] PASS (automation story · old experience 0 · durable gate)",
);

/**
 * verify:onboarding-experiential — product education 7-step
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

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
  "packages/ui/canon/surfaces/product-onboarding.wire.json",
  "packages/ui/copy/ko/product-onboarding.ts",
  "packages/ui/components/onboarding/OnboardingFlow.tsx",
  "packages/ui/components/onboarding/OnboardingShell.tsx",
  "packages/ui/components/onboarding/index.ts",
  "apps/web/app/onboarding/page.tsx",
  "packages/sdk/src/product-onboarding/entry.ts",
  "services/api-nest/src/product-onboarding/product-onboarding.module.ts",
  "supabase/migrations/20260906233000_product_onboarding_progress.sql",
];
for (const f of files) mustExist(f);

const copy = read("packages/ui/copy/ko/product-onboarding.ts");
if (copy) {
  for (const k of [
    "progressLabel",
    "virtualBadge",
    "largeType",
    "easyExplain",
    "expectedLabel",
    "settledLabel",
    "requiredLabel",
    "unavailable",
  ]) {
    if (!copy.includes(`${k}:`)) fails.push(`product-onboarding.ts missing ${k}`);
  }
  if (copy.includes("퍼떡") || copy.includes("퍼득")) {
    fails.push("product-onboarding copy must use brand 퍼뜩");
  }
}

const flow = [
  read("packages/ui/components/onboarding/OnboardingFlow.tsx") || "",
  read("packages/ui/components/onboarding/OnboardingShell.tsx") || "",
].join("\n");
if (flow) {
  for (const need of [
    "OnboardingShell",
    "onboarding-progress",
    "headingRef",
    "T.productOnboarding",
    "T.objections.onboardingSlide",
    "onboarding-objection-slide",
    'window.location.href = "/"',
  ]) {
    if (!flow.includes(need)) fails.push(`OnboardingFlow missing ${need}`);
  }
  if (flow.includes("GuestChrome")) {
    fails.push("OnboardingFlow must not reuse GuestChrome");
  }
  if (flow.includes("/wallet/deposit")) {
    fails.push("OnboardingFlow must not use a deposit funnel");
  }
  if (flow.includes("T.execution.ctaEarn") || /["'`]수익 벌기["'`]/.test(flow)) {
    fails.push("OnboardingFlow must not use capital CTA");
  }
  if (flow.includes("gender_male") || flow.includes("gender_female")) {
    fails.push("OnboardingFlow must not branch on gender");
  }
  if (/\+\s*\$|\+\$/.test(flow)) {
    fails.push("OnboardingFlow must not tease +$ profit");
  }
  if (flow.includes("gsap") || flow.includes("three") || flow.includes("lottie")) {
    fails.push("OnboardingFlow must not add GSAP/Three/Lottie");
  }
}

const page = read("apps/web/app/onboarding/page.tsx");
if (page) {
  if (!page.includes("OnboardingFlow")) fails.push("onboarding page must render OnboardingFlow");
  if (page.includes("GuestChrome")) {
    fails.push("onboarding page must not wrap GuestChrome");
  }
}

const entry = read("packages/sdk/src/product-onboarding/entry.ts");
if (entry && !entry.includes("decidePostAuthEntry")) {
  fails.push("sdk product-onboarding must export decidePostAuthEntry");
}

const fetchSdk = read("packages/sdk/src/product-onboarding/fetch.ts");
if (fetchSdk && !fetchSdk.includes("continueAfterAuth")) {
  fails.push("sdk product-onboarding must export continueAfterAuth");
}

const authRuntimes = [
  "apps/web/app/auth/login/LoginRuntime.tsx",
  "apps/web/app/auth/signup/SignupRuntime.tsx",
  "apps/web/app/auth/verify-email/VerifyEmailRuntime.tsx",
  "apps/web/app/auth/magic/MagicRuntime.tsx",
  "apps/web/app/auth/oauth/[provider]/callback/OauthCallbackRuntime.tsx",
  "apps/web/app/auth/complete-profile/CompleteProfileRuntime.tsx",
];
for (const rel of authRuntimes) {
  const src = read(rel);
  if (src && !src.includes("continueAfterAuth")) {
    fails.push(`${rel} must use continueAfterAuth`);
  }
}

const authFetch = read("packages/sdk/src/auth/fetch.ts");
if (authFetch && !authFetch.includes('"/onboarding"')) {
  fails.push("continuePathAfterAuth B_complete must go to /onboarding");
}

const motion = read("packages/ui/components/onboarding/onboarding-motion.css");
if (motion && /left:\s*8%/.test(motion)) {
  fails.push("scan motion must use transform, not left");
}

const pwa = read("apps/web/components/pwa/suppress-pwa-chrome.ts");
if (pwa && !pwa.includes('"/onboarding"')) {
  fails.push("PWA chrome must stay suppressed on /onboarding");
}

const wire = read("packages/ui/canon/surfaces/product-onboarding.wire.json");
if (wire) {
  let w;
  try {
    w = JSON.parse(wire);
  } catch {
    fails.push("product-onboarding.wire invalid JSON");
    w = null;
  }
  if (w) {
    if (w.route !== "/onboarding") fails.push("product-onboarding.route");
    if (!(w.forbidden || []).includes("gender_branch")) {
      fails.push("product-onboarding.forbidden missing gender_branch");
    }
    if (!(w.forbidden || []).includes("photo_pixel_match")) {
      fails.push("product-onboarding.forbidden missing photo_pixel_match");
    }
    if (!(w.forbidden || []).includes("guest_chrome_auth_split")) {
      fails.push("product-onboarding.forbidden missing guest_chrome_auth_split");
    }
  }
}

const man = read("packages/ui/canon/manifest.json");
if (man) {
  const ids = JSON.parse(man).surfaces.map((s) => s.id);
  if (!ids.includes("product-onboarding")) fails.push("canon/manifest missing product-onboarding");
}

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

const entryTest = spawnSync(
  process.execPath,
  ["--test", "--experimental-strip-types", "packages/sdk/src/product-onboarding/entry.test.ts"],
  { cwd: root, encoding: "utf8" },
);
process.stdout.write(entryTest.stdout || "");
process.stderr.write(entryTest.stderr || "");
if (entryTest.status !== 0) fails.push("product-onboarding entry.test.ts failed");

const nestSrc = read("services/api-nest/src/product-onboarding/product-onboarding.store.ts");
if (nestSrc && !nestSrc.includes("PRODUCT_ONBOARDING_STEP_CONFLICT")) {
  fails.push("product-onboarding store must reject step skip");
}

if (fails.length) {
  console.error("[verify:onboarding-experiential] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:onboarding-experiential] PASS (7-step product shell · server money · PWA suppress)",
);

/**
 * verify:auth-surfaces — UI §6.4b PART2b
 * Canon auth-login/signup/complete-profile · Kakao primary · Stage A/B · gender0
 * Guest utility §6.4c.1 F · 랜딩 firstViewport Kakao 직행 0
 * Kakao callback = Infra auth-kakao-oauth-runtime → UI disabled until ENABLED=1
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
  "packages/ui/canon/surfaces/auth-login.wire.json",
  "packages/ui/canon/surfaces/auth-signup.wire.json",
  "packages/ui/canon/surfaces/auth-complete-profile.wire.json",
  "packages/ui/copy/ko/auth.ts",
  "packages/ui/components/auth/AuthLogin.tsx",
  "packages/ui/components/auth/AuthSignup.tsx",
  "packages/ui/components/auth/AuthCompleteProfile.tsx",
  "packages/ui/components/auth/kakao-ready.ts",
  "packages/ui/components/auth/index.ts",
  "apps/web/app/auth/login/page.tsx",
  "apps/web/app/auth/signup/page.tsx",
  "apps/web/app/auth/complete-profile/page.tsx",
  "apps/web/app/components/GuestChrome.tsx",
];
for (const f of files) mustExist(f);

const guestBanned = /수익|투자|USDT|테더|보장|차익|괴리율|재테크|알바/;

const copy = read("packages/ui/copy/ko/auth.ts");
if (copy) {
  for (const k of [
    "kakaoStart",
    "kakaoUnavailable",
    "loginHeadline",
    "signupHeadline",
    "completeHeadline",
    "saveContinue",
    "displayName",
    "phone",
    "birthDate",
    "termsRequired",
    "marketingOptional",
    "referralCode",
    "emailForm",
    "completeHintWithdraw",
    "termsNeeded",
  ]) {
    if (!copy.includes(`${k}:`)) fails.push(`auth.ts missing ${k}`);
  }
  if (/\b(male|female|gender|오빠|언니)\b/.test(copy)) {
    fails.push("auth.ts must not contain gender branch strings");
  }
  for (const m of copy.matchAll(/:\s*"([^"]*)"/g)) {
    if (guestBanned.test(m[1])) {
      fails.push(`auth.ts Guest utility banned token in "${m[1]}"`);
    }
  }
}

const login = read("packages/ui/components/auth/AuthLogin.tsx");
if (login) {
  if (!login.includes("isKakaoOAuthReady")) {
    fails.push("AuthLogin must guard Kakao with isKakaoOAuthReady");
  }
  if (!login.includes("auth-kakao-unavailable") && !login.includes("kakaoUnavailable")) {
    fails.push("AuthLogin must surface kakaoUnavailable when disabled");
  }
  if (!login.includes('data-oauth="kakao"') && !login.includes('data-oauth={"kakao"}')) {
    if (!login.includes("oauth") || !login.includes("kakao")) {
      fails.push("AuthLogin Kakao primary missing");
    }
  }
  if (/name=["']gender["']|성별/.test(login)) {
    fails.push("AuthLogin must not include gender field");
  }
  if (guestBanned.test(login.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, ""))) {
    // only fail on string literals in JSX/copy usage — skip import paths
    const lit = [...login.matchAll(/["'`]([^"'`]{0,80})["'`]/g)].map((m) => m[1]);
    for (const s of lit) {
      if (guestBanned.test(s) && !s.includes("§") && !s.includes("auth-")) {
        fails.push(`AuthLogin Guest banned token in literal "${s}"`);
      }
    }
  }
}

const signup = read("packages/ui/components/auth/AuthSignup.tsx");
if (signup) {
  if (!signup.includes('data-stage="A"')) fails.push("AuthSignup must mark Stage A");
  if (!signup.includes("isKakaoOAuthReady")) {
    fails.push("AuthSignup must guard Kakao with isKakaoOAuthReady");
  }
  if (!signup.includes("auth-kakao-unavailable") && !signup.includes("kakaoUnavailable")) {
    fails.push("AuthSignup must surface kakaoUnavailable when disabled");
  }
  if (!signup.includes("termsRequired") && !signup.includes("auth-terms")) {
    fails.push("AuthSignup must include terms checkbox");
  }
  if (/name=["']gender["']|type=["']gender["']|성별/.test(signup)) {
    fails.push("AuthSignup must not include gender field");
  }
  if (/주민|rrn|RRN/.test(signup)) {
    fails.push("AuthSignup must not include RRN field");
  }
}

const complete = read("packages/ui/components/auth/AuthCompleteProfile.tsx");
if (complete) {
  if (!complete.includes('data-stage="B"')) {
    fails.push("AuthCompleteProfile must mark Stage B");
  }
  for (const id of ["displayName", "phone", "birthDate"]) {
    if (!complete.includes(`field-${id}`) && !complete.includes(`name="${id}"`)) {
      fails.push(`AuthCompleteProfile missing field ${id}`);
    }
  }
  if (!complete.includes("saveContinue") && !complete.includes("auth-save-continue")) {
    fails.push("AuthCompleteProfile missing saveContinue CTA");
  }
  if (/name=["']gender["']|성별/.test(complete)) {
    fails.push("AuthCompleteProfile must not include gender field");
  }
  if (/주민|rrn|RRN/.test(complete)) {
    fails.push("AuthCompleteProfile must not include RRN field");
  }
}

const kakao = read("packages/ui/components/auth/kakao-ready.ts");
if (kakao) {
  if (!kakao.includes("NEXT_PUBLIC_OAUTH_KAKAO_ENABLED")) {
    fails.push("kakao-ready must require NEXT_PUBLIC_OAUTH_KAKAO_ENABLED");
  }
  if (!kakao.includes("isKakaoOAuthReady")) {
    fails.push("kakao-ready must export isKakaoOAuthReady");
  }
  // Client id alone must not enable (callback pending · founder env ≠ UI ready)
  if (
    /NEXT_PUBLIC_OAUTH_KAKAO_CLIENT_ID/.test(kakao) &&
    /return Boolean\(clientId/.test(kakao)
  ) {
    fails.push(
      "kakao-ready must not enable on CLIENT_ID alone — require ENABLED flag (Infra callback)",
    );
  }
}

for (const rel of [
  "apps/web/app/auth/login/page.tsx",
  "apps/web/app/auth/signup/page.tsx",
  "apps/web/app/auth/complete-profile/page.tsx",
]) {
  const page = read(rel);
  if (!page) continue;
  if (!page.includes("GuestChrome")) {
    fails.push(`${rel} must wrap with GuestChrome (5탭 0)`);
  }
}

// 랜딩 firstViewport Kakao 직행 0 (§6.4c.1 B) — pointer from PART2b
const landing = read("packages/ui/components/landing/Landing3s.tsx");
if (landing) {
  if (
    landing.includes("oauth_kakao") ||
    landing.includes("/auth/oauth/kakao") ||
    landing.includes("isKakaoOAuthReady") ||
    landing.includes("kakaoStart")
  ) {
    fails.push("Landing3s must not start Kakao OAuth (직행 0 · use /onboarding|/auth/login)");
  }
  if (!landing.includes("/onboarding") && !landing.includes("/auth/login")) {
    fails.push("Landing3s CTA must navigate /onboarding or /auth/login");
  }
}

const envExample = read(".env.example");
if (envExample && !envExample.includes("NEXT_PUBLIC_OAUTH_KAKAO_ENABLED")) {
  fails.push(".env.example must document NEXT_PUBLIC_OAUTH_KAKAO_ENABLED UI guard");
}

for (const [id, route, action] of [
  ["auth-login", "/auth/login", "oauth_kakao"],
  ["auth-signup", "/auth/signup", "oauth_kakao"],
  ["auth-complete-profile", "/auth/complete-profile", "patch_profile_stage_b"],
]) {
  const raw = read(`packages/ui/canon/surfaces/${id}.wire.json`);
  if (!raw) continue;
  let w;
  try {
    w = JSON.parse(raw);
  } catch {
    fails.push(`${id}.wire.json invalid JSON`);
    continue;
  }
  if (w.route !== route) fails.push(`${id}.route must be ${route}`);
  if (w.primaryCta?.action !== action) {
    fails.push(`${id}.primaryCta.action must be ${action}`);
  }
  if (w.tone !== "utility") {
    fails.push(`${id}.tone must be utility (§6.4c.1 F)`);
  }
  const forb = w.forbidden || [];
  for (const f of ["gender_field", "rrn_field", "profit_guaranteed_cta"]) {
    if (!forb.includes(f)) fails.push(`${id}.forbidden missing ${f}`);
  }
  if (!forb.includes("gender_branch")) {
    fails.push(`${id}.forbidden missing gender_branch`);
  }
  if (
    (id === "auth-login" || id === "auth-signup") &&
    !forb.includes("kakao_oauth_primary_on_landing")
  ) {
    fails.push(`${id}.forbidden missing kakao_oauth_primary_on_landing`);
  }
  if (id === "auth-signup" && w.stage !== "A") {
    fails.push("auth-signup.stage must be A");
  }
  if (id === "auth-complete-profile" && w.stage !== "B") {
    fails.push("auth-complete-profile.stage must be B");
  }
}

const man = read("packages/ui/canon/manifest.json");
if (man) {
  const ids = JSON.parse(man).surfaces.map((s) => s.id);
  for (const id of ["auth-login", "auth-signup", "auth-complete-profile"]) {
    if (!ids.includes(id)) fails.push(`canon/manifest missing ${id}`);
  }
}

if (fails.length) {
  console.error("[verify:auth-surfaces] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:auth-surfaces] PASS (login · signup StageA · complete StageB · Kakao guard · Guest utility · gender0 · landing Kakao0)",
);

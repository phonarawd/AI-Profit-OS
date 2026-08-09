/**
 * verify:auth-surfaces — UI §6.4b PART2b
 * Canon auth-login/signup/complete-profile · Kakao primary · Stage A/B · gender0
 * Kakao callback = Infra auth-kakao-oauth-runtime → UI disabled guard when not ready
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
];
for (const f of files) mustExist(f);

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
  ]) {
    if (!copy.includes(`${k}:`)) fails.push(`auth.ts missing ${k}`);
  }
  if (/\b(male|female|gender|오빠|언니)\b/.test(copy)) {
    fails.push("auth.ts must not contain gender branch strings");
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
  if (!login.includes('data-oauth="kakao"') && !login.includes("data-oauth={\"kakao\"}")) {
    // allow either quoting style
    if (!login.includes("oauth") || !login.includes("kakao")) {
      fails.push("AuthLogin Kakao primary missing");
    }
  }
}

const signup = read("packages/ui/components/auth/AuthSignup.tsx");
if (signup) {
  if (!signup.includes('data-stage="A"')) fails.push("AuthSignup must mark Stage A");
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
}

const kakao = read("packages/ui/components/auth/kakao-ready.ts");
if (kakao) {
  if (!kakao.includes("NEXT_PUBLIC_OAUTH_KAKAO")) {
    fails.push("kakao-ready must read NEXT_PUBLIC_OAUTH_KAKAO_* env");
  }
  if (!kakao.includes("isKakaoOAuthReady")) {
    fails.push("kakao-ready must export isKakaoOAuthReady");
  }
}

for (const [id, route, action] of [
  ["auth-login", "/auth/login", "oauth_kakao"],
  ["auth-signup", "/auth/signup", "oauth_kakao"],
  ["auth-complete-profile", "/auth/complete-profile", "patch_profile_stage_b"],
]) {
  const raw = read(`packages/ui/canon/surfaces/${id}.wire.json`);
  if (!raw) continue;
  const w = JSON.parse(raw);
  if (w.route !== route) fails.push(`${id}.route must be ${route}`);
  if (w.primaryCta?.action !== action) {
    fails.push(`${id}.primaryCta.action must be ${action}`);
  }
  const forb = w.forbidden || [];
  if (id === "auth-signup" || id === "auth-complete-profile") {
    for (const f of ["rrn_field", "gender_field"]) {
      if (!forb.includes(f)) fails.push(`${id}.forbidden missing ${f}`);
    }
  }
  if (id === "auth-login" && !forb.includes("gender_branch")) {
    fails.push("auth-login.forbidden missing gender_branch");
  }
}

if (fails.length) {
  console.error("[verify:auth-surfaces] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:auth-surfaces] PASS (login · signup StageA · complete StageB · Kakao guard · gender0)",
);

/**
 * C-ACQ-003 인프로세스 Acquisition guest/auth/error/resume E2E.
 * Auth Rule 재정의 0 · 브라우저/실 Kakao 계정 0 · Home/Canon 복구 0.
 */
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) return "";
  return fs.readFileSync(fp, "utf8");
}

/** Nest completeKakaoCode 소유자 규칙 — 기존 identity가 terms보다 앞선다. */
function decideKakaoComplete(input) {
  if (input.existingUserId) {
    return { action: "resume_session", termsRequired: false };
  }
  if (!input.termsAcceptedAt || !input.privacyAcceptedAt) {
    return { action: "TERMS_REQUIRED", termsRequired: true };
  }
  return { action: "signup_stage_a", termsRequired: false };
}

function decideOauthBrowserFail(code) {
  return code === "TERMS_REQUIRED" ? "/auth/signup" : "/auth/login";
}

function collectStringLiterals(src) {
  const out = [];
  const re = /["'`]([^"'`\n]{1,120})["'`]/g;
  let m;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

function runAll() {
  const fails = [];
  const fail = (msg) => fails.push(msg);

  const kakaoCore = require(path.join(root, "services/api-nest/kakao-oauth.core.cjs"));
  if (kakaoCore.continuePathAfterOauth("B_complete") !== "/") {
    fail("continuePathAfterOauth(B_complete) must be /");
  }
  if (kakaoCore.continuePathAfterOauth("B_incomplete") !== "/auth/complete-profile") {
    fail("continuePathAfterOauth(incomplete) must be /auth/complete-profile");
  }
  if (kakaoCore.continuePathAfterOauth("A") !== "/auth/complete-profile") {
    fail("continuePathAfterOauth(A) must be /auth/complete-profile");
  }

  const resume = decideKakaoComplete({
    existingUserId: "u-existing",
    termsAcceptedAt: "",
    privacyAcceptedAt: "",
  });
  if (resume.action !== "resume_session" || resume.termsRequired !== false) {
    fail("existing Kakao identity must resume without terms");
  }
  const terms = decideKakaoComplete({
    existingUserId: "",
    termsAcceptedAt: "",
    privacyAcceptedAt: "",
  });
  if (terms.action !== "TERMS_REQUIRED") {
    fail("new Kakao identity without terms must be TERMS_REQUIRED");
  }
  const stageA = decideKakaoComplete({
    existingUserId: "",
    termsAcceptedAt: "2026-08-20T00:00:00.000Z",
    privacyAcceptedAt: "2026-08-20T00:00:00.000Z",
  });
  if (stageA.action !== "signup_stage_a") {
    fail("new Kakao identity with terms must signup Stage A");
  }
  if (decideOauthBrowserFail("TERMS_REQUIRED") !== "/auth/signup") {
    fail("TERMS_REQUIRED browser fail must go to /auth/signup");
  }
  if (decideOauthBrowserFail("oauth denied") !== "/auth/login") {
    fail("oauth denied must go to /auth/login");
  }

  const svc = read("services/api-nest/src/auth/auth.service.ts");
  const existingIdx = svc.indexOf("existing.rows[0]");
  const termsIdx = svc.indexOf('throw new BadRequestException("TERMS_REQUIRED")');
  if (existingIdx < 0 || termsIdx < 0 || existingIdx > termsIdx) {
    fail("completeKakaoCode must resume existing identity before TERMS_REQUIRED");
  }
  if (!svc.includes("return this.mintSession(existing.rows[0].user_id)")) {
    fail("existing Kakao identity must mintSession without signup");
  }
  if (!svc.includes("oauthErrorRedirect") || !svc.includes("oauthSignupRedirect")) {
    fail("AuthService must keep oauth error/signup redirects");
  }
  if (svc.includes("body.providerSubject ?? body.code")) {
    fail("Kakao must not treat authorization code as providerSubject");
  }

  const ctrl = read("services/api-nest/src/auth/auth.controller.ts");
  if (!ctrl.includes('if (msg.includes("TERMS_REQUIRED"))')) {
    fail("GET callback must map TERMS_REQUIRED to signup redirect");
  }
  if (!ctrl.includes("oauthSignupRedirect()") || !ctrl.includes("oauthErrorRedirect()")) {
    fail("GET callback must redirect signup/login, not dump stack");
  }
  if (!ctrl.includes("attachUserSessionCookie")) {
    fail("Kakao callback must attach aipo_session cookie");
  }
  if (!ctrl.includes("query.error") && !ctrl.includes("error,")) {
    fail("GET callback must accept oauth error query");
  }

  const constants = read("services/api-nest/src/auth/auth.constants.ts");
  if (!constants.includes('USER_SESSION_COOKIE_NAME = "aipo_session"')) {
    fail("session cookie name must stay aipo_session");
  }

  const login = read("apps/web/app/auth/login/LoginClient.tsx");
  const signup = read("apps/web/app/auth/signup/SignupClient.tsx");
  const complete = read("apps/web/app/auth/complete-profile/CompleteProfileClient.tsx");
  const onboarding = read("apps/web/app/onboarding/OnboardingClient.tsx");
  const publicAd = read("apps/web/app/l/PublicAdSurface.tsx");
  const messages = read("apps/web/app/auth/auth-messages.ts");

  if (!login.includes("fetchAuthSession") || !login.includes("continuePathAfterAuth")) {
    fail("login must resume via fetchAuthSession");
  }
  if (!signup.includes("fetchAuthSession") || !signup.includes("continuePathAfterAuth")) {
    fail("signup must resume via fetchAuthSession");
  }
  if (!complete.includes('router.replace("/auth/login")')) {
    fail("complete-profile without session must return to login");
  }
  if (!complete.includes('session.onboardingStage === "B_complete"')) {
    fail("complete-profile must skip when Stage B is already done");
  }
  if (!complete.includes('router.replace("/onboarding")')) {
    fail("complete-profile success must continue to onboarding");
  }
  if (!onboarding.includes('href="/"') && !onboarding.includes('href={"/"}')) {
    fail("onboarding resume CTA must be Home /");
  }

  const coreHits = ["/profits", "/wallet", "/trades"];
  for (const dest of coreHits) {
    if (publicAd.includes(dest)) {
      fail(`public ad must not redirect to Core ${dest}`);
    }
  }
  if (/\/me(?!\/legal)/.test(publicAd)) {
    fail("public ad must not redirect to authenticated /me");
  }
  if (publicAd.includes("/auth/oauth/kakao") || publicAd.includes("startKakaoOAuth")) {
    fail("public ad first viewport must not start Kakao");
  }
  if (!publicAd.includes("/onboarding") || !publicAd.includes("/auth/login")) {
    fail("public ad CTAs must stay /onboarding or /auth/login");
  }
  if (/수익|투자|USDT|테더|보장|차익|괴리율|재테크|알바/.test(publicAd)) {
    fail("public ad must not use guest banned tokens");
  }

  const userFacing = [messages, login, signup, complete, onboarding, publicAd].join("\n");
  const bannedUser = /\b(OAuth|JWT|callback|token|API|Nest|DLQ|NATS|Mock|Staging)\b/;
  for (const lit of collectStringLiterals(userFacing)) {
    if (lit.startsWith("/") || lit.startsWith("http") || lit.includes("data-")) continue;
    if (bannedUser.test(lit)) {
      fail(`user-facing copy must not expose IT jargon: ${lit}`);
    }
  }
  if (!messages.includes("지금은 카카오로 연결할 수 없어요.")) {
    fail("KAKAO_UNAVAILABLE must stay plain Korean");
  }
  if (!messages.includes("약관에 동의해 주세요.")) {
    fail("TERMS_REQUIRED must stay plain Korean");
  }
  if (!messages.includes("다시 로그인해 주세요.")) {
    fail("AUTH_REQUIRED must stay plain Korean");
  }
  if (!messages.includes("지금은 연결할 수 없어요. 다시 시도해 주세요.")) {
    fail("generic auth error must stay retry copy, not stack");
  }

  const adsPages = [
    "apps/web/app/ads/page.tsx",
    "apps/web/app/ads/[variant]/page.tsx",
    "apps/web/app/l/[variant]/page.tsx",
  ];
  for (const rel of adsPages) {
    const src = read(rel);
    if (!src.includes("PublicAdSurface")) {
      fail(`${rel} must keep PublicAdSurface`);
    }
    for (const dest of coreHits) {
      if (src.includes(`href="${dest}`) || src.includes(`href={'${dest}`)) {
        fail(`${rel} must not link Core ${dest}`);
      }
    }
  }

  const test = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--test",
      path.join(root, "packages/sdk/src/auth/auth-release.test.ts"),
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (test.status !== 0) {
    fail(`auth-release.test.ts failed\n${test.stdout}\n${test.stderr}`);
  }

  return { fails };
}

module.exports = {
  runAll,
  decideKakaoComplete,
  decideOauthBrowserFail,
};

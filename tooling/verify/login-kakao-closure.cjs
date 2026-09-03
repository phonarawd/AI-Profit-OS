/**
 * verify:login-kakao-closure — REL-102
 * 일반 로그인 클로저. LIVE_KAKAO_HUMAN_E2E=NOT_RUN 위조 0.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const release = JSON.parse(
  read("governance/consumer-acquisition/acquisition-release.v1.json") || "{}",
);
if (release.e2e?.liveKakaoHumanE2e !== "NOT_RUN") {
  fail("Kakao NOT_RUN must not be rewritten to PASS");
}

const login = read("apps/web/app/auth/login/LoginRuntime.tsx");
if (!login.includes("requestMagicLink") || !login.includes("fetchAuthSession")) {
  fail("login runtime must resume session and request a mail link");
}

const kakao = read("apps/web/app/auth/oauth/kakao/page.tsx");
if (kakao && /\bOAuth\b|\bJWT\b|\bcallback\b/.test(kakao)) {
  fail("kakao start page must not show developer terms");
}

const callbackPage = read("apps/web/app/auth/oauth/[provider]/callback/page.tsx");
const callbackRuntime = read(
  "apps/web/app/auth/oauth/[provider]/callback/OauthCallbackRuntime.tsx",
);
const signup = read("apps/web/app/auth/signup/SignupRuntime.tsx");
const sdkProof = read("packages/sdk/src/auth/proof.ts");
const authController = read("services/api-nest/src/auth/auth.controller.ts");
const stagingWorkflow = read(".github/workflows/deploy-staging.yml");
const releaseBuildWorkflow = read(".github/workflows/release-build.yml");

if (
  !/name: Deploy web staging[\s\S]{0,500}NEXT_PUBLIC_OAUTH_KAKAO_ENABLED: "1"/.test(
    stagingWorkflow,
  )
) {
  fail("staging web build must explicitly enable Kakao CTA after callback closure");
}
if (
  !/name: Build once[\s\S]{0,400}NEXT_PUBLIC_OAUTH_KAKAO_ENABLED: "1"/.test(
    releaseBuildWorkflow,
  )
) {
  fail("immutable release build must explicitly enable Kakao CTA");
}

if (
  !callbackPage.includes("OauthCallbackRuntime") ||
  !callbackPage.includes("params: Promise<{ provider: string }>")
) {
  fail("web OAuth callback route must dispatch provider to OauthCallbackRuntime");
}
for (const needle of [
  "finishOauth",
  'sessionStorage.getItem("aipo.oauth.terms")',
  'provider !== "kakao" && provider !== "google"',
  "continuePathAfterAuth",
]) {
  if (!callbackRuntime.includes(needle)) {
    fail("OAuth callback runtime missing: " + needle);
  }
}
const storeIdx = signup.indexOf('sessionStorage.setItem(\n          "aipo.oauth.terms"');
const redirectIdx = signup.indexOf("window.location.assign(out.authorizeUrl)");
if (storeIdx < 0 || redirectIdx < 0 || storeIdx > redirectIdx) {
  fail("signup Kakao terms must be stored before redirect to provider");
}
if (
  !sdkProof.includes('"/api/v1/auth/oauth/" + input.provider + "/callback"') ||
  !sdkProof.includes("return postSession(")
) {
  fail("SDK OAuth finish must POST code+state to the Nest callback route");
}
if (
  !authController.includes("@Post(AUTH_ROUTES.oauthCallback)") ||
  !authController.includes("this.auth.oauthCallback")
) {
  fail("Nest OAuth callback must remain a POST server-verification route");
}

const notePath = path.join(root, "governance/release-master/REL-102-LOGIN-KAKAO.md");
if (fs.existsSync(notePath)) {
  const note = fs.readFileSync(notePath, "utf8");
  if (!note.includes("LIVE_KAKAO_HUMAN_E2E = NOT_RUN")) {
    fail("REL-102 evidence must keep LIVE_KAKAO_HUMAN_E2E = NOT_RUN");
  }
}

function finish() {
  if (fails.length) {
    console.error("[verify:login-kakao-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:login-kakao-closure] PASS (login + callback + terms handoff + staging/release CTA build flag + Nest POST finish · Kakao live NOT_RUN)",
  );
}

const { runAxeOnHtml, blockingViolations } = require("../e2e/lib/axe-scan.cjs");
const html = `<!doctype html><html lang="ko"><head><title>로그인</title></head>
  <body>
    <main>
      <h1>다시 오신 걸 환영해요</h1>
      <button type="button">카카오로 시작하기</button>
      <label>이메일<input type="email" /></label>
      <a href="/auth/signup">가입하기</a>
    </main>
  </body></html>`;
runAxeOnHtml(html)
  .then((results) => {
    if (blockingViolations(results).length) {
      fail("login axe fixture has blocking violations");
    }
    finish();
  })
  .catch((err) => {
    fail(`axe run error: ${err.message}`);
    finish();
  });

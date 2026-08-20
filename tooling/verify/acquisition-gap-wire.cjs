#!/usr/bin/env node
/**
 * verify:acquisition-gap-wire — C-ACQ-002
 * Gap-only web/SDK 배선. 픽셀/Figma=0. Auth Rule 재정의 0.
 */
"use strict";

const { spawnSync } = require("node:child_process");
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

const ACQ_PAGES = [
  "apps/web/app/auth/login/page.tsx",
  "apps/web/app/auth/signup/page.tsx",
  "apps/web/app/auth/complete-profile/page.tsx",
  "apps/web/app/onboarding/page.tsx",
  "apps/web/app/ads/page.tsx",
  "apps/web/app/ads/[variant]/page.tsx",
  "apps/web/app/l/[variant]/page.tsx",
];

const required = [
  "packages/sdk/src/auth/fetch.ts",
  "packages/sdk/src/auth/index.ts",
  "packages/sdk/src/auth/kakao-ready.ts",
  "packages/sdk/src/auth/types.ts",
  "packages/sdk/src/index.ts",
  "apps/web/app/components/GuestChrome.tsx",
  "apps/web/app/l/PublicAdSurface.tsx",
  "apps/web/app/auth/login/LoginClient.tsx",
  "apps/web/app/auth/signup/SignupClient.tsx",
  "apps/web/app/auth/complete-profile/CompleteProfileClient.tsx",
  "apps/web/app/onboarding/OnboardingClient.tsx",
  "docs/product/consumer/CONSUMER_ACQUISITION_CONTRACT.md",
  "governance/consumer-acquisition/acquisition.v1.json",
];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const sdkFetch = read("packages/sdk/src/auth/fetch.ts");
const sdkIdx = read("packages/sdk/src/auth/index.ts");
const rootSdk = read("packages/sdk/src/index.ts");
const sdkPkg = read("packages/sdk/package.json");
const kakaoReady = read("packages/sdk/src/auth/kakao-ready.ts");
const contract = read("docs/product/consumer/CONSUMER_ACQUISITION_CONTRACT.md");
const login = read("apps/web/app/auth/login/LoginClient.tsx");
const signup = read("apps/web/app/auth/signup/SignupClient.tsx");
const complete = read("apps/web/app/auth/complete-profile/CompleteProfileClient.tsx");
const onboarding = read("apps/web/app/onboarding/OnboardingClient.tsx");
const publicAd = read("apps/web/app/l/PublicAdSurface.tsx");
const guest = read("apps/web/app/components/GuestChrome.tsx");
const kakaoPage = read("apps/web/app/auth/oauth/kakao/page.tsx");

for (const token of [
  "export async function fetchAuthSession",
  "export async function startKakaoOAuth",
  "export async function patchAuthProfile",
  "/api/v1/auth/session",
  "/api/v1/auth/oauth/kakao/start",
  "/api/v1/auth/profile",
  'credentials: "include"',
  "SESSION_UNAVAILABLE",
]) {
  if (!sdkFetch.includes(token)) fail(`sdk auth fetch missing ${token}`);
}
if (sdkFetch.includes("providerSubject") && sdkFetch.includes("code")) {
  if (/providerSubject.*code|code.*providerSubject/.test(sdkFetch)) {
    fail("sdk must not treat authorization code as providerSubject");
  }
}
if (sdkFetch.includes("/api/v1/auth/oauth/google")) {
  fail("C-ACQ-002 must not add Google code exchange");
}
if (!sdkFetch.includes('method: "PATCH"')) {
  fail("patchAuthProfile must PATCH");
}

if (!kakaoReady.includes("NEXT_PUBLIC_OAUTH_KAKAO_ENABLED")) {
  fail("kakao-ready must require NEXT_PUBLIC_OAUTH_KAKAO_ENABLED");
}
if (/return Boolean\(.*CLIENT_ID/.test(kakaoReady)) {
  fail("kakao-ready must not enable on CLIENT_ID alone");
}

for (const name of [
  "fetchAuthSession",
  "startKakaoOAuth",
  "patchAuthProfile",
  "isKakaoOAuthReady",
]) {
  if (!sdkIdx.includes(name) || !rootSdk.includes(name)) {
    fail(`sdk index must export ${name}`);
  }
}
if (!sdkPkg.includes('"./auth"')) {
  fail("packages/sdk/package.json must export ./auth");
}

if (!login.includes("/auth/oauth/kakao")) {
  fail("login must use thin Kakao start for existing users");
}
if (!login.includes("isKakaoOAuthReady")) {
  fail("login must guard Kakao with isKakaoOAuthReady");
}
if (!login.includes("fetchAuthSession")) {
  fail("login must resume via fetchAuthSession");
}

if (!signup.includes("startKakaoOAuth")) {
  fail("signup must POST Kakao start");
}
if (!signup.includes("termsAcceptedAt") || !signup.includes("privacyAcceptedAt")) {
  fail("signup Kakao start must send terms timestamps");
}
if (!signup.includes('data-stage="A"')) {
  fail("signup must mark Stage A");
}

if (!complete.includes("patchAuthProfile")) {
  fail("complete-profile must call patchAuthProfile");
}
if (!complete.includes('data-stage="B"')) {
  fail("complete-profile must mark Stage B");
}
if (/name=["']gender["']|성별/.test(complete + signup + login)) {
  fail("auth clients must not include gender field");
}
if (/주민|rrn|RRN/.test(complete + signup + login)) {
  fail("auth clients must not include RRN field");
}

if (!onboarding.includes('href="/"') && !onboarding.includes('href={"/"}')) {
  fail("onboarding must CTA to Home /");
}
if (!onboarding.includes("시작하기")) {
  fail("onboarding must keep 시작하기 CTA");
}

for (const cta of ["실시간 시세 맵 열기", "지금 비교해 보기"]) {
  if (!publicAd.includes(cta)) fail(`public ad missing locked CTA: ${cta}`);
}
if (!publicAd.includes("/onboarding") || !publicAd.includes("/auth/login")) {
  fail("public ad CTA destinations must be /onboarding or /auth/login");
}
if (
  publicAd.includes("/auth/oauth/kakao") ||
  publicAd.includes("startKakaoOAuth")
) {
  fail("public ad must not start Kakao");
}
if (/수익|투자|USDT|테더|보장|차익|괴리율|재테크|알바/.test(publicAd)) {
  fail("public ad must not use guest banned tokens");
}

if (!guest.includes("data-guest-chrome")) {
  fail("GuestChrome must stay a guest wrapper");
}
if (/BottomNav|spark-dash-home|HomeDesktop|HomeMobile/.test(guest)) {
  fail("GuestChrome must not copy Home geometry");
}

if (kakaoPage.includes("PendingFigma")) {
  fail("kakao start page must stay thin");
}

let pending = 0;
for (const rel of ACQ_PAGES) {
  const src = read(rel);
  if (src.includes("PendingFigma")) pending += 1;
  else fail(`${rel} must keep PendingFigma`);
  if (!src.includes("GuestChrome")) {
    fail(`${rel} must wrap with GuestChrome`);
  }
  if (/spark-dash-home|HomeDesktop|HomeMobile|ProfitsDesktop/.test(src)) {
    fail(`${rel} must not copy Home/Profits geometry`);
  }
}
if (pending !== 7) {
  fail(`web PendingFigma acquisition pages must stay 7, got ${pending}`);
}

if (!contract.includes("SDK_AUTH_EXPORT = PRESENT")) {
  fail("contract must record SDK_AUTH_EXPORT = PRESENT");
}
if (!contract.includes("REAL_IMPLEMENTATION = WEB_GAP_WIRED")) {
  fail("contract must record REAL_IMPLEMENTATION = WEB_GAP_WIRED");
}
if (!contract.includes("LOGIN_SIGNUP_NEST_CALL = PRESENT")) {
  fail("contract must record LOGIN_SIGNUP_NEST_CALL = PRESENT");
}

const gov = JSON.parse(
  read("governance/consumer-acquisition/acquisition.v1.json") || "{}",
);
if (gov.implementationStatus !== "WEB_GAP_WIRED") {
  fail("implementationStatus must be WEB_GAP_WIRED");
}
if (gov.measured?.sdkAuthExport !== "PRESENT") {
  fail("measured.sdkAuthExport must be PRESENT");
}
if (gov.measured?.loginSignupNestCall !== 1) {
  fail("measured.loginSignupNestCall must be 1");
}
if (gov.measured?.webAcquisitionPendingFigma !== 7) {
  fail("measured.webAcquisitionPendingFigma must stay 7");
}
if (gov.certification?.status !== "PENDING") {
  fail("certification.status must stay PENDING until C-ACQ-003");
}
if (gov.authority?.AUTH_RULE_REDEFINITION !== "FORBIDDEN") {
  fail("AUTH_RULE_REDEFINITION must stay FORBIDDEN");
}
if (gov.authority?.GEO_PRICE_MAP !== "FORBIDDEN") {
  fail("GEO_PRICE_MAP must stay FORBIDDEN");
}

const pkg = JSON.parse(read("package.json") || "{}");
if (
  pkg.scripts?.["verify:acquisition-gap-wire"] !==
  "node tooling/verify/acquisition-gap-wire.cjs"
) {
  fail("package.json missing verify:acquisition-gap-wire");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("acquisition-gap-wire")) {
  fail("CATALOG.md must list acquisition-gap-wire");
}

const result = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    "--test",
    path.join(root, "packages/sdk/src/auth/auth-gap.test.ts"),
  ],
  { cwd: root, encoding: "utf8" },
);
if (result.status !== 0) {
  fail(`auth-gap.test.ts failed\n${result.stdout}\n${result.stderr}`);
}

if (fails.length) {
  console.error("[verify:acquisition-gap-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:acquisition-gap-wire] PASS (SDK auth · 7 PendingFigma · Kakao/terms/profile · ads lock · Home geometry 0)",
);

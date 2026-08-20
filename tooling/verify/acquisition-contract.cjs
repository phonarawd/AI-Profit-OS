#!/usr/bin/env node
/**
 * verify:acquisition-contract — C-ACQ-001 계약 유지 + C-ACQ-002 실측.
 * Auth Rule 재정의 0 · 시각 발명 0 · PendingFigma 7 유지.
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

function readJson(rel) {
  const raw = read(rel);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    fail(`${rel} invalid JSON`);
    return null;
  }
}

const CONTRACT = "docs/product/consumer/CONSUMER_ACQUISITION_CONTRACT.md";
const GOV = "governance/consumer-acquisition/acquisition.v1.json";

const ACQ_PENDING_PAGES = [
  "apps/web/app/auth/login/page.tsx",
  "apps/web/app/auth/signup/page.tsx",
  "apps/web/app/auth/complete-profile/page.tsx",
  "apps/web/app/onboarding/page.tsx",
  "apps/web/app/ads/page.tsx",
  "apps/web/app/ads/[variant]/page.tsx",
  "apps/web/app/l/[variant]/page.tsx",
];

const requiredFiles = [
  CONTRACT,
  GOV,
  ...ACQ_PENDING_PAGES,
  "apps/web/app/auth/oauth/kakao/page.tsx",
  "services/api-nest/src/auth/auth.controller.ts",
  "services/api-nest/src/auth/auth.service.ts",
  "services/api-nest/kakao-oauth.core.cjs",
  "tooling/verify/kakao-oauth-runtime.cjs",
];
for (const f of requiredFiles) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const md = read(CONTRACT);
for (const token of [
  "## 1. Product Contract",
  "## 2. Visual Contract",
  "## 3. Implementation Contract",
  "## 4. Gap analysis",
  "AUTH_RULE_REDEFINITION = FORBIDDEN",
  "APPROVED FIGMA = NONE",
  "NEW_VISUAL_LOCK = NO",
  "NEW_ROUTE = FORBIDDEN",
  "HOME_GEOMETRY_DEPENDENCY = FORBIDDEN",
  "LEGAL_SSOT_MUTATION = FORBIDDEN",
  "GEO_PRICE_MAP = FORBIDDEN",
  "G9_PUBLIC_MAP_BEFORE_SIGNUP = FORBIDDEN",
  "CODE_EQUALS_PROVIDER_SUBJECT = FORBIDDEN",
  "GENDER_FIELD = FORBIDDEN",
  "WIRE_WITHOUT_APPROVED_FIGMA = ALLOWED",
  "INVENT_PRESENTATION = FORBIDDEN",
  "WEB_ACQUISITION_PENDING_FIGMA = 7",
  "KAKAO_START_PAGE = PRESENT",
  "KAKAO_CODE_EXCHANGE = PRESENT",
  "SDK_AUTH_EXPORT = PRESENT",
  "LOGIN_SIGNUP_NEST_CALL = PRESENT",
  "REAL_IMPLEMENTATION = WEB_GAP_WIRED",
  "C-ACQ-002",
  "C-ACQ-003",
  "PendingFigma",
  "가격 차이 확인",
  "실시간 시세 맵 열기",
]) {
  if (md && !md.includes(token)) fail(`${CONTRACT} must contain: ${token}`);
}
if (md.includes("12.50")) fail(`${CONTRACT} must not invent 12.50`);

const gov = readJson(GOV);
if (gov) {
  if (gov.status !== "CONTRACT_READY") fail("governance status must be CONTRACT_READY");
  if (gov.implementationStatus !== "WEB_GAP_WIRED") {
    fail("implementationStatus must be WEB_GAP_WIRED after C-ACQ-002");
  }
  if (gov.task !== "C-ACQ-001") fail("governance task must stay C-ACQ-001");
  if (gov.authority.AUTH_RULE_REDEFINITION !== "FORBIDDEN") {
    fail("AUTH_RULE_REDEFINITION must stay FORBIDDEN");
  }
  if (gov.authority.SUPABASE_AUTH !== "FORBIDDEN") {
    fail("SUPABASE_AUTH must stay FORBIDDEN");
  }
  if (gov.authority.NEW_ROUTE !== "FORBIDDEN") fail("NEW_ROUTE must stay FORBIDDEN");
  if (gov.authority.NEW_VISUAL_LOCK !== false) fail("NEW_VISUAL_LOCK must stay false");
  if (gov.authority.APPROVED_FIGMA_ACQUISITION !== "NONE") {
    fail("APPROVED_FIGMA_ACQUISITION must stay NONE");
  }
  if (gov.authority.HOME_GEOMETRY_DEPENDENCY !== "FORBIDDEN") {
    fail("HOME_GEOMETRY_DEPENDENCY must stay FORBIDDEN");
  }
  if (gov.authority.GEO_PRICE_MAP !== "FORBIDDEN") fail("GEO_PRICE_MAP must stay FORBIDDEN");
  if (gov.authority.G9_PUBLIC_MAP_BEFORE_SIGNUP !== "FORBIDDEN") {
    fail("G9_PUBLIC_MAP_BEFORE_SIGNUP must stay FORBIDDEN");
  }
  if (gov.authority.GENDER_FIELD !== "FORBIDDEN") fail("GENDER_FIELD must stay FORBIDDEN");
  if (gov.authority.CODE_EQUALS_PROVIDER_SUBJECT !== "FORBIDDEN") {
    fail("CODE_EQUALS_PROVIDER_SUBJECT must stay FORBIDDEN");
  }
  if (gov.measured.webAcquisitionPendingFigma !== 7) {
    fail("measured.webAcquisitionPendingFigma must be 7");
  }
  if (gov.measured.kakaoStartPage !== "PRESENT") fail("kakaoStartPage must be PRESENT");
  if (gov.measured.kakaoCodeExchange !== "PRESENT") {
    fail("kakaoCodeExchange must be PRESENT after C-AUTH-001");
  }
  if (gov.measured.sdkAuthExport !== "PRESENT") {
    fail("sdkAuthExport must be PRESENT after C-ACQ-002");
  }
  if (gov.measured.loginSignupNestCall !== 1) {
    fail("loginSignupNestCall must be 1 after C-ACQ-002");
  }
  if (gov.certification?.status !== "PENDING") {
    fail("certification.status must stay PENDING until C-ACQ-003");
  }
  if (gov.certification?.task !== "C-ACQ-003") fail("certification.task must be C-ACQ-003");
  const axes = (gov.messageAxes || []).slice().sort().join(",");
  if (axes !== "MARKET_DISCOVERY,PRICE_COMPARISON,TIME_SAVING") {
    fail("messageAxes must be PRICE_COMPARISON, MARKET_DISCOVERY, TIME_SAVING");
  }
}

let pending = 0;
for (const rel of ACQ_PENDING_PAGES) {
  const src = read(rel);
  if (src.includes("PendingFigma")) pending += 1;
  else fail(`${rel} must keep PendingFigma after C-ACQ-002`);
}
if (pending !== 7) {
  fail(`web PendingFigma acquisition pages must be 7, got ${pending}`);
}

const kakaoPage = read("apps/web/app/auth/oauth/kakao/page.tsx");
if (kakaoPage.includes("PendingFigma")) {
  fail("kakao start page must stay thin redirect, not PendingFigma");
}
if (!kakaoPage.includes("/api/v1/auth/oauth/kakao/start")) {
  fail("kakao start page must point at Nest GET start");
}

const svc = read("services/api-nest/src/auth/auth.service.ts");
if (!svc.includes("exchangeKakaoCode")) {
  fail("AuthService must keep Kakao code exchange");
}
if (svc.includes("body.providerSubject ?? body.code")) {
  fail("Kakao must not treat authorization code as providerSubject");
}

const pkg = readJson("package.json");
if (
  pkg &&
  pkg.scripts?.["verify:acquisition-contract"] !==
    "node tooling/verify/acquisition-contract.cjs"
) {
  fail("package.json missing verify:acquisition-contract");
}

const catalog = read("tooling/verify/CATALOG.md");
if (catalog && !catalog.includes("acquisition-contract")) {
  fail("CATALOG.md must list acquisition-contract");
}

const ux = read("docs/product/consumer/CONSUMER_UX_ARCHITECTURE.md");
if (ux && !ux.includes("CONSUMER_ACQUISITION_CONTRACT.md")) {
  fail("CONSUMER_UX_ARCHITECTURE.md must point at acquisition contract");
}

if (fails.length) {
  console.error("[verify:acquisition-contract] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:acquisition-contract] PASS (7 PendingFigma · WEB_GAP_WIRED · SDK auth PRESENT · Home geometry 0)",
);

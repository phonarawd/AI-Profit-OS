#!/usr/bin/env node
/**
 * verify:acquisition-release — C-ACQ-003 Acquisition certification
 * 실 guest/auth/error/resume 인프로세스 E2E · known defect 0
 * Auth Rule 재정의 0 · 레거시 Canon 복구 0 · Home freeze 0 · 시각 lock 0
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

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
const RELEASE = "governance/consumer-acquisition/acquisition-release.v1.json";

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
  CONTRACT,
  GOV,
  RELEASE,
  "tooling/verify/lib/acquisition-release-runtime.cjs",
  "packages/sdk/src/auth/auth-release.test.ts",
  "packages/sdk/src/auth/fetch.ts",
  "apps/web/app/auth/auth-messages.ts",
  "apps/web/app/l/PublicAdSurface.tsx",
  "apps/web/app/auth/oauth/kakao/page.tsx",
  "services/api-nest/src/auth/auth.service.ts",
  "services/api-nest/src/auth/auth.controller.ts",
  "services/api-nest/kakao-oauth.core.cjs",
  ...ACQ_PAGES,
];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const prereqs = [
  "acquisition-contract.cjs",
  "acquisition-gap-wire.cjs",
  "kakao-oauth-runtime.cjs",
  "auth-session-cookie.cjs",
  "auth-flows.cjs",
];
for (const script of prereqs) {
  if (!fs.existsSync(path.join(__dirname, script))) {
    fail(`missing prereq verifier: ${script}`);
  }
}

const surfacePointers = [
  "marketing-compliance.cjs",
  "operator-footer.cjs",
  "landing-3s.cjs",
  "auth-surfaces.cjs",
  "onboarding-experiential.cjs",
];
for (const script of surfacePointers) {
  if (!fs.existsSync(path.join(__dirname, script))) {
    fail(`missing surface pointer verifier: ${script}`);
  }
}

const md = read(CONTRACT);
for (const token of [
  "ACQUISITION_CERTIFICATION = PASS",
  "verify:acquisition-release",
  "C-ACQ-003",
  "AUTH_RULE_REDEFINITION = FORBIDDEN",
  "WEB_ACQUISITION_PENDING_FIGMA = 7",
  "REAL_IMPLEMENTATION = WEB_GAP_WIRED",
  "LIVE_KAKAO_HUMAN_E2E = NOT_RUN",
]) {
  if (md && !md.includes(token)) fail(`${CONTRACT} must contain: ${token}`);
}
if (md.includes("ACQUISITION_CERTIFICATION = PENDING")) {
  fail("ACQUISITION_CERTIFICATION must be PASS after C-ACQ-003");
}

const gov = readJson(GOV);
if (gov) {
  if (gov.certification?.status !== "RELEASE_PASS") {
    fail("acquisition.v1 certification.status must be RELEASE_PASS");
  }
  if (gov.certification?.task !== "C-ACQ-003") {
    fail("acquisition.v1 certification.task must be C-ACQ-003");
  }
  if ((gov.nextSlices || []).includes("C-ACQ-003")) {
    fail("nextSlices must drop C-ACQ-003 after certification");
  }
  if (gov.authority.AUTH_RULE_REDEFINITION !== "FORBIDDEN") {
    fail("AUTH_RULE_REDEFINITION must stay FORBIDDEN");
  }
  if (gov.authority.SUPABASE_AUTH !== "FORBIDDEN") {
    fail("SUPABASE_AUTH must stay FORBIDDEN");
  }
  if (gov.authority.NEW_VISUAL_LOCK !== false) {
    fail("NEW_VISUAL_LOCK must stay false");
  }
  if (gov.authority.HOME_GEOMETRY_DEPENDENCY !== "FORBIDDEN") {
    fail("HOME_GEOMETRY_DEPENDENCY must stay FORBIDDEN");
  }
  if (gov.authority.GEO_PRICE_MAP !== "FORBIDDEN") {
    fail("GEO_PRICE_MAP must stay FORBIDDEN");
  }
  if (gov.authority.CODE_EQUALS_PROVIDER_SUBJECT !== "FORBIDDEN") {
    fail("CODE_EQUALS_PROVIDER_SUBJECT must stay FORBIDDEN");
  }
  if (gov.measured.webAcquisitionPendingFigma !== 7) {
    fail("measured.webAcquisitionPendingFigma must stay 7");
  }
}

const release = readJson(RELEASE);
if (release) {
  if (release.status !== "RELEASE_PASS") fail("release status must be RELEASE_PASS");
  if (!Array.isArray(release.knownDefects) || release.knownDefects.length !== 0) {
    fail("knownDefects must be []");
  }
  for (const proof of [
    "SESSION_401_STAYS_GUEST",
    "ADS_CORE_REDIRECT_0",
    "EXISTING_IDENTITY_NO_TERMS",
    "NEW_IDENTITY_TERMS_REQUIRED",
    "CODE_NOT_PROVIDER_SUBJECT",
    "OAUTH_DENIED_TO_LOGIN",
    "TERMS_REQUIRED_TO_SIGNUP",
    "SESSION_B_COMPLETE_HOME",
    "EXISTING_KAKAO_NO_TERMS_RECOLLECT",
  ]) {
    const rails = [
      ...(release.e2e?.guest || []),
      ...(release.e2e?.auth || []),
      ...(release.e2e?.error || []),
      ...(release.e2e?.resume || []),
    ];
    if (!rails.includes(proof)) fail(`release e2e missing proof ${proof}`);
  }
  if (release.e2e?.liveKakaoHumanE2e !== "NOT_RUN") {
    fail("liveKakaoHumanE2e must stay NOT_RUN (not a known defect)");
  }
  if (release.e2e?.httpBrowser !== "NOT_THIS_SLICE") {
    fail("httpBrowser must stay NOT_THIS_SLICE on Phase0");
  }
}

let pending = 0;
for (const rel of ACQ_PAGES) {
  const src = read(rel);
  if (src.includes("PendingFigma")) pending += 1;
  else fail(`${rel} must keep PendingFigma`);
  if (/HomeDesktop|HomeMobile|spark-dash-home/.test(src)) {
    fail(`${rel} must not copy Home geometry`);
  }
  if (src.includes("12.50") || /Math\.random/.test(src)) {
    fail(`${rel} must not invent money or RNG`);
  }
}
if (pending !== 7) {
  fail(`web PendingFigma acquisition pages must stay 7, got ${pending}`);
}

const kakaoPage = read("apps/web/app/auth/oauth/kakao/page.tsx");
if (kakaoPage.includes("PendingFigma")) {
  fail("kakao start page must stay thin");
}

if (process.env.ACQUISITION_RELEASE_NESTED !== "1") {
  for (const script of prereqs) {
    const r = spawnSync(process.execPath, [path.join(__dirname, script)], {
      cwd: root,
      encoding: "utf8",
    });
    process.stdout.write(r.stdout || "");
    process.stderr.write(r.stderr || "");
    if (r.status !== 0) fail(`prereq ${script} failed`);
  }
}

const runtime = require("./lib/acquisition-release-runtime.cjs");
const ran = runtime.runAll();
for (const msg of ran.fails) fail(msg);

const pkg = readJson("package.json");
if (
  pkg &&
  pkg.scripts?.["verify:acquisition-release"] !==
    "node tooling/verify/acquisition-release.cjs"
) {
  fail("package.json missing verify:acquisition-release");
}
const catalog = read("tooling/verify/CATALOG.md");
if (catalog && !catalog.includes("acquisition-release")) {
  fail("CATALOG.md must list acquisition-release");
}

if (fails.length) {
  console.error("[verify:acquisition-release] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:acquisition-release] PASS (guest/auth/error/resume in-process · known defect 0 · Auth KEEP)",
);

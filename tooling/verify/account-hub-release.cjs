#!/usr/bin/env node
/**
 * verify:account-hub-release — C-ACC-003 Account Hub certification
 * 핵심 8영역 route-contract 100% · 호환 4면 재확인 · known defect 0
 * Auth/Money Rule 재정의 0 · 레거시 Canon 복구 0 · Home freeze 0 · 시각 lock 0
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

const CONTRACT = "docs/product/consumer/CONSUMER_ACCOUNT_HUB_CONTRACT.md";
const GOV = "governance/consumer-account-hub/account-hub.v1.json";
const RELEASE = "governance/consumer-account-hub/account-hub-release.v1.json";

const PRIMARY_PAGES = [
  "apps/web/app/me/page.tsx",
  "apps/web/app/me/invite/page.tsx",
  "apps/web/app/me/inbox/page.tsx",
  "apps/web/app/me/kyc/page.tsx",
  "apps/web/app/me/settings/page.tsx",
  "apps/web/app/me/support/page.tsx",
  "apps/web/app/me/guide/faq/page.tsx",
  "apps/web/app/me/guide/usdt/page.tsx",
  "apps/web/app/me/guide/get-usdt/page.tsx",
  "apps/web/app/me/guide/principal/page.tsx",
  "apps/web/app/me/guide/revenue/page.tsx",
  "apps/web/app/me/guide/partners/page.tsx",
  "apps/web/app/me/guide/market-weekly/page.tsx",
  "apps/web/app/me/legal/page.tsx",
  "apps/web/app/me/legal/terms/page.tsx",
  "apps/web/app/me/legal/privacy/page.tsx",
  "apps/web/app/me/legal/license/page.tsx",
  "apps/web/app/me/legal/oss/page.tsx",
];

const COMPAT_PAGES = [
  "apps/web/app/me/membership/page.tsx",
  "apps/web/app/me/benefits/page.tsx",
  "apps/web/app/me/events/page.tsx",
  "apps/web/app/me/strategies/page.tsx",
];

const required = [
  CONTRACT,
  GOV,
  RELEASE,
  "tooling/verify/lib/account-hub-release-runtime.cjs",
  "apps/web/app/me/ProfileClient.tsx",
  "apps/web/app/me/invite/InviteClient.tsx",
  "apps/web/app/me/inbox/InboxClient.tsx",
  "apps/web/app/me/kyc/KycClient.tsx",
  "apps/web/app/me/settings/SettingsClient.tsx",
  "apps/web/app/me/support/SupportClient.tsx",
  "apps/web/app/me/GuideLinks.tsx",
  "apps/web/app/me/LegalLinks.tsx",
  "apps/web/app/me/peotteok/page.tsx",
  "apps/web/routes.ts",
  "packages/sdk/src/referral/fetch.ts",
  "packages/sdk/src/inbox/fetch.ts",
  "packages/sdk/src/auth/fetch.ts",
  "packages/sdk/src/wallet/fetch.ts",
  "services/api-nest/src/compliance/kyc-gate.ts",
  "services/api-nest/src/membership/membership.user.routes.ts",
  "services/api-nest/src/missions/benefits.user.routes.ts",
  ...PRIMARY_PAGES,
  ...COMPAT_PAGES,
];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const prereqs = ["account-hub-contract.cjs", "account-hub-gap-wire.cjs"];
for (const script of prereqs) {
  if (!fs.existsSync(path.join(__dirname, script))) {
    fail(`missing prereq verifier: ${script}`);
  }
}

const surfacePointers = [
  "invite-explain-surfaces.cjs",
  "ops-inbox.cjs",
  "notification-prefs-default-on.cjs",
  "kyc-surfaces.cjs",
  "wallet-kyc-session-auth.cjs",
  "legal-plain-ko.cjs",
  "membership-surfaces.cjs",
  "market-briefing-no-investment-advice.cjs",
  "referral-unlimited-invites.cjs",
  "auth-flows.cjs",
];
for (const script of surfacePointers) {
  if (!fs.existsSync(path.join(__dirname, script))) {
    fail(`missing surface pointer verifier: ${script}`);
  }
}

const md = read(CONTRACT);
for (const token of [
  "ACCOUNT_HUB_CERTIFICATION = PASS",
  "verify:account-hub-release",
  "C-ACC-003",
  "AUTH_RULE_REDEFINITION = FORBIDDEN",
  "MONEY_RULE_REDEFINITION = FORBIDDEN",
  "WEB_ACCOUNT_HUB_PRIMARY_PENDING_FIGMA = 18",
  "WEB_ACCOUNT_HUB_COMPAT_PENDING_FIGMA = 4",
  "REAL_IMPLEMENTATION = WEB_GAP_WIRED",
  "REQUIREMENT_PRESERVED = YES",
  "PRIMARY_NAV_PRIORITY = LOWERED",
  "FUNCTION_DELETE = FORBIDDEN",
]) {
  if (md && !md.includes(token)) fail(`${CONTRACT} must contain: ${token}`);
}
if (md.includes("CERTIFICATION = NOT_STARTED")) {
  fail("CERTIFICATION must be RELEASE_PASS after C-ACC-003");
}
if (md.includes("ACCOUNT_HUB_CERTIFICATION = PENDING")) {
  fail("ACCOUNT_HUB_CERTIFICATION must be PASS after C-ACC-003");
}

const gov = readJson(GOV);
if (gov) {
  if (gov.certification?.status !== "RELEASE_PASS") {
    fail("account-hub.v1 certification.status must be RELEASE_PASS");
  }
  if (gov.certification?.task !== "C-ACC-003") {
    fail("account-hub.v1 certification.task must be C-ACC-003");
  }
  if ((gov.nextSlices || []).includes("C-ACC-003")) {
    fail("nextSlices must drop C-ACC-003 after certification");
  }
  if (!(gov.nextSlices || []).includes("C-ACC-004")) {
    fail("nextSlices must keep C-ACC-004");
  }
  if (gov.authority.AUTH_RULE_REDEFINITION !== "FORBIDDEN") {
    fail("AUTH_RULE_REDEFINITION must stay FORBIDDEN");
  }
  if (gov.authority.MONEY_RULE_REDEFINITION !== "FORBIDDEN") {
    fail("MONEY_RULE_REDEFINITION must stay FORBIDDEN");
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
  if (gov.authority.FUNCTION_DELETE !== "FORBIDDEN") {
    fail("FUNCTION_DELETE must stay FORBIDDEN");
  }
  if (gov.authority.PRIMARY_NAV_PRIORITY !== "LOWERED") {
    fail("PRIMARY_NAV_PRIORITY must stay LOWERED");
  }
  if (gov.measured.webAccountHubPrimaryPendingFigma !== 18) {
    fail("measured.webAccountHubPrimaryPendingFigma must stay 18");
  }
  if (gov.measured.webAccountHubCompatPendingFigma !== 4) {
    fail("measured.webAccountHubCompatPendingFigma must stay 4");
  }
}

const release = readJson(RELEASE);
if (release) {
  if (release.status !== "RELEASE_PASS") fail("release status must be RELEASE_PASS");
  if (!Array.isArray(release.knownDefects) || release.knownDefects.length !== 0) {
    fail("knownDefects must be []");
  }
  const rails = [
    ...(release.e2e?.primary || []),
    ...(release.e2e?.compat || []),
    ...(release.e2e?.invariant || []),
  ];
  for (const proof of [
    "PROFILE_ROUTE_WIRED",
    "REFERRAL_ROUTE_WIRED",
    "NOTIFICATIONS_ROUTE_WIRED",
    "KYC_ROUTE_WIRED",
    "SETTINGS_ROUTE_WIRED",
    "SUPPORT_ROUTE_WIRED",
    "GUIDES_ROUTE_WIRED",
    "LEGAL_ROUTE_WIRED",
    "PRIMARY_CTA_MATRIX_100",
    "MEMBERSHIP_COMPAT_KEPT",
    "BENEFITS_COMPAT_KEPT",
    "EVENTS_COMPAT_KEPT",
    "STRATEGIES_COMPAT_KEPT",
    "COMPAT_NOT_IN_PRIMARY_NAV",
    "KYC_WITHDRAW_ONLY",
    "FUNCTION_DELETE_0",
  ]) {
    if (!rails.includes(proof)) fail(`release e2e missing proof ${proof}`);
  }
  if (release.e2e?.httpBrowser !== "NOT_THIS_SLICE") {
    fail("httpBrowser must stay NOT_THIS_SLICE on Phase0");
  }
}

if (process.env.ACCOUNT_HUB_RELEASE_NESTED !== "1") {
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

const runtime = require("./lib/account-hub-release-runtime.cjs");
const ran = runtime.runAll();
for (const msg of ran.fails) fail(msg);

const pkg = readJson("package.json");
if (
  pkg &&
  pkg.scripts?.["verify:account-hub-release"] !==
    "node tooling/verify/account-hub-release.cjs"
) {
  fail("package.json missing verify:account-hub-release");
}
const catalog = read("tooling/verify/CATALOG.md");
if (catalog && !catalog.includes("account-hub-release")) {
  fail("CATALOG.md must list account-hub-release");
}

if (fails.length) {
  console.error("[verify:account-hub-release] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:account-hub-release] PASS (8-area route-contract 100% · compat 4 kept · known defect 0 · Auth/Money KEEP)",
);

#!/usr/bin/env node
/**
 * verify:account-hub-contract — C-ACC-001
 * Product/Visual/Implementation 계약 유지 + 2026-08-20 재실측.
 * 8영역 · web PendingFigma 18 · 호환 4면 보존 · Auth/Money Rule 재정의 0.
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

const CONTRACT = "docs/product/consumer/CONSUMER_ACCOUNT_HUB_CONTRACT.md";
const GOV = "governance/consumer-account-hub/account-hub.v1.json";

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

const PRIMARY_ROUTES = [
  "/me",
  "/me/invite",
  "/me/inbox",
  "/me/kyc",
  "/me/settings",
  "/me/support",
  "/me/guide/faq",
  "/me/guide/usdt",
  "/me/guide/get-usdt",
  "/me/guide/principal",
  "/me/guide/revenue",
  "/me/guide/partners",
  "/me/guide/market-weekly",
  "/me/legal",
  "/me/legal/terms",
  "/me/legal/privacy",
  "/me/legal/license",
  "/me/legal/oss",
];

const COMPAT_ROUTES = [
  "/me/membership",
  "/me/benefits",
  "/me/events",
  "/me/strategies",
];

const requiredFiles = [
  CONTRACT,
  GOV,
  ...PRIMARY_PAGES,
  ...COMPAT_PAGES,
  "apps/web/app/me/peotteok/page.tsx",
  "apps/web/routes.ts",
  "packages/sdk/src/index.ts",
  "packages/sdk/src/auth/fetch.ts",
  "packages/sdk/src/wallet/fetch.ts",
  "packages/sdk/src/referral/fetch.ts",
  "packages/sdk/src/inbox/fetch.ts",
  "services/api-nest/src/auth/auth.controller.ts",
  "services/api-nest/src/auth/auth.routes.ts",
  "services/api-nest/src/referral/referral.controller.ts",
  "services/api-nest/src/referral/referral.routes.ts",
  "services/api-nest/src/inbox/inbox.user.controller.ts",
  "services/api-nest/src/inbox/inbox.user.routes.ts",
  "services/api-nest/src/compliance/kyc.controller.ts",
  "services/api-nest/src/compliance/kyc.service.ts",
  "services/api-nest/src/compliance/kyc-gate.ts",
  "services/api-nest/src/wallet/wallet.controller.ts",
  "services/api-nest/src/membership/membership.user.controller.ts",
  "services/api-nest/src/missions/benefits.user.routes.ts",
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
  "MONEY_RULE_REDEFINITION = FORBIDDEN",
  "APPROVED FIGMA = NONE",
  "NEW_VISUAL_LOCK = NO",
  "NEW_ROUTE = FORBIDDEN",
  "HOME_GEOMETRY_DEPENDENCY = FORBIDDEN",
  "LEGAL_SSOT_MUTATION = FORBIDDEN",
  "GENDER_FIELD = FORBIDDEN",
  "RRN_FIELD = FORBIDDEN",
  "KYC_ON_WITHDRAW = REQUIRED",
  "KYC_ON_PARTICIPATE = FORBIDDEN",
  "KYC_ON_DEPOSIT = FORBIDDEN",
  "REFERRAL_PERCENT_HARDCODE = FORBIDDEN",
  "L1_L2_L3_USER_LABEL = FORBIDDEN",
  "FUNCTION_DELETE = FORBIDDEN",
  "PRIMARY_NAV_PRIORITY = LOWERED",
  "REQUIREMENT_PRESERVED = YES",
  "WIRE_WITHOUT_APPROVED_FIGMA = ALLOWED",
  "INVENT_PRESENTATION = FORBIDDEN",
  "WEB_ACCOUNT_HUB_PRIMARY_PENDING_FIGMA = 18",
  "WEB_ACCOUNT_HUB_COMPAT_PENDING_FIGMA = 4",
  "SDK_KYC_EXPORT = PRESENT",
  "SDK_AUTH_SESSION_EXPORT = PRESENT",
  "SDK_REFERRAL_EXPORT = PRESENT",
  "SDK_INBOX_EXPORT = PRESENT",
  "REAL_IMPLEMENTATION = WEB_GAP_WIRED",
  "C-ACC-002",
  "C-ACC-003",
  "PendingFigma",
]) {
  if (md && !md.includes(token)) fail(`${CONTRACT} must contain: ${token}`);
}
if (md.includes("12.50")) fail(`${CONTRACT} must not invent 12.50`);

const gov = readJson(GOV);
if (gov) {
  if (gov.status !== "CONTRACT_READY") {
    fail("governance status must be CONTRACT_READY");
  }
  if (gov.implementationStatus !== "WEB_GAP_WIRED") {
    fail("implementationStatus must be WEB_GAP_WIRED after C-ACC-002");
  }
  if (gov.task !== "C-ACC-001") fail("governance task must be C-ACC-001");
  if (gov.authority.AUTH_RULE_REDEFINITION !== "FORBIDDEN") {
    fail("AUTH_RULE_REDEFINITION must stay FORBIDDEN");
  }
  if (gov.authority.MONEY_RULE_REDEFINITION !== "FORBIDDEN") {
    fail("MONEY_RULE_REDEFINITION must stay FORBIDDEN");
  }
  if (gov.authority.SUPABASE_AUTH !== "FORBIDDEN") {
    fail("SUPABASE_AUTH must stay FORBIDDEN");
  }
  if (gov.authority.NEW_ROUTE !== "FORBIDDEN") fail("NEW_ROUTE must stay FORBIDDEN");
  if (gov.authority.NEW_VISUAL_LOCK !== false) {
    fail("NEW_VISUAL_LOCK must stay false");
  }
  if (gov.authority.APPROVED_FIGMA_ACCOUNT_HUB !== "NONE") {
    fail("APPROVED_FIGMA_ACCOUNT_HUB must stay NONE");
  }
  if (gov.authority.HOME_GEOMETRY_DEPENDENCY !== "FORBIDDEN") {
    fail("HOME_GEOMETRY_DEPENDENCY must stay FORBIDDEN");
  }
  if (gov.authority.LEGAL_SSOT_MUTATION !== "FORBIDDEN") {
    fail("LEGAL_SSOT_MUTATION must stay FORBIDDEN");
  }
  if (gov.authority.GENDER_FIELD !== "FORBIDDEN") fail("GENDER_FIELD must stay FORBIDDEN");
  if (gov.authority.RRN_FIELD !== "FORBIDDEN") fail("RRN_FIELD must stay FORBIDDEN");
  if (gov.authority.KYC_ON_WITHDRAW !== "REQUIRED") {
    fail("KYC_ON_WITHDRAW must stay REQUIRED");
  }
  if (gov.authority.KYC_ON_PARTICIPATE !== "FORBIDDEN") {
    fail("KYC_ON_PARTICIPATE must stay FORBIDDEN");
  }
  if (gov.authority.KYC_ON_DEPOSIT !== "FORBIDDEN") {
    fail("KYC_ON_DEPOSIT must stay FORBIDDEN");
  }
  if (gov.authority.FUNCTION_DELETE !== "FORBIDDEN") {
    fail("FUNCTION_DELETE must stay FORBIDDEN");
  }
  if (gov.authority.PRIMARY_NAV_PRIORITY !== "LOWERED") {
    fail("PRIMARY_NAV_PRIORITY must stay LOWERED");
  }
  if (!Array.isArray(gov.primaryAreas) || gov.primaryAreas.length !== 8) {
    fail("governance.primaryAreas must list exactly 8 areas");
  }
  const areaIds = (gov.primaryAreas || []).map((a) => a.id).join(",");
  if (
    areaIds !==
    "profile,referral,notifications,kyc,settings,support,guides,legal"
  ) {
    fail("primaryAreas must stay the Founder 8-area rescope");
  }
  if ((gov.compatibility || []).length !== 4) {
    fail("compatibility must list membership/benefits/events/strategies");
  }
  if (gov.measured.webAccountHubPrimaryPendingFigma !== 18) {
    fail("measured.webAccountHubPrimaryPendingFigma must be 18");
  }
  if (gov.measured.webAccountHubCompatPendingFigma !== 4) {
    fail("measured.webAccountHubCompatPendingFigma must be 4");
  }
  if (gov.measured.sdkKycExport !== "PRESENT") {
    fail("sdkKycExport must be PRESENT");
  }
  if (gov.measured.sdkReferralExport !== "PRESENT") {
    fail("sdkReferralExport must be PRESENT after C-ACC-002");
  }
  if (gov.measured.sdkInboxExport !== "PRESENT") {
    fail("sdkInboxExport must be PRESENT after C-ACC-002");
  }
  if (gov.certification?.task !== "C-ACC-003") {
    fail("certification.task must be C-ACC-003");
  }
  if (gov.certification?.status === "RELEASE_PASS") {
    fail("certification.status must stay NOT_STARTED until C-ACC-003");
  }
  const next = gov.nextSlices || [];
  if (!next.includes("C-ACC-003")) {
    fail("nextSlices must keep C-ACC-003");
  }
  if (next.includes("C-ACC-002")) {
    fail("nextSlices must drop C-ACC-002 after wiring");
  }
}

let primaryPending = 0;
for (const rel of PRIMARY_PAGES) {
  const src = read(rel);
  if (src.includes("PendingFigma")) primaryPending += 1;
    else fail(`${rel} must keep PendingFigma after C-ACC-002`);
}
if (primaryPending !== 18) {
  fail(`web primary PendingFigma must be 18, got ${primaryPending}`);
}

let compatPending = 0;
for (const rel of COMPAT_PAGES) {
  const src = read(rel);
  if (src.includes("PendingFigma")) compatPending += 1;
  else fail(`${rel} compatibility page must stay PendingFigma (do not delete)`);
}
if (compatPending !== 4) {
  fail(`web compat PendingFigma must be 4, got ${compatPending}`);
}

const routes = read("apps/web/routes.ts");
for (const r of [...PRIMARY_ROUTES, ...COMPAT_ROUTES, "/me/peotteok"]) {
  if (!routes.includes(`"${r}"`)) {
    fail(`USER_ROUTE_PATHS must keep ${r}`);
  }
}

const sdkIndex = read("packages/sdk/src/index.ts");
if (!sdkIndex.includes("fetchKycStatus")) {
  fail("sdk must keep fetchKycStatus");
}
if (!sdkIndex.includes("fetchAuthSession")) {
  fail("sdk must keep fetchAuthSession");
}
if (!sdkIndex.includes("fetchReferralMe")) {
  fail("sdk must export fetchReferralMe after C-ACC-002");
}
if (!sdkIndex.includes("listInbox")) {
  fail("sdk must export listInbox after C-ACC-002");
}
if (!sdkIndex.includes("logoutAuth") || !sdkIndex.includes("deleteAuthAccount")) {
  fail("sdk must export logoutAuth and deleteAuthAccount");
}
if (!sdkIndex.includes("createDepositDispute")) {
  fail("sdk must export createDepositDispute");
}

const kycGate = read("services/api-nest/src/compliance/kyc-gate.ts");
if (!kycGate.includes("participateGate") || !kycGate.includes("kycRequired: false")) {
  fail("kyc-gate must keep participate KYC-free");
}
if (!kycGate.includes("assertWithdrawKyc")) {
  fail("kyc-gate must keep withdraw KYC");
}

const kycSvc = read("services/api-nest/src/compliance/kyc.service.ts");
if (!kycSvc.includes("rrnFull") || !kycSvc.includes("gender")) {
  fail("kyc.service must keep rrnFull/gender NEVER comment");
}

const referral = read("services/api-nest/src/referral/referral.controller.ts");
if (!referral.includes("inviteCountUnlimited: true")) {
  fail("referral/me must keep inviteCountUnlimited");
}
if (!referral.includes("rewardsEnabled")) {
  fail("referral/me must keep rewardsEnabled");
}

const inboxRoutes = read("services/api-nest/src/inbox/inbox.user.routes.ts");
for (const token of ["me/inbox", "me/notification-prefs"]) {
  if (!inboxRoutes.includes(token)) fail(`INBOX_USER_ROUTES must include ${token}`);
}

const walletRoutes = read("services/api-nest/src/wallet/wallet.routes.ts");
if (!walletRoutes.includes("depositDisputes")) {
  fail("WALLET_USER_ROUTES must keep depositDisputes");
}

const pkg = readJson("package.json");
if (
  pkg &&
  pkg.scripts?.["verify:account-hub-contract"] !==
    "node tooling/verify/account-hub-contract.cjs"
) {
  fail("package.json missing verify:account-hub-contract");
}

const catalog = read("tooling/verify/CATALOG.md");
if (catalog && !catalog.includes("account-hub-contract")) {
  fail("CATALOG.md must list account-hub-contract");
}

const ux = read("docs/product/consumer/CONSUMER_UX_ARCHITECTURE.md");
if (ux && !ux.includes("CONSUMER_ACCOUNT_HUB_CONTRACT.md")) {
  fail("CONSUMER_UX_ARCHITECTURE.md must point at account hub contract");
}

if (fails.length) {
  console.error("[verify:account-hub-contract] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:account-hub-contract] PASS (8 areas · PendingFigma 18+4 · WEB_GAP_WIRED · Home geometry 0)",
);

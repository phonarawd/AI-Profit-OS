#!/usr/bin/env node
/**
 * verify:account-hub-gap-wire — C-ACC-002
 * Gap-only web/SDK 배선. 픽셀/Figma=0. Auth/Money Rule 재정의 0.
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

const CLIENTS = [
  "apps/web/app/me/ProfileClient.tsx",
  "apps/web/app/me/invite/InviteClient.tsx",
  "apps/web/app/me/inbox/InboxClient.tsx",
  "apps/web/app/me/kyc/KycClient.tsx",
  "apps/web/app/me/settings/SettingsClient.tsx",
  "apps/web/app/me/support/SupportClient.tsx",
];

const required = [
  ...CLIENTS,
  "apps/web/app/me/GuideLinks.tsx",
  "apps/web/app/me/LegalLinks.tsx",
  "packages/sdk/src/referral/fetch.ts",
  "packages/sdk/src/inbox/fetch.ts",
  "packages/sdk/src/auth/fetch.ts",
  "packages/sdk/src/wallet/fetch.ts",
  "packages/sdk/src/index.ts",
  "docs/product/consumer/CONSUMER_ACCOUNT_HUB_CONTRACT.md",
  "governance/consumer-account-hub/account-hub.v1.json",
];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const sdkAuth = read("packages/sdk/src/auth/fetch.ts");
const sdkReferral = read("packages/sdk/src/referral/fetch.ts");
const sdkInbox = read("packages/sdk/src/inbox/fetch.ts");
const sdkWallet = read("packages/sdk/src/wallet/fetch.ts");
const sdkIdx = read("packages/sdk/src/index.ts");
const sdkPkg = read("packages/sdk/package.json");
const contract = read("docs/product/consumer/CONSUMER_ACCOUNT_HUB_CONTRACT.md");
const profile = read("apps/web/app/me/ProfileClient.tsx");
const invite = read("apps/web/app/me/invite/InviteClient.tsx");
const inbox = read("apps/web/app/me/inbox/InboxClient.tsx");
const kyc = read("apps/web/app/me/kyc/KycClient.tsx");
const settings = read("apps/web/app/me/settings/SettingsClient.tsx");
const support = read("apps/web/app/me/support/SupportClient.tsx");
const partners = read("apps/web/app/me/guide/partners/page.tsx");
const weekly = read("apps/web/app/me/guide/market-weekly/page.tsx");
const license = read("apps/web/app/me/legal/license/page.tsx");
const terms = read("apps/web/app/me/legal/terms/page.tsx");

for (const token of [
  "export async function logoutAuth",
  "export async function deleteAuthAccount",
  "/api/v1/auth/logout",
  "/api/v1/auth/delete-account",
]) {
  if (!sdkAuth.includes(token)) fail(`sdk auth missing ${token}`);
}

for (const token of [
  "export async function fetchReferralMe",
  "export async function bindReferral",
  "export async function shareReferral",
  "/api/v1/referral/me",
  "/api/v1/referral/bind",
  "/api/v1/referral/share",
  "inviteCountUnlimited",
]) {
  if (!sdkReferral.includes(token)) fail(`sdk referral missing ${token}`);
}

for (const token of [
  "export async function listInbox",
  "export async function markInboxRead",
  "export async function fetchNotificationPrefs",
  "export async function putNotificationPrefs",
  "/api/v1/me/inbox",
  "/api/v1/me/notification-prefs",
]) {
  if (!sdkInbox.includes(token)) fail(`sdk inbox missing ${token}`);
}

for (const token of [
  "export async function createDepositDispute",
  "/api/v1/wallet/deposit-disputes",
]) {
  if (!sdkWallet.includes(token)) fail(`sdk wallet missing ${token}`);
}

for (const name of [
  "fetchReferralMe",
  "listInbox",
  "logoutAuth",
  "deleteAuthAccount",
  "createDepositDispute",
]) {
  if (!sdkIdx.includes(name)) fail(`sdk index must export ${name}`);
}
if (!sdkPkg.includes('"./referral"') || !sdkPkg.includes('"./inbox"')) {
  fail("packages/sdk/package.json must export ./referral and ./inbox");
}

if (!profile.includes("logoutAuth")) fail("profile must call logoutAuth");
if (!invite.includes("fetchReferralMe") || !invite.includes("bindReferral")) {
  fail("invite must wire referral me/bind");
}
if (!invite.includes("shareReferral")) fail("invite must call shareReferral");
if (!inbox.includes("listInbox") || !inbox.includes("markInboxRead")) {
  fail("inbox must list and mark read");
}
if (!kyc.includes("fetchKycStatus") || !kyc.includes("submitKyc")) {
  fail("kyc must use existing SDK status/submit");
}
if (!settings.includes("putNotificationPrefs") || !settings.includes("deleteAuthAccount")) {
  fail("settings must save prefs and delete account");
}
if (!support.includes("createDepositDispute")) {
  fail("support must POST deposit disputes");
}

const surface = [profile, invite, inbox, kyc, settings, support].join("\n");
if (/name=["']gender["']|성별/.test(surface)) {
  fail("account hub clients must not include gender field");
}
if (/주민번호|rrnFull|name=["']rrn/i.test(surface)) {
  fail("account hub clients must not include RRN field");
}
if (/\bL1\b|\bL2\b|\bL3\b/.test(invite)) {
  fail("invite must not show L1/L2/L3 user labels");
}
if (/12\.50|%\s*보상|추천\s*\d+\s*%/.test(invite)) {
  fail("invite must not hardcode referral percent");
}

if (!partners.includes("eBay") || !partners.includes("Yahoo! JAPAN Auction")) {
  fail("partners guide must keep Founder lock names");
}
if (!weekly.includes("투자 권유가 아니")) {
  fail("market-weekly must keep no-investment-advice");
}
if (!license.includes("operator") && !license.includes("legalName")) {
  fail("license page must use operator-entity SSOT");
}
if (/제\s*1\s*조|본 약관은/.test(terms)) {
  fail("terms page must not invent legal articles");
}

let pending = 0;
for (const rel of PRIMARY_PAGES) {
  const src = read(rel);
  if (src.includes("PendingFigma")) pending += 1;
  else fail(`${rel} must keep PendingFigma`);
  if (/spark-dash-home|HomeDesktop|HomeMobile|ProfitsDesktop/.test(src)) {
    fail(`${rel} must not copy Home/Profits geometry`);
  }
}
if (pending !== 18) {
  fail(`web primary PendingFigma must stay 18, got ${pending}`);
}

let compatPending = 0;
for (const rel of COMPAT_PAGES) {
  const src = read(rel);
  if (src.includes("PendingFigma")) compatPending += 1;
  if (/ProfileClient|InviteClient|membership grade|L1/.test(src) === false) {
    /* keep-only pages */
  }
}
if (compatPending !== 4) {
  fail(`web compat PendingFigma must stay 4, got ${compatPending}`);
}

if (!contract.includes("SDK_REFERRAL_EXPORT = PRESENT")) {
  fail("contract must record SDK_REFERRAL_EXPORT = PRESENT");
}
if (!contract.includes("REAL_IMPLEMENTATION = WEB_GAP_WIRED")) {
  fail("contract must record REAL_IMPLEMENTATION = WEB_GAP_WIRED");
}

const gov = JSON.parse(
  read("governance/consumer-account-hub/account-hub.v1.json") || "{}",
);
if (gov.implementationStatus !== "WEB_GAP_WIRED") {
  fail("implementationStatus must be WEB_GAP_WIRED");
}
if (gov.measured?.sdkReferralExport !== "PRESENT") {
  fail("measured.sdkReferralExport must be PRESENT");
}
if (gov.measured?.sdkInboxExport !== "PRESENT") {
  fail("measured.sdkInboxExport must be PRESENT");
}
if (gov.measured?.webAccountHubPrimaryPendingFigma !== 18) {
  fail("measured.webAccountHubPrimaryPendingFigma must stay 18");
}
if (gov.authority?.AUTH_RULE_REDEFINITION !== "FORBIDDEN") {
  fail("AUTH_RULE_REDEFINITION must stay FORBIDDEN");
}
if (gov.authority?.MONEY_RULE_REDEFINITION !== "FORBIDDEN") {
  fail("MONEY_RULE_REDEFINITION must stay FORBIDDEN");
}
if (gov.authority?.HOME_GEOMETRY_DEPENDENCY !== "FORBIDDEN") {
  fail("HOME_GEOMETRY_DEPENDENCY must stay FORBIDDEN");
}
if (gov.certification?.status === "RELEASE_PASS") {
  fail("certification.status must stay NOT_STARTED until C-ACC-003");
}

const pkg = JSON.parse(read("package.json") || "{}");
if (
  pkg.scripts?.["verify:account-hub-gap-wire"] !==
  "node tooling/verify/account-hub-gap-wire.cjs"
) {
  fail("package.json missing verify:account-hub-gap-wire");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("account-hub-gap-wire")) {
  fail("CATALOG.md must list account-hub-gap-wire");
}

function runNodeTest(rel) {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--test", path.join(root, rel)],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) {
    fail(`${rel} tests failed\n${result.stdout}\n${result.stderr}`);
  }
}

runNodeTest("packages/sdk/src/referral/referral-gap.test.ts");
runNodeTest("packages/sdk/src/inbox/inbox-gap.test.ts");
runNodeTest("packages/sdk/src/auth/auth-gap.test.ts");

if (fails.length) {
  console.error("[verify:account-hub-gap-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:account-hub-gap-wire] PASS (SDK referral/inbox/logout/disputes · 18 PendingFigma · Home geometry 0)",
);

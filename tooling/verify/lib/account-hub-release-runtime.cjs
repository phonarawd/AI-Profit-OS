/**
 * C-ACC-003 인프로세스 Account Hub route-contract + 호환경로 재확인.
 * Auth/Money Rule 재정의 0 · 브라우저 E2E 0 · Home/Canon 복구 0.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) return "";
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

const PRIMARY_CTA_ROWS = [
  "Profile | 초대",
  "Profile | 알림",
  "Profile | 본인 확인",
  "Profile | 설정",
  "Profile | 고객지원",
  "Profile | 안내",
  "Profile | 약관",
  "Profile | 로그아웃",
  "Referral | 공유",
  "Referral | 코드 연결",
  "Notifications | 항목",
  "Notifications | 읽음",
  "Kyc | 제출",
  "Settings | 알림 저장",
  "Settings | 탈퇴",
  "Support | 분쟁",
  "Guides | 하위",
  "Legal | 하위",
];

const IT_JARGON = /\b(OAuth|JWT|token|multipart|journal|API|Staging|DLQ|NATS)\b/;

function runAll() {
  const fails = [];
  const fail = (msg) => fails.push(msg);

  const routes = read("apps/web/routes.ts");
  const cta = read("docs/product/consumer/CONSUMER_ROUTE_CTA_MATRIX.md");
  const profile = read("apps/web/app/me/ProfileClient.tsx");
  const invite = read("apps/web/app/me/invite/InviteClient.tsx");
  const inbox = read("apps/web/app/me/inbox/InboxClient.tsx");
  const kyc = read("apps/web/app/me/kyc/KycClient.tsx");
  const settings = read("apps/web/app/me/settings/SettingsClient.tsx");
  const support = read("apps/web/app/me/support/SupportClient.tsx");
  const guides = read("apps/web/app/me/GuideLinks.tsx");
  const legal = read("apps/web/app/me/LegalLinks.tsx");
  const license = read("apps/web/app/me/legal/license/page.tsx");
  const terms = read("apps/web/app/me/legal/terms/page.tsx");
  const partners = read("apps/web/app/me/guide/partners/page.tsx");
  const weekly = read("apps/web/app/me/guide/market-weekly/page.tsx");
  const messages = read("apps/web/app/me/account-messages.ts");
  const kycGate = read("services/api-nest/src/compliance/kyc-gate.ts");
  const membershipRoutes = read(
    "services/api-nest/src/membership/membership.user.routes.ts",
  );
  const benefitsRoutes = read(
    "services/api-nest/src/missions/benefits.user.routes.ts",
  );
  const nestSrc = path.join(root, "services/api-nest/src");

  for (const r of PRIMARY_ROUTES) {
    if (!routes.includes(`"${r}"`)) fail(`USER_ROUTE_PATHS missing primary ${r}`);
  }
  for (const r of COMPAT_ROUTES) {
    if (!routes.includes(`"${r}"`)) fail(`USER_ROUTE_PATHS missing compat ${r}`);
  }

  let primaryPending = 0;
  for (const rel of PRIMARY_PAGES) {
    const src = read(rel);
    if (!src) fail(`missing primary page ${rel}`);
    if (src.includes("PendingFigma")) primaryPending += 1;
    else fail(`${rel} must keep PendingFigma`);
    if (/spark-dash-home|HomeDesktop|HomeMobile|ProfitsDesktop/.test(src)) {
      fail(`${rel} must not copy Home/Profits geometry`);
    }
  }
  if (primaryPending !== 18) {
    fail(`primary PendingFigma must stay 18, got ${primaryPending}`);
  }

  if (!profile.includes("logoutAuth") || !profile.includes('data-account-hub="profile"')) {
    fail("PROFILE_ROUTE_WIRED");
  }
  for (const href of [
    "/me/invite",
    "/me/inbox",
    "/me/kyc",
    "/me/settings",
    "/me/support",
    "/me/guide/usdt",
    "/me/legal",
  ]) {
    if (!profile.includes(href)) fail(`profile missing primary link ${href}`);
  }
  if (
    !invite.includes("fetchReferralMe") ||
    !invite.includes("bindReferral") ||
    !invite.includes("shareReferral") ||
    !invite.includes('data-account-hub="referral"')
  ) {
    fail("REFERRAL_ROUTE_WIRED");
  }
  if (
    !inbox.includes("listInbox") ||
    !inbox.includes("markInboxRead") ||
    !inbox.includes('data-account-hub="notifications"')
  ) {
    fail("NOTIFICATIONS_ROUTE_WIRED");
  }
  if (
    !kyc.includes("fetchKycStatus") ||
    !kyc.includes("submitKyc") ||
    !kyc.includes('data-account-hub="kyc"')
  ) {
    fail("KYC_ROUTE_WIRED");
  }
  if (
    !settings.includes("putNotificationPrefs") ||
    !settings.includes("deleteAuthAccount") ||
    !settings.includes('data-account-hub="settings"')
  ) {
    fail("SETTINGS_ROUTE_WIRED");
  }
  if (
    !support.includes("createDepositDispute") ||
    !support.includes('data-account-hub="support"')
  ) {
    fail("SUPPORT_ROUTE_WIRED");
  }

  for (const href of [
    "/me/guide/usdt",
    "/me/guide/get-usdt",
    "/me/guide/principal",
    "/me/guide/revenue",
    "/me/guide/faq",
    "/me/guide/partners",
    "/me/guide/market-weekly",
  ]) {
    if (!guides.includes(href)) fail(`GUIDES_ROUTE_WIRED missing ${href}`);
  }
  for (const href of [
    "/me/legal/terms",
    "/me/legal/privacy",
    "/me/legal/license",
    "/me/legal/oss",
  ]) {
    if (!legal.includes(href)) fail(`LEGAL_ROUTE_WIRED missing ${href}`);
  }
  if (!license.includes("operator") && !license.includes("legalName")) {
    fail("LEGAL_ROUTE_WIRED license must use operator-entity SSOT");
  }

  if (!cta.includes("INTENTIONALLY_DISABLED") || !cta.includes("COMPATIBILITY")) {
    fail("COMPAT_CTA_INTENTIONALLY_DISABLED");
  }
  if (!cta.includes("Events 등")) {
    fail("CTA matrix must keep Events 등 compatibility row");
  }
  for (const row of PRIMARY_CTA_ROWS) {
    if (!cta.includes(row)) fail(`PRIMARY_CTA_MATRIX_100 missing ${row}`);
  }

  const clients = [profile, invite, inbox, kyc, settings, support].join("\n");
  if (!clients.includes("AuthGate")) fail("AUTH_REQUIRED_GATES");
  if (/name=["']gender["']|성별/.test(clients)) fail("GENDER_RRN_0 gender");
  if (/주민번호|rrnFull|name=["']rrn/i.test(clients)) fail("GENDER_RRN_0 rrn");
  if (/\bL1\b|\bL2\b|\bL3\b/.test(invite)) fail("L1_L2_L3_0");
  if (/12\.50|%\s*보상|추천\s*\d+\s*%/.test(invite)) fail("REFERRAL_PERCENT_0");
  if (/제\s*1\s*조|본 약관은/.test(terms)) fail("LEGAL_ARTICLE_INVENT_0");
  if (!partners.includes("eBay") || !partners.includes("Yahoo! JAPAN Auction")) {
    fail("partners guide must keep Founder lock names");
  }
  if (!weekly.includes("투자 권유가 아니")) {
    fail("market-weekly must keep no-investment-advice");
  }
  if (IT_JARGON.test(messages)) fail("USER_COPY_IT_JARGON_0 account-messages");
  if (IT_JARGON.test(profile) || IT_JARGON.test(invite) || IT_JARGON.test(inbox)) {
    fail("USER_COPY_IT_JARGON_0 primary clients");
  }

  if (!kycGate.includes("participateGate") || !kycGate.includes("kycRequired: false")) {
    fail("KYC_WITHDRAW_ONLY participate");
  }
  if (!kycGate.includes("assertWithdrawKyc")) fail("KYC_WITHDRAW_ONLY withdraw");

  let compatPending = 0;
  for (const rel of COMPAT_PAGES) {
    const src = read(rel);
    if (!src) fail(`missing compat page ${rel}`);
    if (src.includes("PendingFigma")) compatPending += 1;
    else fail(`${rel} must stay PendingFigma (FUNCTION_DELETE_0)`);
    if (/spark-dash-home|HomeDesktop|HomeMobile/.test(src)) {
      fail(`${rel} must not copy Home geometry`);
    }
  }
  if (compatPending !== 4) fail(`compat PendingFigma must stay 4, got ${compatPending}`);

  for (const href of COMPAT_ROUTES) {
    if (profile.includes(href)) {
      fail(`COMPAT_NOT_IN_PRIMARY_NAV ${href} leaked into Profile`);
    }
  }
  if (!membershipRoutes.includes("me/membership")) {
    fail("MEMBERSHIP_BENEFITS_OWNER_FOUND membership");
  }
  if (!benefitsRoutes.includes("me/benefits")) {
    fail("MEMBERSHIP_BENEFITS_OWNER_FOUND benefits");
  }

  function walkRoutes(dir, acc = []) {
    if (!fs.existsSync(dir)) return acc;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walkRoutes(p, acc);
      else if (ent.name.endsWith(".routes.ts")) acc.push(p);
    }
    return acc;
  }
  const routeFiles = walkRoutes(nestSrc);
  for (const fp of routeFiles) {
    const src = fs.readFileSync(fp, "utf8");
    if (src.includes("me/events") || src.includes("me/strategies")) {
      fail(`EVENTS_STRATEGIES_USER_API_0 leaked in ${path.relative(root, fp)}`);
    }
  }

  const peotteok = read("apps/web/app/me/peotteok/page.tsx");
  if (!peotteok.includes("PendingFigma")) {
    fail("adjacent /me/peotteok must stay KEEP PendingFigma");
  }
  if (!routes.includes('"/me/peotteok"')) {
    fail("USER_ROUTE_PATHS must keep adjacent /me/peotteok");
  }

  return { fails };
}

module.exports = { runAll };

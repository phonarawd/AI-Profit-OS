/**
 * Account Hub batch static contract — REL-121~130
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);
const read = (rel) => {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
};

const required = [
  "apps/web/app/me/layout.tsx",
  "apps/web/app/me/AccountFrame.tsx",
  "apps/web/app/me/ProfileClient.tsx",
  "apps/web/app/me/inbox/InboxClient.tsx",
  "apps/web/app/me/kyc/KycClient.tsx",
  "apps/web/app/me/settings/SettingsClient.tsx",
  "apps/web/app/me/peotteok/page.tsx",
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
  "apps/web/app/me/events/page.tsx",
  "apps/web/app/me/strategies/page.tsx",
  "apps/web/app/me/membership/page.tsx",
  "apps/web/app/me/benefits/page.tsx",
  "apps/web/app/ads/page.tsx",
  "apps/web/app/l/[variant]/page.tsx",
  "tooling/e2e/specs/account-journey.spec.cjs",
];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const layout = read("apps/web/app/me/layout.tsx");
if (layout.includes("LegacyAppShell") || layout.includes("AppShellRoot")) {
  fail("me layout must not remount leftover 5-tab chrome");
}

const profile =
  read("apps/web/app/me/ProfileClient.tsx") +
  read("apps/web/app/me/AccountHub.tsx");
if (!profile.includes("fetchAuthSession")) fail("profile must use fetchAuthSession");
if (profile.includes("SafeStopTrustMetric") || profile.includes("depositUsdt")) {
  fail("profile must not invent money zeros");
}
if (!profile.includes("/me/benefits") || !profile.includes("/me/settings")) {
  fail("profile must keep benefits + settings links");
}

const inbox = read("apps/web/app/me/inbox/InboxClient.tsx");
if (!inbox.includes("unauthorized") || /setItems\(\[\]\)/.test(inbox)) {
  fail("inbox must not turn errors into empty lists");
}

const kyc = read("apps/web/app/me/kyc/KycClient.tsx");
if (!kyc.includes("/api/v1/compliance/kyc/status")) {
  fail("kyc must read status owner");
}
if (/kycStatus:\s*"approved"/.test(kyc) && /catch/.test(kyc)) {
  fail("kyc must not invent approved");
}

const settings = read("apps/web/app/me/settings/SettingsClient.tsx");
if (!settings.includes("SettingsPanel") || !settings.includes("logoutAuth")) {
  fail("settings must keep prefs panel + logout owner");
}
if (!settings.includes("deleteAuthAccount")) {
  fail("settings must use deleteAuthAccount, not a fake delete");
}

const support = read("apps/web/app/me/support/page.tsx");
for (const needle of [
  "category=deposit",
  "wrong_chain",
  "/api/v1/wallet/deposit-disputes",
  "DEPOSIT_DISPUTE_SUBMITTED",
]) {
  if (!support.includes(needle)) fail(`support missing ${needle}`);
}
if (support.includes("\uB77C\uC774\uBE0C \uCC44\uD305") || support.includes("fake chat")) {
  fail("support must not invent live chat");
}

const peotteok = read("apps/web/app/me/peotteok/page.tsx");
if (!peotteok.includes("usePeotteokChat") || !peotteok.includes("ai-orb.svg")) {
  fail("peotteok must keep chat owner and reuse spark-dash ai-orb");
}

const leftoverA = "\uACE8\uACA9";
const leftoverB = "\uB3C4\uBA54\uC778 todo";
const leftoverC = "\uBCF8\uAD6C\uD604";
const events = read("apps/web/app/me/events/page.tsx");
const strategies = read("apps/web/app/me/strategies/page.tsx");
if (events.includes(leftoverA) || events.includes(leftoverB) || events.includes(leftoverC)) {
  fail("events must not show developer leftover copy");
}
if (
  strategies.includes(leftoverA) ||
  strategies.includes(leftoverB) ||
  strategies.includes(leftoverC)
) {
  fail("strategies must not show developer leftover copy");
}

const membership = read("apps/web/app/me/membership/page.tsx");
if (membership.includes('membership: "sprout"')) {
  fail("membership must not invent sprout on error");
}

const benefits = read("apps/web/app/me/benefits/page.tsx");
if (benefits.includes('releasedMonthUsdt: "0"') && benefits.includes("unauthorized")) {
  fail("benefits must not invent 0 on error");
}

const partners = read("apps/web/app/me/guide/partners/page.tsx");
if (!partners.includes("MarketPartnerGrid")) {
  fail("partners must keep official logo grid");
}

const weekly = read("apps/web/app/me/guide/market-weekly/page.tsx");
if (!weekly.includes("data={null}")) {
  fail("market-weekly must not invent briefing numbers");
}

const ads = read("apps/web/app/ads/page.tsx");
const landing = read("apps/web/app/l/[variant]/page.tsx");
if (!ads.includes("Landing3s") || !landing.includes("Landing3s")) {
  fail("ads/l must keep intended landing owner");
}

if (fails.length) {
  console.error("[verify:account-hub-batch] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:account-hub-batch] PASS — /me leftover chrome 0 · auth/money truth · compat copy",
);

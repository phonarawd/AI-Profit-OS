#!/usr/bin/env node
/**
 * verify:consumer-ux-architecture — Phase 3
 * Lightweight consistency: required docs · headings · CTA/gap vocabulary ·
 * no old visual authority · no invented 12.50 fact.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const dir = "docs/product/consumer";
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

function mustInclude(rel, token) {
  const t = read(rel);
  if (t && !t.includes(token)) fail(`${rel} must contain: ${token}`);
}

function mustNotInclude(rel, token) {
  const t = read(rel);
  if (t && t.includes(token)) fail(`${rel} must not contain: ${token}`);
}

const FILES = {
  ux: `${dir}/CONSUMER_UX_ARCHITECTURE.md`,
  journey: `${dir}/CONSUMER_JOURNEY_MAP.md`,
  screens: `${dir}/CONSUMER_SCREEN_INVENTORY.md`,
  cta: `${dir}/CONSUMER_ROUTE_CTA_MATRIX.md`,
  owners: `${dir}/CONSUMER_DATA_STATE_OWNER_MATRIX.md`,
  states: `${dir}/CONSUMER_SCREEN_STATE_MATRIX.md`,
  gaps: `${dir}/CONSUMER_IMPLEMENTATION_GAP_REGISTER.md`,
  caps: `${dir}/CONSUMER_CAPABILITY_MAP.md`,
};

for (const rel of Object.values(FILES)) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing: ${rel}`);
}

const UX_HEADINGS = [
  "## Product principles",
  "## User model",
  "## Core journey",
  "## Recommended IA",
  "## Screen hierarchy",
  "## Primary navigation",
  "## Contextual navigation",
  "## Task continuation",
  "## Home job",
  "## Opportunity UX",
  "## Matching UX",
  "## Wallet UX",
  "## Settlement UX",
  "## Referral UX",
  "## AI UX",
  "## Partner/trust UX",
  "## Account/support UX",
  "## Mobile-first priority",
  "## Desktop enhancement",
  "## State philosophy",
  "## CTA philosophy",
  "## Known implementation gaps",
  "## Open product decisions",
];

for (const h of UX_HEADINGS) mustInclude(FILES.ux, h);

const JOURNEY = [
  "## Acquisition",
  "## Activation",
  "## Opportunity Discovery",
  "## Participation",
  "## Funding",
  "## Matching",
  "## Settlement",
  "## Wallet",
  "## Retention",
  "## Referral",
  "## Account/Support",
];
for (const h of JOURNEY) mustInclude(FILES.journey, h);

mustInclude(FILES.ux, "OLD_5TAB_AUTHORITY = NO");
mustInclude(FILES.ux, "LUX_AUTHORITY = NO");
mustInclude(FILES.ux, "CANON_AUTHORITY = NO");
mustInclude(FILES.ux, "FAKE_STEPPER = 0");
mustInclude(FILES.ux, "FAKE_STEPPER = FORBIDDEN");
mustInclude(FILES.ux, "APPROVED FIGMA = NONE");
mustInclude(FILES.ux, "IA-A");

mustNotInclude(FILES.ux, "OLD_5TAB_AUTHORITY = YES");
mustNotInclude(FILES.ux, "LUX_AUTHORITY = YES");
mustNotInclude(FILES.ux, "CANON_AUTHORITY = YES");
mustNotInclude(FILES.ux, "VISUAL_MASTER_AUTHORITY = YES");

for (const rel of Object.values(FILES)) {
  const t = read(rel);
  if (t.includes("12.50")) fail(`${rel} must not invent 12.50`);
}

const CLASS = [
  "KEEP AS SCREEN",
  "EMBED AS SECTION",
  "MODAL/SHEET",
  "REMOVE FROM PRIMARY JOURNEY",
  "COMPATIBILITY ROUTE ONLY",
];
for (const c of CLASS) mustInclude(FILES.screens, c);

const CRITICAL_SCREENS = [
  "Landing",
  "Signup",
  "Login",
  "Onboarding",
  "Home",
  "OpportunityDetail",
  "ParticipateConfirmation",
  "Matching",
  "Wallet",
  "UsdtDeposit",
  "UsdtWithdraw",
  "KrwDeposit",
  "KrwWithdraw",
  "Referral",
];
const screens = read(FILES.screens);
const journey = read(FILES.journey);
const excluded = journey.includes("Intentionally excluded");
for (const name of CRITICAL_SCREENS) {
  if (!screens.includes(name)) fail(`screen inventory missing ${name}`);
  if (!journey.includes(name) && !excluded) {
    fail(`journey missing ${name} and no exclusion section`);
  }
}

for (const token of [
  "VALID_ROUTE",
  "VALID_ACTION",
  "INTENTIONALLY_DISABLED",
  "FUTURE_CAPABILITY",
  "UNMAPPED_CRITICAL_CTA = 0",
  "dead = 0",
]) {
  mustInclude(FILES.cta, token);
}

for (const token of [
  "RequiredCapital",
  "WalletBalance",
  "Eligibility",
  "MatchingStatus",
  "SettlementStatus",
  "FXReference",
  "ReferralRewardStatus",
  "PartnerStatus",
]) {
  mustInclude(FILES.owners, token);
}

mustInclude(FILES.states, "insufficient-capital");
mustInclude(FILES.states, "offline/stale");
mustInclude(FILES.gaps, "P0 = 2");
mustInclude(FILES.gaps, "G-P0-01");
mustInclude(FILES.gaps, "G-P1-01");
mustInclude(FILES.caps, "WEB_WIRING_MISSING");
mustInclude(FILES.caps, "COMPLETE_ENOUGH");

const os = read(
  "docs/product/PUTDUK_PRODUCT_DESIGN_ENGINEERING_OPERATING_SYSTEM.md",
);
if (os && !os.includes("docs/product/consumer/")) {
  fail("operating system must point at docs/product/consumer/");
}

if (fails.length) {
  console.error("verify:consumer-ux-architecture FAIL");
  for (const f of fails) console.error(` - ${f}`);
  process.exit(1);
}

console.log("verify:consumer-ux-architecture PASS");
console.log(` docs=${Object.keys(FILES).length} headings=${UX_HEADINGS.length}`);

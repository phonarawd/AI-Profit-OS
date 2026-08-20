#!/usr/bin/env node
/**
 * verify:consumer-ux-architecture — Phase 3
 * Lightweight consistency: required docs · headings · CTA accounting ·
 * single FX/partner owners · founder decisions closed · no old visual authority.
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
  loop: `${dir}/CONSUMER_CORE_LOOP_CONTRACT.md`,
  wallet: `${dir}/CONSUMER_WALLET_CONTRACT.md`,
  acquisition: `${dir}/CONSUMER_ACQUISITION_CONTRACT.md`,
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
  "## Founder approved product decisions",
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
mustInclude(FILES.ux, "OLD_5TAB_AUTHORITY = 0");
mustInclude(FILES.ux, "LUX_AUTHORITY = NO");
mustInclude(FILES.ux, "OLD_LUX_AUTHORITY = 0");
mustInclude(FILES.ux, "CANON_AUTHORITY = NO");
mustInclude(FILES.ux, "OLD_CANON_AUTHORITY = 0");
mustInclude(FILES.ux, "FAKE_STEPPER = 0");
mustInclude(FILES.ux, "FAKE_STEPPER = FORBIDDEN");
mustInclude(FILES.ux, "FAKE_FINANCIAL_TRUTH = 0");
mustInclude(FILES.ux, "FAKE_MATCHING_PROGRESS = 0");
mustInclude(FILES.ux, "FAKE_PRODUCT_STATE = 0");
mustInclude(FILES.ux, "APPROVED FIGMA = NONE");
mustInclude(FILES.ux, "IA-A");
mustInclude(FILES.ux, "OPEN_FOUNDER_DECISIONS_PHASE3 = 0");
mustInclude(FILES.ux, "FX_DUPLICATE_ACTIVE_OWNER = 0");
mustInclude(FILES.ux, "PARTNER_DUPLICATE_ACTIVE_OWNER = 0");

mustNotInclude(FILES.ux, "OLD_5TAB_AUTHORITY = YES");
mustNotInclude(FILES.ux, "LUX_AUTHORITY = YES");
mustNotInclude(FILES.ux, "CANON_AUTHORITY = YES");
mustNotInclude(FILES.ux, "VISUAL_MASTER_AUTHORITY = YES");

for (const id of ["D01", "D02", "D03", "D04", "D05", "D06", "D07"]) {
  mustInclude(FILES.ux, `${id}_APPROVED = YES`);
}

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

const CTA_CLASSES = [
  "VALID_ROUTE",
  "VALID_ACTION",
  "INTENTIONALLY_DISABLED",
  "FUTURE_CAPABILITY",
  "DEAD",
];
for (const token of CTA_CLASSES) mustInclude(FILES.cta, token);
mustInclude(FILES.cta, "UNCLASSIFIED_CRITICAL_CTA = 0");
mustInclude(FILES.cta, "DEAD_CRITICAL_CTA = 0");
mustInclude(FILES.cta, "UNMAPPED_CRITICAL_CTA = 0");
mustInclude(FILES.cta, "dead = 0");

const ALLOWED_CTA = new Set(CTA_CLASSES);

function parseDeclaredInt(md, key) {
  const m = md.match(new RegExp(`${key}\\s*=\\s*(\\d+)`));
  return m ? Number(m[1]) : null;
}

function parseCriticalCtaActions(md) {
  const start = md.indexOf("## Critical CTA table");
  if (start < 0) {
    fail("cta matrix missing Critical CTA table");
    return [];
  }
  const rest = md.slice(start);
  const nextH = rest.indexOf("\n## ", 1);
  const block = nextH >= 0 ? rest.slice(0, nextH) : rest;
  const actions = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    if (/^\|\s*source\s*\|/i.test(line)) continue;
    if (/^\|\s*-+/.test(line)) continue;
    const parts = line.split("|").slice(1, -1).map((s) => s.trim());
    if (parts.length < 4 || !parts[0] || !parts[1]) continue;
    actions.push(parts[3]);
  }
  return actions;
}

const ctaMd = read(FILES.cta);
const ctaActions = parseCriticalCtaActions(ctaMd);
const parsed = {
  VALID_ROUTE: 0,
  VALID_ACTION: 0,
  INTENTIONALLY_DISABLED: 0,
  FUTURE_CAPABILITY: 0,
  DEAD: 0,
};
let unclassified = 0;
for (const a of ctaActions) {
  if (ALLOWED_CTA.has(a)) parsed[a] += 1;
  else unclassified += 1;
}
const parsedTotal = ctaActions.length;
const declaredTotal = parseDeclaredInt(ctaMd, "TOTAL_CRITICAL_CTA");
if (declaredTotal == null) fail("cta matrix missing TOTAL_CRITICAL_CTA");
if (parsedTotal !== declaredTotal) {
  fail(
    `CTA total mismatch: table=${parsedTotal} declared=${declaredTotal}`,
  );
}
for (const k of CTA_CLASSES) {
  const d = parseDeclaredInt(ctaMd, k === "DEAD" ? "DEAD_CRITICAL_CTA" : k);
  if (k !== "DEAD" && d != null && d !== parsed[k]) {
    fail(`CTA ${k} mismatch: table=${parsed[k]} declared=${d}`);
  }
}
const declaredDead = parseDeclaredInt(ctaMd, "DEAD_CRITICAL_CTA");
if (declaredDead !== 0 || parsed.DEAD !== 0) {
  fail(`DEAD_CRITICAL_CTA must be 0 (table=${parsed.DEAD} declared=${declaredDead})`);
}
if (unclassified !== 0) {
  fail(`UNCLASSIFIED_CRITICAL_CTA = ${unclassified}`);
}
const sum =
  parsed.VALID_ROUTE +
  parsed.VALID_ACTION +
  parsed.INTENTIONALLY_DISABLED +
  parsed.FUTURE_CAPABILITY +
  parsed.DEAD;
if (sum + unclassified !== parsedTotal) {
  fail(`CTA accounting broken: classified=${sum} + unclass=${unclassified} != ${parsedTotal}`);
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
  "AdapterAvailability",
]) {
  mustInclude(FILES.owners, token);
}

mustInclude(FILES.owners, "FX_TRUTH = SINGLE_OWNER");
mustInclude(FILES.owners, "FX_DUPLICATE_ACTIVE_OWNER = 0");
mustInclude(FILES.owners, "FX_ZERO_FALLBACK_IS_AUTHORITY = NO");
mustInclude(FILES.owners, "INVALID_IMPLEMENTATION_FALLBACK");
mustInclude(FILES.owners, "PARTNER_DUPLICATE_ACTIVE_OWNER = 0");
mustInclude(FILES.owners, "KNOWN_DUPLICATE_CRITICAL_TRUTH_OWNER = 0");
mustInclude(FILES.owners, "KNOWN_AMBIGUOUS_CRITICAL_TRUTH_OWNER = 0");
mustInclude(FILES.owners, "PARTNER_ADAPTER_CONCEPT_CONFLATED = NO");
mustNotInclude(FILES.owners, "FX display | AMBIGUOUS");
mustNotInclude(FILES.owners, "Partner | AMBIGUOUS");

mustInclude(FILES.states, "insufficient-capital");
mustInclude(FILES.states, "offline/stale");
mustInclude(FILES.gaps, "P0 = 2");
mustInclude(FILES.gaps, "G-P0-01");
mustInclude(FILES.gaps, "G-P1-01");
mustInclude(FILES.gaps, "FX_ZERO_FALLBACK_REGISTERED_AS_GAP = YES");
mustInclude(FILES.caps, "WEB_WIRING_MISSING");
mustInclude(FILES.caps, "COMPLETE_ENOUGH");
mustInclude(FILES.loop, "ENGINE_RULE_REDEFINITION = FORBIDDEN");
mustInclude(FILES.loop, "WEB_PARTICIPATE_POST = 1");
mustInclude(FILES.ux, "CONSUMER_CORE_LOOP_CONTRACT.md");
mustInclude(FILES.ux, "CONSUMER_WALLET_CONTRACT.md");
mustInclude(FILES.ux, "CONSUMER_ACQUISITION_CONTRACT.md");
mustInclude(FILES.acquisition, "AUTH_RULE_REDEFINITION = FORBIDDEN");
mustInclude(FILES.wallet, "MONEY_RULE_REDEFINITION = FORBIDDEN");
mustInclude(FILES.wallet, "WEB_WALLET_PENDING_FIGMA = 8");
mustInclude(FILES.wallet, "HOME_GEOMETRY_DEPENDENCY = FORBIDDEN");

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
console.log(
  ` docs=${Object.keys(FILES).length} headings=${UX_HEADINGS.length} cta=${parsedTotal} ` +
    `route=${parsed.VALID_ROUTE} action=${parsed.VALID_ACTION} ` +
    `disabled=${parsed.INTENTIONALLY_DISABLED} future=${parsed.FUTURE_CAPABILITY} dead=${parsed.DEAD}`,
);

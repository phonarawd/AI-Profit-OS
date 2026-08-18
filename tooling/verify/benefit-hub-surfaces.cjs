/**
 * verify:benefit-hub-surfaces — UI §5.9.5 + Money §51.8a.7
 * Deep UI: BenefitHub Hero/Carousel/D·M·W·S + mission card + page wiring
 * (v7.22.52 §0.8.2 #2 — Money API+copy alone is NOT completion)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = [
  "packages/ui/copy/ko/benefits.ts",
  "packages/ui/canon/surfaces/benefit-hub.wire.json",
  "packages/ui/canon/surfaces/benefit-mission-card.wire.json",
  "packages/ui/components/benefits/BenefitHub.tsx",
  "packages/ui/components/benefits/BenefitMissionCard.tsx",
  "packages/ui/components/benefits/index.ts",
  "apps/web/app/me/benefits/page.tsx",
  "services/api-nest/src/missions/benefits.user.routes.ts",
  "services/api-nest/src/missions/benefits.user.controller.ts",
  "services/api-nest/src/missions/benefits.user.service.ts",
  "services/api-nest/src/missions/mission.module.ts",
];
for (const f of files) mustExist(f);

const ui = read(".cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md");
for (const needle of ["#### 5.9.5", "/me/benefits", "Credits"]) {
  if (ui && !ui.includes(needle)) fails.push(`UI plan missing: ${needle}`);
}
if (ui && !ui.includes("Credits ❌") && !ui.includes("Credits **0**")) {
  fails.push("UI §5.9.5 must forbid Credits currency");
}

const copy = read("packages/ui/copy/ko/benefits.ts");
if (copy && /credits_balance|creditsBalance|virtualCredits|\bCredits\b/i.test(copy)) {
  fails.push("benefits copy must not use Credits currency label");
}
if (copy && !copy.includes("혜택 · 미션")) {
  fails.push("benefits copy missing title 혜택 · 미션");
}
for (const key of [
  "heroMonthly:",
  "heroClaimable:",
  "heroPending:",
  "sectionDaily:",
  "sectionOneTime:",
  "sectionWeekly:",
  "sectionStreak:",
  "statusContinue:",
  "footerInvite:",
  "footerEvents:",
  "moneyPointer:",
  "enginePointer:",
  "adminPointer:",
  "noVirtualCurrencyNote:",
]) {
  if (copy && !copy.includes(key)) fails.push(`benefits.ts missing ${key}`);
}

const wire = JSON.parse(read("packages/ui/canon/surfaces/benefit-hub.wire.json") || "{}");
if (wire.id !== "benefit-hub" || wire.route !== "/me/benefits") {
  fails.push("benefit-hub.wire id/route mismatch");
}
const blockIds = (wire.blocks || []).map((b) => b.id);
for (const id of [
  "title",
  "hero",
  "campaignCarousel",
  "daily",
  "oneTime",
  "weekly",
  "streak",
  "footerLinks",
]) {
  if (!blockIds.includes(id)) fails.push(`benefit-hub.wire missing block ${id}`);
}
for (const f of [
  "Credits balance",
  "G4 demo amounts in hero",
  "IT_jargon",
  "gender_branch",
]) {
  if (!(wire.forbidden || []).includes(f)) {
    fails.push(`benefit-hub.wire must forbid ${f}`);
  }
}

const hub = read("packages/ui/components/benefits/BenefitHub.tsx");
for (const needle of [
  'data-testid="benefit-hub"',
  'data-canon="benefit-hub"',
  'data-canon-block="hero"',
  'data-canon-block="campaignCarousel"',
  'data-canon-block="daily"',
  'data-canon-block="oneTime"',
  'data-canon-block="weekly"',
  'data-canon-block="streak"',
  'data-canon-block="footerLinks"',
  'data-testid="benefit-hub-hero"',
  'data-testid="benefit-hub-carousel"',
  'data-testid="benefit-hub-section-daily"',
  'data-testid="benefit-hub-section-oneTime"',
  'data-testid="benefit-hub-section-weekly"',
  'data-testid="benefit-hub-section-streak"',
  "data-credits-currency=\"false\"",
  "data-g4-hero-sum=\"false\"",
  "data-money-pointer",
  "data-engine-pointer",
  "data-admin-pointer",
  "BenefitMissionCard",
  "T.benefits",
  "/me/invite",
  "/me/events",
]) {
  if (hub && !hub.includes(needle)) {
    fails.push(`BenefitHub missing: ${needle}`);
  }
}
if (hub && /credits_balance|virtualCredits|Credits\s*잔고/i.test(hub)) {
  fails.push("BenefitHub must not render Credits currency");
}
if (hub && /받기\s*버튼|수동\s*지급|claimMission|manualClaim/i.test(hub)) {
  fails.push("BenefitHub must not require manual claim for auto missions");
}

const card = read("packages/ui/components/benefits/BenefitMissionCard.tsx");
for (const needle of [
  'data-testid="benefit-mission-card"',
  'data-canon="benefit-mission-card"',
  'data-canon-slot="icon"',
  'data-canon-slot="title"',
  'data-canon-slot="body"',
  'data-canon-slot="rewardAmount"',
  'data-canon-slot="statusLabel"',
  'data-canon-slot="cta"',
  "data-credits-currency=\"false\"",
  "statusContinue",
  "queued_pool",
]) {
  if (card && !card.includes(needle)) {
    fails.push(`BenefitMissionCard missing: ${needle}`);
  }
}

const page = read("apps/web/app/me/benefits/page.tsx");
if (page && !page.includes("BenefitHub")) {
  fails.push("/me/benefits must render BenefitHub");
}
if (page && page.includes("deep Benefit Hub = PART7b Owns") && /Skeleton only/.test(page)) {
  fails.push("/me/benefits must not remain PART7b skeleton");
}
if (page && !page.includes("/api/v1/me/benefits")) {
  fails.push("/me/benefits page must fetch Money GET /me/benefits");
}

const pkg = read("packages/ui/package.json");
if (pkg && !pkg.includes('"./components/benefits"')) {
  fails.push("package.json must export ./components/benefits");
}

const idx = read("packages/ui/copy/ko/index.ts");
if (
  idx &&
  !idx.includes('from "./benefits"') &&
  !idx.includes("from './benefits'")
) {
  fails.push("copy/ko/index.ts must import benefits");
}
if (idx && !/\bbenefits,/.test(idx) && !/benefits\n/.test(idx)) {
  if (idx && !idx.includes("benefits,")) {
    fails.push("copy/ko/index.ts must export benefits on T");
  }
}

const manifest = read("packages/ui/canon/manifest.json");
if (manifest && !manifest.includes('"id": "benefit-hub"')) {
  fails.push("canon manifest missing benefit-hub");
}

// --- Money API surface (money-user-benefits-read) ---
const routes = read("services/api-nest/src/missions/benefits.user.routes.ts");
const ctrl = read("services/api-nest/src/missions/benefits.user.controller.ts");
const svc = read("services/api-nest/src/missions/benefits.user.service.ts");
const mod = read("services/api-nest/src/missions/mission.module.ts");

if (routes && !/export const BENEFITS_USER_ROUTES\s*=\s*\{/.test(routes)) {
  fails.push("BENEFITS_USER_ROUTES must be exported as const object");
}
if (routes && !routes.includes('list: "me/benefits"')) {
  fails.push('BENEFITS_USER_ROUTES.list must be "me/benefits"');
}
if (routes && !routes.includes('summary: "me/benefits/summary"')) {
  fails.push('BENEFITS_USER_ROUTES.summary must be "me/benefits/summary"');
}
if (routes && !/as const/.test(routes)) {
  fails.push("BENEFITS_USER_ROUTES must use as const");
}
if (ctrl && !ctrl.includes("export class BenefitsUserController")) {
  fails.push("BenefitsUserController class missing");
}
if (ctrl && !ctrl.includes("BENEFITS_USER_ROUTES")) {
  fails.push("controller must use BENEFITS_USER_ROUTES");
}
if (ctrl && !ctrl.includes("UnauthorizedException")) {
  fails.push("controller must reject missing JWT session userId");
}
if (ctrl && /query\.userId|body\.userId|@Query\(["']userId/.test(ctrl)) {
  fails.push("controller must not trust query/body userId");
}
if (svc && !svc.includes("listForUser")) {
  fails.push("BenefitsUserService.listForUser missing");
}
if (svc && !svc.includes("summaryForUser")) {
  fails.push("BenefitsUserService.summaryForUser missing");
}
if (svc && /credits_balance|creditsBalance|virtualCredits/i.test(svc)) {
  fails.push("benefits service must not expose Credits currency");
}
if (svc && !svc.includes("deep_route") && !svc.includes("deepRoute")) {
  fails.push("benefits service must expose deepRoute for CTA");
}
if (svc && !/\bicon\b/.test(svc)) {
  fails.push("benefits service must expose icon for cards");
}
if (mod && !mod.includes("BenefitsUserController")) {
  fails.push("MissionModule must register BenefitsUserController");
}
if (mod && !/controllers:\s*\[[^\]]*BenefitsUserController/.test(mod)) {
  fails.push("MissionModule.controllers must include BenefitsUserController");
}

const rootPkg = read("package.json");
if (rootPkg && !rootPkg.includes('"verify:benefit-hub-surfaces"')) {
  fails.push("root package.json must define verify:benefit-hub-surfaces");
}

if (fails.length) {
  console.error("[verify:benefit-hub-surfaces] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:benefit-hub-surfaces] PASS (deep UI BenefitHub · Money GET · Credits0)",
);

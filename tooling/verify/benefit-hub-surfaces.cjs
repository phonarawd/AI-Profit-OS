/**
 * verify:benefit-hub-surfaces — UI §5.9.5 + Money §51.8a.7 API 존재
 * money-user-benefits-read: GET /api/v1/me/benefits(+summary)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

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
  "services/api-nest/src/missions/benefits.user.routes.ts",
  "services/api-nest/src/missions/benefits.user.controller.ts",
  "services/api-nest/src/missions/benefits.user.service.ts",
  "services/api-nest/src/missions/mission.module.ts",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fails.push(`missing: ${f}`);
}

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
if (mod && !mod.includes("BenefitsUserController")) {
  fails.push("MissionModule must register BenefitsUserController");
}
if (mod && !/controllers:\s*\[[^\]]*BenefitsUserController/.test(mod)) {
  fails.push("MissionModule.controllers must include BenefitsUserController");
}

if (fails.length) {
  console.error("[verify:benefit-hub-surfaces] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:benefit-hub-surfaces] PASS");

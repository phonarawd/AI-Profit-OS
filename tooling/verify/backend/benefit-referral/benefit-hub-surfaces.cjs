/**
 * BACKEND-ONLY PORT of tooling/verify/benefit-hub-surfaces.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:benefit-hub-surfaces — UI §5.9.5 + Money §51.8a.7
 * Deep UI: BenefitHub Hero/Carousel/D·M·W·S + mission card + page wiring
 * (v7.22.52 §0.8.2 #2 — Money API+copy alone is NOT completion)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
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
  "services/api-nest/src/missions/benefits.user.routes.ts",
  "services/api-nest/src/missions/benefits.user.controller.ts",
  "services/api-nest/src/missions/benefits.user.service.ts",
  "services/api-nest/src/missions/mission.module.ts",
];
for (const f of files) mustExist(f);

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

if (fails.length) {
  console.error("[verify:benefit-hub-surfaces] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:benefit-hub-surfaces] PASS (Money GET /me/benefits · summary · JWT session only · Credits 0)",
);

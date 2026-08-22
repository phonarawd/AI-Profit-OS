/**
 * verify:rel-210-admin-opportunities — live wire, no stub, no fake truth
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

const page = read("apps/admin/app/admin/opportunities/page.tsx");
const ctrl = read(
  "services/api-nest/src/opportunities/opportunities.admin.controller.ts",
);
const svc = read(
  "services/api-nest/src/opportunities/opportunities.admin.service.ts",
);
const writeSrc = read("services/api-nest/src/opportunities/opportunity-write.cjs");
const guard = read("services/api-nest/src/common/admin-guard.selftest.ts");

if (page.includes("Admin §9.1.1 골격") && !page.includes("adminGet")) {
  fails.push("opportunities must not stay stub-only");
}
for (const needle of [
  'data-testid="admin-opportunities"',
  'data-testid="opportunities-pricing-panel"',
  "/api/v1/admin/opportunities",
  "/api/v1/admin/opportunities/assets",
  "/pricing",
  "adminGet",
  "adminSend",
  "AdminTruth",
  'data-forbid="fake-opportunity-truth"',
  'data-filter="capitalBand"',
  'data-capital-band="micro"',
  "소액(10~)",
]) {
  if (!page.includes(needle)) fails.push(`opportunities missing ${needle}`);
}
if (!page.includes("asRecordList") && !page.includes("items.length === 0")) {
  fails.push("opportunities must render honest empty, not invented rows");
}
if (
  /expectedProfitUsdt\s*=\s*["']0["']/.test(page) ||
  /requiredCapitalUsdt\s*=\s*["']0["']/.test(page) ||
  /FAKE_OPP|mockOpportunity|OPP_FIXTURE/.test(page)
) {
  fails.push("opportunities must not invent profit/capital truth");
}
if (/expectedProfitUsdt\s*\|\|\s*0|requiredCapitalUsdt\s*\?\?\s*0/.test(page)) {
  fails.push("opportunities must not coerce missing money to 0");
}
if (page.includes("service_role") || page.includes("tronGridApiKey")) {
  fails.push("opportunities must not render secrets");
}

if (!/@UseGuards\(AdminGuard\)/.test(ctrl)) {
  fails.push("opportunities.admin.controller must use AdminGuard");
}
if (!svc.includes("FROM public.opportunities")) {
  fails.push("admin list must read public.opportunities owner");
}
if (!writeSrc.includes("INSERT INTO public.opportunities")) {
  fails.push("shared write owner must remain the only INSERT path");
}
if (!guard.includes("user JWT -> 401 on admin route")) {
  fails.push("admin-guard.selftest must keep user JWT 401 EXIT_GATE");
}

if (fails.length) {
  console.error("[verify:rel-210-admin-opportunities] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-210-admin-opportunities] PASS");

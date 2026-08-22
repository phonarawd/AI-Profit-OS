/**
 * verify:rel-211-admin-adapters — live wire, no invented health/KPI
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

const page = read("apps/admin/app/admin/adapters/page.tsx");
const ctrl = read("services/api-nest/src/adapters/adapters.admin.controller.ts");
const guard = read("services/api-nest/src/common/admin-guard.selftest.ts");

if (page.includes("Admin §9.1.1 골격") && !page.includes("adminGet")) {
  fails.push("adapters must not stay stub-only");
}
for (const needle of [
  'data-testid="admin-adapters"',
  'data-testid="adapter-matching-kpi"',
  'data-testid="identity-review-queue"',
  "/api/v1/admin/adapters",
  "/api/v1/admin/adapters/listing-legs",
  "/api/v1/admin/adapters/identity-review-queue",
  "/api/v1/admin/adapters/matching-kpi",
  "adminGet",
  "readObservedRate",
  "AdminTruth",
  'data-forbid="fake-adapter-truth"',
  'data-lock="yahoo0"',
  'data-day1-auto-publish-yahoo-jp="false"',
  'data-forbid="day1_yahoo_jp_auto_publish"',
  'data-owns="execution-policy"',
]) {
  if (!page.includes(needle)) fails.push(`adapters missing ${needle}`);
}
if (!page.includes("asRecordList") && !page.includes("items.length === 0")) {
  fails.push("adapters must render honest empty, not invented rows");
}
if (
  /skuMatchFailureRate\s*\|\|\s*0|skuMatchFailureRate\s*\?\?\s*0/.test(page) ||
  /FAKE_ADAPTER|mockHealth|ADAPTER_FIXTURE/.test(page)
) {
  fails.push("adapters must not invent health/KPI or coerce missing rate to 0");
}
if (page.includes("recordMatchAttempts") || page.includes("/adapters/match-attempts")) {
  fails.push("adapters UI must not invent match attempts");
}
if (
  page.includes("EBAY_APP_ID") ||
  page.includes("service_role") ||
  page.includes("apiKey") ||
  page.includes("access_token")
) {
  fails.push("adapters must not render secrets");
}
if (/scrapeYahoo|yahoo_jp.*fetch\(|activateYahoo/i.test(page)) {
  fails.push("adapters must not activate Yahoo as a runtime source");
}

if (!/@UseGuards\(AdminGuard\)/.test(ctrl)) {
  fails.push("adapters.admin.controller must use AdminGuard");
}
if (!guard.includes("user JWT -> 401 on admin route")) {
  fails.push("admin-guard.selftest must keep user JWT 401 EXIT_GATE");
}

if (fails.length) {
  console.error("[verify:rel-211-admin-adapters] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-211-admin-adapters] PASS");

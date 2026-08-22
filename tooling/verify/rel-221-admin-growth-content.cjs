/**
 * verify:rel-221-admin-growth-content — locked disclaimer + honest empty metrics
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

const page = read("apps/admin/app/admin/growth/page.tsx");
const redir = read("apps/admin/app/admin/growth/content/page.tsx");
const guard = read("services/api-nest/src/common/admin-guard.selftest.ts");

if (!redir.includes('redirect("/admin/growth?tab=content")')) {
  fails.push("legacy /admin/growth/content must redirect to hub tab");
}
for (const needle of [
  'data-testid="growth-content-panel"',
  'data-forbid="fake-content-truth"',
  'data-tax-disclaimer-locked="true"',
  'data-admin-override="false"',
  'data-metric="content-performance"',
  "TaxDisclaimerBlock",
  "AdminTruth",
]) {
  if (!page.includes(needle)) fails.push(`content growth missing ${needle}`);
}
if (
  /impressions\s*=\s*\d|engagementRate|CONTENT_PERF_FIXTURE|fakeContent/.test(
    page,
  )
) {
  fails.push("content growth must not invent impressions/engagement");
}
if (
  /adsOrchestrator|capiDispatcher|POST-00[145]|standingAuthorization/.test(page) &&
  !page.includes("아직 없습니다")
) {
  fails.push("content growth must not activate POST advertising");
}
if (!guard.includes("user JWT -> 401 on admin route")) {
  fails.push("admin-guard.selftest must keep user JWT 401 EXIT_GATE");
}

if (fails.length) {
  console.error("[verify:rel-221-admin-growth-content] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-221-admin-growth-content] PASS");

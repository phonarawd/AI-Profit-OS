/**
 * verify:rel-220-admin-growth-whale — existing capitalBand=whale only
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
const redir = read("apps/admin/app/admin/growth/whale/page.tsx");
const opp = read(
  "services/api-nest/src/opportunities/opportunities.admin.controller.ts",
);
const guard = read("services/api-nest/src/common/admin-guard.selftest.ts");

if (!redir.includes('redirect("/admin/growth?tab=whale")')) {
  fails.push("legacy /admin/growth/whale must redirect to hub tab");
}
for (const needle of [
  'data-testid="growth-whale-panel"',
  'data-forbid="fake-whale-truth"',
  "/api/v1/admin/opportunities?capitalBand=whale",
  'data-metric="whale-users"',
  "adminGet",
  "AdminTruth",
]) {
  if (!page.includes(needle)) fails.push(`whale growth missing ${needle}`);
}
if (
  /lifetimeValue\s*=|WHALE_LTV_FIXTURE|fakeWhale|riskLabel\s*=\s*["']high["']/.test(
    page,
  )
) {
  fails.push("whale growth must not invent LTV/risk/user value");
}
if (!opp.includes("capitalBand")) {
  fails.push("whale tab must reuse opportunities capitalBand owner");
}
if (!/@UseGuards\(AdminGuard\)/.test(opp)) {
  fails.push("opportunities.admin.controller must use AdminGuard");
}
if (!guard.includes("user JWT -> 401 on admin route")) {
  fails.push("admin-guard.selftest must keep user JWT 401 EXIT_GATE");
}

if (fails.length) {
  console.error("[verify:rel-220-admin-growth-whale] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-220-admin-growth-whale] PASS");

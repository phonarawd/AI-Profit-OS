/**
 * verify:rel-217-admin-growth — growth hub live wire, no fake ROAS
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
const sim = read(
  "services/api-nest/src/simulation/simulation.admin.controller.ts",
);
const ref = read("services/api-nest/src/referral/referral.admin.controller.ts");
const guard = read("services/api-nest/src/common/admin-guard.selftest.ts");

if (page.includes("Admin §35.6 골격") && !page.includes("adminGet")) {
  fails.push("growth hub must not stay stub-only");
}
for (const needle of [
  'data-testid="admin-growth"',
  'data-testid="growth-simulation-panel"',
  'data-testid="growth-referral-panel"',
  "/api/v1/admin/simulation/latest",
  "/api/v1/admin/simulation/growth-gate",
  "/api/v1/admin/growth/enabled",
  "/api/v1/admin/growth/referral/program",
  "/api/v1/admin/growth/referral/pool",
  "adminGet",
  "AdminTruth",
  'data-forbid="fake-growth-truth"',
  'data-forbid="fake-roas"',
  'data-post-deferred="POST-006"',
]) {
  if (!page.includes(needle)) fails.push(`growth hub missing ${needle}`);
}
if (
  /ROAS\s*=\s*\d|CAC\s*=\s*\d|mockRoas|CAMPAIGN_REVENUE_FIXTURE/.test(page)
) {
  fails.push("growth hub must not invent ROAS/CAC/campaign revenue");
}
if (page.includes("capPerReferrerMonth") && !page.includes("data-forbid-monthly-invite-cap")) {
  fails.push("growth hub must not add monthly invite cap UI");
}
if (page.includes("service_role") || page.includes("withdrawPin")) {
  fails.push("growth hub must not render secrets");
}

if (!/@UseGuards\(AdminGuard\)/.test(sim)) {
  fails.push("simulation.admin.controller must use AdminGuard");
}
if (!/@UseGuards\(AdminGuard\)/.test(ref)) {
  fails.push("referral.admin.controller must use AdminGuard");
}
if (!guard.includes("user JWT -> 401 on admin route")) {
  fails.push("admin-guard.selftest must keep user JWT 401 EXIT_GATE");
}

if (fails.length) {
  console.error("[verify:rel-217-admin-growth] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-217-admin-growth] PASS");

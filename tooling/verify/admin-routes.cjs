/**
 * verify:admin-routes — Admin §9.1 (12) + §9.1.1 children
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const routesPath = path.join(root, "apps/admin/routes.ts");

if (!fs.existsSync(routesPath)) {
  console.error("[verify:admin-routes] FAIL missing apps/admin/routes.ts");
  process.exit(1);
}

const src = fs.readFileSync(routesPath, "utf8");

const requiredHrefs = [
  "/admin",
  "/admin/opportunities",
  "/admin/execution-policy",
  "/admin/adapters",
  "/admin/wallet",
  "/admin/ledger",
  "/admin/users",
  "/admin/risk",
  "/admin/compliance",
  "/admin/system-control",
  "/admin/ai-logs",
  "/admin/growth",
  "/admin/audit",
];

for (const href of requiredHrefs) {
  if (!src.includes(`"${href}"`)) fails.push(`ADMIN_MODULES missing href ${href}`);
}

if (!/ADMIN_TOP_LEVEL_COUNT\s*=\s*12/.test(src)) {
  fails.push("ADMIN_TOP_LEVEL_COUNT must be 12");
}

const childRequired = [
  "/admin/wallet?tab=deposit-settings",
  "/admin/wallet?tab=review",
  "/admin/wallet?tab=krw-pending",
  "/admin/wallet?tab=disputes",
  "/admin/support?tab=queue",
  "/admin/reports/financial",
  "/admin/growth?tab=simulation",
  "/admin/growth?tab=referral",
  "/admin/growth?tab=notices",
  "/admin/growth?tab=campaigns",
  "/admin/growth?tab=share",
  "/admin/growth?tab=content",
  "/admin/growth?tab=deposit",
  "/admin/growth?tab=whale",
  "/admin/growth?tab=ticker",
  "/admin/ai-logs?tab=coach",
  "/admin/ai-logs?tab=spotcheck",
  "/admin/users/:id",
  "/admin/users/:id/finance",
  "/admin/users/:id/finance?tab=buckets",
  "/admin/risk?tab=queue",
];

for (const href of childRequired) {
  if (!src.includes(`"${href}"`)) fails.push(`ADMIN_CHILD_ROUTES missing ${href}`);
}

const pageDirs = [
  "app/admin/page.tsx",
  "app/admin/opportunities/page.tsx",
  "app/admin/execution-policy/page.tsx",
  "app/admin/adapters/page.tsx",
  "app/admin/wallet/page.tsx",
  "app/admin/ledger/page.tsx",
  "app/admin/users/page.tsx",
  "app/admin/users/[id]/page.tsx",
  "app/admin/users/[id]/finance/page.tsx",
  "app/admin/risk/page.tsx",
  "app/admin/compliance/page.tsx",
  "app/admin/system-control/page.tsx",
  "app/admin/ai-logs/page.tsx",
  "app/admin/growth/page.tsx",
  "app/admin/audit/page.tsx",
  "app/admin/support/page.tsx",
  "app/admin/reports/financial/page.tsx",
];

for (const rel of pageDirs) {
  if (!fs.existsSync(path.join(root, "apps/admin", rel))) {
    fails.push(`missing apps/admin/${rel}`);
  }
}

if (fails.length) {
  console.error("[verify:admin-routes] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:admin-routes] PASS (§9.1 + §9.1.1)");

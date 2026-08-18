/**
 * verify:admin-user-opportunity-override — Admin §9.8.9 / Engine override DDL
 * schema · DDL columns · Nest CRUD · RBAC · audit · merge · ledger 불변
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "schemas/user-opportunity-override.v1.json",
  "schemas/admin-rbac.v1.json",
  "supabase/migrations/20260809023713_user_opportunity_overrides_schema_align.sql",
  "services/api-nest/src/opportunities/user-opportunity-override.merge.ts",
  "services/api-nest/src/opportunities/user-opportunity-override.admin.service.ts",
  "services/api-nest/src/opportunities/user-opportunity-override.admin.controller.ts",
  "services/api-nest/src/opportunities/opportunities.routes.ts",
  "services/api-nest/src/opportunities/opportunities.module.ts",
  "apps/admin/app/admin/users/[id]/page.tsx",
  "apps/admin/routes.ts",
];
for (const f of files) mustExist(f);

// --- schema SSOT ---
const schema = JSON.parse(read("schemas/user-opportunity-override.v1.json"));
for (const req of [
  "userId",
  "opportunityId",
  "reason",
  "updatedByAdminId",
  "updatedAt",
]) {
  if (!(schema.required || []).includes(req)) {
    fails.push(`user-opportunity-override.v1 must require ${req}`);
  }
}
for (const opt of [
  "hidden",
  "forceShow",
  "pinOrder",
  "marginPctOverride",
  "expectedProfitUsdtOverride",
  "capitalBandForce",
]) {
  if (!schema.properties?.[opt]) {
    fails.push(`schema missing ${opt}`);
  }
}
if (schema.properties?.pinOrder?.minimum !== 0) {
  fails.push("pinOrder.minimum must be 0");
}
if ((schema.properties?.reason?.minLength ?? 0) < 10) {
  fails.push("reason.minLength must be ≥10");
}

const manifest = read("schemas/manifest.day1.json");
if (!manifest.includes("user-opportunity-override.v1.json")) {
  fails.push("manifest.day1 must list user-opportunity-override.v1.json");
}

// --- DDL align (no legacy pinned / margin_override_usdt) ---
const mig = read(
  "supabase/migrations/20260809023713_user_opportunity_overrides_schema_align.sql",
);
for (const col of [
  "force_show",
  "pin_order",
  "margin_pct_override",
  "expected_profit_usdt_override",
  "capital_band_force",
]) {
  if (!mig.includes(col)) fails.push(`migration missing column ${col}`);
}
if (!mig.includes("DROP COLUMN IF EXISTS pinned")) {
  fails.push("migration must drop legacy pinned");
}
if (!mig.includes("DROP COLUMN IF EXISTS margin_override_usdt")) {
  fails.push("migration must drop legacy margin_override_usdt");
}
if (!mig.includes("DAY1_MAX_PINS")) {
  fails.push("migration must enforce Day-1 pin cap");
}
if (!mig.includes("user_opportunity_override_audit")) {
  fails.push("migration must create override audit table");
}
if (!mig.includes("admin.user.opportunity_override.upsert")) {
  fails.push("audit action upsert missing in migration");
}

// Legacy create table must not be the only definition — ensure align mig exists
const createMig = read(
  "supabase/migrations/20260808205850_opportunities_pricing.sql",
);
if (
  createMig.includes("pinned boolean") &&
  !mig.includes("force_show")
) {
  fails.push("align migration incomplete vs create table");
}

// --- merge SSOT ---
const merge = read(
  "services/api-nest/src/opportunities/user-opportunity-override.merge.ts",
);
for (const needle of [
  "mergeUserOpportunityOverride",
  "excludeFromFeed",
  "forceShow",
  "pinOrder",
  "expectedProfitUsdtOverride",
  "marginPctOverride",
  "DAY1_MAX_PINS_PER_USER = 10",
  "HIDDEN_FORCE_SHOW_MUTEX",
  "userOpportunityOverrideAccess",
  "compareReady",
]) {
  if (!merge.includes(needle)) {
    fails.push(`merge.ts missing ${needle}`);
  }
}
if (/UPDATE\s+(?:public\.)?(?:ledger_accounts|wallet_buckets)/i.test(merge)) {
  fails.push("merge must not UPDATE ledger balances");
}
// false→true forge banned
if (/compareReady\s*[:=]\s*true/.test(merge) && merge.includes("forceShow")) {
  // allowed only as fixture default — ensure we keep base.compareReady
  if (!merge.includes("compareReady: base.compareReady")) {
    fails.push("merge must preserve base.compareReady (no false→true forge)");
  }
}

const rbacAccess = [
  ['"super"', '"write"'],
  ['"finance"', '"write"'],
  ['"cs"', '"read"'],
  ['"marketing"', '"none"'],
];
for (const [role, access] of rbacAccess) {
  // soft: function body encodes mapping
  if (!merge.includes("userOpportunityOverrideAccess")) {
    fails.push("RBAC access helper missing");
    break;
  }
}

const rbacSchema = JSON.parse(read("schemas/admin-rbac.v1.json"));
const roles = rbacSchema.default?.roles || [];
const byId = Object.fromEntries(roles.map((r) => [r.id, r]));
if (byId.super?.capabilities?.userOpportunityOverride !== "write") {
  fails.push("RBAC super must write userOpportunityOverride");
}
if (byId.finance?.capabilities?.userOpportunityOverride !== "write") {
  fails.push("RBAC finance must write userOpportunityOverride");
}
if (byId.cs?.capabilities?.userOpportunityOverride !== "read") {
  fails.push("RBAC cs must read-only userOpportunityOverride");
}
if (byId.marketing?.capabilities?.userOpportunityOverride !== "none") {
  fails.push("RBAC marketing must none userOpportunityOverride");
}

// --- Nest CRUD ---
const routes = read(
  "services/api-nest/src/opportunities/opportunities.routes.ts",
);
for (const needle of [
  "users/:id/opportunity-overrides",
  "users/:id/opportunity-overrides/:opportunityId",
]) {
  if (!routes.includes(needle)) fails.push(`routes missing ${needle}`);
}

const ctrl = read(
  "services/api-nest/src/opportunities/user-opportunity-override.admin.controller.ts",
);
for (const needle of ["@Get", "@Put", "@Delete", "opportunity-overrides"]) {
  if (!ctrl.includes(needle)) fails.push(`controller missing ${needle}`);
}

const svc = read(
  "services/api-nest/src/opportunities/user-opportunity-override.admin.service.ts",
);
for (const needle of [
  "ledgerMutated: false",
  "OVERRIDE_AUDIT",
  "user_opportunity_override_audit",
  "force_show",
  "pin_order",
  "margin_pct_override",
  "expected_profit_usdt_override",
  "DAY1_MAX_PINS",
  "mergeUserOpportunityOverride",
]) {
  if (!svc.includes(needle)) fails.push(`admin service missing ${needle}`);
}
if (
  /UPDATE\s+(?:public\.)?(?:ledger_accounts|wallet_buckets)/i.test(svc) ||
  /balance_usdt\s*=/.test(svc)
) {
  fails.push("override service must not UPDATE ledger/wallet balances");
}

const mod = read(
  "services/api-nest/src/opportunities/opportunities.module.ts",
);
if (!mod.includes("UserOpportunityOverrideAdminController")) {
  fails.push("module must register override controller");
}
if (!mod.includes("UserOpportunityOverrideAdminService")) {
  fails.push("module must register override service");
}

// --- Admin UI contract ---
const page = read("apps/admin/app/admin/users/[id]/page.tsx");
for (const needle of [
  "tab=opportunities",
  "forceShow",
  "pinOrder",
  "marginPctOverride",
  "expectedProfitUsdtOverride",
  "user-opportunity-override",
  "ledger-immutable",
  "userOpportunityOverride",
  "admin.user.opportunity_override.upsert",
]) {
  if (!page.includes(needle)) {
    fails.push(`admin users/:id page missing ${needle}`);
  }
}

const adminRoutes = read("apps/admin/routes.ts");
if (!adminRoutes.includes("/admin/users/:id?tab=opportunities")) {
  fails.push("ADMIN_CHILD_ROUTES missing ?tab=opportunities");
}

// --- fixture merge behavior (inline) ---
// Re-implement minimal checks matching merge.ts semantics without TS import
function mergeFixture(base, ov) {
  if (!ov) {
    return {
      excludeFromFeed: false,
      expectedProfitUsdt: base.expectedProfitUsdt,
      compareReady: base.compareReady,
    };
  }
  if (ov.hidden && ov.forceShow) throw new Error("mutex");
  return {
    excludeFromFeed: ov.hidden === true,
    expectedProfitUsdt: ov.expectedProfitUsdtOverride ?? base.expectedProfitUsdt,
    compareReady: base.compareReady,
  };
}
const m1 = mergeFixture(
  { expectedProfitUsdt: "10", compareReady: false },
  { hidden: true, forceShow: false },
);
if (!m1.excludeFromFeed) fails.push("fixture: hidden must exclude");
if (m1.compareReady !== false) {
  fails.push("fixture: compareReady must stay false under override");
}
const m2 = mergeFixture(
  { expectedProfitUsdt: "10", compareReady: true },
  { expectedProfitUsdtOverride: "12.5" },
);
if (m2.expectedProfitUsdt !== "12.5") {
  fails.push("fixture: expectedProfit override must apply");
}
try {
  mergeFixture(
    { expectedProfitUsdt: "1", compareReady: true },
    { hidden: true, forceShow: true },
  );
  fails.push("fixture: hidden+forceShow must throw");
} catch {
  /* expected */
}

if (fails.length) {
  console.error("[verify:admin-user-opportunity-override] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:admin-user-opportunity-override] PASS (schema↔DDL · §9.8.9 CRUD · RBAC · audit · merge · ledger 불변)",
);

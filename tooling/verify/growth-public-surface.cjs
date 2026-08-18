/**
 * verify:growth-public-surface — UI PART9g
 * growth_ticker_config + Nest GET growth/public-surface · Admin PATCH pointer only
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

mustExist("supabase/migrations/20260810024643_growth_ticker_config.sql");
mustExist("services/api-nest/src/growth/growth.public.controller.ts");
mustExist("services/api-nest/src/growth/growth-public.service.ts");
mustExist("services/api-nest/src/growth/growth.module.ts");

const mig = read("supabase/migrations/20260810024643_growth_ticker_config.sql");
const ctl = read("services/api-nest/src/growth/growth.public.controller.ts");
const svc = read("services/api-nest/src/growth/growth-public.service.ts");
const mod = read("services/api-nest/src/app.module.ts");
const adminPlan = read(
  ".cursor/plans/ai_profit_os_04_admin_e5f6a7b8.plan.md",
);

if (!mig.includes("growth_ticker_config")) {
  fails.push("migration must create growth_ticker_config");
}
if (!mig.includes("ticker_mode") || !mig.includes("counter_mode")) {
  fails.push("migration must define ticker_mode/counter_mode");
}
if (!mig.includes("DEFAULT 'off'")) {
  fails.push("migration defaults must be off");
}
if (!mig.includes("ENABLE ROW LEVEL SECURITY")) {
  fails.push("growth_ticker_config RLS ON required");
}

if (!ctl.includes("growth/public-surface") && !ctl.includes("publicSurface")) {
  fails.push("controller must expose growth/public-surface");
}
if (!svc.includes("growth_ticker_config")) {
  fails.push("service must read growth_ticker_config");
}
if (!svc.includes("ledgerTotal") || !svc.includes("success")) {
  fails.push("service must aggregate settlement.completed (success) for ledgerTotal");
}
if (/email|userId|legalName/i.test(svc) && !svc.includes("maskLabel")) {
  fails.push("service must not leak PII in events without masking");
}

if (!mod.includes("GrowthModule")) {
  fails.push("AppModule must import GrowthModule");
}

if (!adminPlan.includes("growth_ticker_config")) {
  fails.push(
    "Admin 04 plan must pointer growth_ticker_config (admin-growth-ticker-organic)",
  );
}

// apps/admin code 0 for this todo
const adminGrowth = path.join(root, "apps/admin/app/admin/growth");
// allow existing growth folder — but PART9g must not add PATCH in apps/admin
// soft check: no new requirement

if (fails.length) {
  console.error("[verify:growth-public-surface] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:growth-public-surface] PASS — growth_ticker_config + GET public-surface",
);

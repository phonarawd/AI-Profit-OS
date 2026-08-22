/**
 * verify:rel-408-security-baseline — runbook + RLS evidence. apply_migration 0.
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

const baseline = read("governance/release-master/SECURITY_BASELINE.md");
const runbook = read("governance/release-master/ROLLBACK_RUNBOOK.md");
const evidence = read("governance/release-master/REL-408-SECURITY-BASELINE.md");
const migration = read(
  "supabase/migrations/20260822140000_rel405_admin_control_plane.sql",
);

for (const needle of [
  "RLS_ENABLED",
  "PRODUCTION_DB_WRITE = 0",
  "MIGRATION_FILE_CREATED",
  "MIGRATION_APPLIED = 0",
  "anon",
  "service_role",
]) {
  if (!baseline.includes(needle)) fails.push(`SECURITY_BASELINE missing ${needle}`);
}
if (!runbook.includes("REL-602") || !runbook.includes("rollback")) {
  fails.push("rollback runbook must exist and point REL-602");
}
if (!migration.includes("ENABLE ROW LEVEL SECURITY")) {
  fails.push("migration file must enable RLS (not applied here)");
}
if (evidence.includes("apply_migration") && /apply_migration\s*=\s*1/.test(evidence)) {
  fails.push("this REL must not apply production migrations");
}
if (!evidence.includes("PRODUCTION_DB_WRITE = 0")) {
  fails.push("evidence must keep PRODUCTION_DB_WRITE = 0");
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
if (!pkg.includes("verify:rel-408-security-baseline")) {
  fails.push("package.json missing verify:rel-408-security-baseline");
}
if (!catalog.includes("rel-408-security-baseline")) {
  fails.push("CATALOG.md missing rel-408-security-baseline");
}

if (fails.length) {
  console.error("[verify:rel-408-security-baseline] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-408-security-baseline] PASS");

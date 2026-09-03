"use strict";

const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing:" + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const rollbackRel = "supabase/staging/20260901120300_hardening_rollback.sql";
const verifyRel = "supabase/staging/20260901120400_hardening_verify.sql";
const rollback = read(rollbackRel);
const verify = read(verifyRel);

for (const [name, body] of [["rollback", rollback], ["verify", verify]]) {
  if (!body.includes("STAGING / NON-PRODUCTION ONLY")) fails.push(name + ":staging_marker_missing");
}
if (!rollback.includes("APPLY_THIS_SLICE = NO")) fails.push("rollback:apply_guard_missing");
if (!rollback.includes("PRODUCTION_ROLLBACK_EXECUTION = 0")) fails.push("rollback:production_zero_missing");
if (!verify.includes("READ_ONLY_VERIFY = YES")) fails.push("verify:readonly_marker_missing");
if (!verify.includes("PRODUCTION_MUTATION = 0")) fails.push("verify:production_zero_missing");

for (const table of ["admin_audit_events", "push_control", "push_subscriptions"]) {
  if (!rollback.includes(table)) fails.push("rollback:table_missing:" + table);
  if (!verify.includes(table)) fails.push("verify:table_missing:" + table);
}
for (const policy of [
  "push_control_deny_anon",
  "push_control_deny_authenticated",
  "push_subscriptions_deny_anon",
  "push_subscriptions_deny_authenticated",
]) {
  if (!rollback.includes("DROP POLICY IF EXISTS " + policy)) {
    fails.push("rollback:policy_drop_missing:" + policy);
  }
}
if (!rollback.includes("NO FORCE ROW LEVEL SECURITY")) fails.push("rollback:no_force_missing");
if (!rollback.includes("DISABLE ROW LEVEL SECURITY")) fails.push("rollback:disable_rls_missing");
if (/ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin/i.test(rollback)) {
  fails.push("rollback:managed_role_acl_mutation_forbidden");
}
if (/ALTER DEFAULT PRIVILEGES FOR ROLE postgres[\s\S]*GRANT ALL ON TABLES TO anon/i.test(rollback)) {
  fails.push("rollback:must_not_broaden_postgres_defaults");
}
if (/GRANT\s+ALL\s+ON\s+TABLE\s+public\./i.test(rollback)) {
  fails.push("rollback:table_grant_all_forbidden_use_explicit_privileges");
}

const verifyBody = verify
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");
for (const keyword of ["INSERT ", "UPDATE ", "DELETE ", "ALTER ", "DROP ", "CREATE ", "GRANT ", "REVOKE ", "TRUNCATE "]) {
  if (verifyBody.toUpperCase().includes(keyword)) {
    fails.push("verify:mutation_keyword:" + keyword.trim());
  }
}
if (!/WITH\s+table_state\s+AS/i.test(verifyBody) || !/SELECT\s+jsonb_build_object/i.test(verifyBody)) {
  fails.push("verify:select_snapshot_shape_missing");
}

for (const rel of [rollbackRel, verifyRel]) {
  const prodPath = rel.replace("supabase/staging/", "supabase/migrations/");
  if (fs.existsSync(path.join(ROOT, prodPath))) fails.push("production_migration_copy_forbidden:" + prodPath);
}

if (fails.length) {
  console.error("[staging-db-hardening-rehearsal] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log("[staging-db-hardening-rehearsal] PASS · static only · Production mutation 0");

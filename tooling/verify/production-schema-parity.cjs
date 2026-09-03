"use strict";

const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "../..");
const rel = "supabase/migrations/20260902032000_production_schema_parity.sql";
const sql = fs.readFileSync(path.join(ROOT, rel), "utf8");
const fails = [];

const tables = [
  "ledger_outbox_events",
  "source_observations",
  "canonical_products",
  "canonical_product_source_links",
  "match_results",
  "push_control",
  "push_subscriptions",
  "admin_audit_events",
  "admin_kill_switches",
  "opportunity_price_overrides",
  "admin_ops_intents",
  "admin_match_controls",
  "admin_policy_versions",
  "admin_policy_heads",
];

for (const table of tables) {
  if (!sql.includes("CREATE TABLE IF NOT EXISTS public." + table)) {
    fails.push("missing_create:" + table);
  }
}
const creates = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS public\.([a-z0-9_]+)/g)].map(m=>m[1]);
if (new Set(creates).size !== 14) fails.push("create_count=" + new Set(creates).size);

const insertTargets = [...sql.matchAll(/INSERT INTO public\.([a-z0-9_]+)/g)].map(m=>m[1]);
for (const target of insertTargets) {
  if (!["push_control","admin_kill_switches"].includes(target)) {
    fails.push("customer_data_seed_forbidden:" + target);
  }
}
if (!sql.includes("DATA COPY = 0")) fails.push("data_copy_zero_marker_missing");
if (/\bCOPY\b/i.test(sql.replace(/^--.*$/gm,""))) fails.push("copy_command_forbidden");
if (/INSERT\s+INTO[\s\S]{0,200}\bSELECT\b/i.test(sql)) fails.push("insert_select_forbidden");
if (/DROP\s+TABLE/i.test(sql)) fails.push("drop_table_forbidden");
if (/TRUNCATE\s+TABLE/i.test(sql)) fails.push("truncate_forbidden");
if (/ALTER\s+DEFAULT\s+PRIVILEGES/i.test(sql)) fails.push("default_acl_change_forbidden_in_parity_migration");

for (const table of [
  "ledger_outbox_events","source_observations","canonical_products",
  "canonical_product_source_links","match_results","admin_audit_events",
  "admin_kill_switches","opportunity_price_overrides","admin_ops_intents",
  "admin_match_controls","admin_policy_versions","admin_policy_heads"
]) {
  if (!sql.includes("ALTER TABLE public." + table + " ENABLE ROW LEVEL SECURITY")) {
    fails.push("rls_enable_missing:" + table);
  }
}
for (const table of ["push_control","push_subscriptions"]) {
  if (!sql.includes("ALTER TABLE public." + table + " DISABLE ROW LEVEL SECURITY")) {
    fails.push("pre_hardening_rls_off_missing:" + table);
  }
}

for (const trigger of [
  "source_observations_forbid_mutation",
  "canonical_products_protect_immutable",
  "match_results_forbid_mutation",
  "admin_audit_events_forbid_mutation",
  "admin_kill_switches_forbid_delete",
  "opportunity_price_overrides_forbid_delete",
  "admin_ops_intents_forbid_delete",
  "admin_match_controls_forbid_delete",
  "admin_policy_versions_forbid_update",
]) {
  if (!sql.includes("CREATE TRIGGER " + trigger)) fails.push("trigger_missing:" + trigger);
}

if (fails.length) {
  console.error("[production-schema-parity] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log("[production-schema-parity] PASS · 14 tables · customer data copy 0");

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  compareSnapshot,
  snapshotSql,
  policySignature,
} = require("../release/db-hardening-readiness.cjs");

const READY = {
  tables: {
    admin_audit_events: {
      rls_enabled: true,
      rls_forced: false,
      service_role: ["SELECT", "INSERT"],
      policies: [],
    },
    push_control: {
      rls_enabled: true,
      rls_forced: true,
      service_role: ["UPDATE", "SELECT"],
      policies: [
        { name: "push_control_deny_authenticated", roles: ["authenticated"], cmd: "ALL", qual: "(false)", with_check: "false" },
        { name: "push_control_deny_anon", roles: ["anon"], cmd: "ALL", qual: "false", with_check: "(false)" },
      ],
    },
    push_subscriptions: {
      rls_enabled: true,
      rls_forced: true,
      service_role: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      policies: [
        { name: "push_subscriptions_deny_anon", roles: ["anon"], cmd: "ALL", qual: "false", with_check: "false" },
        { name: "push_subscriptions_deny_authenticated", roles: ["authenticated"], cmd: "ALL", qual: "false", with_check: "false" },
      ],
    },
  },
  public_table_owners: {
    postgres: 93,
  },
  default_acl_public_tables: {
    postgres: ["postgres", "service_role"],
    // Supabase-managed role defaults may be broader; they are informational
    // unless that role actually owns an app table in public.
    supabase_admin: ["anon", "authenticated", "postgres", "service_role"],
  },
};

const ready = compareSnapshot(READY);
assert.equal(ready.ok, true);
assert.equal(ready.status, "READY");
assert.deepEqual(ready.fails, []);
assert.equal(ready.production_mutation, 0);

const broad = structuredClone(READY);
broad.tables.push_control.service_role.push("TRUNCATE", "REFERENCES", "TRIGGER", "INSERT");
let got = compareSnapshot(broad);
assert.equal(got.ok, false);
assert.equal(got.status, "NOT_READY");
assert.ok(
  got.fails.some((x) =>
    x.startsWith("service_role_privilege_mismatch:push_control"),
  ),
);
assert.ok(got.fails.includes("forbidden_privilege:push_control:TRUNCATE"));
assert.ok(got.fails.includes("forbidden_privilege:push_control:REFERENCES"));
assert.ok(got.fails.includes("forbidden_privilege:push_control:TRIGGER"));

const noRls = structuredClone(READY);
noRls.tables.push_subscriptions.rls_enabled = false;
got = compareSnapshot(noRls);
assert.equal(got.ok, false);
assert.ok(
  got.fails.includes(
    "rls_enabled_mismatch:push_subscriptions:expected=true:got=false",
  ),
);

const notForced = structuredClone(READY);
notForced.tables.push_control.rls_forced = false;
got = compareSnapshot(notForced);
assert.equal(got.ok, false);
assert.ok(
  got.fails.includes(
    "rls_forced_mismatch:push_control:expected=true:got=false",
  ),
);

const missingPolicy = structuredClone(READY);
missingPolicy.tables.push_control.policies = [];
got = compareSnapshot(missingPolicy);
assert.equal(got.ok, false);
assert.ok(got.fails.some((x) => x.startsWith("policy_mismatch:push_control")));

const permissivePolicy = structuredClone(READY);
permissivePolicy.tables.push_subscriptions.policies[0].qual = "true";
got = compareSnapshot(permissivePolicy);
assert.equal(got.ok, false);
assert.ok(
  got.fails.some((x) => x.startsWith("policy_mismatch:push_subscriptions")),
);

const missingDefaultAcl = structuredClone(READY);
delete missingDefaultAcl.default_acl_public_tables;
got = compareSnapshot(missingDefaultAcl);
assert.equal(got.ok, false);
assert.ok(got.fails.includes("default_acl_snapshot_missing"));

const managedDefaultAcl = structuredClone(READY);
got = compareSnapshot(managedDefaultAcl);
assert.equal(got.ok, true);
assert.deepEqual(got.app_default_acl_owners, ["postgres"]);
assert.ok(
  got.warnings.includes(
    "managed_default_acl_outside_app_owner_scope:supabase_admin:anon",
  ),
);
assert.ok(
  got.warnings.includes(
    "managed_default_acl_outside_app_owner_scope:supabase_admin:authenticated",
  ),
);

const unsafeAppOwnerDefaultAcl = structuredClone(READY);
unsafeAppOwnerDefaultAcl.default_acl_public_tables.postgres = [
  "anon",
  "authenticated",
  "postgres",
  "service_role",
];
got = compareSnapshot(unsafeAppOwnerDefaultAcl);
assert.equal(got.ok, false);
assert.ok(
  got.fails.includes("forbidden_default_acl_grantee:postgres:anon"),
);
assert.ok(
  got.fails.includes("forbidden_default_acl_grantee:postgres:authenticated"),
);

const unexpectedOwner = structuredClone(READY);
unexpectedOwner.public_table_owners.supabase_admin = 1;
got = compareSnapshot(unexpectedOwner);
assert.equal(got.ok, false);
assert.ok(got.fails.includes("unexpected_public_table_owner:supabase_admin"));
assert.ok(
  got.fails.includes("forbidden_default_acl_grantee:supabase_admin:anon"),
);

const missingOwnerSnapshot = structuredClone(READY);
delete missingOwnerSnapshot.public_table_owners;
got = compareSnapshot(missingOwnerSnapshot);
assert.equal(got.ok, false);
assert.ok(got.fails.includes("public_table_owner_snapshot_missing"));

assert.equal(
  policySignature({
    name: "x",
    roles: ["authenticated"],
    cmd: "all",
    qual: "( false )",
    with_check: "((false))",
  }),
  "x|authenticated|ALL|false|false",
);

const sql = snapshotSql();
assert.match(sql, /information_schema\.role_table_grants/);
assert.match(sql, /pg_policies/);
assert.match(sql, /relforcerowsecurity/);
assert.match(sql, /service_role/);
assert.match(sql, /push_control/);
assert.match(sql, /pg_default_acl/);
assert.match(sql, /aclexplode/);
assert.match(sql, /default_acl_public_tables/);
assert.match(sql, /relowner/);
assert.match(sql, /public_table_owners/);
assert.doesNotMatch(sql, /\b(update|delete|insert|alter|grant|revoke|truncate)\b\s+/i);

const root = path.resolve(__dirname, "../..");
const adminSql = fs.readFileSync(
  path.join(root, "supabase/staging/20260901120000_admin_audit_append_only.sql"),
  "utf8",
);
const pushSql = fs.readFileSync(
  path.join(root, "supabase/staging/20260901120100_push_rls.sql"),
  "utf8",
);
const productionHardeningSql = fs.readFileSync(
  path.join(root, "supabase/migrations/20260902092000_production_db_hardening.sql"),
  "utf8",
);

for (const needle of [
  "GRANT SELECT, INSERT ON TABLE public.admin_audit_events TO service_role",
  "REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.admin_audit_events FROM service_role",
]) {
  assert.ok(adminSql.includes(needle), "admin hardening contract drift: " + needle);
}

for (const needle of [
  "ALTER TABLE public.push_control ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE public.push_control FORCE ROW LEVEL SECURITY",
  "ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE public.push_subscriptions FORCE ROW LEVEL SECURITY",
  "CREATE POLICY push_control_deny_anon",
  "CREATE POLICY push_control_deny_authenticated",
  "CREATE POLICY push_subscriptions_deny_anon",
  "CREATE POLICY push_subscriptions_deny_authenticated",
  "GRANT SELECT, UPDATE ON TABLE public.push_control TO service_role",
  "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_subscriptions TO service_role",
]) {
  assert.ok(pushSql.includes(needle), "push hardening contract drift: " + needle);
}

for (const needle of [
  "ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY",
  "REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER",
  "GRANT SELECT, INSERT ON TABLE public.admin_audit_events TO service_role",
  "CREATE TRIGGER admin_audit_events_forbid_truncate",
  "ALTER TABLE public.push_control ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE public.push_control FORCE ROW LEVEL SECURITY",
  "ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE public.push_subscriptions FORCE ROW LEVEL SECURITY",
  "CREATE POLICY push_control_deny_anon",
  "CREATE POLICY push_control_deny_authenticated",
  "CREATE POLICY push_subscriptions_deny_anon",
  "CREATE POLICY push_subscriptions_deny_authenticated",
  "REVOKE ALL ON TABLE public.push_control FROM service_role",
  "REVOKE ALL ON TABLE public.push_subscriptions FROM service_role",
  "GRANT SELECT, UPDATE ON TABLE public.push_control TO service_role",
]) {
  assert.ok(
    productionHardeningSql.includes(needle),
    "production hardening migration contract drift: " + needle,
  );
}
assert.match(
  productionHardeningSql,
  /GRANT SELECT, INSERT, UPDATE, DELETE\s+ON TABLE public\.push_subscriptions TO service_role/,
);
assert.doesNotMatch(
  productionHardeningSql,
  /GRANT ALL ON TABLE public\.(push_control|push_subscriptions) TO service_role/,
);

console.log(
  "[verify:db-hardening-readiness] PASS (EXACT_PRIVILEGES · ENABLE+FORCE_RLS · DENY_POLICIES · SOURCE_CONTRACT_BOUND · production mutation 0)",
);

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
      forbidden_grants: [],
      triggers: ["admin_audit_events_forbid_truncate"],
    },
    push_control: {
      rls_enabled: true,
      rls_forced: true,
      service_role: ["UPDATE", "SELECT"],
      policies: [
        { name: "push_control_deny_authenticated", roles: ["authenticated"], cmd: "ALL", qual: "(false)", with_check: "false" },
        { name: "push_control_deny_anon", roles: ["anon"], cmd: "ALL", qual: "false", with_check: "(false)" },
      ],
      forbidden_grants: [],
      triggers: [],
    },
    push_subscriptions: {
      rls_enabled: true,
      rls_forced: true,
      service_role: ["SELECT", "INSERT", "UPDATE", "DELETE"],
      policies: [
        { name: "push_subscriptions_deny_anon", roles: ["anon"], cmd: "ALL", qual: "false", with_check: "false" },
        { name: "push_subscriptions_deny_authenticated", roles: ["authenticated"], cmd: "ALL", qual: "false", with_check: "false" },
      ],
      forbidden_grants: [],
      triggers: [],
    },
  },
  default_acl_forbidden: [],
};

const ready = compareSnapshot(READY);
assert.equal(ready.ok, true);
assert.deepEqual(ready.fails, []);
assert.equal(ready.production_mutation, 0);

const broad = structuredClone(READY);
broad.tables.push_control.service_role.push("TRUNCATE");
let got = compareSnapshot(broad);
assert.equal(got.ok, false);
assert.ok(
  got.fails.some((x) =>
    x.startsWith("service_role_privilege_mismatch:push_control"),
  ),
);

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

const forbiddenGrant = structuredClone(READY);
forbiddenGrant.tables.push_control.forbidden_grants.push({
  grantee: "authenticated",
  privilege_type: "SELECT",
});
got = compareSnapshot(forbiddenGrant);
assert.equal(got.ok, false);
assert.ok(
  got.fails.some((x) => x.startsWith("forbidden_table_grant:push_control")),
);

const missingGrantEvidence = structuredClone(READY);
delete missingGrantEvidence.tables.push_subscriptions.forbidden_grants;
got = compareSnapshot(missingGrantEvidence);
assert.equal(got.ok, false);
assert.ok(
  got.fails.includes("forbidden_grant_evidence_missing:push_subscriptions"),
);

const missingTruncateGuard = structuredClone(READY);
missingTruncateGuard.tables.admin_audit_events.triggers = [];
got = compareSnapshot(missingTruncateGuard);
assert.equal(got.ok, false);
assert.ok(
  got.fails.includes(
    "required_trigger_missing:admin_audit_events:admin_audit_events_forbid_truncate",
  ),
);

const unsafeDefaultAcl = structuredClone(READY);
unsafeDefaultAcl.default_acl_forbidden.push({
  owner: "supabase_admin",
  grantee: "authenticated",
  privilege_type: "SELECT",
});
got = compareSnapshot(unsafeDefaultAcl);
assert.equal(got.ok, false);
assert.ok(
  got.fails.some((x) => x.startsWith("default_acl_forbidden_grant:")),
);

const missingDefaultAclEvidence = structuredClone(READY);
delete missingDefaultAclEvidence.default_acl_forbidden;
got = compareSnapshot(missingDefaultAclEvidence);
assert.equal(got.ok, false);
assert.ok(got.fails.includes("default_acl_evidence_missing"));

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
assert.match(sql, /information_schema\.table_privileges/);
assert.match(sql, /pg_policies/);
assert.match(sql, /pg_trigger/);
assert.match(sql, /pg_default_acl/);
assert.match(sql, /aclexplode/);
assert.match(sql, /relforcerowsecurity/);
assert.match(sql, /service_role/);
assert.match(sql, /push_control/);
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
const defaultAclSql = fs.readFileSync(
  path.join(root, "supabase/staging/20260901120200_default_acl.sql"),
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
  "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public",
  "ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public",
  "REVOKE ALL ON TABLES FROM anon, authenticated",
]) {
  assert.ok(
    defaultAclSql.includes(needle),
    "default ACL hardening contract drift: " + needle,
  );
}

console.log(
  "[verify:db-hardening-readiness] PASS (EXACT_PRIVILEGES · FORBIDDEN_GRANTS_ZERO · APPEND_ONLY_TRIGGER · DEFAULT_ACL_SAFE · ENABLE+FORCE_RLS · DENY_POLICIES · SOURCE_CONTRACT_BOUND · production mutation 0)",
);

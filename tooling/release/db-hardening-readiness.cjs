"use strict";

/**
 * Production DB hardening readiness comparator.
 * It consumes a READ-ONLY privilege/RLS/policy snapshot and compares it with
 * the canonical staging hardening contract. It never connects or mutates DB.
 */

const fs = require("node:fs");
const path = require("node:path");

const EXPECTED = Object.freeze({
  admin_audit_events: {
    rls_enabled: true,
    rls_forced: false,
    service_role: ["INSERT", "SELECT"],
    policies: [],
    required_triggers: ["admin_audit_events_forbid_truncate"],
  },
  push_control: {
    rls_enabled: true,
    rls_forced: true,
    service_role: ["SELECT", "UPDATE"],
    policies: [
      { name: "push_control_deny_anon", roles: ["anon"], cmd: "ALL", qual: "false", with_check: "false" },
      { name: "push_control_deny_authenticated", roles: ["authenticated"], cmd: "ALL", qual: "false", with_check: "false" },
    ],
    required_triggers: [],
  },
  push_subscriptions: {
    rls_enabled: true,
    rls_forced: true,
    service_role: ["DELETE", "INSERT", "SELECT", "UPDATE"],
    policies: [
      { name: "push_subscriptions_deny_anon", roles: ["anon"], cmd: "ALL", qual: "false", with_check: "false" },
      { name: "push_subscriptions_deny_authenticated", roles: ["authenticated"], cmd: "ALL", qual: "false", with_check: "false" },
    ],
    required_triggers: [],
  },
});

function snapshotSql() {
  return `
select jsonb_build_object(
  'tables',
  jsonb_object_agg(
    c.relname,
    jsonb_build_object(
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity,
      'service_role', coalesce(priv.privileges, '[]'::jsonb),
      'policies', coalesce(pol.policies, '[]'::jsonb),
      'forbidden_grants', coalesce(forbidden.grants, '[]'::jsonb),
      'triggers', coalesce(trg.triggers, '[]'::jsonb)
    )
  ),
  'default_acl_forbidden',
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'owner', owner_role.rolname,
        'grantee', coalesce(grantee_role.rolname, 'public'),
        'privilege_type', acl.privilege_type
      )
      order by owner_role.rolname, coalesce(grantee_role.rolname, 'public'), acl.privilege_type
    )
    from pg_default_acl d
    join pg_roles owner_role on owner_role.oid = d.defaclrole
    join pg_namespace dns on dns.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) acl
    left join pg_roles grantee_role on grantee_role.oid = acl.grantee
    where dns.nspname='public'
      and d.defaclobjtype='r'
      and owner_role.rolname in ('postgres','supabase_admin')
      and (
        acl.grantee = 0
        or grantee_role.rolname in ('anon','authenticated')
      )
  ), '[]'::jsonb)
)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join lateral (
  select jsonb_agg(g.privilege_type order by g.privilege_type) as privileges
  from information_schema.role_table_grants g
  where g.table_schema='public'
    and g.table_name=c.relname
    and g.grantee='service_role'
) priv on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'name', p.policyname,
      'roles', to_jsonb(p.roles),
      'cmd', p.cmd,
      'qual', p.qual,
      'with_check', p.with_check
    )
    order by p.policyname
  ) as policies
  from pg_policies p
  where p.schemaname='public'
    and p.tablename=c.relname
) pol on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'grantee', lower(g.grantee),
      'privilege_type', g.privilege_type
    )
    order by lower(g.grantee), g.privilege_type
  ) as grants
  from information_schema.table_privileges g
  where g.table_schema='public'
    and g.table_name=c.relname
    and lower(g.grantee) in ('public','anon','authenticated')
) forbidden on true
left join lateral (
  select jsonb_agg(t.tgname order by t.tgname) as triggers
  from pg_trigger t
  where t.tgrelid=c.oid
    and not t.tgisinternal
) trg on true
where n.nspname='public'
  and c.relkind='r'
  and c.relname in ('admin_audit_events','push_control','push_subscriptions');
`.trim();
}

function sortedUnique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(String))].sort();
}

function normalizeExpr(value) {
  let s = String(value == null ? "" : value).trim().toLowerCase().replace(/\s+/g, " ");
  while (s.startsWith("(") && s.endsWith(")")) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function normalizePolicy(policy) {
  const p = policy && typeof policy === "object" ? policy : {};
  return {
    name: String(p.name || p.policyname || ""),
    roles: sortedUnique(p.roles),
    cmd: String(p.cmd || "").toUpperCase(),
    qual: normalizeExpr(p.qual),
    with_check: normalizeExpr(p.with_check),
  };
}

function policySignature(policy) {
  const p = normalizePolicy(policy);
  return [
    p.name,
    p.roles.join(","),
    p.cmd,
    p.qual,
    p.with_check,
  ].join("|");
}

function compareSnapshot(snapshot) {
  const fails = [];
  const tables =
    snapshot && typeof snapshot === "object" && snapshot.tables
      ? snapshot.tables
      : {};

  for (const [table, expected] of Object.entries(EXPECTED)) {
    const got = tables[table];
    if (!got || typeof got !== "object") {
      fails.push("missing_table:" + table);
      continue;
    }

    if (got.rls_enabled !== expected.rls_enabled) {
      fails.push(
        "rls_enabled_mismatch:" +
          table +
          ":expected=" +
          expected.rls_enabled +
          ":got=" +
          got.rls_enabled,
      );
    }
    if (got.rls_forced !== expected.rls_forced) {
      fails.push(
        "rls_forced_mismatch:" +
          table +
          ":expected=" +
          expected.rls_forced +
          ":got=" +
          got.rls_forced,
      );
    }

    const actualPrivileges = sortedUnique(got.service_role);
    const expectedPrivileges = sortedUnique(expected.service_role);
    if (JSON.stringify(actualPrivileges) !== JSON.stringify(expectedPrivileges)) {
      fails.push(
        "service_role_privilege_mismatch:" +
          table +
          ":expected=" +
          expectedPrivileges.join(",") +
          ":got=" +
          actualPrivileges.join(","),
      );
    }

    const actualPolicies = (Array.isArray(got.policies) ? got.policies : [])
      .map(policySignature)
      .sort();
    const expectedPolicies = expected.policies.map(policySignature).sort();
    if (JSON.stringify(actualPolicies) !== JSON.stringify(expectedPolicies)) {
      fails.push(
        "policy_mismatch:" +
          table +
          ":expected=" +
          expectedPolicies.join(";") +
          ":got=" +
          actualPolicies.join(";"),
      );
    }

    if (!Array.isArray(got.forbidden_grants)) {
      fails.push("forbidden_grant_evidence_missing:" + table);
    } else if (got.forbidden_grants.length > 0) {
      fails.push(
        "forbidden_table_grant:" +
          table +
          ":" +
          JSON.stringify(got.forbidden_grants),
      );
    }

    if (!Array.isArray(got.triggers)) {
      fails.push("trigger_evidence_missing:" + table);
    } else {
      const triggers = new Set(got.triggers.map(String));
      for (const required of expected.required_triggers || []) {
        if (!triggers.has(required)) {
          fails.push("required_trigger_missing:" + table + ":" + required);
        }
      }
    }
  }

  if (!snapshot || !Array.isArray(snapshot.default_acl_forbidden)) {
    fails.push("default_acl_evidence_missing");
  } else if (snapshot.default_acl_forbidden.length > 0) {
    fails.push(
      "default_acl_forbidden_grant:" +
        JSON.stringify(snapshot.default_acl_forbidden),
    );
  }

  return {
    ok: fails.length === 0,
    schema: "db-hardening-readiness.v2",
    production_mutation: 0,
    expected: EXPECTED,
    fails,
  };
}

function parseArgs(argv) {
  const out = { input: "" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--input") out.input = argv[i + 1] || "";
  }
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  if (!args.input) {
    process.stderr.write(
      "usage: db-hardening-readiness.cjs --input <read-only-snapshot.json>\n",
    );
    process.exit(2);
  }
  const abs = path.resolve(args.input);
  let snapshot;
  try {
    snapshot = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch {
    process.stderr.write("[db-hardening-readiness] FAIL_CLOSED:snapshot_invalid\n");
    process.exit(1);
  }
  const result = compareSnapshot(snapshot);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (!result.ok) process.exit(1);
}

if (require.main === module) main(process.argv);

module.exports = {
  EXPECTED,
  snapshotSql,
  sortedUnique,
  normalizeExpr,
  normalizePolicy,
  policySignature,
  compareSnapshot,
  parseArgs,
};

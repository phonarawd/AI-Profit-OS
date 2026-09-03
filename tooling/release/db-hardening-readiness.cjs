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
  },
  push_control: {
    rls_enabled: true,
    rls_forced: true,
    service_role: ["SELECT", "UPDATE"],
    policies: [
      { name: "push_control_deny_anon", roles: ["anon"], cmd: "ALL", qual: "false", with_check: "false" },
      { name: "push_control_deny_authenticated", roles: ["authenticated"], cmd: "ALL", qual: "false", with_check: "false" },
    ],
  },
  push_subscriptions: {
    rls_enabled: true,
    rls_forced: true,
    service_role: ["DELETE", "INSERT", "SELECT", "UPDATE"],
    policies: [
      { name: "push_subscriptions_deny_anon", roles: ["anon"], cmd: "ALL", qual: "false", with_check: "false" },
      { name: "push_subscriptions_deny_authenticated", roles: ["authenticated"], cmd: "ALL", qual: "false", with_check: "false" },
    ],
  },
});

function snapshotSql() {
  return `
with table_state as (
  select jsonb_object_agg(
    c.relname,
    jsonb_build_object(
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity,
      'service_role', coalesce(priv.privileges, '[]'::jsonb),
      'policies', coalesce(pol.policies, '[]'::jsonb)
    )
  ) as tables
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
  where n.nspname='public'
    and c.relkind='r'
    and c.relname in ('admin_audit_events','push_control','push_subscriptions')
),
table_owner_state as (
  select coalesce(
    jsonb_object_agg(owner, table_count),
    '{}'::jsonb
  ) as public_table_owners
  from (
    select
      pg_get_userbyid(c.relowner) as owner,
      count(*)::int as table_count
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public'
      and c.relkind='r'
    group by c.relowner
  ) q
),
default_acl_state as (
  select coalesce(
    jsonb_object_agg(owner, to_jsonb(grantees)),
    '{}'::jsonb
  ) as default_acl_public_tables
  from (
    select
      pg_get_userbyid(d.defaclrole) as owner,
      array_agg(
        distinct case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end
        order by case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end
      ) as grantees
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) x
    where n.nspname='public'
      and d.defaclobjtype='r'
    group by d.defaclrole
  ) q
)
select jsonb_build_object(
  'tables', coalesce((select tables from table_state), '{}'::jsonb),
  'public_table_owners', coalesce(
    (select public_table_owners from table_owner_state),
    '{}'::jsonb
  ),
  'default_acl_public_tables', coalesce(
    (select default_acl_public_tables from default_acl_state),
    '{}'::jsonb
  )
);
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
    for (const banned of ["TRUNCATE", "REFERENCES", "TRIGGER"]) {
      if (actualPrivileges.includes(banned)) {
        fails.push("forbidden_privilege:" + table + ":" + banned);
      }
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
  }

  const publicTableOwners =
    snapshot &&
    typeof snapshot === "object" &&
    snapshot.public_table_owners &&
    typeof snapshot.public_table_owners === "object"
      ? snapshot.public_table_owners
      : null;
  const defaultAcl =
    snapshot &&
    typeof snapshot === "object" &&
    snapshot.default_acl_public_tables &&
    typeof snapshot.default_acl_public_tables === "object"
      ? snapshot.default_acl_public_tables
      : null;
  const warnings = [];
  const appOwners = [];

  if (!publicTableOwners) {
    fails.push("public_table_owner_snapshot_missing");
  } else {
    for (const [owner, rawCount] of Object.entries(publicTableOwners)) {
      const count = Number(rawCount);
      if (!Number.isInteger(count) || count < 1) {
        fails.push("public_table_owner_count_invalid:" + owner);
        continue;
      }
      appOwners.push(owner);
      if (owner !== "postgres") {
        fails.push("unexpected_public_table_owner:" + owner);
      }
    }
    if (!appOwners.includes("postgres")) {
      fails.push("postgres_public_table_owner_missing");
    }
  }

  if (!defaultAcl) {
    fails.push("default_acl_snapshot_missing");
  } else if (publicTableOwners) {
    for (const owner of appOwners) {
      const grantees = sortedUnique(defaultAcl[owner]);
      for (const banned of ["PUBLIC", "anon", "authenticated"]) {
        if (grantees.includes(banned)) {
          fails.push("forbidden_default_acl_grantee:" + owner + ":" + banned);
        }
      }
    }

    for (const [owner, values] of Object.entries(defaultAcl)) {
      if (appOwners.includes(owner)) continue;
      const grantees = sortedUnique(values);
      for (const banned of ["PUBLIC", "anon", "authenticated"]) {
        if (grantees.includes(banned)) {
          warnings.push(
            "managed_default_acl_outside_app_owner_scope:" + owner + ":" + banned,
          );
        }
      }
    }
  }

  return {
    ok: fails.length === 0,
    schema: "db-hardening-readiness.v3",
    status: fails.length === 0 ? "READY" : "NOT_READY",
    production_mutation: 0,
    apply: false,
    app_default_acl_owners: appOwners.sort(),
    expected: EXPECTED,
    warnings,
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

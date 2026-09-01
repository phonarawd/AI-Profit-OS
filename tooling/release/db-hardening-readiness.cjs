"use strict";

/**
 * Production DB hardening readiness comparator.
 * It consumes a READ-ONLY privilege/RLS snapshot and compares it with the
 * already-approved staging hardening contract. It never connects or mutates DB.
 */

const fs = require("node:fs");
const path = require("node:path");

const EXPECTED = Object.freeze({
  admin_audit_events: {
    rls: true,
    service_role: ["INSERT", "SELECT"],
  },
  push_control: {
    rls: true,
    service_role: ["SELECT", "UPDATE"],
  },
  push_subscriptions: {
    rls: true,
    service_role: ["DELETE", "INSERT", "SELECT", "UPDATE"],
  },
});

function snapshotSql() {
  return `
select jsonb_build_object(
  'tables',
  jsonb_object_agg(
    t.tablename,
    jsonb_build_object(
      'rls', t.rowsecurity,
      'service_role', coalesce(p.privileges, '[]'::jsonb)
    )
  )
)
from pg_tables t
left join lateral (
  select jsonb_agg(g.privilege_type order by g.privilege_type) as privileges
  from information_schema.role_table_grants g
  where g.table_schema='public'
    and g.table_name=t.tablename
    and g.grantee='service_role'
) p on true
where t.schemaname='public'
  and t.tablename in ('admin_audit_events','push_control','push_subscriptions');
`.trim();
}

function sortedUnique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(String))].sort();
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
    if (got.rls !== expected.rls) {
      fails.push(
        "rls_mismatch:" + table + ":expected=" + expected.rls + ":got=" + got.rls,
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
  }
  return {
    ok: fails.length === 0,
    schema: "db-hardening-readiness.v1",
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
  compareSnapshot,
  parseArgs,
};

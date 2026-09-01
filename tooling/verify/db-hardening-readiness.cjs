"use strict";

const assert = require("node:assert/strict");
const {
  compareSnapshot,
  snapshotSql,
} = require("../release/db-hardening-readiness.cjs");

const READY = {
  tables: {
    admin_audit_events: {
      rls: true,
      service_role: ["SELECT", "INSERT"],
    },
    push_control: {
      rls: true,
      service_role: ["UPDATE", "SELECT"],
    },
    push_subscriptions: {
      rls: true,
      service_role: ["SELECT", "INSERT", "UPDATE", "DELETE"],
    },
  },
};

const ready = compareSnapshot(READY);
assert.equal(ready.ok, true);
assert.deepEqual(ready.fails, []);
assert.equal(ready.production_mutation, 0);

const broad = structuredClone(READY);
broad.tables.push_control.service_role.push("TRUNCATE");
const broadResult = compareSnapshot(broad);
assert.equal(broadResult.ok, false);
assert.ok(
  broadResult.fails.some((x) =>
    x.startsWith("service_role_privilege_mismatch:push_control"),
  ),
);

const noRls = structuredClone(READY);
noRls.tables.push_subscriptions.rls = false;
const noRlsResult = compareSnapshot(noRls);
assert.equal(noRlsResult.ok, false);
assert.ok(
  noRlsResult.fails.includes(
    "rls_mismatch:push_subscriptions:expected=true:got=false",
  ),
);

const sql = snapshotSql();
assert.match(sql, /information_schema\.role_table_grants/);
assert.match(sql, /pg_tables/);
assert.match(sql, /service_role/);
assert.match(sql, /push_control/);
assert.doesNotMatch(sql, /\b(update|delete|insert|alter|grant|revoke)\b/i);

console.log(
  "[verify:db-hardening-readiness] PASS (READ_ONLY_SNAPSHOT_COMPARATOR · exact least privilege · production mutation 0)",
);

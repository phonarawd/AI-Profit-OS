"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  PRODUCTION_PROJECT_REF,
  ALLOWLIST_PATH,
  assertQaIsolation,
  isProductionTarget,
  isAllowlisted,
  loadAllowlist,
} = require("../e2e/lib/qa-env-isolation-guard.cjs");

const STAGING_PROJECT_REF = "uluzxvdpynytytduuryy";
const allowlist = loadAllowlist();

assert.equal(allowlist.productionProjectRef, PRODUCTION_PROJECT_REF);
assert.deepEqual(allowlist.allowedProjectRefs, [STAGING_PROJECT_REF]);
assert.equal(
  allowlist.allowedProjectRefs.includes(PRODUCTION_PROJECT_REF),
  false,
);

const prod = {
  projectRef: PRODUCTION_PROJECT_REF,
  databaseUrl:
    "postgresql://postgres." +
    PRODUCTION_PROJECT_REF +
    ":[redacted]@pooler.supabase.com:5432/postgres",
};
assert.equal(isProductionTarget(prod, allowlist), true);

const stage = {
  projectRef: STAGING_PROJECT_REF,
  databaseUrl:
    "postgresql://postgres." +
    STAGING_PROJECT_REF +
    ":[redacted]@pooler.supabase.com:5432/postgres",
};
assert.equal(isProductionTarget(stage, allowlist), false);
assert.equal(isAllowlisted(stage, allowlist), true);

const stageMoney = assertQaIsolation({
  purpose: "money_mutation",
  projectRef: STAGING_PROJECT_REF,
  databaseUrl: stage.databaseUrl,
});
assert.equal(stageMoney.ok, true);

assert.throws(
  () =>
    assertQaIsolation({
      purpose: "money_mutation",
      projectRef: PRODUCTION_PROJECT_REF,
      databaseUrl: prod.databaseUrl,
    }),
  /production project_ref\/url denied/,
);

assert.throws(
  () =>
    assertQaIsolation({
      purpose: "money_mutation",
      projectRef: "unknownstagingref",
      databaseUrl:
        "postgresql://postgres.unknownstagingref:[redacted]@pooler.supabase.com:5432/postgres",
    }),
  /production project_ref\/url denied|target not allowlisted/,
);

assert.throws(
  () =>
    assertQaIsolation({
      purpose: "money_mutation",
      databaseUrl:
        "postgresql://postgres." +
        STAGING_PROJECT_REF +
        ":[redacted]@pooler.supabase.com:5432/postgres",
    }),
  /production project_ref\/url denied|target not allowlisted/,
);

const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"));
assert.ok(raw.productionDenySubstrings.includes(".supabase.co"));
assert.ok(
  raw.productionDenySubstrings.includes(PRODUCTION_PROJECT_REF),
  "production ref must remain explicitly denied",
);

console.log(
  "[qa-env-isolation-staging] PASS · Production denied · isolated staging explicitly allowlisted · unknown Supabase fail-closed",
);

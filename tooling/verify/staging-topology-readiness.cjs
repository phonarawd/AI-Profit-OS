"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  evaluateStagingTopology,
  normalizeUrl,
} = require("../release/staging-topology-readiness.cjs");

const PROD_REF = "mgsytcetsiecllmhcyox";
const READY = {
  production: {
    render: {
      service_id: "srv-prod123",
      environment_id: "evm-prod123",
      url: "https://ai-profit-os.onrender.com",
      branch: "main",
    },
    supabase: { project_ref: PROD_REF },
  },
  staging: {
    render: {
      service_id: "srv-stage456",
      environment_id: "evm-stage456",
      url: "https://ai-profit-os-staging.onrender.com",
      branch: "release/rc-candidate",
      kind: "web_service",
      supabase_project_ref: "stageprojectref123",
    },
    supabase: {
      project_ref: "stageprojectref123",
      parent_project_ref: PROD_REF,
      customer_data: false,
      ready: true,
    },
  },
};

assert.equal(normalizeUrl("ai-profit-os.onrender.com"), "https://ai-profit-os.onrender.com");

let got = evaluateStagingTopology(READY);
assert.equal(got.ready, true);
assert.deepEqual(got.blockers, []);
assert.equal(got.production_mutation, 0);
assert.equal(got.create_resources, false);

const currentProviderReality = {
  production: READY.production,
  staging: {},
};
got = evaluateStagingTopology(currentProviderReality);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("render_staging_missing"));
assert.ok(got.blockers.includes("supabase_staging_missing"));

got = evaluateStagingTopology({
  ...READY,
  staging: {
    ...READY.staging,
    render: {
      ...READY.staging.render,
      service_id: READY.production.render.service_id,
    },
  },
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("render_staging_reuses_production_service"));

got = evaluateStagingTopology({
  ...READY,
  staging: {
    ...READY.staging,
    render: {
      ...READY.staging.render,
      branch: "main",
    },
  },
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("render_staging_tracks_main"));

got = evaluateStagingTopology({
  ...READY,
  staging: {
    ...READY.staging,
    supabase: {
      ...READY.staging.supabase,
      project_ref: PROD_REF,
    },
  },
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("supabase_staging_reuses_production_ref"));

got = evaluateStagingTopology({
  ...READY,
  staging: {
    ...READY.staging,
    supabase: {
      ...READY.staging.supabase,
      customer_data: true,
    },
  },
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("supabase_staging_customer_data_not_proven_zero"));

const root = path.resolve(__dirname, "../..");
const stagingWorkflow = fs.readFileSync(
  path.join(root, ".github/workflows/deploy-staging.yml"),
  "utf8",
);
const nonProdHost = fs.readFileSync(
  path.join(root, "tooling/deploy/lib/non-prod-api-host.cjs"),
  "utf8",
);
const b3 = JSON.parse(
  fs.readFileSync(
    path.join(root, "governance/release-master/rel-b3-promotion/b3-promotion.v1.json"),
    "utf8",
  ),
);

assert.match(stagingWorkflow, /STAGING_API_HOST/);
assert.doesNotMatch(stagingWorkflow, /secrets\.API_HOST/);
assert.match(nonProdHost, /production API_HOST inheritance forbidden/);
assert.equal(b3.isolated_verify_db.exists, "NO");
assert.equal(b3.staging_e2e.status, "NOT_RUN");
assert.equal(b3.staging_e2e.requires.isolated_verify_db_exists, "YES");

console.log(
  "[verify:staging-topology-readiness] PASS (TRUE_NONPROD_TOPOLOGY_CONTRACT · CURRENT_ABSENCE_FAILS · production mutation 0)",
);

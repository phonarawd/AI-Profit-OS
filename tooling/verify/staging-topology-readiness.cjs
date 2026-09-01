"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  evaluateStagingTopology,
  normalizeUrl,
} = require("../release/staging-topology-readiness.cjs");

const root = path.resolve(__dirname, "../..");
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
assert.equal(got.status, "READY");
assert.equal(got.classification, "TRUE_ISOLATED_STAGING");
assert.deepEqual(got.blockers, []);
assert.equal(got.production_mutation, 0);
assert.equal(got.create_resources, false);

const currentProviderReality = {
  production: READY.production,
  staging: {},
};
got = evaluateStagingTopology(currentProviderReality);
assert.equal(got.ready, false);
assert.equal(got.status, "NOT_READY");
assert.equal(got.classification, "BLOCKED_EXTERNAL_ACTION");
assert.ok(got.blockers.includes("render_staging_missing"));
assert.ok(got.blockers.includes("supabase_staging_missing"));

got = evaluateStagingTopology({
  ...READY,
  cloudflare_preview: {
    uses_production_api: true,
    uses_production_db: false,
  },
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("cloudflare_preview_not_staging"));

got = evaluateStagingTopology({
  ...READY,
  cloudflare_preview: {
    dedicated_staging_api: false,
    dedicated_staging_db: false,
  },
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("cloudflare_preview_not_staging"));

const currentSnapshot = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "governance/release-master/staging-topology.current.v1.json",
    ),
    "utf8",
  ),
);
got = evaluateStagingTopology(currentSnapshot);
assert.equal(got.ready, false);
assert.equal(got.status, "NOT_READY");
assert.equal(got.classification, "BLOCKED_EXTERNAL_ACTION");
assert.equal(got.verdict, "STAGING_TOPOLOGY=NOT_READY");

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
    render: {
      ...READY.staging.render,
      supabase_project_ref: "",
    },
  },
});
assert.equal(got.ready, false);
assert.equal(got.classification, "BLOCKED_EXTERNAL_ACTION");
assert.ok(got.blockers.includes("render_staging_db_binding_missing"));

got = evaluateStagingTopology({
  ...READY,
  staging: {
    ...READY.staging,
    render: {
      ...READY.staging.render,
      environment_id: "",
    },
  },
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("render_staging_environment_id_missing"));

got = evaluateStagingTopology({
  ...READY,
  production: {
    ...READY.production,
    render: {
      ...READY.production.render,
      service_id: "",
    },
  },
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("production_render_service_id_missing"));

got = evaluateStagingTopology({
  ...READY,
  production: {
    ...READY.production,
    render: {
      ...READY.production.render,
      environment_id: "",
    },
  },
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("production_render_environment_id_missing"));

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

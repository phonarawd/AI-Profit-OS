"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  evaluateStagingTopology,
  normalizeUrl,
  autoDeployIsOff,
} = require("../release/staging-topology-readiness.cjs");

const root = path.resolve(__dirname, "../..");
const PROD_REF = "mgsytcetsiecllmhcyox";
const STAGE_REF = "uluzxvdpynytytduuryy";
const READY = {
  candidate_sha: "52877334c22f074ebe6bc4b280a96b6b896995c0",
  production: {
    render: {
      service_id: "srv-prod123",
      environment_id: "evm-prod123",
      url: "https://ai-profit-os.onrender.com",
      branch: "main",
    },
    supabase: {
      project_ref: PROD_REF,
      public_table_count: 93,
    },
  },
  staging: {
    render: {
      service_id: "srv-stage456",
      environment_scope: "service-scoped",
      url: "https://ai-profit-os-staging.onrender.com",
      branch: "recovery/release-provenance-20260831",
      kind: "web_service",
      autoDeploy: "no",
      supabase_project_ref: STAGE_REF,
      source_sha: "52877334c22f074ebe6bc4b280a96b6b896995c0",
      runtime_health: {
        db_configured: true,
        db_ok: true,
        redis_configured: true,
        redis_ok: true,
        warnings_empty: true,
      },
    },
    supabase: {
      project_ref: STAGE_REF,
      parent_project_ref: PROD_REF,
      customer_data: false,
      ready: true,
      schema_parity_with_production: true,
      public_table_count: 93,
    },
  },
  cloudflare_preview: {
    exists: true,
    required_for_current_topology: false,
    dedicated_staging_api: false,
    dedicated_staging_db: false,
  },
};

assert.equal(normalizeUrl("ai-profit-os.onrender.com"), "https://ai-profit-os.onrender.com");
assert.equal(autoDeployIsOff("no"), true);
assert.equal(autoDeployIsOff(false), true);
assert.equal(autoDeployIsOff("yes"), false);

let got = evaluateStagingTopology(READY);
assert.equal(got.ready, true);
assert.equal(got.status, "READY");
assert.equal(got.classification, "TRUE_ISOLATED_STAGING");
assert.equal(got.verdict, "STAGING_TOPOLOGY=READY");
assert.deepEqual(got.blockers, []);
assert.equal(got.frontend_staging_status, "PENDING_NOT_CORE_TOPOLOGY");

const currentSnapshot = JSON.parse(
  fs.readFileSync(
    path.join(root, "governance/release-master/staging-topology.current.v1.json"),
    "utf8",
  ),
);
got = evaluateStagingTopology(currentSnapshot);
assert.equal(got.ready, false);
assert.equal(got.status, "NOT_READY");
assert.equal(got.classification, "BLOCKED_EXTERNAL_ACTION");
assert.equal(got.verdict, "STAGING_TOPOLOGY=NOT_READY");
assert.ok(got.blockers.includes("render_staging_db_binding_missing"));
assert.ok(got.blockers.includes("render_staging_runtime_health_missing"));
assert.ok(got.blockers.includes("render_staging_source_sha_mismatch"));
assert.ok(got.blockers.includes("supabase_staging_not_ready"));
assert.ok(got.blockers.includes("supabase_staging_customer_data_not_proven_zero"));
assert.ok(got.blockers.includes("supabase_staging_schema_parity_not_proven"));

const reuseService = structuredClone(READY);
reuseService.staging.render.service_id = READY.production.render.service_id;
got = evaluateStagingTopology(reuseService);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("render_staging_reuses_production_service"));

const tracksMain = structuredClone(READY);
tracksMain.staging.render.branch = "main";
got = evaluateStagingTopology(tracksMain);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("render_staging_tracks_main"));

const sameEnv = structuredClone(READY);
sameEnv.staging.render.environment_id = READY.production.render.environment_id;
delete sameEnv.staging.render.environment_scope;
got = evaluateStagingTopology(sameEnv);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("render_staging_reuses_production_environment"));

const noEnvProof = structuredClone(READY);
delete noEnvProof.staging.render.environment_scope;
got = evaluateStagingTopology(noEnvProof);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("render_staging_environment_scope_unproven"));

const sameUrl = structuredClone(READY);
sameUrl.staging.render.url = READY.production.render.url;
got = evaluateStagingTopology(sameUrl);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("render_staging_reuses_production_url"));

const wrongKind = structuredClone(READY);
wrongKind.staging.render.kind = "static_site";
got = evaluateStagingTopology(wrongKind);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("render_staging_not_web_service"));

const autoDeployOn = structuredClone(READY);
autoDeployOn.staging.render.autoDeploy = "yes";
got = evaluateStagingTopology(autoDeployOn);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("render_staging_autodeploy_not_off"));

const bindingMismatch = structuredClone(READY);
bindingMismatch.staging.render.supabase_project_ref = "otherref1234567";
got = evaluateStagingTopology(bindingMismatch);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("render_staging_db_binding_mismatch"));

const customerData = structuredClone(READY);
customerData.staging.supabase.customer_data = true;
got = evaluateStagingTopology(customerData);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("supabase_staging_customer_data_not_proven_zero"));

const noParity = structuredClone(READY);
noParity.staging.supabase.schema_parity_with_production = false;
got = evaluateStagingTopology(noParity);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("supabase_staging_schema_parity_not_proven"));

const countMismatch = structuredClone(READY);
countMismatch.staging.supabase.public_table_count = 92;
got = evaluateStagingTopology(countMismatch);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("supabase_staging_public_table_count_mismatch"));

const runtimeFail = structuredClone(READY);
runtimeFail.staging.render.runtime_health.redis_ok = false;
got = evaluateStagingTopology(runtimeFail);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("render_staging_runtime_redis_ok_not_true"));

const sourceMissing = structuredClone(READY);
sourceMissing.staging.render.source_sha = "";
got = evaluateStagingTopology(sourceMissing);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("render_staging_source_sha_missing"));

const cfUsesProd = structuredClone(READY);
cfUsesProd.cloudflare_preview.uses_production_api = true;
got = evaluateStagingTopology(cfUsesProd);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("cloudflare_preview_uses_production"));

const cfRequiredButUnbound = structuredClone(READY);
cfRequiredButUnbound.cloudflare_preview.required_for_current_topology = true;
got = evaluateStagingTopology(cfRequiredButUnbound);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("cloudflare_preview_not_staging"));

const missingProdEnv = structuredClone(READY);
delete missingProdEnv.production.render.environment_id;
got = evaluateStagingTopology(missingProdEnv);
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("production_render_environment_id_missing"));

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
assert.equal(b3.isolated_verify_db.exists, "YES");
assert.equal(b3.isolated_verify_db.usable, "UNPROVEN_CURRENTLY");
assert.equal(b3.isolated_verify_db.branch_project_ref, STAGE_REF);
assert.equal(b3.release_ready, "NO");
assert.equal(b3.staging_e2e.status, "NOT_RUN");
assert.equal(b3.staging_e2e.requires.isolated_verify_db_exists, "YES");

console.log(
  "[verify:staging-topology-readiness] PASS (TRUE_ISOLATED_RUNTIME · DB+REDIS_HEALTH · final RC SHA is a separate gate · production mutation 0)",
);

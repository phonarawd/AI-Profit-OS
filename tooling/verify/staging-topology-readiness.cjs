"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const {
  evaluateStagingTopology,
  normalizeUrl,
  autoDeployIsOff,
  stagingSchemaReady,
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

const HARDENED = structuredClone(READY);
HARDENED.staging.supabase.schema_parity_with_production = false;
HARDENED.staging.supabase.baseline_schema_parity_proven = true;
HARDENED.staging.supabase.schema_relation =
  "PRODUCTION_BASELINE_PLUS_REVIEWED_HARDENING";
HARDENED.staging.supabase.hardening_rehearsal = {
  evidence_path: "governance/recovery/staging-db-hardening-snapshot.20260903.v2.json",
  evidence_blob_sha: "a".repeat(40),
  source_path: "supabase/migrations/20260903092000_production_db_hardening.sql",
  source_blob_sha: "b".repeat(40),
  rollback_source_path: "supabase/staging/20260903151500_preview_baseline_parity.sql",
  rollback_source_blob_sha: "c".repeat(40),
  baseline_diff_count: 0,
  function_authority_diff_count: 0,
  customer_data_zero: true,
  expected_delta_only: true,
  apply: "PASS",
  rollback: "PASS",
  reapply: "PASS",
  final_state: "PASS",
};
assert.equal(stagingSchemaReady(HARDENED.staging.supabase), true);
got = evaluateStagingTopology(HARDENED);
assert.equal(got.ready, true);
assert.equal(
  got.staging_schema_relation,
  "PRODUCTION_BASELINE_PLUS_REVIEWED_HARDENING",
);

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
assert.ok(!got.blockers.includes("supabase_staging_not_ready"));
assert.ok(!got.blockers.includes("supabase_staging_customer_data_not_proven_zero"));
assert.ok(!got.blockers.includes("supabase_staging_schema_parity_not_proven"));
assert.equal(
  got.staging_schema_relation,
  "PRODUCTION_BASELINE_PLUS_REVIEWED_HARDENING",
);

const currentDbEvidencePath =
  "governance/recovery/staging-db-hardening-snapshot.20260903.v2.json";
const currentDbEvidenceRaw = fs.readFileSync(
  path.join(root, currentDbEvidencePath),
  "utf8",
);
const currentDbEvidence = JSON.parse(currentDbEvidenceRaw);
const hardeningSourcePath =
  "supabase/migrations/20260903092000_production_db_hardening.sql";
const rollbackSourcePath =
  "supabase/staging/20260903151500_preview_baseline_parity.sql";

function gitBlobSha(raw) {
  const body = Buffer.from(raw, "utf8");
  return createHash("sha1")
    .update(Buffer.from(`blob ${body.length}\0`, "utf8"))
    .update(body)
    .digest("hex");
}

const currentStageDb = currentSnapshot.staging.supabase;
assert.equal(currentStageDb.customer_data, false);
assert.equal(currentStageDb.ready, true);
assert.equal(currentStageDb.public_table_count, 93);
assert.equal(currentStageDb.baseline_schema_parity_proven, true);
assert.equal(
  currentStageDb.schema_relation,
  "PRODUCTION_BASELINE_PLUS_REVIEWED_HARDENING",
);
assert.equal(currentDbEvidence.baseline.public_table_column_rls_diff_count, 0);
assert.equal(currentDbEvidence.baseline.function_authority_diff_count, 0);
assert.equal(currentDbEvidence.baseline.customer_data_proven_zero, true);
assert.equal(currentDbEvidence.rehearsal.apply, "PASS");
assert.equal(currentDbEvidence.rehearsal.rollback, "PASS");
assert.equal(currentDbEvidence.rehearsal.reapply, "PASS");
assert.equal(currentDbEvidence.rehearsal.reassert, "PASS");
assert.equal(currentDbEvidence.rehearsal.current_state, "PASS");
assert.equal(currentDbEvidence.rehearsal.final_state, "PASS");
assert.equal(currentDbEvidence.rehearsal.expected_delta_only, true);
assert.equal(
  currentStageDb.hardening_rehearsal.evidence_blob_sha,
  gitBlobSha(currentDbEvidenceRaw),
);
assert.equal(
  currentStageDb.hardening_rehearsal.source_blob_sha,
  gitBlobSha(fs.readFileSync(path.join(root, hardeningSourcePath), "utf8")),
);
assert.equal(
  currentStageDb.hardening_rehearsal.rollback_source_blob_sha,
  gitBlobSha(fs.readFileSync(path.join(root, rollbackSourcePath), "utf8")),
);

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
  "[verify:staging-topology-readiness] PASS (BASELINE_PARITY_OR_EXACT_REHEARSED_HARDENING · TRUE_ISOLATED_RUNTIME · DB+REDIS_HEALTH · final RC SHA separate · production mutation 0)",
);

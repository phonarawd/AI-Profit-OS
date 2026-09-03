"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const packetPath = path.join(root, "governance/recovery/founder-action-packet.current.v2.json");
const fails = [];
const fail = (x) => fails.push(x);
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

let packet;
try {
  packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));
} catch (e) {
  fail("packet_unreadable:" + String(e && e.message || e));
}

if (packet) {
  if (packet.schema !== "governance.recovery.founder-action-packet.current.v2") fail("schema_invalid");
  if (packet.production_release !== "NO_GO") fail("release_must_remain_no_go");
  const inv = packet.invariants || {};
  if (inv.integration_pr !== 209 || inv.integration_pr_state !== "DRAFT_DO_NOT_MERGE") fail("integration_pr_guard_missing");
  for (const k of ["production_mutation","production_db_apply","provider_mutation","engine_ack_mutation","ghas_dismissal"]) {
    if (inv[k] !== 0) fail("mutation_must_be_zero:" + k);
  }
  const render = packet.render || {};
  if (!render.production || render.production.service_id !== "srv-da5r1tqjobas73fl16dg") fail("production_render_identity_drift");
  if (!render.production || render.production.autoDeploy !== "yes") fail("render_autodeploy_fact_stale");
  if (!render.staging || render.staging.service_id !== "srv-dabph32fngtc73esj8rg") fail("staging_render_identity_drift");
  if (render.staging.current_candidate_bound !== false) fail("staging_candidate_truth_stale");

  const sb = packet.supabase || {};
  if (sb.production_project_ref !== "mgsytcetsiecllmhcyox") fail("supabase_prod_ref_drift");
  if (sb.applied_migrations !== 43) fail("migration_count_fact_stale");
  if (sb.latest_applied_migration !== "20260902155632_withdraw_broadcast_tron") fail("migration_tip_fact_stale");
  if (!sb.staging_branch || sb.staging_branch.project_ref !== "uluzxvdpynytytduuryy") fail("staging_branch_ref_drift");
  if (sb.staging_branch.preview_project_status !== "ACTIVE_HEALTHY") fail("staging_branch_status_stale");
  if (sb.staging_branch.with_data !== false) fail("staging_branch_with_data_stale");

  const engine = packet.engine || {};
  if (engine.final_acceptance !== "NOT_ISSUED" || engine.rebase_required !== true || engine.ack_received !== false) {
    fail("engine_truth_stale");
  }

  const restored = packet.integration_safety_restored || {};
  for (const k of [
    "final_production_decision_gate",
    "accepted_artifact_deploy_lock",
    "release_manifest_identity_lock",
    "authoritative_engine_run_binding",
    "staging_production_api_fallback_blocked",
    "staging_topology_fail_closed",
    "production_db_hardening_source_staged",
    "db_default_acl_readiness_checked",
    "auth_magic_link_delivery_fail_closed",
    "tron_synthetic_derivation_removed",
  ]) {
    if (restored[k] !== true) fail("restored_guard_missing:" + k);
  }

  const blockers = new Set(Array.isArray(packet.blockers) ? packet.blockers : []);
  for (const x of [
    "STAGING_CURRENT_CANDIDATE_NOT_BOUND",
    "PRODUCTION_DB_HARDENING_NOT_APPLIED",
    "RENDER_AUTODEPLOY_ENABLED",
    "TRON_HD_VAULT_NOT_PROVEN",
    "ENGINE_NOT_ISSUED",
    "ENGINE_REBASE_REQUIRED",
    "ENGINE_ACK_MISSING",
    "RELEASE_ACCEPTANCE_MISSING",
    "ROLLBACK_TARGET_NOT_BOUND",
  ]) if (!blockers.has(x)) fail("missing_blocker:" + x);

  for (const staleClosed of [
    "FINAL_PRODUCTION_DECISION_ENFORCEMENT_NOT_WIRED",
    "PRODUCTION_DEPLOY_PATH_BYPASS_PRESENT_IN_RECOVERY",
    "RELEASE_MANIFEST_METADATA_NOT_LOCKED_IN_RECOVERY",
    "PRODUCTION_VERDICT_ENGINE_BINDING_NOT_ENFORCED_IN_RECOVERY",
    "DB_DEFAULT_ACL_READINESS_NOT_CHECKED_IN_RECOVERY",
  ]) if (blockers.has(staleClosed)) fail("closed_blocker_reintroduced:" + staleClosed);

  const actions = new Set((packet.next_actions || []).map((x) => x && x.id));
  for (const id of ["CI_EXACT_HEAD","STAGING_BINDING","DB_HARDENING_REHEARSAL","TRON_HD_VAULT","REL_502_CURRENT_EPOCH","RENDER_RELEASE_CONTROL","PRODUCTION_DB_APPLY","RELEASE_ACCEPTANCE"]) {
    if (!actions.has(id)) fail("missing_action:" + id);
  }
}

const releaseDecision = read("tooling/release/production-release-decision.cjs");
if (!releaseDecision.includes("PRODUCTION_RELEASE=GO_CANDIDATE") || !releaseDecision.includes("PRODUCTION_RELEASE=NO_GO")) {
  fail("production_decision_gate_missing");
}
const acceptedAuthority = read("tooling/deploy/lib/accepted-artifact-authority.cjs");
if (!acceptedAuthority.includes("AIPO_ACCEPTED_ARTIFACT_DEPLOY")) fail("accepted_artifact_authority_missing");
const manifestLock = read("tooling/verify/release-manifest-identity-lock.cjs");
if (!manifestLock.includes("manifest identity + deploy invariants fail closed")) fail("manifest_identity_lock_missing");
const verdict = read("tooling/release/release-acceptance-verdict.cjs");
if (!verdict.includes("engine_run_binding_missing") || !verdict.includes("engine_run_workflow_path_mismatch")) {
  fail("authoritative_engine_binding_missing");
}
const nonProd = read("tooling/deploy/lib/non-prod-api-host.cjs");
if (!nonProd.includes("requireNonProdApiIsolation")) fail("non_prod_api_isolation_missing");
const tron = read("services/api-nest/src/wallet/tron-address.ts");
if (tron.includes("createHmac")) fail("synthetic_tron_derivation_reintroduced");

if (fails.length) {
  console.error("[verify:founder-action-packet-current] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log("[verify:founder-action-packet-current] PASS (current NO_GO truth · restored guards · mutation=0)");

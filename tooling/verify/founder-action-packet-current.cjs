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
  for (const k of ["production_mutation","production_db_apply","production_provider_mutation","engine_ack_mutation","ghas_dismissal"]) {
    if (inv[k] !== 0) fail("production_or_authority_mutation_must_be_zero:" + k);
  }
  if (inv.staging_provider_mutation_performed !== true) fail("staging_provider_mutation_truth_missing");
  const stagingMutationScope = new Set(Array.isArray(inv.staging_provider_mutation_scope) ? inv.staging_provider_mutation_scope : []);
  for (const x of [
    "SUPABASE_PREVIEW_REBASE",
    "SUPABASE_PREVIEW_RESET",
    "SUPABASE_PREVIEW_BASELINE_PARITY",
    "SUPABASE_PREVIEW_HARDENING_APPLY_ROLLBACK_REAPPLY",
    "SUPABASE_PREVIEW_HARDENING_REASSERT_CURRENT",
    "RENDER_EXACT_STAGING_SERVICE_CREATE",
    "RENDER_STAGING_REDIS_BINDING",
    "RENDER_STAGING_ADAPTER_INGEST_TOKEN_CONFIG",
    "RENDER_STAGING_INTERNAL_WALLET_TICK_TOKEN_CONFIG",
    "SUPABASE_PREVIEW_RUNTIME_LOGIN_ROLE_CREATE",
    "SUPABASE_PREVIEW_RUNTIME_ROLE_SERVICE_ROLE_GRANT",
    "SUPABASE_PREVIEW_RUNTIME_ROLE_BYPASSRLS",
    "RENDER_STAGING_DATABASE_URL_CONFIG",
    "RENDER_STAGING_DATABASE_SSL_CA_CONFIG",
    "EXACT_STAGING_BRANCH_FAST_FORWARD",
    "RENDER_EXACT_STAGING_REDEPLOY",
    "CLOUDFLARE_STAGING_WEB_PREVIEW_REDEPLOY",
    "CLOUDFLARE_STAGING_OPS_PREVIEW_REDEPLOY",
    "CLOUDFLARE_STAGING_API_ORIGIN_BINDING",
  ]) if (!stagingMutationScope.has(x)) fail("staging_provider_scope_missing:" + x);
  if (packet.subject_integration_sha !== "45dd5a15410bcb3b5f52dbe295d010f73cfc1e8c") fail("subject_integration_sha_stale");
  const render = packet.render || {};
  if (!render.production || render.production.service_id !== "srv-da5r1tqjobas73fl16dg") fail("production_render_identity_drift");
  if (!render.production || render.production.autoDeploy !== "yes") fail("render_autodeploy_fact_stale");
  if (!render.staging || render.staging.service_id !== "srv-dacjnnm1egvs73cuh190") fail("staging_render_identity_drift");
  if (render.staging.current_candidate_bound !== true) fail("staging_candidate_truth_stale");
  if (render.staging.live_sha !== "45dd5a15410bcb3b5f52dbe295d010f73cfc1e8c") fail("staging_live_sha_truth_stale");
  if (render.staging.database_url_configured !== true || render.staging.database_ok !== true) fail("staging_db_runtime_truth_stale");
  if (render.staging.database_tls_verified !== true) fail("staging_db_tls_truth_stale");
  if (render.staging.db_backed_public_read_status !== 200) fail("staging_db_backed_read_truth_stale");
  if (render.staging.redis_configured !== true || render.staging.redis_ok !== true) fail("staging_redis_runtime_truth_stale");
  if (render.staging.frontend_proxy_binding_proven !== true) fail("staging_frontend_proxy_binding_truth_stale");
  if (render.staging.frontend_web_proxy_status !== 200 || render.staging.frontend_ops_proxy_status !== 200) fail("staging_frontend_proxy_status_truth_stale");

  const sb = packet.supabase || {};
  if (sb.production_project_ref !== "mgsytcetsiecllmhcyox") fail("supabase_prod_ref_drift");
  if (sb.applied_migrations !== 43) fail("migration_count_fact_stale");
  if (sb.latest_applied_migration !== "20260902155632_withdraw_broadcast_tron") fail("migration_tip_fact_stale");
  if (!sb.staging_branch || sb.staging_branch.project_ref !== "uluzxvdpynytytduuryy") fail("staging_branch_ref_drift");
  if (sb.staging_branch.preview_project_status !== "ACTIVE_HEALTHY") fail("staging_branch_status_stale");
  if (sb.staging_branch.with_data !== false) fail("staging_branch_with_data_stale");

  if (sb.staging_branch.customer_data_zero_proven !== true) fail("staging_customer_data_truth_stale");
  if (sb.staging_branch.baseline_schema_parity_proven !== true) fail("staging_baseline_parity_truth_stale");
  if (sb.staging_branch.final_schema_relation !== "PRODUCTION_BASELINE_PLUS_REVIEWED_HARDENING") fail("staging_schema_relation_truth_stale");
  if (sb.staging_branch.hardening_rehearsal_proven !== true) fail("staging_hardening_rehearsal_truth_stale");
  if (sb.staging_branch.render_binding_currently_proven !== true) fail("staging_render_binding_truth_stale");
  if (sb.staging_branch.render_exact_candidate_runtime_proven !== true) fail("staging_exact_runtime_truth_stale");
  if (sb.staging_branch.render_redis_runtime_proven !== true) fail("staging_redis_binding_truth_stale");
  if (sb.staging_branch.render_database_url_configured !== true) fail("staging_database_url_truth_stale");
  if (sb.staging_branch.render_database_runtime_proven !== true) fail("staging_database_runtime_truth_stale");
  if (sb.staging_branch.render_database_tls_verified !== true) fail("staging_database_tls_truth_stale");

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
    "STAGING_FRONTEND_E2E_NOT_PROVEN_CURRENT",
    "PRODUCTION_DB_HARDENING_NOT_APPLIED",
    "RENDER_AUTODEPLOY_ENABLED",
    "FX_RUNTIME_FEED_NOT_ACTIVE_CURRENT",
    "PRODUCTION_MAGIC_LINK_DELIVERY_NOT_PROVEN_CURRENT",
    "MAIN_RULESET_BYPASS_PRESENT",
    "TRON_HD_VAULT_NOT_PROVEN",
    "ENGINE_NOT_ISSUED",
    "ENGINE_REBASE_REQUIRED",
    "ENGINE_ACK_MISSING",
    "RELEASE_ACCEPTANCE_MISSING",
    "CURRENT_SHA_SECURITY_EVIDENCE_INCOMPLETE",
  ]) if (!blockers.has(x)) fail("missing_blocker:" + x);

  for (const closedNow of [
    "STAGING_SCHEMA_PARITY_NOT_PROVEN_CURRENT",
    "STAGING_CURRENT_CANDIDATE_NOT_BOUND",
    "STAGING_RENDER_RUNTIME_HEALTH_NOT_PROVEN_CURRENT",
    "STAGING_RENDER_DB_BINDING_NOT_PROVEN_CURRENT",
    "STAGING_RENDER_DATABASE_URL_NOT_CONFIGURED_CURRENT",
    "ROLLBACK_TARGET_NOT_BOUND",
  ]) if (blockers.has(closedNow)) fail("closed_current_blocker_reintroduced:" + closedNow);

  const ruleset = packet.github && packet.github.main_ruleset || {};
  if (ruleset.id !== 20576556 || ruleset.enforcement !== "active") fail("main_ruleset_truth_stale");
  if (ruleset.required_approving_review_count !== 0) fail("main_ruleset_review_count_truth_stale");
  if (ruleset.current_user_can_bypass !== "always") fail("main_ruleset_bypass_truth_stale");
  if (ruleset.release_risk !== "BYPASS_PLUS_RENDER_MAIN_AUTODEPLOY") fail("main_ruleset_release_risk_missing");

  const emailRuntime = packet.auth_email_runtime || {};
  if (emailRuntime.magic_link_delivery_503_count !== 2) fail("auth_email_runtime_503_truth_stale");
  if (emailRuntime.resend_http_failure_log_count !== 0) fail("auth_email_runtime_http_failure_truth_stale");
  if (emailRuntime.live_provider_configuration !== "NOT_PROVEN") fail("auth_email_provider_truth_must_fail_closed");
  if (emailRuntime.status !== "BLOCKED") fail("auth_email_runtime_must_stay_blocked");

  const sec = packet.security_evidence || {};
  if (sec.rel_408_role !== "HISTORICAL_SNAPSHOT_ONLY") fail("rel408_current_authority_forbidden");
  if (sec.current_production_public_tables !== 93) fail("current_production_table_count_truth_stale");
  if (!Array.isArray(sec.current_production_known_rls_off) || !sec.current_production_known_rls_off.includes("push_control") || !sec.current_production_known_rls_off.includes("push_subscriptions")) fail("current_production_rls_truth_stale");
  if (sec.current_sha_codeql_or_equivalent_run !== "SUCCESS") fail("current_codeql_truth_stale");
  if (sec.current_runtime_subject_sha !== "45dd5a15410bcb3b5f52dbe295d010f73cfc1e8c") fail("current_security_subject_sha_stale");
  if (sec.full_ghas_open_alert_inventory !== "NOT_PROVEN") fail("full_ghas_inventory_must_fail_closed");
  if (sec.status !== "PARTIAL") fail("security_evidence_status_must_remain_partial");

  const rollback = packet.rollback || {};
  if (rollback.target_bound !== true) fail("rollback_target_not_bound");
  if (rollback.role !== "PRE_PROMOTION_ROLLBACK_TARGET") fail("rollback_role_invalid");
  if (rollback.service_id !== "srv-da5r1tqjobas73fl16dg") fail("rollback_service_drift");
  if (rollback.deploy_id !== "dep-da938o142hec73eipre0") fail("rollback_deploy_drift");
  if (rollback.source_sha !== "0a72b27dd0da3c422eca0f931cf668e7a760c8ec") fail("rollback_sha_drift");
  if (rollback.provider_confirmed !== true) fail("rollback_provider_confirmation_missing");
  if (rollback.execution !== "BLOCKED_FOUNDER_ACTION") fail("rollback_execution_guard_missing");

  for (const staleClosed of [
    "FINAL_PRODUCTION_DECISION_ENFORCEMENT_NOT_WIRED",
    "PRODUCTION_DEPLOY_PATH_BYPASS_PRESENT_IN_RECOVERY",
    "RELEASE_MANIFEST_METADATA_NOT_LOCKED_IN_RECOVERY",
    "PRODUCTION_VERDICT_ENGINE_BINDING_NOT_ENFORCED_IN_RECOVERY",
    "DB_DEFAULT_ACL_READINESS_NOT_CHECKED_IN_RECOVERY",
  ]) if (blockers.has(staleClosed)) fail("closed_blocker_reintroduced:" + staleClosed);

  const actions = new Set((packet.next_actions || []).map((x) => x && x.id));
  for (const id of ["CI_EXACT_HEAD","STAGING_BINDING","STAGING_FRONTEND_E2E","DB_HARDENING_REHEARSAL","FX_RUNTIME_FEED","AUTH_EMAIL_RUNTIME","TRON_HD_VAULT","REL_502_CURRENT_EPOCH","MAIN_RELEASE_GOVERNANCE","RENDER_RELEASE_CONTROL","PRODUCTION_DB_APPLY","RELEASE_ACCEPTANCE"]) {
    if (!actions.has(id)) fail("missing_action:" + id);
  }

  const dbAction = (packet.next_actions || []).find((x) => x && x.id === "DB_HARDENING_REHEARSAL");
  if (!dbAction || dbAction.status !== "CLOSED_VERIFIED") fail("db_rehearsal_action_not_closed_verified");
  const stagingAction = (packet.next_actions || []).find((x) => x && x.id === "STAGING_BINDING");
  if (!stagingAction || stagingAction.status !== "CLOSED_VERIFIED") fail("staging_binding_action_truth_stale");
  const stagingFrontendAction = (packet.next_actions || []).find((x) => x && x.id === "STAGING_FRONTEND_E2E");
  if (!stagingFrontendAction || stagingFrontendAction.status !== "BLOCKED") fail("staging_frontend_e2e_action_truth_stale");
  const securityRollback = (packet.next_actions || []).find((x) => x && x.id === "SECURITY_AND_ROLLBACK");
  if (!securityRollback || securityRollback.status !== "PARTIAL") fail("security_rollback_action_truth_stale");
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
console.log("[verify:founder-action-packet-current] PASS (current NO_GO truth · Production mutation=0 · scoped staging provider writes recorded · rollback target bound)");

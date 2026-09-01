"use strict";

const fs = require("node:fs");
const path = require("node:path");

const PACKET = "governance/recovery/founder-action-packet.current.v1.json";
const EXPECTED_RECOVERY = "38032dafb04ce61ebdf5bf77e6d37df787ecf046";
const PROD_REF = "mgsytcetsiecllmhcyox";

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) { fails.push(msg); }

let packet;
try {
  packet = JSON.parse(fs.readFileSync(path.join(root, PACKET), "utf8"));
} catch (err) {
  fail("packet_unreadable:" + String(err && err.message || err));
}

if (packet) {
  if (packet.schema !== "governance.recovery.founder-action-packet.current.v1") {
    fail("schema_invalid");
  }
  if (packet.recovery_sha !== EXPECTED_RECOVERY) fail("recovery_sha_stale");
  if (packet.production_release !== "NO_GO") fail("release_must_remain_no_go");

  const inv = packet.invariants || {};
  if (inv.pr_114 !== "DRAFT_DO_NOT_MERGE") fail("pr114_guard_missing");
  if (inv.production_mutation !== 0) fail("production_mutation_must_be_zero");
  if (inv.engine_ack_mutation !== 0) fail("engine_ack_mutation_must_be_zero");
  if (inv.ghas_dismissal !== 0) fail("ghas_dismissal_must_be_zero");

  const render = packet.render || {};
  if (render.production_service_id !== "srv-da5r1tqjobas73fl16dg") fail("render_service_drift");
  if (render.autoDeploy !== "yes") fail("render_autodeploy_fact_stale");
  if (render.production_live_sha !== "0a72b27dd0da3c422eca0f931cf668e7a760c8ec") {
    fail("render_live_sha_stale");
  }
  if (render.production_live_sha === packet.recovery_sha) fail("render_drift_must_be_explicit");

  const supabase = packet.supabase || {};
  if (supabase.production_project_ref !== PROD_REF) fail("supabase_prod_ref_drift");
  if (supabase.development_branches !== 0) fail("supabase_branch_fact_stale");
  if (supabase.isolated_staging_ready !== false) fail("staging_readiness_fact_stale");
  if (supabase.applied_migrations !== 42) fail("migration_count_fact_stale");
  if (supabase.latest_applied_migration !== "20260821223109_beginner_onboarding_experience") {
    fail("migration_tip_fact_stale");
  }

  const engine = packet.engine || {};
  if (engine.final_acceptance !== "NOT_ISSUED") fail("engine_acceptance_fact_stale");
  if (engine.rebase_required !== true) fail("engine_rebase_fact_stale");
  if (engine.ack_received !== false) fail("engine_ack_fact_stale");

  const blockers = Array.isArray(packet.blockers) ? packet.blockers : [];
  for (const required of [
    "ISOLATED_STAGING_NOT_READY",
    "PRODUCTION_DB_HARDENING_NOT_READY",
    "RENDER_AUTODEPLOY_ENABLED",
    "PRODUCTION_LIVE_SHA_DIFFERS_FROM_RECOVERY",
    "TRON_HD_VAULT_NOT_PROVEN",
    "ENGINE_NOT_ISSUED",
    "ENGINE_REBASE_REQUIRED",
    "ENGINE_ACK_MISSING",
    "FINAL_PRODUCTION_DECISION_ENFORCEMENT_NOT_WIRED",
  ]) {
    if (!blockers.includes(required)) fail("missing_blocker:" + required);
  }

  const actions = Array.isArray(packet.next_actions) ? packet.next_actions : [];
  if (actions.length < 7) fail("founder_actions_incomplete");
  const ids = new Set(actions.map((x) => x && x.id));
  for (const id of [
    "ISOLATED_STAGING",
    "DB_HARDENING",
    "RENDER_RELEASE_CONTROL",
    "TRON_HD_VAULT",
    "ENGINE_REBASE_ACK",
    "GHAS_COOKIE_CLASSIFICATION",
    "FINAL_DECISION_ENFORCEMENT",
  ]) {
    if (!ids.has(id)) fail("missing_action:" + id);
  }
}

if (fails.length) {
  console.error("[verify:founder-action-packet-current] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log("[verify:founder-action-packet-current] PASS (current recovery/provider truth pinned · NO_GO fail-closed)");

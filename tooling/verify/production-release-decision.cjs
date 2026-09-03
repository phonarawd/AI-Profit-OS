"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  evaluateProductionReleaseDecision,
} = require("../release/production-release-decision.cjs");

const fails = [];
const SHA = "a".repeat(40);
const DIGEST = "c".repeat(64);

function basePass() {
  return {
    candidate_sha: SHA,
    release_acceptance: {
      verdict: "PASS",
      kind: "PRODUCTION_RELEASE",
      sha: SHA,
      artifact_digest: DIGEST,
      artifact_source_sha: SHA,
      artifact_built_once: true,
      api_runtime_verified: true,
    },
    engine: {
      final_acceptance: "ISSUED",
      rebase_required: false,
      ack_received: true,
      candidate_sha: SHA,
    },
    staging: {
      ready: true,
      status: "READY",
      verdict: "STAGING_TOPOLOGY=READY",
      blockers: [],
    },
    db_hardening: {
      ok: true,
      status: "READY",
      fails: [],
    },
    render_preflight: {
      ready: true,
      status: "READY",
      accepted_sha: SHA,
      blockers: [],
      auto_deploy_required: "disabled",
    },
    security: {
      exact_head_sha: SHA,
      codeql_workflow: "success",
      unresolved_p0: 0,
      unresolved_p1: 0,
      release_blocking_p2: 0,
      unexplained_ghas: 0,
      dismissals_without_evidence: 0,
    },
    tron_hd: {
      ready: true,
      derivation_path: "m/44'/195'/0'/0/{index}",
      vault_authority_proven: true,
      synthetic_derivation: false,
    },
    rollback: {
      ready: true,
      target_deploy_id: "dep-known-good",
      target_sha: "b".repeat(40),
    },
    quality: {
      known_errors: 0,
      known_defects: 0,
      known_contradictions: 0,
      known_release_duplicates: 0,
      stale_release_evidence: 0,
    },
  };
}

function expectGo(name, input) {
  const out = evaluateProductionReleaseDecision(input);
  if (!out.ready || out.decision !== "PRODUCTION_RELEASE=GO_CANDIDATE" || out.blockers.length) {
    fails.push(name + " expected GO_CANDIDATE got " + JSON.stringify(out));
  }
}

function expectNoGo(name, input, requiredBlockers) {
  const out = evaluateProductionReleaseDecision(input);
  if (out.ready || out.decision !== "PRODUCTION_RELEASE=NO_GO") {
    fails.push(name + " expected NO_GO got " + JSON.stringify(out));
    return;
  }
  for (const blocker of requiredBlockers) {
    if (!out.blockers.includes(blocker)) {
      fails.push(name + " missing blocker " + blocker + " got " + out.blockers.join(","));
    }
  }
}

expectGo("all_independent_gates_proven", basePass());

const acceptanceOnly = {
  candidate_sha: SHA,
  release_acceptance: basePass().release_acceptance,
};
expectNoGo("release_acceptance_alone_is_insufficient", acceptanceOnly, [
  "engine_evidence_missing",
  "staging_evidence_missing",
  "db_hardening_evidence_missing",
  "render_preflight_missing",
  "security_evidence_missing",
  "tron_hd_evidence_missing",
  "rollback_evidence_missing",
  "quality_evidence_missing",
]);

{
  const x = basePass();
  x.engine.final_acceptance = "NOT_ISSUED";
  x.engine.rebase_required = true;
  x.engine.ack_received = false;
  expectNoGo("engine_not_issued", x, [
    "engine_not_issued",
    "engine_rebase_required",
    "engine_ack_missing",
  ]);
}

{
  const x = basePass();
  x.staging.ready = false;
  x.staging.status = "NOT_READY";
  x.staging.verdict = "STAGING_TOPOLOGY=NOT_READY";
  x.staging.blockers = ["render_staging_missing", "supabase_staging_missing"];
  expectNoGo("isolated_staging_missing", x, [
    "staging_not_ready",
    "staging_verdict_invalid",
    "staging_blockers_present",
  ]);
}

{
  const x = basePass();
  x.db_hardening.ok = false;
  x.db_hardening.status = "NOT_READY";
  x.db_hardening.fails = ["forbidden_privilege:push_control:TRUNCATE"];
  expectNoGo("db_hardening_open", x, [
    "db_hardening_not_ready",
    "db_hardening_failures_present",
  ]);
}

{
  const x = basePass();
  x.render_preflight.ready = false;
  x.render_preflight.status = "NOT_READY";
  x.render_preflight.blockers = ["auto_deploy_enabled"];
  x.render_preflight.auto_deploy_required = "disabled";
  expectNoGo("render_autodeploy_still_on", x, [
    "render_not_ready",
    "render_blockers_present",
  ]);
}

{
  const x = basePass();
  x.security.unexplained_ghas = 1;
  expectNoGo("unexplained_ghas_blocks", x, ["security_unexplained_ghas"]);
}

{
  const x = basePass();
  x.security.dismissals_without_evidence = 1;
  expectNoGo("unsupported_dismissal_blocks", x, ["security_unsupported_dismissal"]);
}

{
  const x = basePass();
  x.tron_hd.ready = false;
  x.tron_hd.vault_authority_proven = false;
  expectNoGo("tron_503_is_safe_but_not_release_ready", x, [
    "tron_hd_not_ready",
    "tron_hd_vault_authority_unproven",
  ]);
}

{
  const x = basePass();
  x.release_acceptance.artifact_source_sha = "d".repeat(40);
  expectNoGo("artifact_source_sha_drift", x, ["artifact_source_sha_mismatch"]);
}

{
  const x = basePass();
  x.render_preflight.accepted_sha = "d".repeat(40);
  expectNoGo("render_candidate_sha_drift", x, ["render_accepted_sha_mismatch"]);
}

{
  const x = basePass();
  x.quality.stale_release_evidence = 1;
  expectNoGo("stale_release_evidence_blocks", x, ["stale_release_evidence_open"]);
}

{
  const x = basePass();
  x.engine = {
    final_acceptance: "NOT_ISSUED",
    rebase_required: true,
    ack_received: false,
    candidate_sha: SHA,
  };
  x.staging = {
    ready: false,
    status: "NOT_READY",
    verdict: "STAGING_TOPOLOGY=NOT_READY",
    blockers: ["render_staging_missing", "supabase_staging_missing"],
  };
  x.db_hardening = {
    ok: false,
    status: "NOT_READY",
    fails: ["forbidden_privilege:push_control:TRUNCATE"],
  };
  x.render_preflight = {
    ready: false,
    status: "NOT_READY",
    accepted_sha: SHA,
    blockers: ["auto_deploy_enabled"],
    auto_deploy_required: "disabled",
  };
  x.tron_hd = {
    ready: false,
    derivation_path: "m/44'/195'/0'/0/{index}",
    vault_authority_proven: false,
    synthetic_derivation: false,
  };
  expectNoGo("known_current_truth_remains_no_go", x, [
    "engine_not_issued",
    "engine_rebase_required",
    "engine_ack_missing",
    "staging_not_ready",
    "db_hardening_not_ready",
    "render_not_ready",
    "tron_hd_not_ready",
  ]);
}

const currentEvidence = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "governance/release-master/production-release-decision.current.v1.json"),
    "utf8",
  ),
);
const currentDecision = evaluateProductionReleaseDecision(currentEvidence);
if (currentDecision.ready || currentDecision.decision !== "PRODUCTION_RELEASE=NO_GO") {
  fails.push("current release evidence must remain NO_GO until all blocking domains close");
}
for (const blocker of [
  "release_acceptance_missing",
  "engine_not_issued",
  "engine_rebase_required",
  "engine_ack_missing",
  "staging_not_ready",
  "db_hardening_not_ready",
  "render_not_ready",
  "tron_hd_not_ready",
  "security_p0_open",
  "security_p1_open",
  "security_unexplained_ghas",
  "known_errors_open",
  "known_defects_open",
  "known_contradictions_open",
  "known_release_duplicates_open",
]) {
  if (!currentDecision.blockers.includes(blocker)) {
    fails.push("current release blocker missing: " + blocker);
  }
}
if (currentEvidence.rollback?.ready !== true) {
  fails.push("current rollback evidence must remain bound/ready");
}
if (currentEvidence.quality?.stale_release_evidence !== 0) {
  fails.push("current release evidence refresh must close stale_release_evidence");
}
if (currentEvidence.production_mutation !== 0) {
  fails.push("current release evidence must record production_mutation=0");
}

if (fails.length) {
  console.error("[verify:production-release-decision] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}

console.log(
  "[verify:production-release-decision] PASS (acceptance necessary-not-sufficient · infra/security/Engine/TRON/rollback/quality all fail closed)",
);

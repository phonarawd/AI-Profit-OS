"use strict";

/**
 * Final Production release-decision evaluator.
 *
 * This is intentionally stricter than release-acceptance-verdict.cjs.
 * Engine/artifact acceptance is necessary but not sufficient for a Production GO.
 * This evaluator consumes already-generated evidence from independent gates and
 * returns GO_CANDIDATE only when every release-blocking domain is proven ready.
 *
 * It performs no provider calls and no mutations.
 */

function isFullSha(value) {
  return /^[0-9a-f]{40}$/i.test(String(value || ""));
}

function isSha256(value) {
  return /^[0-9a-f]{64}$/i.test(String(value || ""));
}

function sameSha(a, b) {
  return isFullSha(a) && isFullSha(b) && String(a).toLowerCase() === String(b).toLowerCase();
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function emptyArray(value) {
  return Array.isArray(value) && value.length === 0;
}

function evaluateProductionReleaseDecision(input) {
  const i = input && typeof input === "object" ? input : {};
  const candidateSha = String(i.candidate_sha || "").toLowerCase();
  const blockers = [];

  if (!isFullSha(candidateSha)) blockers.push("candidate_sha_invalid");

  const acceptance = i.release_acceptance && typeof i.release_acceptance === "object"
    ? i.release_acceptance
    : null;
  if (!acceptance) {
    blockers.push("release_acceptance_missing");
  } else {
    if (acceptance.verdict !== "PASS") blockers.push("release_acceptance_not_pass");
    if (acceptance.kind !== "PRODUCTION_RELEASE") blockers.push("release_acceptance_kind_invalid");
    if (!sameSha(acceptance.sha, candidateSha)) blockers.push("release_acceptance_sha_mismatch");
    if (!isSha256(acceptance.artifact_digest)) blockers.push("artifact_digest_invalid");
    if (!sameSha(acceptance.artifact_source_sha, candidateSha)) {
      blockers.push("artifact_source_sha_mismatch");
    }
    if (acceptance.artifact_built_once !== true) blockers.push("artifact_not_built_once");
    if (acceptance.api_runtime_verified !== true) blockers.push("api_runtime_not_verified");
  }

  const engine = i.engine && typeof i.engine === "object" ? i.engine : null;
  if (!engine) {
    blockers.push("engine_evidence_missing");
  } else {
    if (engine.final_acceptance !== "ISSUED") blockers.push("engine_not_issued");
    if (engine.rebase_required !== false) blockers.push("engine_rebase_required");
    if (engine.ack_received !== true) blockers.push("engine_ack_missing");
    if (!sameSha(engine.candidate_sha, candidateSha)) blockers.push("engine_candidate_sha_mismatch");
  }

  const staging = i.staging && typeof i.staging === "object" ? i.staging : null;
  if (!staging) {
    blockers.push("staging_evidence_missing");
  } else {
    if (staging.ready !== true || staging.status !== "READY") blockers.push("staging_not_ready");
    if (staging.verdict !== "STAGING_TOPOLOGY=READY") blockers.push("staging_verdict_invalid");
    if (!emptyArray(staging.blockers)) blockers.push("staging_blockers_present");
  }

  const db = i.db_hardening && typeof i.db_hardening === "object" ? i.db_hardening : null;
  if (!db) {
    blockers.push("db_hardening_evidence_missing");
  } else {
    if (db.ok !== true || db.status !== "READY") blockers.push("db_hardening_not_ready");
    if (!emptyArray(db.fails)) blockers.push("db_hardening_failures_present");
  }

  const render = i.render_preflight && typeof i.render_preflight === "object"
    ? i.render_preflight
    : null;
  if (!render) {
    blockers.push("render_preflight_missing");
  } else {
    if (render.ready !== true || render.status !== "READY") blockers.push("render_not_ready");
    if (!sameSha(render.accepted_sha, candidateSha)) blockers.push("render_accepted_sha_mismatch");
    if (!emptyArray(render.blockers)) blockers.push("render_blockers_present");
    if (render.auto_deploy_required !== "disabled") blockers.push("render_autodeploy_not_disabled");
  }

  const security = i.security && typeof i.security === "object" ? i.security : null;
  if (!security) {
    blockers.push("security_evidence_missing");
  } else {
    if (!sameSha(security.exact_head_sha, candidateSha)) blockers.push("security_sha_mismatch");
    if (security.codeql_workflow !== "success") blockers.push("codeql_not_success");
    for (const [field, code] of [
      ["unresolved_p0", "security_p0_open"],
      ["unresolved_p1", "security_p1_open"],
      ["release_blocking_p2", "security_release_blocking_p2_open"],
      ["unexplained_ghas", "security_unexplained_ghas"],
      ["dismissals_without_evidence", "security_unsupported_dismissal"],
    ]) {
      if (!Number.isInteger(security[field]) || security[field] !== 0) blockers.push(code);
    }
  }

  const tron = i.tron_hd && typeof i.tron_hd === "object" ? i.tron_hd : null;
  if (!tron) {
    blockers.push("tron_hd_evidence_missing");
  } else {
    if (tron.ready !== true) blockers.push("tron_hd_not_ready");
    if (tron.derivation_path !== "m/44'/195'/0'/0/{index}") blockers.push("tron_hd_path_invalid");
    if (tron.vault_authority_proven !== true) blockers.push("tron_hd_vault_authority_unproven");
    if (tron.synthetic_derivation !== false) blockers.push("tron_hd_synthetic_derivation_present");
  }

  const rollback = i.rollback && typeof i.rollback === "object" ? i.rollback : null;
  if (!rollback) {
    blockers.push("rollback_evidence_missing");
  } else {
    if (rollback.ready !== true) blockers.push("rollback_not_ready");
    if (!nonEmpty(rollback.target_deploy_id)) blockers.push("rollback_target_deploy_missing");
    if (!isFullSha(rollback.target_sha)) blockers.push("rollback_target_sha_invalid");
  }

  const quality = i.quality && typeof i.quality === "object" ? i.quality : null;
  if (!quality) {
    blockers.push("quality_evidence_missing");
  } else {
    for (const [field, code] of [
      ["known_errors", "known_errors_open"],
      ["known_defects", "known_defects_open"],
      ["known_contradictions", "known_contradictions_open"],
      ["known_release_duplicates", "known_release_duplicates_open"],
      ["stale_release_evidence", "stale_release_evidence_open"],
    ]) {
      if (!Number.isInteger(quality[field]) || quality[field] !== 0) blockers.push(code);
    }
  }

  const uniqueBlockers = [...new Set(blockers)].sort();
  const go = uniqueBlockers.length === 0;

  return {
    schema: "production-release-decision.v1",
    candidate_sha: isFullSha(candidateSha) ? candidateSha : null,
    decision: go ? "PRODUCTION_RELEASE=GO_CANDIDATE" : "PRODUCTION_RELEASE=NO_GO",
    ready: go,
    blockers: uniqueBlockers,
    release_acceptance_is_necessary_not_sufficient: true,
    provider_mutation: 0,
    production_mutation: 0,
  };
}

module.exports = {
  isFullSha,
  isSha256,
  sameSha,
  evaluateProductionReleaseDecision,
};

if (require.main === module) {
  const fs = require("node:fs");
  const path = require("node:path");
  const idx = process.argv.indexOf("--input");
  const inputPath = idx >= 0 ? process.argv[idx + 1] : "";
  if (!inputPath) {
    process.stderr.write("usage: production-release-decision.cjs --input <evidence.json>\n");
    process.exit(2);
  }
  let input;
  try {
    input = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));
  } catch {
    process.stderr.write("[production-release-decision] FAIL_CLOSED:evidence_invalid\n");
    process.exit(1);
  }
  const result = evaluateProductionReleaseDecision(input);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (!result.ready) process.exit(1);
}

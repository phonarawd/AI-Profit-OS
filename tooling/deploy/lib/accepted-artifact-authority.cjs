"use strict";

/**
 * Defense-in-depth authority guard for low-level Production deploy helpers.
 *
 * Production deployment must enter through deploy-from-artifact.cjs after
 * release acceptance + exact SHA/digest verification. Low-level Cloudflare
 * helpers are not independent Production entry points.
 *
 * This is a process-integrity guard, not a cryptographic boundary against a
 * fully privileged local operator who can modify code/environment.
 */

function isProductionTarget(target) {
  const value = String(target || "").trim().toLowerCase();
  return value === "production" || value === "prod";
}

function isFullSha(value) {
  return /^[0-9a-f]{40}$/i.test(String(value || ""));
}

function isSha256(value) {
  return /^[0-9a-f]{64}$/i.test(String(value || ""));
}

function validateAcceptedArtifactAuthority(target, env) {
  if (!isProductionTarget(target)) {
    return { ok: true, skipped: true, reason: "non_production_target" };
  }
  const e = env || process.env;
  if (e.AIPO_ACCEPTED_ARTIFACT_DEPLOY !== "1") {
    return { ok: false, reason: "accepted_artifact_authority_missing" };
  }
  if (!isFullSha(e.AIPO_ACCEPTED_DEPLOY_SHA)) {
    return { ok: false, reason: "accepted_deploy_sha_invalid" };
  }
  if (!isSha256(e.AIPO_ACCEPTED_ARTIFACT_DIGEST)) {
    return { ok: false, reason: "accepted_artifact_digest_invalid" };
  }
  return {
    ok: true,
    skipped: false,
    reason: "accepted_artifact_authority_present",
    sha: String(e.AIPO_ACCEPTED_DEPLOY_SHA).toLowerCase(),
    digest: String(e.AIPO_ACCEPTED_ARTIFACT_DIGEST).toLowerCase(),
  };
}

function requireAcceptedArtifactAuthority(target, env) {
  const result = validateAcceptedArtifactAuthority(target, env);
  if (!result.ok) {
    const err = new Error("FAIL_CLOSED:" + result.reason);
    err.code = result.reason;
    throw err;
  }
  return result;
}

module.exports = {
  isProductionTarget,
  isFullSha,
  isSha256,
  validateAcceptedArtifactAuthority,
  requireAcceptedArtifactAuthority,
};

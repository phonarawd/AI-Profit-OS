"use strict";

/**
 * 저수준 Production 배포 헬퍼용 심층 방어 권한 가드.
 *
 * Production 배포는 release acceptance + 정확한 SHA/digest 검증 후
 * deploy-from-artifact.cjs 로만 진입해야 한다. 저수준 Cloudflare
 * 헬퍼는 독립 Production 진입점이 아니다.
 *
 * 프로세스 무결성 가드이며, 코드/환경을 바꿀 수 있는 완전 권한
 * 로컬 운영자에 대한 암호학적 경계는 아니다.
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

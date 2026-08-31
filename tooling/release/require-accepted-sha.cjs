"use strict";

/**
 * Production deploy guard: ACCEPTED_SHA must equal DEPLOY_SHA.
 * Looks up a release-acceptance artifact/run for the deploy SHA.
 * Does not deploy. Does not mutate production.
 */
const fs = require("fs");
const { isFullSha, isSha256, normalizeHex } = require("./artifact-provenance.cjs");

function parseArgs(argv) {
  const out = { sha: "", target: "", artifact: "", expectedDigest: "" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--sha") out.sha = argv[i + 1] || "";
    if (argv[i] === "--target") out.target = argv[i + 1] || "";
    if (argv[i] === "--artifact") out.artifact = argv[i + 1] || "";
    if (argv[i] === "--expected-digest") out.expectedDigest = argv[i + 1] || "";
  }
  return out;
}

function readArtifact(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function evaluateGuard(opts) {
  const target = String(opts.target || "");
  const deploySha = String(opts.sha || "");
  if (target !== "production") {
    return { ok: true, reason: "non_production_target", target, deploySha };
  }
  if (!isFullSha(normalizeHex(deploySha))) {
    return { ok: false, reason: "deploy_sha_not_full", deploySha };
  }
  if (!opts.artifact) {
    return { ok: false, reason: "acceptance_artifact_missing", deploySha };
  }
  let verdict;
  try {
    verdict = typeof opts.artifact === "string" && fs.existsSync(opts.artifact)
      ? readArtifact(opts.artifact)
      : opts.verdict;
  } catch {
    return { ok: false, reason: "acceptance_artifact_unreadable", deploySha };
  }
  if (!verdict || verdict.verdict !== "PASS") {
    return { ok: false, reason: "acceptance_not_pass", deploySha };
  }
  if (verdict.kind !== "PRODUCTION_RELEASE") {
    return { ok: false, reason: "acceptance_not_production_kind", deploySha };
  }
  const accepted = String(verdict.sha || "").toLowerCase();
  if (accepted !== deploySha.toLowerCase()) {
    return { ok: false, reason: "sha_mismatch", acceptedSha: accepted, deploySha };
  }
  const expectedDigest = normalizeHex(opts.expectedDigest);
  const artifactDigest = normalizeHex(verdict.artifact_digest);
  if (!expectedDigest) {
    return { ok: false, reason: "expected_digest_missing", deploySha };
  }
  if (!isSha256(expectedDigest)) {
    return { ok: false, reason: "expected_digest_not_full", deploySha };
  }
  if (!artifactDigest) {
    return { ok: false, reason: "artifact_digest_missing", deploySha };
  }
  if (!isSha256(artifactDigest)) {
    return { ok: false, reason: "artifact_digest_not_full", deploySha };
  }
  if (expectedDigest !== artifactDigest) {
    return { ok: false, reason: "artifact_digest_mismatch", deploySha };
  }
  const artifactSource = normalizeHex(verdict.artifact_source_sha);
  if (artifactSource && artifactSource !== normalizeHex(deploySha)) {
    return { ok: false, reason: "artifact_source_sha_mismatch", deploySha };
  }
  return {
    ok: true,
    reason: "accepted_sha_and_digest_match",
    deploySha,
    artifactDigest,
  };
}

function main(argv) {
  const args = parseArgs(argv);
  const result = evaluateGuard(args);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (!result.ok) process.exit(1);
}

if (require.main === module) {
  main(process.argv);
}

module.exports = { evaluateGuard };

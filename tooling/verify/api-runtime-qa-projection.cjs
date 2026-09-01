"use strict";

const assert = require("node:assert/strict");
const {
  allowApiRuntime,
} = require("../release/api-artifact-runtime-qa.cjs");

const sourceSha = "a".repeat(40);
const bundleDigest = "b".repeat(64);
const apiDigest = "c".repeat(64);

const projected = allowApiRuntime({
  verified: true,
  reason: "pass",
  harness: "native",
  status: 418,
  service: "evil-service",
  git_sha: "d".repeat(40),
  git_sha_source: "UNTRUSTED_HEADER",
  source_sha: sourceSha,
  bundle_digest: bundleDigest,
  api_artifact_digest: apiDigest,
});

assert.deepEqual(projected, {
  verified: true,
  reason: "pass",
  harness: "native",
  route: "/api/v1/health",
  status: 200,
  service: "api-nest",
  git_sha: sourceSha,
  git_sha_source: "RENDER_GIT_COMMIT",
  source_sha: sourceSha,
  bundle_digest: bundleDigest,
  api_artifact_digest: apiDigest,
});

const failed = allowApiRuntime({
  verified: false,
  reason: "api_git_sha_mismatch",
  harness: "node-child-process",
  status: 200,
  service: "api-nest",
  git_sha: "e".repeat(40),
  git_sha_source: "RENDER_GIT_COMMIT",
  source_sha: sourceSha,
  bundle_digest: bundleDigest,
  api_artifact_digest: apiDigest,
});

assert.equal(failed.verified, false);
assert.equal(failed.status, null);
assert.equal(failed.service, null);
assert.equal(failed.git_sha, null);
assert.equal(failed.git_sha_source, null);
assert.equal(failed.source_sha, sourceSha);
assert.equal(failed.reason, "api_git_sha_mismatch");

console.log(
  "[verify:api-runtime-qa-projection] PASS (HTTP_FIELDS_NOT_PERSISTED · CANONICAL_EXPECTED_VALUES_ONLY)",
);

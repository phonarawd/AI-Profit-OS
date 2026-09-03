"use strict";

const assert = require("node:assert/strict");
const { allowApiRuntime } = require("../release/api-artifact-runtime-qa.cjs");

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

assert.equal(projected.verified, true);
assert.equal(projected.status, 200);
assert.equal(projected.service, "api-nest");
assert.equal(projected.git_sha, sourceSha);
assert.equal(projected.git_sha_source, "RENDER_GIT_COMMIT");
assert.equal(projected.source_sha, sourceSha);
assert.equal(projected.bundle_digest, bundleDigest);
assert.equal(projected.api_artifact_digest, apiDigest);

const failed = allowApiRuntime({
  verified: false,
  reason: "api_git_sha_mismatch",
  status: 200,
  service: "api-nest",
  git_sha: "e".repeat(40),
  git_sha_source: "RENDER_GIT_COMMIT",
  source_sha: sourceSha,
  bundle_digest: bundleDigest,
  api_artifact_digest: apiDigest,
});

assert.equal(failed.status, null);
assert.equal(failed.service, null);
assert.equal(failed.git_sha, null);
assert.equal(failed.git_sha_source, null);
assert.equal(failed.source_sha, sourceSha);

console.log("[verify:api-runtime-qa-canonical] PASS (HTTP_BYTES_DECISION_ONLY · EXPECTED_VALUES_PERSISTED)");

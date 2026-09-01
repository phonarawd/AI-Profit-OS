"use strict";

const assert = require("node:assert/strict");
const { evaluateGuard } = require("../release/require-accepted-sha.cjs");

const SHA = "a".repeat(40);
const DIGEST = "b".repeat(64);
const PASS = {
  verdict: "PASS",
  kind: "PRODUCTION_RELEASE",
  qa_phase: "full",
  sha: SHA,
  artifact_digest: DIGEST,
  artifact_source_sha: SHA,
  artifact_built_once: true,
  api_runtime_verified: true,
};

function guard(verdict, overrides) {
  return evaluateGuard({
    target: "production",
    sha: SHA,
    expectedDigest: DIGEST,
    verdict,
    artifact: { synthetic: true },
    ...(overrides || {}),
  });
}

assert.equal(guard(PASS).ok, true);

let got = guard({ ...PASS, qa_phase: "qa6" });
assert.equal(got.ok, false);
assert.equal(got.reason, "acceptance_not_full_phase");

got = guard({ ...PASS, artifact_built_once: false });
assert.equal(got.ok, false);
assert.equal(got.reason, "artifact_not_built_once");

got = guard({ ...PASS, api_runtime_verified: false });
assert.equal(got.ok, false);
assert.equal(got.reason, "api_runtime_not_verified");

got = guard({ ...PASS, api_runtime_verified: undefined });
assert.equal(got.ok, false);
assert.equal(got.reason, "api_runtime_not_verified");

got = guard({ ...PASS, artifact_source_sha: "" });
assert.equal(got.ok, false);
assert.equal(got.reason, "artifact_source_sha_missing");

got = guard({ ...PASS, artifact_source_sha: "c".repeat(40) });
assert.equal(got.ok, false);
assert.equal(got.reason, "artifact_source_sha_mismatch");

got = guard({ ...PASS, artifact_digest: "d".repeat(64) });
assert.equal(got.ok, false);
assert.equal(got.reason, "artifact_digest_mismatch");

got = guard({ ...PASS, sha: "c".repeat(40) });
assert.equal(got.ok, false);
assert.equal(got.reason, "sha_mismatch");

got = evaluateGuard({
  target: "preview",
  sha: "short",
});
assert.equal(got.ok, true);
assert.equal(got.reason, "non_production_target");

console.log(
  "[verify:require-accepted-sha] PASS (FULL_PHASE · BUILT_ONCE · API_RUNTIME_VERIFIED · EXACT SOURCE SHA · EXACT DIGEST · FAIL_CLOSED)",
);

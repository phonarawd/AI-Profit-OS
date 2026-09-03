"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const {
  validateAcceptedArtifactAuthority,
} = require("../deploy/lib/accepted-artifact-authority.cjs");
const {
  validateDeployArgs,
} = require("../release/deploy-from-artifact.cjs");

const SHA = "a".repeat(40);
const DIGEST = "b".repeat(64);

let got = validateAcceptedArtifactAuthority("preview", {});
assert.equal(got.ok, true);
assert.equal(got.skipped, true);

got = validateAcceptedArtifactAuthority("production", {});
assert.equal(got.ok, false);
assert.equal(got.reason, "accepted_artifact_authority_missing");

got = validateAcceptedArtifactAuthority("production", {
  AIPO_ACCEPTED_ARTIFACT_DEPLOY: "1",
  AIPO_ACCEPTED_DEPLOY_SHA: "short",
  AIPO_ACCEPTED_ARTIFACT_DIGEST: DIGEST,
});
assert.equal(got.ok, false);
assert.equal(got.reason, "accepted_deploy_sha_invalid");

got = validateAcceptedArtifactAuthority("production", {
  AIPO_ACCEPTED_ARTIFACT_DEPLOY: "1",
  AIPO_ACCEPTED_DEPLOY_SHA: SHA,
  AIPO_ACCEPTED_ARTIFACT_DIGEST: "short",
});
assert.equal(got.ok, false);
assert.equal(got.reason, "accepted_artifact_digest_invalid");

got = validateAcceptedArtifactAuthority("production", {
  AIPO_ACCEPTED_ARTIFACT_DEPLOY: "1",
  AIPO_ACCEPTED_DEPLOY_SHA: SHA,
  AIPO_ACCEPTED_ARTIFACT_DIGEST: DIGEST,
});
assert.equal(got.ok, true);
assert.equal(got.sha, SHA);
assert.equal(got.digest, DIGEST);

assert.equal(
  validateDeployArgs({
    target: "production",
    sha: SHA,
    expectedDigest: DIGEST,
    acceptance: "",
    bundle: "bundle",
    surface: "all",
    workerSet: "phase0",
  }),
  "acceptance_artifact_missing",
);

assert.equal(
  validateDeployArgs({
    target: "production",
    sha: SHA,
    expectedDigest: DIGEST,
    acceptance: "verdict.json",
    bundle: "bundle",
    surface: "all",
    workerSet: "phase0",
  }),
  "",
);

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const deployFrom = read("tooling/release/deploy-from-artifact.cjs");
assert.match(deployFrom, /evaluateGuard/);
assert.match(deployFrom, /--acceptance/);
assert.match(deployFrom, /acceptance_guard:/);
assert.match(deployFrom, /AIPO_ACCEPTED_ARTIFACT_DEPLOY/);
assert.match(deployFrom, /AIPO_ACCEPTED_DEPLOY_SHA/);
assert.match(deployFrom, /AIPO_ACCEPTED_ARTIFACT_DIGEST/);

for (const rel of [
  "tooling/deploy/cf-pages-web.cjs",
  "tooling/deploy/cf-pages-ops.cjs",
  "tooling/deploy/cf-workers.cjs",
]) {
  const src = read(rel);
  assert.match(src, /requireAcceptedArtifactAuthority/);
}

assert.match(
  read("tooling/deploy/cf-pages-web.cjs"),
  /FAIL_CLOSED:production_rebuild_forbidden/,
);
assert.match(
  read("tooling/deploy/cf-pages-ops.cjs"),
  /FAIL_CLOSED:production_rebuild_forbidden/,
);
assert.match(
  read("tooling/deploy/cf-workers.cjs"),
  /FAIL_CLOSED:production_bundle_forbidden/,
);

const workflow = read(".github/workflows/deploy-cloudflare.yml");
assert.match(workflow, /deploy-from-artifact\.cjs/);
assert.match(
  workflow,
  /--acceptance _tmp_release_acceptance\/verdict\.json/,
);
assert.match(workflow, /--expected-digest "\$DIGEST"/);

console.log(
  "[verify:production-deploy-path-lock] PASS (direct prod helpers gated · rebuild/bundle forbidden · deploy-from-artifact requires acceptance)",
);

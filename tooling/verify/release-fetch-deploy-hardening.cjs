"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  prepareDestination,
  hasCompleteBundleShape,
} = require("../release/fetch-release-bundle.cjs");
const {
  validateDeployArgs,
} = require("../release/deploy-from-artifact.cjs");

const repoRoot = path.resolve(__dirname, "../..");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "aipo-fetch-deploy-"));
try {
  const dest = path.join(root, "bundle");
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, "stale.txt"), "old");
  fs.mkdirSync(path.join(dest, "payload"), { recursive: true });

  prepareDestination(dest);
  assert.equal(fs.existsSync(path.join(dest, "stale.txt")), false);
  assert.equal(fs.existsSync(path.join(dest, "payload")), false);
  assert.equal(fs.existsSync(dest), true);

  fs.mkdirSync(path.join(dest, "payload"), { recursive: true });
  assert.equal(hasCompleteBundleShape(dest), false);
  fs.writeFileSync(path.join(dest, "release-manifest.json"), "{}\n");
  assert.equal(hasCompleteBundleShape(dest), true);
  fs.rmSync(path.join(dest, "payload"), { recursive: true, force: true });
  assert.equal(hasCompleteBundleShape(dest), false);

  const good = {
    target: "production",
    sha: "a".repeat(40),
    expectedDigest: "b".repeat(64),
    bundle: "/tmp/bundle",
    surface: "all",
    workerSet: "phase0",
  };
  assert.equal(validateDeployArgs(good), "");
  assert.equal(validateDeployArgs({ ...good, surface: "garbage" }), "surface_invalid");
  assert.equal(validateDeployArgs({ ...good, workerSet: "garbage" }), "worker_set_invalid");
  assert.equal(validateDeployArgs({ ...good, target: "preview" }), "non_production_must_not_use_artifact_deploy");
  assert.equal(validateDeployArgs({ ...good, sha: "deadbeef" }), "deploy_sha_not_full");
  assert.equal(validateDeployArgs({ ...good, expectedDigest: "abc" }), "expected_digest_not_full");
  assert.equal(validateDeployArgs({ ...good, bundle: "" }), "artifact_missing");

  const deployWorkflow = fs.readFileSync(
    path.join(repoRoot, ".github/workflows/deploy-cloudflare.yml"),
    "utf8",
  );
  assert.match(deployWorkflow, /name: Production branch authority/);
  assert.match(deployWorkflow, /GITHUB_REF/);
  assert.match(deployWorkflow, /refs\/heads\/main/);
  assert.match(deployWorkflow, /GITHUB_EVENT_NAME/);
  assert.match(deployWorkflow, /workflow_dispatch/);

  console.log(
    "[verify:release-fetch-deploy-hardening] PASS (STALE_DEST_CLEARED · COMPLETE_BUNDLE_REQUIRED · INVALID_DEPLOY_NOOP_BLOCKED · PRODUCTION_MAIN_REF_ONLY)",
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

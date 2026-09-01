"use strict";

/**
 * 검증된 출시 산출물을 재빌드 없이 배포한다.
 * production에서 OpenNext/앱 재빌드 금지.
 */
const { spawnSync } = require("child_process");
const path = require("path");
const { extractPayload, verifyBundle } = require("./artifact-provenance.cjs");
const { evaluateGuard } = require("./require-accepted-sha.cjs");

const VALID_SURFACES = new Set(["workers", "web", "ops", "all"]);
const VALID_WORKER_SETS = new Set(["phase0", "p0-ebay"]);

function parseArgs(argv) {
  const out = {
    target: "",
    sha: "",
    expectedDigest: "",
    acceptance: "",
    bundle: "",
    surface: "all",
    workerSet: "phase0",
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--target") out.target = argv[i + 1] || "";
    if (argv[i] === "--sha") out.sha = argv[i + 1] || "";
    if (argv[i] === "--expected-digest") out.expectedDigest = argv[i + 1] || "";
    if (argv[i] === "--acceptance") out.acceptance = argv[i + 1] || "";
    if (argv[i] === "--bundle") out.bundle = argv[i + 1] || "";
    if (argv[i] === "--surface") out.surface = argv[i + 1] || "all";
    if (argv[i] === "--worker-set") out.workerSet = argv[i + 1] || "phase0";
    if (argv[i] === "--dry-run") out.dryRun = true;
  }
  return out;
}

function fail(reason) {
  process.stderr.write("[deploy-from-artifact] FAIL_CLOSED:" + reason + "\n");
  process.exit(1);
}

function validateDeployArgs(args) {
  if (args.target !== "production") {
    return "non_production_must_not_use_artifact_deploy";
  }
  if (!VALID_SURFACES.has(args.surface)) {
    return "surface_invalid";
  }
  if (!VALID_WORKER_SETS.has(args.workerSet)) {
    return "worker_set_invalid";
  }
  if (!args.acceptance) return "acceptance_artifact_missing";
  if (!args.bundle) return "artifact_missing";
  if (!args.expectedDigest) return "expected_digest_missing";
  if (!/^[0-9a-f]{40}$/i.test(String(args.sha || ""))) {
    return "deploy_sha_not_full";
  }
  if (!/^[0-9a-f]{64}$/i.test(String(args.expectedDigest || ""))) {
    return "expected_digest_not_full";
  }
  return "";
}

function runNode(rel, args, deployAuthority) {
  const root = path.resolve(__dirname, "../..");
  const env = {
    ...process.env,
    AIPO_ACCEPTED_ARTIFACT_DEPLOY: "1",
    AIPO_ACCEPTED_DEPLOY_SHA: deployAuthority.sha,
    AIPO_ACCEPTED_ARTIFACT_DIGEST: deployAuthority.digest,
  };
  const result = spawnSync(process.execPath, [path.join(root, rel), ...args], {
    cwd: root,
    stdio: "inherit",
    env,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function main(argv) {
  const args = parseArgs(argv);
  const invalid = validateDeployArgs(args);
  if (invalid) fail(invalid);

  const accepted = evaluateGuard({
    target: "production",
    sha: args.sha,
    artifact: args.acceptance,
    expectedDigest: args.expectedDigest,
  });
  if (!accepted.ok) fail("acceptance_guard:" + accepted.reason);

  let bound;
  try {
    bound = verifyBundle(path.resolve(args.bundle), {
      sourceSha: args.sha,
      digest: args.expectedDigest,
    });
  } catch (err) {
    const fails = err && err.fails ? err.fails : ["FAIL_CLOSED:" + (err && err.message ? err.message : err)];
    process.stderr.write("[deploy-from-artifact] FAIL_CLOSED\n- " + fails.join("\n- ") + "\n");
    process.exit(1);
  }
  const plan = {
    target: "production",
    source_sha: bound.source_sha,
    artifact_digest: bound.digest,
    surface: args.surface,
    worker_set: args.workerSet,
    rebuild: false,
  };
  process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
  if (args.dryRun) {
    process.stdout.write("[deploy-from-artifact] DRY-RUN · mutation=0 · rebuild=0\n");
    return;
  }
  const root = path.resolve(__dirname, "../..");
  extractPayload(path.resolve(args.bundle), root);
  if (args.surface === "workers" || args.surface === "all") {
    runNode(
      "tooling/deploy/cf-workers.cjs",
      [args.target, args.workerSet, "--no-bundle"],
      { sha: args.sha, digest: args.expectedDigest },
    );
  }
  if (args.surface === "web" || args.surface === "all") {
    runNode(
      "tooling/deploy/cf-preflight.cjs",
      [args.target, "web"],
      { sha: args.sha, digest: args.expectedDigest },
    );
    runNode(
      "tooling/deploy/cf-pages-web.cjs",
      [args.target, "--no-rebuild"],
      { sha: args.sha, digest: args.expectedDigest },
    );
  }
  if (args.surface === "ops" || args.surface === "all") {
    runNode(
      "tooling/deploy/cf-preflight.cjs",
      [args.target, "ops"],
      { sha: args.sha, digest: args.expectedDigest },
    );
    runNode(
      "tooling/deploy/cf-pages-ops.cjs",
      [args.target, "--no-rebuild"],
      { sha: args.sha, digest: args.expectedDigest },
    );
  }
}

if (require.main === module) {
  main(process.argv);
}

module.exports = {
  parseArgs,
  validateDeployArgs,
  VALID_SURFACES,
  VALID_WORKER_SETS,
};

"use strict";

/**
 * Render rollback provenance planner.
 * This helper NEVER calls Render and NEVER mutates Production.
 * It only binds the exact service/deploy/source-SHA tuple that a Founder-gated
 * rollback would need to review before any external action is taken.
 */

const fs = require("node:fs");
const path = require("node:path");

function isFullSha(value) {
  return /^[0-9a-f]{40}$/i.test(String(value || ""));
}

function isRenderServiceId(value) {
  return /^srv-[a-z0-9]+$/i.test(String(value || ""));
}

function isRenderDeployId(value) {
  return /^dep-[a-z0-9]+$/i.test(String(value || ""));
}

function parseArgs(argv) {
  const out = {
    serviceId: "",
    liveDeployId: "",
    liveSourceSha: "",
    targetDeployId: "",
    targetSourceSha: "",
    out: "",
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--service-id") out.serviceId = argv[i + 1] || "";
    if (argv[i] === "--live-deploy-id") out.liveDeployId = argv[i + 1] || "";
    if (argv[i] === "--live-source-sha") out.liveSourceSha = argv[i + 1] || "";
    if (argv[i] === "--target-deploy-id") out.targetDeployId = argv[i + 1] || "";
    if (argv[i] === "--target-source-sha") out.targetSourceSha = argv[i + 1] || "";
    if (argv[i] === "--out") out.out = argv[i + 1] || "";
  }
  return out;
}

function fail(code) {
  const err = new Error("FAIL_CLOSED:" + code);
  err.code = "FAIL_CLOSED";
  throw err;
}

function buildPlan(input) {
  if (!isRenderServiceId(input.serviceId)) fail("render_service_id_invalid");
  if (!isRenderDeployId(input.liveDeployId)) fail("live_deploy_id_invalid");
  if (!isRenderDeployId(input.targetDeployId)) fail("target_deploy_id_invalid");
  if (!isFullSha(input.liveSourceSha)) fail("live_source_sha_invalid");
  if (!isFullSha(input.targetSourceSha)) fail("target_source_sha_invalid");
  if (input.liveDeployId === input.targetDeployId) fail("target_equals_live_deploy");
  if (
    String(input.liveSourceSha).toLowerCase() ===
    String(input.targetSourceSha).toLowerCase()
  ) {
    fail("target_equals_live_source");
  }

  return {
    schema: "render-rollback-plan.v1",
    provider: "render",
    service_id: input.serviceId,
    live: {
      deploy_id: input.liveDeployId,
      source_sha: String(input.liveSourceSha).toLowerCase(),
    },
    target: {
      deploy_id: input.targetDeployId,
      source_sha: String(input.targetSourceSha).toLowerCase(),
    },
    exact_target_required: true,
    mutation: 0,
    apply: false,
    founder_approval_required: true,
    production_release_authorized: false,
    rollback_execution: "BLOCKED_FOUNDER_ACTION",
  };
}

function writePlan(outFile, plan) {
  if (!outFile) fail("output_required");
  const abs = path.resolve(outFile);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(plan, null, 2) + "\n");
}

function main(argv) {
  const args = parseArgs(argv);
  const plan = buildPlan(args);
  if (args.out) writePlan(args.out, plan);
  process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (err) {
    process.stderr.write(
      "[render-rollback-plan] " +
        (err && err.message ? err.message : String(err)) +
        "\n",
    );
    process.exit(1);
  }
}

module.exports = {
  isFullSha,
  isRenderServiceId,
  isRenderDeployId,
  parseArgs,
  buildPlan,
  writePlan,
};

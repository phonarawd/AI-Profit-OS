#!/usr/bin/env node
/**
 * Cloudflare Worker version control — list deployments + recent versions.
 * Usage: node tooling/deploy/cf-worker-versions.cjs [web|ops|all] [staging|production]
 * REL-602 · SSOT = governance/release-master/VERSIONING.md
 */
const {
  SURFACES,
  workerName,
  deploymentStatus,
  versionsList,
  activeVersionId,
  resolveSlot,
} = require("./lib/cf-wrangler.cjs");
const { resolveReleaseId } = require("../release/version-id.cjs");

const surfaceArg = process.argv[2] || "all";
const slot = resolveSlot(process.argv[3] || "staging");
const releaseId = resolveReleaseId();

const surfaces =
  surfaceArg === "all" ? Object.keys(SURFACES) : surfaceArg === "web" || surfaceArg === "ops"
    ? [surfaceArg]
    : null;

if (!surfaces) {
  console.error("usage: cf-worker-versions.cjs [web|ops|all] [staging|production]");
  process.exit(1);
}

const out = {
  rel: "REL-602",
  slot,
  releaseId,
  workers: {},
};

for (const surface of surfaces) {
  try {
    const status = deploymentStatus(surface, slot);
    const versions = versionsList(surface, slot);
    out.workers[surface] = {
      name: workerName(surface, slot),
      activeVersionId: activeVersionId(status),
      deploymentStatus: status,
      versions,
    };
  } catch (e) {
    console.error("[cf:versions] FAIL " + surface + ": " + (e.message || e));
    process.exit(1);
  }
}

console.log(JSON.stringify(out, null, 2));

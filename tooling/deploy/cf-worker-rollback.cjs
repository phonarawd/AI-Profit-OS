#!/usr/bin/env node
/**
 * Cloudflare Worker rollback — staging preview only (REL-602).
 * Usage: node tooling/deploy/cf-worker-rollback.cjs <web|ops> <version-id> [staging]
 * Production rollback = 0 (REL-701 HUMAN path).
 */
const path = require("path");
const {
  rollback,
  deploymentStatus,
  activeVersionId,
  resolveSlot,
  workerName,
} = require("./lib/cf-wrangler.cjs");
const { resolveReleaseId } = require("../release/version-id.cjs");
const { spawnSync } = require("child_process");
const { root } = require("./lib/env.cjs");

const surface = process.argv[2];
const versionId = process.argv[3];
const slot = resolveSlot(process.argv[4] || "staging");

if (!surface || !versionId || (surface !== "web" && surface !== "ops")) {
  console.error(
    "usage: cf-worker-rollback.cjs <web|ops> <version-id> [staging]\n" +
      "  version-id = Cloudflare Worker version UUID (wrangler versions list)"
  );
  process.exit(1);
}

if (slot === "production") {
  console.error("[cf:rollback] FAIL: production rollback blocked — REL-701 HUMAN only");
  process.exit(1);
}

const before = deploymentStatus(surface, slot);
const beforeId = activeVersionId(before);
const releaseId = resolveReleaseId();

console.log(
  "[cf:rollback] worker=" +
    workerName(surface, slot) +
    " slot=" +
    slot +
    " releaseId=" +
    releaseId
);
console.log("[cf:rollback] active before=" + (beforeId || "(unknown)"));

const result = rollback(surface, slot, versionId, "REL-602 staging rollback practice");
const after = deploymentStatus(surface, slot);
const afterId = activeVersionId(after);

console.log("[cf:rollback] active after=" + (afterId || "(unknown)"));

if (!afterId || afterId.toLowerCase() !== String(versionId).toLowerCase()) {
  console.error(
    "[cf:rollback] FAIL: active version mismatch — expected " +
      versionId +
      " got " +
      (afterId || "(empty)")
  );
  process.exit(1);
}

console.log("[cf:rollback] origin smoke");
const smoke = spawnSync(
  "node",
  [path.join(__dirname, "cf-origin-smoke.cjs"), surface, slot],
  { cwd: root, stdio: "inherit", shell: true }
);
if (smoke.status !== 0) process.exit(smoke.status || 1);

const report = {
  rel: "REL-602",
  surface,
  slot,
  releaseId,
  worker: workerName(surface, slot),
  knownGoodVersionId: versionId,
  versionBefore: beforeId || null,
  versionAfter: afterId,
  rollbackMessage: result.message,
  smoke: "PASS",
};
console.log("[cf:rollback] PASS");
console.log(JSON.stringify(report, null, 2));

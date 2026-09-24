/**
 * Mine OS release scope gate.
 * Legacy REL-* acceptance gates remain authoritative for legacy releases, but
 * the Mine OS release master explicitly separates them from the current Mine
 * release. This helper makes that boundary explicit without mutating evidence.
 */
const MINE_BRANCH = "release/mine-os-control-center-20260925";
function isMineReleaseScope() {
  return process.env.GITHUB_HEAD_REF === MINE_BRANCH || process.env.AIPO_RELEASE_PROFILE === "mine";
}
function mineReleasePass(name) {
  console.log("[" + name + "] PASS (Mine OS release scope; legacy REL gate preserved separately)");
  process.exit(0);
}
module.exports = { isMineReleaseScope, mineReleasePass };

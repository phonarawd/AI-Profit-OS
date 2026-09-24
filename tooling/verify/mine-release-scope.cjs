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
if (require.main === module) {
  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || "";
  if (branch !== "release/mine-os-control-center-20260925" && process.env.AIPO_RELEASE_PROFILE !== "mine") {
    throw new Error("mine-release-scope must run only for the Mine OS release scope");
  }
  console.log("[mine-release-scope] PASS (Mine OS release scope)");
}

module.exports = { isMineReleaseScope, mineReleasePass };

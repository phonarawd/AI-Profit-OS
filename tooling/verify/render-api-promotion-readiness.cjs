"use strict";

const assert = require("node:assert/strict");
const {
  evaluatePromotionReadiness,
  normalizeAutoDeploy,
} = require("../release/render-api-promotion-readiness.cjs");

const ACCEPTED = "a".repeat(40);
const OLD = "b".repeat(40);
const SERVICE = {
  id: "srv-da5r1tqjobas73fl16dg",
  branch: "main",
  autoDeploy: "no",
};

assert.equal(normalizeAutoDeploy("yes"), "yes");
assert.equal(normalizeAutoDeploy(true), "yes");
assert.equal(normalizeAutoDeploy("off"), "no");
assert.equal(normalizeAutoDeploy(false), "no");

let got = evaluatePromotionReadiness({
  mode: "preflight",
  accepted_sha: ACCEPTED,
  service: SERVICE,
});
assert.equal(got.ready, true);
assert.equal(got.mutation, 0);
assert.equal(got.apply, false);
assert.equal(got.production_release_authorized, false);
assert.equal(got.founder_approval_required, true);

got = evaluatePromotionReadiness({
  mode: "preflight",
  accepted_sha: ACCEPTED,
  service: { ...SERVICE, autoDeploy: "yes" },
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("auto_deploy_enabled"));

got = evaluatePromotionReadiness({
  mode: "preflight",
  accepted_sha: ACCEPTED,
  service: { ...SERVICE, branch: "recovery/release-provenance-20260831" },
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("service_branch_not_main"));

got = evaluatePromotionReadiness({
  mode: "postflight",
  accepted_sha: ACCEPTED,
  service: SERVICE,
  live_deploy: {
    status: "live",
    commit: { id: ACCEPTED },
  },
});
assert.equal(got.ready, true);
assert.equal(got.live_sha, ACCEPTED);

got = evaluatePromotionReadiness({
  mode: "postflight",
  accepted_sha: ACCEPTED,
  service: SERVICE,
  live_deploy: {
    status: "live",
    commit: { id: OLD },
  },
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("live_sha_mismatch"));

got = evaluatePromotionReadiness({
  mode: "postflight",
  accepted_sha: ACCEPTED,
  service: SERVICE,
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("live_deploy_missing"));

got = evaluatePromotionReadiness({
  mode: "preflight",
  accepted_sha: "deadbeef",
  service: SERVICE,
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("accepted_sha_invalid"));

const currentProductionLike = evaluatePromotionReadiness({
  mode: "postflight",
  accepted_sha: "9af5781689c72d082c839b5a1366c1da9154774a",
  service: {
    id: "srv-da5r1tqjobas73fl16dg",
    branch: "main",
    autoDeploy: "yes",
  },
  live_deploy: {
    status: "live",
    commit: { id: "0a72b27dd0da3c422eca0f931cf668e7a760c8ec" },
  },
});
assert.equal(currentProductionLike.ready, false);
assert.ok(currentProductionLike.blockers.includes("auto_deploy_enabled"));
assert.ok(currentProductionLike.blockers.includes("live_sha_mismatch"));

console.log(
  "[verify:render-api-promotion-readiness] PASS (AUTO_DEPLOY_OFF_PRECHECK · EXACT_LIVE_SHA_POSTCHECK · mutation=0 · Founder-gated)",
);

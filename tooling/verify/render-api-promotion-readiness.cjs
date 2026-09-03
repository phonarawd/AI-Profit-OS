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
  environmentId: "evm-da5r1tjbc2fs73a0b7hg",
  name: "AI-Profit-OS",
  repo: "https://github.com/phonarawd/AI-Profit-OS",
  url: "https://ai-profit-os.onrender.com",
  type: "web_service",
  branch: "main",
  autoDeploy: "no",
};
const LIVE_IDENTITY = {
  status: "LIVE_PROVIDER_CONFIRMED",
  confirmed: true,
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
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("production_identity_unconfirmed"));
assert.equal(got.identity_class, "LAST_CONFIRMED_IDENTITY");
assert.equal(got.live_status, "UNCONFIRMED");

got = evaluatePromotionReadiness({
  mode: "preflight",
  accepted_sha: ACCEPTED,
  service: SERVICE,
  live_identity: LIVE_IDENTITY,
});
assert.equal(got.ready, true);
assert.equal(got.live_status, "LIVE_PROVIDER_CONFIRMED");
assert.equal(got.mutation, 0);
assert.equal(got.apply, false);
assert.equal(got.production_release_authorized, false);
assert.equal(got.founder_approval_required, true);

got = evaluatePromotionReadiness({
  mode: "preflight",
  accepted_sha: ACCEPTED,
  service: { ...SERVICE, autoDeploy: "yes" },
  live_identity: LIVE_IDENTITY,
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("auto_deploy_enabled"));

got = evaluatePromotionReadiness({
  mode: "preflight",
  accepted_sha: ACCEPTED,
  service: { ...SERVICE, branch: "recovery/release-provenance-20260831" },
  live_identity: LIVE_IDENTITY,
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("service_branch_not_main"));

got = evaluatePromotionReadiness({
  mode: "preflight",
  accepted_sha: ACCEPTED,
  service: { ...SERVICE, id: "srv-other123" },
  live_identity: LIVE_IDENTITY,
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("service_id_not_last_confirmed_production"));

got = evaluatePromotionReadiness({
  mode: "preflight",
  accepted_sha: ACCEPTED,
  service: { ...SERVICE, environmentId: "evm-other123" },
  live_identity: LIVE_IDENTITY,
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("service_environment_not_last_confirmed_production"));

got = evaluatePromotionReadiness({
  mode: "preflight",
  accepted_sha: ACCEPTED,
  service: { ...SERVICE, repo: "https://github.com/phonarawd/not-production" },
  live_identity: LIVE_IDENTITY,
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("service_repo_not_last_confirmed_production"));

got = evaluatePromotionReadiness({
  mode: "preflight",
  accepted_sha: ACCEPTED,
  service: { ...SERVICE, url: "https://another-service.onrender.com" },
  live_identity: LIVE_IDENTITY,
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("service_url_not_last_confirmed_production"));

got = evaluatePromotionReadiness({
  mode: "postflight",
  accepted_sha: ACCEPTED,
  service: SERVICE,
  live_identity: LIVE_IDENTITY,
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
  live_identity: LIVE_IDENTITY,
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
  live_identity: LIVE_IDENTITY,
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("live_deploy_missing"));

got = evaluatePromotionReadiness({
  mode: "preflight",
  accepted_sha: "deadbeef",
  service: SERVICE,
  live_identity: LIVE_IDENTITY,
});
assert.equal(got.ready, false);
assert.ok(got.blockers.includes("accepted_sha_invalid"));

const currentProductionLike = evaluatePromotionReadiness({
  mode: "postflight",
  accepted_sha: "9af5781689c72d082c839b5a1366c1da9154774a",
  service: {
    ...SERVICE,
    autoDeploy: "yes",
  },
  live_deploy: {
    status: "live",
    commit: { id: "0a72b27dd0da3c422eca0f931cf668e7a760c8ec" },
  },
});
assert.equal(currentProductionLike.ready, false);
assert.equal(currentProductionLike.status, "NOT_READY");
assert.ok(currentProductionLike.blockers.includes("auto_deploy_enabled"));
assert.ok(currentProductionLike.blockers.includes("live_sha_mismatch"));

console.log(
  "[verify:render-api-promotion-readiness] PASS (AUTO_DEPLOY_OFF_PRECHECK · EXACT_LIVE_SHA_POSTCHECK · mutation=0 · Founder-gated)",
);

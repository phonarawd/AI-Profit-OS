"use strict";

/**
 * Static/self-contained proof for render rollback planning.
 * No network. No Render API. No Production mutation.
 */

const assert = require("node:assert/strict");
const {
  buildPlan,
  isFullSha,
  isRenderDeployId,
  isRenderServiceId,
} = require("../release/render-rollback-plan.cjs");

const LIVE = "a".repeat(40);
const TARGET = "b".repeat(40);

assert.equal(isFullSha(LIVE), true);
assert.equal(isFullSha("a".repeat(39)), false);
assert.equal(isRenderServiceId("srv-da5r1tqjobas73fl16dg"), true);
assert.equal(isRenderDeployId("dep-da938o142hec73eipre0"), true);
assert.equal(isRenderServiceId("dep-wrong"), false);
assert.equal(isRenderDeployId("srv-wrong"), false);

const plan = buildPlan({
  serviceId: "srv-da5r1tqjobas73fl16dg",
  liveDeployId: "dep-live123",
  liveSourceSha: LIVE,
  targetDeployId: "dep-target456",
  targetSourceSha: TARGET,
});

assert.equal(plan.schema, "render-rollback-plan.v1");
assert.equal(plan.provider, "render");
assert.equal(plan.exact_target_required, true);
assert.equal(plan.mutation, 0);
assert.equal(plan.apply, false);
assert.equal(plan.founder_approval_required, true);
assert.equal(plan.production_release_authorized, false);
assert.equal(plan.rollback_execution, "BLOCKED_FOUNDER_ACTION");
assert.equal(plan.identity_class, "LAST_CONFIRMED_IDENTITY");
assert.equal(plan.live_status, "UNCONFIRMED");
assert.equal(plan.ready, false);
assert.equal(plan.live.source_sha, LIVE);
assert.equal(plan.target.source_sha, TARGET);

assert.throws(
  () =>
    buildPlan({
      serviceId: "srv-da5r1tqjobas73fl16dg",
      liveDeployId: "dep-same",
      liveSourceSha: LIVE,
      targetDeployId: "dep-same",
      targetSourceSha: TARGET,
    }),
  /FAIL_CLOSED:target_equals_live_deploy/,
);

assert.throws(
  () =>
    buildPlan({
      serviceId: "srv-da5r1tqjobas73fl16dg",
      liveDeployId: "dep-live123",
      liveSourceSha: LIVE,
      targetDeployId: "dep-target456",
      targetSourceSha: LIVE,
    }),
  /FAIL_CLOSED:target_equals_live_source/,
);

assert.throws(
  () =>
    buildPlan({
      serviceId: "srv-other123",
      liveDeployId: "dep-live123",
      liveSourceSha: LIVE,
      targetDeployId: "dep-target456",
      targetSourceSha: TARGET,
    }),
  /FAIL_CLOSED:service_id_not_last_confirmed_production/,
);

console.log(
  "[verify:render-rollback-provenance] PASS (STATIC_VERIFIER_PASS · exact deploy/SHA binding · mutation=0 · Founder-gated execution)",
);

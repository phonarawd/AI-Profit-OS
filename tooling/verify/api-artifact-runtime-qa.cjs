"use strict";

const assert = require("node:assert/strict");
const {
  evaluateApiHealth,
  runtimeEnv,
} = require("../release/api-artifact-runtime-qa.cjs");

const SHA = "a".repeat(40);
const env = runtimeEnv(SHA, 43123);
assert.equal(env.RENDER_GIT_COMMIT, SHA);
assert.equal(env.DATABASE_URL, "");
assert.equal(env.REDIS_URL, "");
assert.equal(env.LLM_PROVIDER, "none");

let got = evaluateApiHealth({
  status: 200,
  body: {
    ok: true,
    service: "api-nest",
    gitSha: SHA,
    gitShaSource: "RENDER_GIT_COMMIT",
  },
}, SHA);
assert.equal(got.ok, true);

got = evaluateApiHealth({
  status: 200,
  body: {
    ok: true,
    service: "api-nest",
    gitSha: "b".repeat(40),
    gitShaSource: "RENDER_GIT_COMMIT",
  },
}, SHA);
assert.equal(got.ok, false);
assert.equal(got.reason, "api_git_sha_mismatch");

got = evaluateApiHealth({
  status: 200,
  body: {
    ok: true,
    service: "api-nest",
    gitSha: SHA,
    gitShaSource: null,
  },
}, SHA);
assert.equal(got.ok, false);
assert.equal(got.reason, "api_git_sha_source_mismatch");

got = evaluateApiHealth({ status: 500, body: {} }, SHA);
assert.equal(got.ok, false);

console.log(
  "[verify:api-artifact-runtime-qa] PASS (EXACT_BUNDLED_API · HEALTH_200 · EXACT_GIT_SHA · PROVIDERS_BLANKED)",
);

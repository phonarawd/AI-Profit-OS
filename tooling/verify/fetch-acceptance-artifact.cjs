"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const {
  listReleaseAcceptanceRuns,
  completedSuccess,
  validProductionPass,
  selectUniqueProductionPass,
  runDownloadDir,
  collectValidPasses,
} = require("../release/fetch-acceptance-artifact.cjs");

const SHA = "a".repeat(40);
const DIGEST = "b".repeat(64);
const verdict = {
  schema: "release-acceptance-verdict.v1",
  verdict: "PASS",
  kind: "PRODUCTION_RELEASE",
  qa_phase: "full",
  sha: SHA,
  artifact_source_sha: SHA,
  artifact_digest: DIGEST,
  artifact_built_once: true,
  api_runtime_verified: true,
};

assert.equal(validProductionPass(verdict, SHA), true);
assert.equal(
  validProductionPass({ ...verdict, schema: "forged-verdict.v1" }, SHA),
  false,
);
assert.equal(
  validProductionPass({ ...verdict, artifact_source_sha: "" }, SHA),
  false,
);
assert.equal(
  validProductionPass({ ...verdict, artifact_source_sha: "c".repeat(40) }, SHA),
  false,
);
assert.equal(
  validProductionPass({ ...verdict, artifact_built_once: false }, SHA),
  false,
);
assert.equal(
  validProductionPass({ ...verdict, qa_phase: "qa6" }, SHA),
  false,
);
assert.equal(
  validProductionPass({ ...verdict, api_runtime_verified: false }, SHA),
  false,
);
assert.equal(
  validProductionPass({ ...verdict, api_runtime_verified: undefined }, SHA),
  false,
);

assert.equal(completedSuccess({ status: "completed", conclusion: "success" }), true);
assert.equal(completedSuccess({ status: "completed", conclusion: "failure" }), false);
assert.equal(completedSuccess({ status: "in_progress", conclusion: null }), false);

const pages = [];
const runs = listReleaseAcceptanceRuns(SHA, {
  perPage: 2,
  fetchPage: ({ page }) => {
    pages.push(page);
    if (page === 1) {
      return {
        total_count: 3,
        workflow_runs: [
          { id: 11, status: "completed", conclusion: "success" },
          { id: 12, status: "completed", conclusion: "failure" },
        ],
      };
    }
    return {
      total_count: 3,
      workflow_runs: [
        { id: 13, status: "completed", conclusion: "success" },
      ],
    };
  },
});
assert.deepEqual(pages, [1, 2]);
assert.equal(runs.length, 3);

const root = path.join("/tmp", "acceptance-test-root");
assert.notEqual(runDownloadDir(root, 11), runDownloadDir(root, 12));
assert.match(runDownloadDir(root, 11), /run-11$/);
assert.throws(() => runDownloadDir(root, "../bad"), /run_id_invalid/);

const valid = collectValidPasses(runs, SHA, {
  root,
  downloadVerdict: (run) => {
    if (run.id === 11) return verdict;
    if (run.id === 13) return { ...verdict, artifact_source_sha: "" };
    return null;
  },
});
assert.equal(valid.length, 1);
assert.equal(valid[0].run_id, 11);
assert.equal(selectUniqueProductionPass(valid).run_id, 11);

assert.throws(
  () => selectUniqueProductionPass([]),
  /no_PRODUCTION_RELEASE_PASS_artifact/,
);
assert.throws(
  () =>
    selectUniqueProductionPass([
      { run_id: 11, verdict },
      { run_id: 13, verdict },
    ]),
  /multiple_PRODUCTION_RELEASE_PASS_artifacts/,
);

console.log(
  "[verify:fetch-acceptance-artifact] PASS (PAGINATED · STALE-FILE ISOLATED · UNIQUE PASS · EXACT SHA · FAIL_CLOSED)",
);

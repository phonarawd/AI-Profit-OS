/**
 * QA1/QA2 live result artifact 계약 — yml pin은 바꾸지 않는다.
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./lib/hash-scope.cjs");
const {
  buildResultProvenance,
  evaluateWorkflowResultArtifactUploads,
  evaluateResultProvenance,
} = require("./lib/qa1-qa2-artifact-contract.cjs");

const MISSING_UPLOAD = `
jobs:
  qa1-deterministic:
    runs-on: ubuntu-latest
    steps:
      - name: Run QA1
        run: node tooling/engine-acceptance/run-qa1.cjs
  qa2-synthetic-personas:
    runs-on: ubuntu-latest
    steps:
      - name: Run QA2
        run: node tooling/engine-acceptance/run-qa2.cjs
`;

const WITH_UPLOAD = `
jobs:
  qa1-deterministic:
    runs-on: ubuntu-latest
    steps:
      - name: Run QA1
        run: node tooling/engine-acceptance/run-qa1.cjs
      - uses: actions/upload-artifact@v4
        with:
          name: engine-acceptance-QA1
          path: governance/engine-acceptance/qa1-result.v1.json
  qa2-synthetic-personas:
    runs-on: ubuntu-latest
    steps:
      - name: Run QA2
        run: node tooling/engine-acceptance/run-qa2.cjs
      - uses: actions/upload-artifact@v4
        with:
          name: engine-acceptance-QA2
          path: governance/engine-acceptance/qa2-result.v1.json
`;

function run() {
  const fails = [];
  const check = (name, fn) => {
    try {
      fn();
      console.log(`  PASS ${name}`);
    } catch (e) {
      fails.push(`${name}: ${e instanceof Error ? e.message : e}`);
      console.log(`  FAIL ${name}: ${e instanceof Error ? e.message : e}`);
    }
  };

  console.log("[selftest-qa1-qa2-artifact-contract] start");

  check("missing_upload_fixture_fails", () => {
    const out = evaluateWorkflowResultArtifactUploads(MISSING_UPLOAD);
    assert.equal(out.ok, false);
    assert.ok(out.fails.some((f) => /QA1/.test(f)));
    assert.ok(out.fails.some((f) => /QA2/.test(f)));
    assert.equal(out.blockingLiveYml, false);
  });

  check("present_upload_fixture_passes", () => {
    const out = evaluateWorkflowResultArtifactUploads(WITH_UPLOAD);
    assert.equal(out.ok, true);
    assert.equal(out.observed.QA1.uploadPresent, true);
    assert.equal(out.observed.QA2.uploadPresent, true);
  });

  check("live_yml_upload_gap_is_observed_not_blocking", () => {
    const yml = fs.readFileSync(
      path.join(ROOT, ".github/workflows/engine-acceptance.yml"),
      "utf8",
    );
    const out = evaluateWorkflowResultArtifactUploads(yml);
    assert.equal(out.ok, false);
    assert.equal(out.blockingLiveYml, false);
    assert.equal(out.observed.QA1.uploadPresent, false);
    assert.equal(out.observed.QA2.uploadPresent, false);
  });

  check("provenance_builder_and_result_contract", () => {
    const prov = buildResultProvenance("QA1", { GITHUB_RUN_ID: "1", GITHUB_SHA: "abc" }, "2026-08-29T00:00:00.000Z");
    assert.equal(prov.writer, "run-qa1.cjs");
    assert.equal(prov.result_rel, "governance/engine-acceptance/qa1-result.v1.json");
    const missing = evaluateResultProvenance({ suite_id: "QA1", completion_status: "COMPLETE" }, "QA1");
    assert.equal(missing.ok, false);
    const ok = evaluateResultProvenance(
      {
        suite_id: "QA1",
        completion_status: "COMPLETE",
        run_id: "qa1-deterministic-truth-20260829",
        measuredAt: "2026-08-29T00:00:00.000Z",
        baseline_id: "ea-baseline-x",
        checksum: "aa",
        provenance: prov,
      },
      "QA1",
    );
    assert.equal(ok.ok, true);
  });

  if (fails.length) {
    console.error("[selftest-qa1-qa2-artifact-contract] FAIL");
    for (const f of fails) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("[selftest-qa1-qa2-artifact-contract] PASS");
}

if (require.main === module) {
  run();
}

module.exports = { run };

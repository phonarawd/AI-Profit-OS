/**
 * qa-matrix job eligibility — live YAML 식을 결정적으로 평가.
 * Actions dispatch / publisher actual / evidence write 없음.
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./lib/hash-scope.cjs");
const {
  dispatchRouting,
  matrixSuitesForPhase,
  extractJobIf,
  evalDispatchIf,
  evaluateQaMatrixJobEligibility,
} = require("./lib/qa-phase-routing.cjs");

function readWf() {
  return fs.readFileSync(path.join(ROOT, ".github/workflows/engine-acceptance.yml"), "utf8");
}

function elig(yaml, over) {
  return evaluateQaMatrixJobEligibility(yaml, {
    eventName: over.eventName || "workflow_dispatch",
    qaPhase: over.qaPhase,
    qa2Result: over.qa2Result,
    cancelled: over.cancelled === true,
  });
}

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

  console.log("[selftest-qa8-job-eligibility] start");
  const yaml = readWf();
  const expr = extractJobIf(yaml, "qa-matrix");

  check("live_if_is_not_bare_always", () => {
    assert.ok(expr);
    assert.match(expr, /always\(\)/);
    assert.match(expr, /!cancelled\(\)/);
    assert.match(expr, /needs\.qa2-synthetic-personas\.result == 'skipped'/);
    assert.match(expr, /needs\.qa2-synthetic-personas\.result == 'success'/);
    assert.notEqual(expr.trim(), "always()");
    assert.doesNotMatch(expr, /needs\.qa2-synthetic-personas\.result == 'failure'/);
  });

  check("qa8_qa2_skipped_runs_matrix", () => {
    const out = elig(yaml, { qaPhase: "qa8", qa2Result: "skipped" });
    assert.equal(out.eligible, true, out.reason);
  });

  check("qa8_qa2_success_contractually_allowed", () => {
    // Contract: if QA2 somehow succeeded on a qa8 dispatch, matrix may still run.
    const out = elig(yaml, { qaPhase: "qa8", qa2Result: "success" });
    assert.equal(out.eligible, true, out.reason);
  });

  check("qa8_qa2_failure_denied", () => {
    const out = elig(yaml, { qaPhase: "qa8", qa2Result: "failure" });
    assert.equal(out.eligible, false);
  });

  check("qa8_qa2_cancelled_denied", () => {
    const out = elig(yaml, { qaPhase: "qa8", qa2Result: "cancelled" });
    assert.equal(out.eligible, false);
  });

  check("qa8_unexpected_needs_denied", () => {
    const out = elig(yaml, { qaPhase: "qa8", qa2Result: "unknown" });
    assert.equal(out.eligible, false);
    assert.equal(out.reason, "unexpected_needs_result");
  });

  check("qa8_workflow_cancelled_denied", () => {
    const out = elig(yaml, { qaPhase: "qa8", qa2Result: "skipped", cancelled: true });
    assert.equal(out.eligible, false);
  });

  check("qa8_materialized_matrix_is_exactly_qa8", () => {
    assert.deepEqual(matrixSuitesForPhase(yaml, "qa8"), ["QA8"]);
    const r = dispatchRouting(yaml, "qa8");
    assert.equal(r.jobs["qa1-deterministic"], false);
    assert.equal(r.jobs["qa2-synthetic-personas"], false);
    assert.equal(r.jobs["qa-matrix"], true);
    assert.equal(r.runs_qa7, false);
    assert.equal(r.runs_qa8_adversarial, false);
    assert.deepEqual(r.matrix_suites, ["QA8"]);
  });

  check("qa8_does_not_select_qa3_qa4_qa5_qa6", () => {
    const r = dispatchRouting(yaml, "qa8");
    for (const suite of ["QA3", "QA4", "QA5", "QA6"]) {
      assert.equal(r.matrix_suites.includes(suite), false, suite);
    }
  });

  check("qa6_keeps_qa1_qa6_chain_and_requires_qa2_success", () => {
    const r = dispatchRouting(yaml, "qa6");
    assert.equal(r.jobs["qa1-deterministic"], true);
    assert.equal(r.jobs["qa2-synthetic-personas"], true);
    assert.equal(r.jobs["qa-matrix"], true);
    assert.deepEqual(r.matrix_suites, ["QA3", "QA4", "QA5", "QA6"]);
    assert.equal(elig(yaml, { qaPhase: "qa6", qa2Result: "success" }).eligible, true);
    assert.equal(elig(yaml, { qaPhase: "qa6", qa2Result: "skipped" }).eligible, false);
    assert.equal(elig(yaml, { qaPhase: "qa6", qa2Result: "failure" }).eligible, false);
    assert.equal(elig(yaml, { qaPhase: "qa6", qa2Result: "cancelled" }).eligible, false);
  });

  check("qa3_qa4_qa5_full_keep_prior_meaning", () => {
    const expected = ["QA3", "QA4", "QA5", "QA6", "QA8"];
    for (const phase of ["qa3", "qa4", "qa5", "full"]) {
      const r = dispatchRouting(yaml, phase);
      assert.deepEqual(r.matrix_suites, expected, phase);
      assert.equal(elig(yaml, { qaPhase: phase, qa2Result: "success" }).eligible, true, phase);
      assert.equal(elig(yaml, { qaPhase: phase, qa2Result: "failure" }).eligible, false, `${phase} failure`);
      assert.equal(elig(yaml, { qaPhase: phase, qa2Result: "cancelled" }).eligible, false, `${phase} cancelled`);
      assert.equal(elig(yaml, { qaPhase: phase, qa2Result: "skipped" }).eligible, false, `${phase} skipped`);
    }
    const full = dispatchRouting(yaml, "full");
    assert.equal(full.runs_qa7, true);
    assert.equal(full.runs_qa8_adversarial, true);
  });

  check("pull_request_push_do_not_launder_predecessor_failure", () => {
    for (const eventName of ["pull_request", "push"]) {
      assert.equal(
        elig(yaml, { eventName, qaPhase: undefined, qa2Result: "success" }).eligible,
        true,
        eventName,
      );
      assert.equal(
        elig(yaml, { eventName, qaPhase: undefined, qa2Result: "failure" }).eligible,
        false,
        `${eventName} failure`,
      );
      assert.equal(
        elig(yaml, { eventName, qaPhase: undefined, qa2Result: "cancelled" }).eligible,
        false,
        `${eventName} cancelled`,
      );
      assert.equal(
        elig(yaml, { eventName, qaPhase: undefined, qa2Result: "skipped" }).eligible,
        false,
        `${eventName} skipped`,
      );
    }
  });

  check("aggregator_always_is_not_qa8_formal", () => {
    const agg = extractJobIf(yaml, "aggregator");
    assert.equal(agg, "always()");
    assert.equal(evalDispatchIf(agg, "qa8"), true);
    assert.equal(evalDispatchIf(agg, "qa7"), true);
    const matrix = extractJobIf(yaml, "qa-matrix");
    assert.notEqual(matrix, "always()");
    assert.equal(evalDispatchIf(matrix, "qa8"), true);
    assert.equal(evalDispatchIf(matrix, "qa7"), false);
    assert.equal(evalDispatchIf(matrix, "qa8-adversarial"), false);
    assert.equal(dispatchRouting(yaml, "qa7").jobs["qa-matrix"], false);
  });

  check("yaml_structure_keeps_qa2_needs", () => {
    const start = yaml.search(/^  qa-matrix:\s*$/m);
    const rest = yaml.slice(start);
    const next = rest.slice(1).search(/^  [a-zA-Z][a-zA-Z0-9-]*:\s*$/m);
    const body = next >= 0 ? rest.slice(0, next + 1) : rest;
    assert.match(body, /needs:\s*\[qa2-synthetic-personas\]/);
    assert.match(body, /suite:\s*\[QA3, QA4, QA5, QA6, QA8\]/);
  });

  if (fails.length) {
    console.error("[selftest-qa8-job-eligibility] FAIL");
    for (const f of fails) console.error(" -", f);
    throw new Error(fails.join("; "));
  }
  console.log("[selftest-qa8-job-eligibility] PASS");
  return { ok: true };
}

if (require.main === module) {
  run();
}

module.exports = { run };

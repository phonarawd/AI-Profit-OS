/**
 * QA1–QA9 공식 경로 정적 계약 selftest.
 * Actions dispatch · 실제 QA 재실행 · evidence publication 없음.
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./lib/hash-scope.cjs");
const {
  dispatchRouting,
  matrixSuitesForPhase,
  parseMatrixSuiteList,
  parseExcludeSuiteRules,
  excludedSuitesForPhase,
  qa4CaseHasClockHarness,
  qa4UploadIncludesClockHarness,
  qa8CasePreservedForFull,
} = require("./lib/qa-phase-routing.cjs");
const {
  evaluatePublicationInheritance,
  isInheritanceAllowed,
  DENY,
  ALLOW,
  SAME_SHA,
} = require("./lib/publication-sha-inheritance.cjs");

function readWf() {
  return fs.readFileSync(path.join(ROOT, ".github/workflows/engine-acceptance.yml"), "utf8");
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

  console.log("[selftest-qa-pipeline-contract] start");
  const yaml = readWf();

  check("qa6_runs_qa1_to_qa6_only", () => {
    const r = dispatchRouting(yaml, "qa6");
    assert.equal(r.jobs["qa1-deterministic"], true);
    assert.equal(r.jobs["qa2-synthetic-personas"], true);
    assert.equal(r.jobs["qa-matrix"], true);
    assert.deepEqual(r.matrix_suites, ["QA3", "QA4", "QA5", "QA6"]);
    assert.equal(r.runs_qa8_matrix, false);
    assert.equal(r.runs_qa7, false);
    assert.equal(r.runs_qa8_adversarial, false);
    assert.equal(r.runs_qa9, false);
    assert.equal(r.jobs["qa5-fault"], false);
    assert.equal(r.jobs["qa6-measure"], false);
  });

  check("qa6_does_not_run_qa7_qa8_qa9", () => {
    const r = dispatchRouting(yaml, "qa6");
    assert.equal(r.runs_qa7, false);
    assert.equal(r.runs_qa8_matrix, false);
    assert.equal(r.runs_qa8_adversarial, false);
    assert.equal(r.runs_qa9, false);
    assert.equal(yaml.includes("run-qa9.cjs"), false);
  });

  check("qa6_qa8_unrun_does_not_fail_whole_run", () => {
    assert.match(yaml, /inputs\.qa_phase == 'qa6' && 'QA8' \|\| '___never___'/);
    const r = dispatchRouting(yaml, "qa6");
    assert.equal(r.runs_qa8_matrix, false);
    assert.ok(r.jobs["qa-matrix"]);
  });

  check("qa4_clock_harness_generated_and_uploaded", () => {
    assert.equal(qa4CaseHasClockHarness(yaml), true);
    assert.equal(qa4UploadIncludesClockHarness(yaml), true);
    assert.match(yaml, /qa4-clock-harness\.v1\.json/);
    assert.match(yaml, /run-qa4-clock\.cjs/);
  });

  check("qa4_missing_harness_fail_closed", () => {
    const m = yaml.match(/QA4\)\s*\n([\s\S]*?)\n\s*;;/);
    assert.ok(m);
    assert.match(m[1], /test -f \/tmp\/aipo-harness\/qa4-clock\/qa4-clock-harness\.v1\.json/);
  });

  check("full_preserves_qa8_matrix_and_adversarial", () => {
    const r = dispatchRouting(yaml, "full");
    assert.equal(r.runs_qa8_matrix, true);
    assert.equal(r.runs_qa8_adversarial, true);
    assert.equal(r.runs_qa7, true);
    assert.ok(r.matrix_suites.includes("QA8"));
    assert.equal(qa8CasePreservedForFull(yaml), true);
  });

  check("qa8_phase_matrix_is_exactly_qa8", () => {
    const r = dispatchRouting(yaml, "qa8");
    assert.equal(r.jobs["qa-matrix"], true);
    assert.deepEqual(r.matrix_suites, ["QA8"]);
    assert.equal(r.runs_qa8_matrix, true);
    assert.equal(r.runs_qa7, false);
    assert.equal(r.runs_qa8_adversarial, false);
    assert.equal(r.jobs["qa1-deterministic"], false);
    assert.equal(r.jobs["qa2-synthetic-personas"], false);
  });

  check("qa8_phase_excludes_qa3_qa4_qa5_qa6_each", () => {
    const r = dispatchRouting(yaml, "qa8");
    assert.equal(r.matrix_suites.includes("QA3"), false);
    assert.equal(r.matrix_suites.includes("QA4"), false);
    assert.equal(r.matrix_suites.includes("QA5"), false);
    assert.equal(r.matrix_suites.includes("QA6"), false);
    const excluded = excludedSuitesForPhase(yaml, "qa8");
    assert.deepEqual(excluded.slice().sort(), ["QA3", "QA4", "QA5", "QA6"]);
  });

  check("qa3_qa4_qa5_full_matrix_unchanged", () => {
    const expected = ["QA3", "QA4", "QA5", "QA6", "QA8"];
    for (const phase of ["qa3", "qa4", "qa5", "full"]) {
      const r = dispatchRouting(yaml, phase);
      assert.equal(r.jobs["qa-matrix"], true, `${phase} must run qa-matrix`);
      assert.deepEqual(r.matrix_suites, expected, `${phase} matrix drifted`);
    }
    const full = dispatchRouting(yaml, "full");
    assert.equal(full.runs_qa8_adversarial, true);
    assert.equal(full.runs_qa7, true);
  });

  check("phase_routing_evaluates_yaml_excludes_not_hardcoded", () => {
    const jobIf =
      "github.event_name != 'workflow_dispatch' || inputs.qa_phase == 'qa6' || inputs.qa_phase == 'qa8' || inputs.qa_phase == 'full'";
    const before = [
      "  qa-matrix:",
      `    if: \${{ ${jobIf} }}`,
      "    strategy:",
      "      fail-fast: false",
      "      matrix:",
      "        suite: [QA3, QA4, QA5, QA6, QA8]",
      "        exclude:",
      "          - suite: ${{ github.event_name == 'workflow_dispatch' && inputs.qa_phase == 'qa6' && 'QA8' || '___never___' }}",
      "",
    ].join("\n");
    assert.deepEqual(parseMatrixSuiteList(before), ["QA3", "QA4", "QA5", "QA6", "QA8"]);
    assert.deepEqual(parseExcludeSuiteRules(before), [{ phase: "qa6", suite: "QA8" }]);
    assert.deepEqual(matrixSuitesForPhase(before, "qa8"), ["QA3", "QA4", "QA5", "QA6", "QA8"]);
    assert.deepEqual(matrixSuitesForPhase(before, "qa6"), ["QA3", "QA4", "QA5", "QA6"]);
    const after = `${before}          - suite: \${{ github.event_name == 'workflow_dispatch' && inputs.qa_phase == 'qa8' && 'QA3' || '___never___' }}\n          - suite: \${{ github.event_name == 'workflow_dispatch' && inputs.qa_phase == 'qa8' && 'QA4' || '___never___' }}\n          - suite: \${{ github.event_name == 'workflow_dispatch' && inputs.qa_phase == 'qa8' && 'QA5' || '___never___' }}\n          - suite: \${{ github.event_name == 'workflow_dispatch' && inputs.qa_phase == 'qa8' && 'QA6' || '___never___' }}\n`;
    assert.deepEqual(matrixSuitesForPhase(after, "qa8"), ["QA8"]);
    assert.deepEqual(matrixSuitesForPhase(after, "qa6"), ["QA3", "QA4", "QA5", "QA6"]);
    assert.deepEqual(matrixSuitesForPhase(after, "full"), ["QA3", "QA4", "QA5", "QA6", "QA8"]);
    assert.equal(matrixSuitesForPhase(after, "qa8").includes("QA3"), false);
    assert.equal(matrixSuitesForPhase(after, "qa6").includes("QA8"), false);
  });

  check("qa8_adversarial_phase_isolated", () => {
    const r = dispatchRouting(yaml, "qa8-adversarial");
    assert.equal(r.runs_qa8_adversarial, true);
    assert.equal(r.jobs["qa-matrix"], false);
    assert.equal(r.runs_qa7, false);
  });

  check("qa7_phase_does_not_run_qa8", () => {
    const r = dispatchRouting(yaml, "qa7");
    assert.equal(r.runs_qa7, true);
    assert.equal(r.runs_qa8_matrix, false);
    assert.equal(r.jobs["qa-matrix"], false);
  });

  check("qa7_publisher_lock_preserved", () => {
    const src = fs.readFileSync(path.join(ROOT, "tooling/engine-acceptance/publish-qa7-formal.cjs"), "utf8");
    assert.match(src, /QA4-QA6 are not COMPLETE for the current baseline/);
    assert.match(src, /ENGINE_ACCEPTED_FOR_UI/);
    assert.match(src, /formal_actions_evidence/);
    assert.doesNotMatch(src, /publishQa1Qa6Checkpoint/);
  });

  check("qa8_stale_pre_qa7_invariant_preserved", () => {
    const src = fs.readFileSync(path.join(ROOT, "tooling/engine-acceptance/lib/product-rebase.cjs"), "utf8");
    assert.match(src, /STALE_FOR_CURRENT_EPOCH/);
    assert.match(src, /must not promote current QA8 to COMPLETE/);
    assert.match(src, /verifyPreQa7Qa8Stale/);
  });

  check("qa8_requires_qa7_formal_before_official_run", () => {
    const src = fs.readFileSync(path.join(ROOT, "tooling/engine-acceptance/run-qa8.cjs"), "utf8");
    assert.match(src, /QA8 official run requires current-epoch QA7 formal COMPLETE/);
    assert.match(src, /AIPO_QA8_REQUIRES_QA7_FORMAL/);
  });

  check("qa9_requires_current_qa8_complete", () => {
    const src = fs.readFileSync(path.join(ROOT, "tooling/engine-acceptance/run-qa9.cjs"), "utf8");
    assert.match(src, /QA9 aggregation requires current-epoch QA8 COMPLETE/);
    assert.match(src, /AIPO_QA9_REQUIRES_QA8_COMPLETE/);
  });

  check("engine_accepted_blocked_before_qa9", () => {
    const src = fs.readFileSync(path.join(ROOT, "tooling/verify/engine-acceptance.cjs"), "utf8");
    assert.match(src, /must not issue ENGINE_ACCEPTED_FOR_UI before current-epoch QA9 aggregation/);
    assert.match(src, /isEphemeralOfficialQa8Rewrite/);
  });

  check("qa9_stale_aggregation_is_canonical_before_qa9_runner", () => {
    const src = fs.readFileSync(path.join(ROOT, "tooling/verify/engine-acceptance.cjs"), "utf8");
    const lib = fs.readFileSync(
      path.join(ROOT, "tooling/engine-acceptance/lib/qa9-stale-aggregation.cjs"),
      "utf8",
    );
    assert.match(src, /assertQa9StaleAggregation/);
    assert.doesNotMatch(src, /post-QA7 checkpoint requires current QA9 NOT_STARTED/);
    assert.doesNotMatch(src, /post-QA8 checkpoint requires QA9 NOT_STARTED with null run_id\/checksum/);
    assert.match(lib, /STALE_AGGREGATION_FOR_CURRENT_EPOCH/);
    assert.match(lib, /NOT_STARTED is not canonical/);
  });

  check("phase_aware_qa8_verifier_uses_post_qa7_head", () => {
    const src = fs.readFileSync(path.join(ROOT, "tooling/verify/engine-acceptance.cjs"), "utf8");
    assert.match(src, /headObj\.qa_phase !== "QA-7"/);
    assert.match(src, /QA8_SECURITY_PRIVACY/);
  });

  check("official_checkpoint_classified_before_ephemeral", () => {
    const src = fs.readFileSync(path.join(ROOT, "tooling/verify/engine-acceptance.cjs"), "utf8");
    const shapeIdx = src.indexOf("hasOfficialQa1Qa6CheckpointShape(evidence)");
    const ephCall = src.indexOf("isEphemeralQa6Rewrite(evidence, qa7Peek)");
    assert.ok(shapeIdx > 0 && ephCall > shapeIdx, "official shape must be computed before ephemeral QA6 rewrite");
    assert.match(src, /if \(hasOfficialQa1Qa6CheckpointShape\(evidenceObj\)\) return false/);
  });

  check("inheritance_same_sha_allowed", () => {
    const sha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const out = evaluatePublicationInheritance({
      subjectSha: sha,
      currentHead: sha,
      baselineId: "b1",
      liveBaselineId: "b1",
      promptHash: "p",
      livePromptHash: "p",
      evalHash: "e",
      liveEvalHash: "e",
      workflowHash: "w",
      liveWorkflowHash: "w",
      isAncestor: () => false,
    });
    assert.equal(out.status, SAME_SHA);
    assert.equal(isInheritanceAllowed(out), true);
  });

  check("inheritance_ancestor_same_bindings_allowed", () => {
    const out = evaluatePublicationInheritance({
      subjectSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      currentHead: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      baselineId: "b1",
      liveBaselineId: "b1",
      promptHash: "p",
      livePromptHash: "p",
      evalHash: "e",
      liveEvalHash: "e",
      workflowHash: "w",
      liveWorkflowHash: "w",
      isAncestor: (a, d) => a.startsWith("aa") && d.startsWith("bb"),
    });
    assert.equal(out.status, ALLOW);
    assert.equal(isInheritanceAllowed(out), true);
  });

  check("inheritance_wrong_ancestor_denied", () => {
    const out = evaluatePublicationInheritance({
      subjectSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      currentHead: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      baselineId: "b1",
      liveBaselineId: "b1",
      promptHash: "p",
      livePromptHash: "p",
      evalHash: "e",
      liveEvalHash: "e",
      workflowHash: "w",
      liveWorkflowHash: "w",
      isAncestor: () => false,
    });
    assert.equal(out.status, DENY);
    assert.equal(out.code, "NOT_ANCESTOR");
    assert.equal(isInheritanceAllowed(out), false);
  });

  check("inheritance_baseline_mismatch_denied", () => {
    const sha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const out = evaluatePublicationInheritance({
      subjectSha: sha,
      currentHead: sha,
      baselineId: "old",
      liveBaselineId: "new",
      promptHash: "p",
      livePromptHash: "p",
      evalHash: "e",
      liveEvalHash: "e",
      workflowHash: "w",
      liveWorkflowHash: "w",
    });
    assert.equal(out.status, DENY);
    assert.equal(out.code, "BINDING");
  });

  check("inheritance_hash_drift_denied", () => {
    const sha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const out = evaluatePublicationInheritance({
      subjectSha: sha,
      currentHead: sha,
      baselineId: "b1",
      liveBaselineId: "b1",
      promptHash: "p",
      livePromptHash: "p",
      evalHash: "e",
      liveEvalHash: "e",
      workflowHash: "old",
      liveWorkflowHash: "new",
    });
    assert.equal(out.status, DENY);
    assert.match(out.reasons.join(" "), /workflow/);
  });

  check("rel502_qa8_amend_once_not_rewritten_to_always_succeed", () => {
    const once = fs.readFileSync(
      path.join(ROOT, ".github/workflows/rel-502-qa8-canonical-amend-once.yml"),
      "utf8",
    );
    assert.match(once, /release\/auth-wallet-rel502-v1-20260828/);
    assert.match(once, /chore\(rel-502\): start canonical QA8 L7 repair/);
    assert.doesNotMatch(once, /if: true/);
  });

  if (fails.length) {
    console.error("[selftest-qa-pipeline-contract] FAIL");
    for (const f of fails) console.error(" -", f);
    throw new Error(fails.join("; "));
  }
  console.log("[selftest-qa-pipeline-contract] PASS");
  return { ok: true };
}

if (require.main === module) {
  run();
}

module.exports = { run };

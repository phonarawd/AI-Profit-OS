/**
 * Fixture selftest for ENGINE_ACCEPTANCE_REBASE_EVAL_REVIEW_V1
 * live baseline / eval / product-only rebase 의미를 변경하지 않는다.
 */
"use strict";

const {
  DECISION_ID,
  PRODUCT_ONLY_DECISION_ID,
  REVIEW_SCHEMA,
  SCHEMA,
  emptyLedger,
  validateReviewEvidence,
  validateEvolutionEntry,
  validateLedgerPolicy,
  evaluateEvalReviewInvariants,
  assertEvalReviewEpochBound,
  predecessorSnapshotUnchanged,
  productOnlyStillRejectsEvalDrift,
  stampEvalReviewPolicy,
  latestEvolution,
} = require("./lib/eval-review-rebase.cjs");
const {
  DECISION_ID: PRODUCT_DECISION,
  INVALIDATED_SUITES,
  REQUIRED_RERUN_SUITES,
  STALE_AGGREGATION_PHASES,
  CURRENT_REBASE_POLICY_ID,
  evaluateRebaseInvariants,
  validateRebaseEntry,
} = require("./lib/product-rebase.cjs");
const { SEMANTIC, diffEvalSnapshots } = require("./lib/eval-dataset-diff.cjs");

function makeProductAck() {
  return {
    by: "Human/PO",
    at: "2026-08-13T00:00:00.000Z",
    statement:
      "ACK APPROVED ENGINE_ACCEPTANCE_REBASE_V1: new epoch from predecessor ea-baseline-old; do not rewrite hashes inside the old baseline.",
  };
}

function makeProductEntry(over = {}) {
  return {
    decision_id: PRODUCT_DECISION,
    rebase_id: "ea-rebase-fixture-v2",
    rebase_policy_version: CURRENT_REBASE_POLICY_ID,
    human_po_ack: makeProductAck(),
    predecessor_baseline_id: "ea-baseline-old",
    new_baseline_id: "ea-baseline-new",
    reason: "fixture product rebase",
    product_commit: "a".repeat(40),
    changed_protected_paths: ["services/api-nest/src/ai/coach.orchestrator.ts"],
    changed_nonprotected_support_paths: ["services/ai-platform/src/index.d.ts"],
    old_prompt_hash: "11".repeat(32),
    new_prompt_hash: "22".repeat(32),
    old_protected_manifest_hash: "33".repeat(32),
    new_protected_manifest_hash: "44".repeat(32),
    eval_dataset_hash: "55".repeat(32),
    acceptance_workflow_hash: "66".repeat(32),
    invalidated_suites: INVALIDATED_SUITES.slice(),
    required_rerun_suites: REQUIRED_RERUN_SUITES.slice(),
    stale_aggregation_phases: STALE_AGGREGATION_PHASES.slice(),
    timestamp: "2026-08-13T00:00:00.000Z",
    commit_sha_or_pending: "pending:fixture",
    qa7_complete: false,
    qa8_complete: false,
    qa9_complete: false,
    qa9_verdict_issued: false,
    ...over,
  };
}

function predBaseline() {
  return {
    id: "ea-baseline-old",
    commit_sha: "b".repeat(40),
    prompt_hash: "11".repeat(32),
    eval_dataset_hash: "55".repeat(32),
    acceptance_workflow_hash: "66".repeat(32),
    protected_scope_manifest: {
      aggregate: "33".repeat(32),
      entries: [{ path: "eval/p_fact.jsonl", sha256: "bb".repeat(32) }],
    },
  };
}

function makeReview(over = {}) {
  return {
    schema: REVIEW_SCHEMA,
    review_id: "ea-evalrev-fixture",
    decision_id: DECISION_ID,
    predecessor_acceptance_epoch: "ea-baseline-old",
    predecessor_product_commit: "b".repeat(40),
    new_product_commit: "c".repeat(40),
    old_eval_dataset_hash: "55".repeat(32),
    new_eval_dataset_hash: "99".repeat(32),
    changed_eval_files: [
      {
        path: "eval/s_refuse.jsonl",
        old_case_count: 1,
        new_case_count: 2,
        added: ["s_extra"],
        removed: [],
        modified: [],
        semantic_effect: "STRICTER",
      },
    ],
    reason: "fixture: additive S refuse",
    coverage_effect: "STRICTER",
    p_g_s_ownership_impact: "S coverage expanded; owner unchanged",
    money_authority_impact: "none",
    tool_authority_impact: "none",
    prompt_injection_coverage_impact: "none",
    refusal_coverage_impact: "stricter",
    numeric_grounding_impact: "none",
    acceptance_workflow_hash: "66".repeat(32),
    schema_migration_hash: { predecessor: "aa", live: "aa", status: "MATCH" },
    removed_safety_cases: 0,
    weakened_assertions: 0,
    disabled_eval_files: 0,
    skipped_required_qa: 0,
    hash_check_bypass: 0,
    product_only_rebase_weakened: 0,
    human_po_ack: null,
    founder_approval_used: false,
    ...over,
  };
}

function makeEvalDiff() {
  const oldMap = new Map([
    ["eval/s_refuse.jsonl", "{\"id\":\"s_withdraw\",\"expectPath\":\"refuse_s\"}\n"],
  ]);
  const newMap = new Map([
    [
      "eval/s_refuse.jsonl",
      "{\"id\":\"s_withdraw\",\"expectPath\":\"refuse_s\"}\n{\"id\":\"s_extra\",\"expectPath\":\"refuse_s\"}\n",
    ],
  ]);
  return diffEvalSnapshots(oldMap, newMap);
}

function makeEvalEntry(over = {}) {
  const entry = {
    decision_id: DECISION_ID,
    rebase_id: "ea-evalrev-fixture",
    predecessor_baseline_id: "ea-baseline-old",
    new_baseline_id: "ea-baseline-eval",
    reason: "fixture eval review",
    product_commit: "c".repeat(40),
    predecessor_product_commit: "b".repeat(40),
    old_eval_dataset_hash: "55".repeat(32),
    new_eval_dataset_hash: "99".repeat(32),
    changed_eval_files: makeReview().changed_eval_files,
    coverage_effect: "STRICTER",
    review_id: "ea-evalrev-fixture",
    acceptance_workflow_hash: "66".repeat(32),
    old_prompt_hash: "11".repeat(32),
    new_prompt_hash: "22".repeat(32),
    old_protected_manifest_hash: "33".repeat(32),
    new_protected_manifest_hash: "44".repeat(32),
    timestamp: "2026-08-22T00:00:00.000Z",
    commit_sha_or_pending: "pending:eval-fixture",
    ...over,
  };
  return stampEvalReviewPolicy(entry);
}

function evalCtx(over = {}) {
  return {
    predecessorBaseline: predBaseline(),
    liveEvalHash: "99".repeat(32),
    liveWorkflowHash: "66".repeat(32),
    livePromptHash: "22".repeat(32),
    liveManifestAggregate: "44".repeat(32),
    liveManifestEntries: [{ path: "eval/p_fact.jsonl", sha256: "cc".repeat(32) }],
    predecessorManifestEntries: predBaseline().protected_scope_manifest.entries,
    productCommit: "c".repeat(40),
    predecessorProductCommit: "b".repeat(40),
    review: makeReview(),
    evalDiff: makeEvalDiff(),
    skipGit: true,
    ...over,
  };
}

function run() {
  const fails = [];
  const pass = (name) => console.log(`  PASS ${name}`);
  const check = (name, cond, detail) => {
    if (cond) pass(name);
    else {
      fails.push(`${name}: ${detail || "failed"}`);
      console.error(`  FAIL ${name}: ${detail || "failed"}`);
    }
  };

  console.log("[selftest-eval-review-rebase] start");

  // 1) product-only rebase still rejects eval drift
  {
    const f = [];
    evaluateRebaseInvariants(
      makeProductEntry(),
      {
        predecessorBaseline: predBaseline(),
        liveEvalHash: "99".repeat(32),
        livePromptHash: "22".repeat(32),
        liveWorkflowHash: "66".repeat(32),
        liveManifestAggregate: "44".repeat(32),
        liveManifestEntries: predBaseline().protected_scope_manifest.entries,
        predecessorManifestEntries: predBaseline().protected_scope_manifest.entries,
        fileExists: () => false,
      },
      f,
    );
    check(
      "1_product_only_rejects_eval_drift",
      f.some((x) => /eval dataset drift/i.test(x) || /eval_dataset_hash must remain MATCH/i.test(x)),
      f.join("; "),
    );
  }

  // 2) product-only rebase still accepts eligible product-only drift (eval MATCH)
  {
    const f = [];
    evaluateRebaseInvariants(
      makeProductEntry(),
      {
        predecessorBaseline: predBaseline(),
        liveEvalHash: "55".repeat(32),
        livePromptHash: "22".repeat(32),
        liveWorkflowHash: "66".repeat(32),
        liveManifestAggregate: "44".repeat(32),
        liveManifestEntries: predBaseline().protected_scope_manifest.entries,
        predecessorManifestEntries: predBaseline().protected_scope_manifest.entries,
        fileExists: () => false,
      },
      f,
    );
    check(
      "2_product_only_accepts_eval_match",
      f.length === 0,
      f.join("; "),
    );
    const shape = [];
    validateRebaseEntry(makeProductEntry(), null, shape, { requireCurrentPolicy: true });
    check("2b_product_only_entry_shape_unchanged", shape.length === 0, shape.join("; "));
    check(
      "2c_product_only_decision_id_unchanged",
      PRODUCT_DECISION === PRODUCT_ONLY_DECISION_ID && PRODUCT_DECISION === "ENGINE_ACCEPTANCE_REBASE_V1",
      PRODUCT_DECISION,
    );
  }

  // 3) new path rejects unreviewed eval drift
  {
    const f = [];
    evaluateEvalReviewInvariants(makeEvalEntry(), evalCtx({ review: null, evalDiff: null }), f);
    check(
      "3_unreviewed_eval_drift_rejected",
      f.some((x) => /unreviewed eval/i.test(x)),
      f.join("; "),
    );
  }

  // 4) new path records old/new eval hashes
  {
    const entry = makeEvalEntry();
    check(
      "4_records_old_new_eval_hashes",
      entry.old_eval_dataset_hash === "55".repeat(32) &&
        entry.new_eval_dataset_hash === "99".repeat(32) &&
        entry.old_eval_dataset_hash !== entry.new_eval_dataset_hash,
    );
    const f = [];
    validateEvolutionEntry(
      makeEvalEntry({ old_eval_dataset_hash: "55".repeat(32), new_eval_dataset_hash: "55".repeat(32) }),
      null,
      f,
    );
    check(
      "4b_same_eval_hashes_rejected",
      f.some((x) => /old\/new eval_dataset_hash must differ/i.test(x)),
      f.join("; "),
    );
  }

  // 5) new path records exact changed eval files
  {
    const f = [];
    evaluateEvalReviewInvariants(makeEvalEntry(), evalCtx(), f);
    check("5_valid_reviewed_eval_path", f.length === 0, f.join("; "));
    const omitted = [];
    evaluateEvalReviewInvariants(
      makeEvalEntry(),
      evalCtx({
        review: makeReview({ changed_eval_files: [] }),
      }),
      omitted,
    );
    check(
      "5b_omitted_changed_files_rejected",
      omitted.some((x) => /changed_eval_files/i.test(x) || /omitted changed eval file/i.test(x)),
      omitted.join("; "),
    );
  }

  // 6) historical epoch immutable
  {
    const pred = predBaseline();
    const before = JSON.parse(JSON.stringify(pred));
    const entry = makeEvalEntry();
    const f = [];
    evaluateEvalReviewInvariants(entry, evalCtx(), f);
    check("6_valid_invariants_do_not_mutate_pred", predecessorSnapshotUnchanged(before, pred) && f.length === 0, f.join("; "));
    check("6b_new_epoch_id_differs", entry.new_baseline_id !== pred.id);
    const bindFails = [];
    assertEvalReviewEpochBound(
      { id: "ea-baseline-eval", eval_dataset_hash: "99".repeat(32) },
      { evolutions: [entry] },
      { baseline_id: "ea-baseline-old", frozen_at_qa0: { eval_dataset_hash: "55".repeat(32) } },
      bindFails,
    );
    check("6c_eval_tip_binds_new_epoch", bindFails.length === 0, bindFails.join("; "));
    const wash = [];
    assertEvalReviewEpochBound(
      { id: "ea-baseline-old", eval_dataset_hash: "99".repeat(32) },
      { evolutions: [] },
      { baseline_id: "ea-baseline-old", frozen_at_qa0: { eval_dataset_hash: "55".repeat(32) } },
      wash,
    );
    check(
      "6d_in_place_eval_rewrite_rejected",
      wash.some((x) => /in-place rewrite forbidden/i.test(x) || /without eval-review/i.test(x)),
      wash.join("; "),
    );
  }

  // 7) no safety-test weakening
  {
    const oldMap = new Map([
      ["eval/s_refuse.jsonl", "{\"id\":\"s_withdraw\",\"expectPath\":\"refuse_s\",\"forbidExecute\":true}\n"],
    ]);
    const weaker = new Map([
      ["eval/s_refuse.jsonl", "{\"id\":\"s_withdraw\",\"expectPath\":\"refuse_s\",\"forbidExecute\":false}\n"],
    ]);
    const diff = diffEvalSnapshots(oldMap, weaker);
    check("7_weakened_assertion_detected", diff.totals.weakened_assertions === 1 && diff.coverage_effect === SEMANTIC.WEAKER);
    const removed = diffEvalSnapshots(
      oldMap,
      new Map([["eval/s_refuse.jsonl", ""]]),
    );
    check(
      "7b_removed_safety_case_detected",
      removed.totals.removed_safety_cases === 1 && removed.safety_coverage_weakened === true,
    );
    const f = [];
    evaluateEvalReviewInvariants(
      makeEvalEntry(),
      evalCtx({
        evalDiff: diff,
        review: makeReview({
          changed_eval_files: [
            {
              path: "eval/s_refuse.jsonl",
              old_case_count: 1,
              new_case_count: 1,
              added: [],
              removed: [],
              modified: ["s_withdraw"],
              semantic_effect: "WEAKER",
            },
          ],
          coverage_effect: "WEAKER",
          weakened_assertions: 1,
        }),
      }),
      f,
    );
    check(
      "7c_weakened_eval_path_rejected",
      f.some((x) => /WEAKENED_ASSERTIONS/i.test(x) || /WEAKER/i.test(x)),
      f.join("; "),
    );
  }

  // 8) malformed review evidence rejected
  {
    const f = [];
    validateReviewEvidence({ schema: "nope" }, f);
    check("8_malformed_review_rejected", f.length > 0, f.join("; "));
    const f2 = [];
    validateReviewEvidence(null, f2);
    check("8b_missing_review_rejected", f2.some((x) => /required/i.test(x)), f2.join("; "));
  }

  // 9) wrong predecessor rejected
  {
    const f = [];
    evaluateEvalReviewInvariants(
      makeEvalEntry({ predecessor_baseline_id: "ea-baseline-wrong" }),
      evalCtx({ review: makeReview({ predecessor_acceptance_epoch: "ea-baseline-wrong" }) }),
      f,
    );
    check(
      "9_wrong_predecessor_rejected",
      f.some((x) => /wrong predecessor/i.test(x)),
      f.join("; "),
    );
  }

  // 10) stale product commit rejected
  {
    const f = [];
    evaluateEvalReviewInvariants(
      makeEvalEntry({ product_commit: "b".repeat(40) }),
      evalCtx({ productCommit: "b".repeat(40) }),
      f,
    );
    check(
      "10_stale_product_commit_rejected",
      f.some((x) => /stale product commit/i.test(x)),
      f.join("; "),
    );
    const f2 = [];
    evaluateEvalReviewInvariants(
      makeEvalEntry({ product_commit: "not-a-sha" }),
      evalCtx({ productCommit: "not-a-sha" }),
      f2,
    );
    check(
      "10b_malformed_product_commit_rejected",
      f2.some((x) => /40-char hex/i.test(x)),
      f2.join("; "),
    );
  }

  // 11) workflow/schema integrity preserved
  {
    const f = [];
    evaluateEvalReviewInvariants(
      makeEvalEntry(),
      evalCtx({ liveWorkflowHash: "77".repeat(32) }),
      f,
    );
    check(
      "11_silent_workflow_change_rejected",
      f.some((x) => /workflow hash silently changed/i.test(x)),
      f.join("; "),
    );
    const ledgerFails = [];
    const ledger = emptyLedger();
    validateLedgerPolicy(ledger, ledgerFails);
    check("11b_empty_eval_ledger_valid", ledgerFails.length === 0 && ledger.schema === SCHEMA, ledgerFails.join("; "));
    check(
      "11c_product_only_policy_still_forbidden",
      ledger.policies.eval_dataset_mutation_during_product_rebase === "FORBIDDEN" &&
        ledger.policies.product_only_rebase_weakened === "FORBIDDEN" &&
        ledger.policies.hash_check_bypass === "FORBIDDEN",
    );
    check("11d_latest_empty", latestEvolution(ledger) === null);
    const cross = [];
    productOnlyStillRejectsEvalDrift(
      makeProductEntry(),
      {
        predecessorBaseline: predBaseline(),
        liveEvalHash: "99".repeat(32),
        livePromptHash: "22".repeat(32),
        liveWorkflowHash: "66".repeat(32),
        liveManifestAggregate: "44".repeat(32),
        liveManifestEntries: predBaseline().protected_scope_manifest.entries,
        predecessorManifestEntries: predBaseline().protected_scope_manifest.entries,
        fileExists: () => false,
      },
      cross,
    );
    check("11e_cross_check_product_only_unweakened", cross.length === 0, cross.join("; "));
  }

  if (fails.length) {
    console.error("[selftest-eval-review-rebase] FAIL");
    for (const f of fails) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("[selftest-eval-review-rebase] PASS");
  console.log(`  DECISION_ID=${DECISION_ID}`);
  console.log(`  PRODUCT_ONLY=${PRODUCT_ONLY_DECISION_ID} PRESERVED`);
}

if (require.main === module) {
  run();
}

module.exports = { run };

/**
 * Fixture selftest for ENGINE_ACCEPTANCE_REBASE_V1
 * Does not mutate tracked baseline / eval / prompt / workflow.
 */
"use strict";

const {
  DECISION_ID,
  INVALIDATED_SUITES,
  REQUIRED_RERUN_SUITES,
  validateRebaseEntry,
  evaluateRebaseInvariants,
  assertNoInPlaceHashRewrite,
  verifyWashing,
  detectProtectedScopeWash,
} = require("./lib/product-rebase.cjs");

function makeAck() {
  return {
    by: "Human/PO",
    at: "2026-08-13T00:00:00.000Z",
    statement:
      "ACK APPROVED ENGINE_ACCEPTANCE_REBASE_V1: new epoch from predecessor ea-baseline-old; invalidate QA1-QA6",
  };
}

function makeValidEntry(over = {}) {
  return {
    decision_id: DECISION_ID,
    rebase_id: "ea-rebase-fixture",
    human_po_ack: makeAck(),
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
    timestamp: "2026-08-13T00:00:00.000Z",
    commit_sha_or_pending: "pending:fixture",
    qa7_complete: false,
    ...over,
  };
}

function predBaseline() {
  return {
    id: "ea-baseline-old",
    prompt_hash: "11".repeat(32),
    eval_dataset_hash: "55".repeat(32),
    acceptance_workflow_hash: "66".repeat(32),
    protected_scope_manifest: {
      aggregate: "33".repeat(32),
      entries: [
        { path: "services/api-nest/src/ai/coach.orchestrator.ts", sha256: "aa".repeat(32) },
        { path: "eval/p_fact.jsonl", sha256: "bb".repeat(32) },
      ],
    },
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

  console.log("[selftest-product-rebase] start");

  {
    const f = [];
    validateRebaseEntry(makeValidEntry(), null, f);
    check("valid_entry_shape", f.length === 0, f.join("; "));
  }

  // 1) old baseline id + new prompt hash → FAIL
  {
    const f = [];
    const baseline = { id: "ea-baseline-old", prompt_hash: "22".repeat(32) };
    const amendmentLedger = {
      baseline_id: "ea-baseline-old",
      frozen_at_qa0: { prompt_hash: "11".repeat(32) },
    };
    assertNoInPlaceHashRewrite(baseline, amendmentLedger, { rebases: [] }, f);
    check(
      "old_id_new_prompt_fail",
      f.some((x) => /old baseline id \+ new prompt hash/i.test(x)),
      f.join("; "),
    );
  }

  // 2) rebase without Human/PO ACK → FAIL
  {
    const f = [];
    const bad = makeValidEntry();
    delete bad.human_po_ack;
    validateRebaseEntry(bad, null, f);
    check(
      "rebase_without_ack_fail",
      f.some((x) => /human_po_ack/i.test(x)),
      f.join("; "),
    );
  }

  // 3) rebase ledger missing predecessor → FAIL
  {
    const f = [];
    evaluateRebaseInvariants(makeValidEntry(), { predecessorBaseline: null }, f);
    check(
      "missing_predecessor_fail",
      f.some((x) => /missing predecessor/i.test(x)),
      f.join("; "),
    );
  }

  // 4) old QA1-QA6 results treated as current COMPLETE → FAIL
  {
    const f = [];
    const baseline = { id: "ea-baseline-new" };
    const evidence = {
      suites: [
        {
          suite_id: "QA1",
          completion_status: "COMPLETE",
          baseline_id: "ea-baseline-old",
          checksum: "deadbeef",
        },
      ],
    };
    const rebaseLedger = {
      rebases: [
        makeValidEntry({
          predecessor_suite_checksums: { QA1: "deadbeef" },
        }),
      ],
    };
    verifyWashing(
      baseline,
      evidence,
      rebaseLedger,
      () => ({ baseline_id: "ea-baseline-old", completion_status: "COMPLETE" }),
      f,
    );
    check(
      "old_qa_as_current_complete_fail",
      f.some((x) => /current COMPLETE/i.test(x)),
      f.join("; "),
    );
  }

  // 5) changed protected bytes excluded from protected-scope → FAIL
  {
    const f = [];
    detectProtectedScopeWash(
      [{ path: "services/api-nest/src/ai/coach.orchestrator.ts", sha256: "aa".repeat(32) }],
      [{ path: "eval/p_fact.jsonl", sha256: "bb".repeat(32) }],
      () => true,
      f,
    );
    check(
      "scope_exclusion_wash_fail",
      f.some((x) => /excluded from protected-scope/i.test(x)),
      f.join("; "),
    );
  }

  // 6) eval dataset drift during product-only rebase → FAIL
  {
    const f = [];
    evaluateRebaseInvariants(
      makeValidEntry(),
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
      "eval_drift_fail",
      f.some((x) => /eval dataset drift/i.test(x)),
      f.join("; "),
    );
  }

  // 7) workflow hash silently changed → FAIL
  {
    const f = [];
    evaluateRebaseInvariants(
      makeValidEntry(),
      {
        predecessorBaseline: predBaseline(),
        liveEvalHash: "55".repeat(32),
        livePromptHash: "22".repeat(32),
        liveWorkflowHash: "77".repeat(32),
        liveManifestAggregate: "44".repeat(32),
        liveManifestEntries: predBaseline().protected_scope_manifest.entries,
        predecessorManifestEntries: predBaseline().protected_scope_manifest.entries,
        fileExists: () => false,
      },
      f,
    );
    check(
      "silent_workflow_change_fail",
      f.some((x) => /workflow hash silently changed/i.test(x)),
      f.join("; "),
    );
  }

  // 8) new baseline created without invalidation ledger → FAIL
  {
    const f = [];
    const baseline = { id: "ea-baseline-new", prompt_hash: "22".repeat(32) };
    const amendmentLedger = {
      baseline_id: "ea-baseline-old",
      frozen_at_qa0: { prompt_hash: "11".repeat(32) },
    };
    assertNoInPlaceHashRewrite(baseline, amendmentLedger, { rebases: [] }, f);
    check(
      "new_baseline_without_ledger_fail",
      f.some((x) => /without invalidation ledger/i.test(x)),
      f.join("; "),
    );
  }

  {
    const f = [];
    const noInv = makeValidEntry({ invalidated_suites: ["QA7"] });
    validateRebaseEntry(noInv, null, f);
    check(
      "missing_qa1_qa6_invalidation_fail",
      f.some((x) => /invalidated_suites/i.test(x)),
      f.join("; "),
    );
  }

  {
    const f = [];
    evaluateRebaseInvariants(
      makeValidEntry(),
      {
        predecessorBaseline: predBaseline(),
        liveEvalHash: "55".repeat(32),
        livePromptHash: "22".repeat(32),
        liveWorkflowHash: "66".repeat(32),
        liveManifestAggregate: "44".repeat(32),
        liveManifestEntries: [
          { path: "services/api-nest/src/ai/coach.orchestrator.ts", sha256: "cc".repeat(32) },
          { path: "eval/p_fact.jsonl", sha256: "bb".repeat(32) },
        ],
        predecessorManifestEntries: predBaseline().protected_scope_manifest.entries,
        fileExists: () => true,
      },
      f,
    );
    check("happy_product_rebase_invariants", f.length === 0, f.join("; "));
  }

  if (fails.length) {
    console.error("[selftest-product-rebase] FAIL");
    for (const f of fails) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("[selftest-product-rebase] PASS");
  console.log(`  DECISION_ID=${DECISION_ID}`);
  console.log("  BASELINE_WASHING=FORBIDDEN");
}

if (require.main === module) {
  run();
}

module.exports = { run };

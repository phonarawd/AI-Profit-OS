/**
 * Fixture selftest for ENGINE_ACCEPTANCE_REBASE_V1
 * Does not mutate tracked baseline / eval / prompt / workflow.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./lib/hash-scope.cjs");
const {
  DECISION_ID,
  INVALIDATED_SUITES,
  REQUIRED_RERUN_SUITES,
  STALE_AGGREGATION_PHASES,
  POLICY_V1_ID,
  POLICY_V2_ID,
  CURRENT_REBASE_POLICY_ID,
  FROZEN_HISTORICAL_V1_REBASE_IDS,
  REBASE_POLICIES,
  validateRebaseEntry,
  validateLedgerPolicy,
  evaluateRebaseInvariants,
  assertNoInPlaceHashRewrite,
  verifyWashing,
  verifyPendingRerunEpoch,
  verifyRebaseLedgerAgainstBaseline,
  findBridgingAmendment,
  detectProtectedScopeWash,
  mapSuitesForRebase,
  stampCurrentPolicyOnEntry,
  stampEvalDatasetOnEntry,
  currentPolicy,
  isPendingRerun,
} = require("./lib/product-rebase.cjs");

function readGov(name) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, "governance/engine-acceptance", name), "utf8"),
  );
}

function makeAck() {
  return {
    by: "Human/PO",
    at: "2026-08-13T00:00:00.000Z",
    statement:
      "ACK APPROVED ENGINE_ACCEPTANCE_REBASE_V1: new epoch from predecessor ea-baseline-old; invalidate discovery; do not rewrite hashes inside the old baseline.",
  };
}

function makeValidEntry(over = {}) {
  return {
    decision_id: DECISION_ID,
    rebase_id: "ea-rebase-fixture-v2",
    rebase_policy_version: CURRENT_REBASE_POLICY_ID,
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

function makeV1ShapeEntry(over = {}) {
  const v1 = REBASE_POLICIES[POLICY_V1_ID];
  return {
    decision_id: DECISION_ID,
    rebase_id: "ea-rebase-unauthorized-v1-shape",
    rebase_policy_version: POLICY_V1_ID,
    human_po_ack: makeAck(),
    predecessor_baseline_id: "ea-baseline-old",
    new_baseline_id: "ea-baseline-new",
    reason: "fixture old-policy shape",
    product_commit: "b".repeat(40),
    changed_protected_paths: ["services/api-nest/src/ai/coach.orchestrator.ts"],
    changed_nonprotected_support_paths: [],
    old_prompt_hash: "11".repeat(32),
    new_prompt_hash: "22".repeat(32),
    old_protected_manifest_hash: "33".repeat(32),
    new_protected_manifest_hash: "44".repeat(32),
    eval_dataset_hash: "55".repeat(32),
    acceptance_workflow_hash: "66".repeat(32),
    invalidated_suites: v1.invalidated_suites.slice(),
    required_rerun_suites: v1.required_rerun_suites.slice(),
    timestamp: "2026-08-13T00:00:00.000Z",
    commit_sha_or_pending: "pending:v1-shape",
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

  {
    const f = [];
    validateRebaseEntry(makeValidEntry(), null, f, { requireCurrentPolicy: true });
    check("valid_entry_current_policy", f.length === 0, f.join("; "));
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

  // 6b) live eval ≠ predecessor + ACKNOWLEDGED_EXPANSION old/new pin → PASS
  {
    const f = [];
    evaluateRebaseInvariants(
      makeValidEntry({
        eval_dataset_status: "ACKNOWLEDGED_EXPANSION",
        eval_dataset_hash: "99".repeat(32),
        old_eval_dataset_hash: "55".repeat(32),
        new_eval_dataset_hash: "99".repeat(32),
      }),
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
    check("eval_expansion_recorded_ok", f.length === 0, f.join("; "));
  }

  // 6c) live eval ≠ predecessor but MATCH claim → still FAIL
  {
    const f = [];
    evaluateRebaseInvariants(
      makeValidEntry({ eval_dataset_status: "MATCH" }),
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
      "eval_expansion_claimed_match_fail",
      f.some((x) => /eval dataset drift/i.test(x)),
      f.join("; "),
    );
  }

  {
    const e = {};
    stampEvalDatasetOnEntry(e, "55".repeat(32), "99".repeat(32));
    check(
      "stamp_eval_expansion",
      e.eval_dataset_status === "ACKNOWLEDGED_EXPANSION" &&
        e.old_eval_dataset_hash === "55".repeat(32) &&
        e.new_eval_dataset_hash === "99".repeat(32) &&
        e.eval_dataset_hash === "99".repeat(32),
      JSON.stringify(e),
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
    validateRebaseEntry(
      makeValidEntry({
        old_prompt_hash: "11".repeat(32),
        new_prompt_hash: "11".repeat(32),
        changed_protected_paths: ["supabase/migrations/x.sql"],
      }),
      null,
      f,
    );
    check("schema_only_rebase_prompt_match_ok", f.length === 0, f.join("; "));
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

  // --- policy versioning / QA8 / QA9 ---

  check(
    "current_policy_is_v2",
    CURRENT_REBASE_POLICY_ID === POLICY_V2_ID && currentPolicy().id === POLICY_V2_ID,
    CURRENT_REBASE_POLICY_ID,
  );
  check(
    "current_policy_invalidates_qa8_not_qa9",
    INVALIDATED_SUITES.includes("QA8") && !INVALIDATED_SUITES.includes("QA9"),
    INVALIDATED_SUITES.join(","),
  );
  check(
    "current_policy_requires_qa8_rerun_not_qa9",
    REQUIRED_RERUN_SUITES.includes("QA8") && !REQUIRED_RERUN_SUITES.includes("QA9"),
    REQUIRED_RERUN_SUITES.join(","),
  );
  check(
    "current_policy_stale_aggregation_is_qa9",
    STALE_AGGREGATION_PHASES.length === 1 && STALE_AGGREGATION_PHASES[0] === "QA9",
    STALE_AGGREGATION_PHASES.join(","),
  );

  {
    const liveLedger = readGov("product-rebases.v1.json");
    const liveBaseline = readGov("baseline.v1.json");
    const liveEvidence = readGov("evidence-manifest.v1.json");
    const qa9 = readGov("qa9-result.v1.json");
    const policyFails = [];
    validateLedgerPolicy(liveLedger, policyFails);
    check("live_ledger_policy_block", policyFails.length === 0, policyFails.join("; "));

    // Regression snapshot of the live ledger/baseline at the time this file was
    // written, NOT a policy that forbids a rebase — the real policy is enforced
    // by validateRebaseEntry/verifyRebaseLedgerAgainstBaseline/verifyWashing
    // above and below. Updated with REL-502 rebase after REL-508
    // (ea-rebase-229e7777f9b0-2d4567b3a2c8 · eval MATCH predecessor).
    check("no_new_epoch_created", liveLedger.rebases.length === 7, `rebases=${liveLedger.rebases.length}`);
    check(
      "live_baseline_unchanged",
      liveBaseline.id === "ea-baseline-229e7777f9b0-2d4567b3a2c8",
      liveBaseline.id,
    );
    // qa9-result is only ever written by run-qa9.cjs. After REL-508 rebase,
    // current-epoch QA1-QA8 reran and QA9 re-aggregated on
    // ea-baseline-229e7777f9b0-2d4567b3a2c8. Predecessor ISSUED is history.
    check(
      "live_verdict_unchanged",
      qa9.verdict === "ENGINE_ACCEPTED_FOR_UI" &&
        qa9.engine_accepted_for_ui === "ISSUED" &&
        qa9.baseline_id === "ea-baseline-229e7777f9b0-2d4567b3a2c8",
      qa9.verdict,
    );
    // evidence-manifest.verdict is rewritten ephemerally by run-qa3/4/5/6/8.cjs in every
    // CI qa-matrix job that reruns one of those suites without immediately re-running QA9
    // (its qa_phase field then reads that suite's id, e.g. "QA-6", not "QA-9") - none of
    // those runners are allowed to self-issue ENGINE_ACCEPTED_FOR_UI (enforced separately in
    // verify/engine-acceptance.cjs), so the only real invariant to hold during that ephemeral
    // window is "not falsely optimistic". Once evidence-manifest was itself last written BY
    // QA9 (qa_phase==="QA-9"), the two must match exactly - a real check, not a relaxation.
    check(
      "evidence_verdict_matches_qa9",
      liveEvidence.qa_phase === "QA-9"
        ? liveEvidence.verdict === qa9.verdict
        : liveEvidence.verdict !== "ENGINE_ACCEPTED_FOR_UI",
      liveEvidence.verdict,
    );

    const v1 = REBASE_POLICIES[POLICY_V1_ID];
    for (const id of FROZEN_HISTORICAL_V1_REBASE_IDS) {
      const entry = liveLedger.rebases.find((r) => r.rebase_id === id);
      check(`historical_present_${id.slice(0, 22)}`, Boolean(entry), "missing");
      if (!entry) continue;
      check(
        `historical_payload_unmutated_${id.slice(10, 22)}`,
        !entry.rebase_policy_version &&
          JSON.stringify(entry.invalidated_suites) === JSON.stringify(v1.invalidated_suites) &&
          JSON.stringify(entry.required_rerun_suites) === JSON.stringify(v1.required_rerun_suites) &&
          entry.stale_aggregation_phases === undefined,
        "historical payload mutated",
      );
      const hf = [];
      validateRebaseEntry(entry, null, hf);
      check(`historical_still_validates_${id.slice(10, 22)}`, hf.length === 0, hf.join("; "));
    }

    const ledgerFails = [];
    verifyRebaseLedgerAgainstBaseline(liveBaseline, liveLedger, liveEvidence, ledgerFails);
    check("live_ledger_verifies_under_versioned_policy", ledgerFails.length === 0, ledgerFails.join("; "));

    const twoHopLedger = {
      amendments: [
        {
          baseline_id: liveBaseline.id,
          old_acceptance_workflow_hash: "aaa",
          new_acceptance_workflow_hash: "bbb",
        },
        {
          baseline_id: liveBaseline.id,
          old_acceptance_workflow_hash: "bbb",
          new_acceptance_workflow_hash: "ccc",
        },
      ],
    };
    const twoHopBaseline = { id: liveBaseline.id, acceptance_workflow_hash: "ccc" };
    check(
      "bridging_amendment_walks_hash_chain",
      Boolean(findBridgingAmendment(twoHopLedger, twoHopBaseline, "aaa")),
      "two-hop amendment chain must bridge rebase tip to current baseline hash",
    );
    check(
      "bridging_amendment_rejects_broken_chain",
      findBridgingAmendment(twoHopLedger, { id: liveBaseline.id, acceptance_workflow_hash: "zzz" }, "aaa") ==
        null,
      "broken chain must not bridge",
    );
  }

  {
    const f = [];
    validateRebaseEntry(makeV1ShapeEntry(), null, f, { requireCurrentPolicy: true });
    check(
      "old_policy_cannot_authorize_new_rebase",
      f.some((x) => /rebase_policy_version/i.test(x) || /cannot authorize a new rebase/i.test(x)),
      f.join("; "),
    );
  }

  {
    const f = [];
    validateRebaseEntry(makeV1ShapeEntry(), null, f);
    check(
      "old_v1_shape_without_frozen_id_rejected",
      f.some((x) => /cannot authorize a new rebase/i.test(x)),
      f.join("; "),
    );
  }

  {
    const liveLedger = readGov("product-rebases.v1.json");
    const frozen = liveLedger.rebases[0];
    const copy = JSON.parse(JSON.stringify(frozen));
    copy.rebase_policy_version = POLICY_V2_ID;
    const f = [];
    validateRebaseEntry(copy, 0, f);
    check(
      "historical_payload_rewrite_rejected",
      f.some((x) => /must not be rewritten/i.test(x)),
      f.join("; "),
    );
  }

  {
    const f = [];
    validateRebaseEntry(
      makeValidEntry({
        invalidated_suites: [...INVALIDATED_SUITES, "QA9"],
      }),
      null,
      f,
    );
    check(
      "qa9_must_not_be_discovery_invalidated",
      f.some((x) => /QA9/i.test(x)),
      f.join("; "),
    );
  }

  {
    const f = [];
    validateRebaseEntry(
      makeValidEntry({
        required_rerun_suites: [...REQUIRED_RERUN_SUITES, "QA9"],
      }),
      null,
      f,
    );
    check(
      "qa9_must_not_be_required_rerun_discovery",
      f.some((x) => /QA9/i.test(x)),
      f.join("; "),
    );
  }

  {
    const f = [];
    validateRebaseEntry(makeValidEntry({ stale_aggregation_phases: [] }), null, f);
    check(
      "qa9_aggregation_stale_required_on_v2",
      f.some((x) => /stale_aggregation_phases/i.test(x)),
      f.join("; "),
    );
  }

  {
    const f = [];
    validateRebaseEntry(makeValidEntry({ qa9_verdict_issued: true }), null, f);
    check(
      "must_not_fabricate_qa9_verdict",
      f.some((x) => /fabricate a QA9 verdict/i.test(x)),
      f.join("; "),
    );
  }

  {
    const f = [];
    const bad = makeValidEntry();
    delete bad.human_po_ack.statement;
    bad.human_po_ack.statement = "please rebase";
    validateRebaseEntry(bad, null, f, { requireCurrentPolicy: true });
    check(
      "malformed_ack_rejected",
      f.some((x) => /ACK APPROVED/i.test(x)),
      f.join("; "),
    );
  }

  // suite mapping semantics (no disk writes)
  {
    const predSuites = [
      { suite_id: "QA0", completion_status: "COMPLETE", baseline_id: "ea-baseline-old", run_id: "old", checksum: "c0" },
      { suite_id: "QA1", completion_status: "COMPLETE", baseline_id: "ea-baseline-old", run_id: "r1", checksum: "c1" },
      { suite_id: "QA7", completion_status: "COMPLETE", baseline_id: "ea-baseline-old", run_id: "r7", checksum: "c7" },
      { suite_id: "QA8", completion_status: "COMPLETE", baseline_id: "ea-baseline-old", run_id: "r8", checksum: "c8", asvs_version: "5.0.0" },
      {
        suite_id: "QA9",
        completion_status: "COMPLETE",
        baseline_id: "ea-baseline-old",
        run_id: "r9",
        checksum: "c9",
        aggregation_only: true,
      },
    ];
    const mapped = mapSuitesForRebase(predSuites, currentPolicy(), {
      newBaselineId: "ea-baseline-new",
      predecessorId: "ea-baseline-old",
      rebaseId: "ea-rebase-new",
      qa0Checksum: "newagg",
      predecessorVerdict: "ENGINE_NOT_ACCEPTED",
    });
    const byId = Object.fromEntries(mapped.map((s) => [s.suite_id, s]));
    check("map_qa0_complete_new_epoch", byId.QA0.completion_status === "COMPLETE" && byId.QA0.baseline_id === "ea-baseline-new");
    check(
      "map_qa1_stale_with_history",
      byId.QA1.completion_status === "STALE" &&
        byId.QA1.historical_baseline_id === "ea-baseline-old" &&
        byId.QA1.historical_checksum === "c1" &&
        byId.QA1.predecessor_result_preserved === true,
    );
    check("map_qa7_not_started", byId.QA7.completion_status === "NOT_STARTED");
    check(
      "map_qa8_stale_discovery",
      byId.QA8.completion_status === "STALE" &&
        byId.QA8.epoch_status === "STALE_FOR_CURRENT_EPOCH" &&
        byId.QA8.historical_checksum === "c8" &&
        byId.QA8.historical_baseline_id === "ea-baseline-old",
    );
    check(
      "map_qa9_stale_aggregation",
      byId.QA9.completion_status === "STALE" &&
        byId.QA9.epoch_status === "STALE_AGGREGATION_FOR_CURRENT_EPOCH" &&
        byId.QA9.aggregation_only === true &&
        byId.QA9.discovery_suite === false &&
        byId.QA9.current_epoch_authoritative === false &&
        byId.QA9.historical_verdict === "ENGINE_NOT_ACCEPTED" &&
        byId.QA9.rerun_after_current_epoch_discovery === true,
    );
  }

  {
    const f = [];
    const baseline = { id: "ea-baseline-new" };
    const entry = makeValidEntry({
      predecessor_suite_checksums: { QA8: "old-qa8", QA9: "old-qa9" },
    });
    const evidence = {
      verdict: "ENGINE_NOT_ACCEPTED",
      suites: [
        { suite_id: "QA8", completion_status: "COMPLETE", baseline_id: "ea-baseline-old", checksum: "old-qa8" },
        { suite_id: "QA9", completion_status: "COMPLETE", baseline_id: "ea-baseline-old", checksum: "old-qa9" },
      ],
    };
    verifyWashing(baseline, evidence, { rebases: [entry] }, (id) => {
      if (id === "QA8") return { baseline_id: "ea-baseline-old", checksum: "old-qa8" };
      if (id === "QA9") return { baseline_id: "ea-baseline-old", checksum: "old-qa9", verdict: "ENGINE_NOT_ACCEPTED" };
      return null;
    }, f);
    check(
      "qa8_predecessor_complete_washing_fail",
      f.some((x) => /QA8/i.test(x) && /current COMPLETE/i.test(x)),
      f.join("; "),
    );
    check(
      "qa9_predecessor_complete_washing_fail",
      f.some((x) => /QA9/i.test(x)),
      f.join("; "),
    );
  }

  {
    const entry = makeValidEntry();
    const mapped = mapSuitesForRebase(
      [
        { suite_id: "QA0", completion_status: "COMPLETE" },
        { suite_id: "QA1", completion_status: "COMPLETE", checksum: "c1", run_id: "r1" },
        { suite_id: "QA2", completion_status: "COMPLETE", checksum: "c2", run_id: "r2" },
        { suite_id: "QA3", completion_status: "COMPLETE", checksum: "c3", run_id: "r3" },
        { suite_id: "QA4", completion_status: "COMPLETE", checksum: "c4", run_id: "r4" },
        { suite_id: "QA5", completion_status: "COMPLETE", checksum: "c5", run_id: "r5" },
        { suite_id: "QA6", completion_status: "COMPLETE", checksum: "c6", run_id: "r6" },
        { suite_id: "QA7", completion_status: "COMPLETE" },
        { suite_id: "QA8", completion_status: "COMPLETE", checksum: "c8" },
        { suite_id: "QA9", completion_status: "COMPLETE", checksum: "c9" },
      ],
      currentPolicy(),
      {
        newBaselineId: "ea-baseline-new",
        predecessorId: "ea-baseline-old",
        rebaseId: "ea-rebase-fixture-v2",
        qa0Checksum: "agg",
        predecessorVerdict: "ENGINE_NOT_ACCEPTED",
      },
    );
    const evidence = {
      baseline_id: "ea-baseline-new",
      qa_phase: "QA-0",
      next: "QA1_DETERMINISTIC_TRUTH",
      verdict: "ENGINE_QA_INCOMPLETE",
      suites: mapped,
    };
    const f = [];
    verifyPendingRerunEpoch({ id: "ea-baseline-new" }, evidence, { rebases: [entry] }, f);
    check("pending_v2_epoch_ok", f.length === 0, f.join("; "));
    check(
      "pending_rebuild_true_while_qa1_stale",
      isPendingRerun({ id: "ea-baseline-new" }, evidence, { rebases: [entry] }) === true,
    );
  }

  {
    const entry = makeValidEntry();
    const mapped = mapSuitesForRebase(
      [
        { suite_id: "QA0", completion_status: "COMPLETE" },
        { suite_id: "QA1", completion_status: "COMPLETE" },
        { suite_id: "QA8", completion_status: "COMPLETE", checksum: "c8" },
        { suite_id: "QA9", completion_status: "COMPLETE", checksum: "c9" },
      ],
      currentPolicy(),
      {
        newBaselineId: "ea-baseline-new",
        predecessorId: "ea-baseline-old",
        rebaseId: "ea-rebase-fixture-v2",
        qa0Checksum: "agg",
        predecessorVerdict: "ENGINE_NOT_ACCEPTED",
      },
    );
    const evidence = {
      baseline_id: "ea-baseline-new",
      qa_phase: "QA-0",
      next: "QA1_DETERMINISTIC_TRUTH",
      verdict: "ENGINE_NOT_ACCEPTED",
      suites: mapped.map((s) =>
        s.suite_id === "QA9"
          ? { ...s, completion_status: "COMPLETE", current_epoch_authoritative: true }
          : s,
      ),
    };
    const f = [];
    verifyPendingRerunEpoch({ id: "ea-baseline-new" }, evidence, { rebases: [entry] }, f);
    check(
      "predecessor_qa9_cannot_remain_authoritative",
      f.some((x) => /QA9/i.test(x) || /current-authoritative/i.test(x) || /ENGINE_QA_INCOMPLETE/i.test(x)),
      f.join("; "),
    );
  }

  {
    const entry = stampCurrentPolicyOnEntry({
      decision_id: DECISION_ID,
      rebase_id: "ea-rebase-future",
    });
    check(
      "stamp_current_policy_sets_v2",
      entry.rebase_policy_version === POLICY_V2_ID &&
        entry.invalidated_suites.includes("QA8") &&
        entry.stale_aggregation_phases.includes("QA9") &&
        entry.qa9_verdict_issued === false,
    );
  }

  {
    const f = [];
    const baseline = { id: "ea-baseline-future", prompt_hash: "22".repeat(32) };
    const amendmentLedger = {
      baseline_id: "ea-baseline-old",
      frozen_at_qa0: { prompt_hash: "11".repeat(32) },
    };
    assertNoInPlaceHashRewrite(
      baseline,
      amendmentLedger,
      { rebases: [makeV1ShapeEntry({ new_baseline_id: "ea-baseline-future" })] },
      f,
    );
    check(
      "v1_tip_cannot_bind_new_baseline",
      f.some((x) => /old policy cannot authorize/i.test(x) || /invalidation ledger/i.test(x)),
      f.join("; "),
    );
  }

  if (fails.length) {
    console.error("[selftest-product-rebase] FAIL");
    for (const f of fails) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("[selftest-product-rebase] PASS");
  console.log(`  DECISION_ID=${DECISION_ID}`);
  console.log(`  CURRENT_REBASE_POLICY=${CURRENT_REBASE_POLICY_ID}`);
  console.log("  BASELINE_WASHING=FORBIDDEN");
}

if (require.main === module) {
  run();
}

module.exports = { run };

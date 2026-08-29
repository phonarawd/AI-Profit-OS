/**
 * Fixture selftest for ENGINE_ACCEPTANCE_REBASE_V1
 * Does not mutate tracked baseline / eval / prompt / workflow.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { ROOT, git, hashPathList } = require("./lib/hash-scope.cjs");
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
  isCurrentEpochPreQa7Checkpoint,
  verifyCurrentEpochPreQa7Checkpoint,
  evaluateLiveQa9EpochBinding,
  stampCurrentEpochPendingSuite,
  CURRENT_EPOCH_REBASE_SNAPSHOT,
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

function cloneJson(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function sealResult(obj) {
  const result = { ...obj };
  result.checksum = crypto
    .createHash("sha256")
    .update(`${JSON.stringify(result)}\n`, "utf8")
    .digest("hex");
  return result;
}

const FIX_CUR = "ea-baseline-new";
const FIX_PRED = "ea-baseline-old";
const FIX_WF = "66".repeat(32);
const FIX_QA7_BYTES = '{"schema":"governance.engine-acceptance.qa7-result.v1","suite_id":"QA7"}';
const FIX_QA8_BYTES = '{"schema":"governance.engine-acceptance.qa8-result.v1","suite_id":"QA8"}';
const FIX_QA9_BYTES = '{"schema":"governance.engine-acceptance.qa9-result.v1","suite_id":"QA9"}';
const FIX_CS = {
  QA1: "c1".repeat(32),
  QA2: "c2".repeat(32),
  QA3: "c3".repeat(32),
  QA4: "c4".repeat(32),
  QA5: "c5".repeat(32),
  QA6: "c6".repeat(32),
};

function makeCompleteResult(id, checksum, runId, extra) {
  return {
    suite_id: id,
    completion_status: "COMPLETE",
    baseline_id: FIX_CUR,
    checksum,
    run_id: runId,
    ...(extra || {}),
  };
}

function makeCheckpointCtx(over) {
  const historicalQa7 = sealResult({
    schema: "governance.engine-acceptance.qa7-result.v1",
    suite_id: "QA7",
    completion_status: "COMPLETE",
    qa7_completion_status: "COMPLETE",
    baseline_id: FIX_PRED,
    formal_actions_evidence: true,
    local_validation_only: false,
    engine_accepted_for_ui: "NOT_ISSUED",
    ui_ux_entry_gate: "CLOSED",
    next: "QA8_SECURITY_PRIVACY",
    run_id: "32713082605",
    actions: {
      run_id: "32713082605",
      workflow: "engine-acceptance",
      event: "workflow_dispatch",
      qa_phase: "qa7",
      conclusion: "success",
    },
  });
  const historicalQa8 = sealResult({
    schema: "governance.engine-acceptance.qa8-result.v1",
    suite_id: "QA8",
    completion_status: "COMPLETE",
    baseline_id: FIX_PRED,
    run_id: "qa8-hist",
    asvs_version: "5.0.0",
    exhaustive_certification_claim: false,
    kill_switch: { verified_before_checks: true },
    product_mutation: 0,
    kpi_forbidden: true,
    mock_pass_forbidden: true,
    mode: "full",
    next: "QA9_ACCEPTANCE_REPORT",
    checks: {
      security_privacy_world: {
        checks: [
          { check_id: "QA8_ADMIN_BOUNDARY" },
          { check_id: "QA8_USER_ISOLATION_SHARED_WITH_QA2" },
          { check_id: "QA8_JWT_TOKEN_VALIDATION" },
          { check_id: "QA8_PRIVACY_DELETE_ACCOUNT" },
          { check_id: "QA8_ERROR_DISCLOSURE_AND_LOGGING" },
        ],
      },
    },
    critical_invariant_cumulative: { blocked: 0, skipped: 0, uncovered: 0, failed: 0 },
  });
  const historicalQa9 = sealResult({
    schema: "governance.engine-acceptance.qa9-result.v1",
    suite_id: "QA9",
    completion_status: "COMPLETE",
    baseline_id: FIX_PRED,
    run_id: "qa9-hist",
    aggregation_only: true,
    discovery_suite: false,
    kill_switch: { verified_before_checks: true },
    product_mutation: 0,
    kpi_forbidden: true,
    mock_pass_forbidden: true,
    verdict: "ENGINE_ACCEPTED_FOR_UI",
    engine_accepted_for_ui: "ISSUED",
    ui_ux_entry_gate: "OPEN",
    formula_inputs: {
      defects_P0: 0,
      defects_P1: 0,
      mandatory_suite_complete: true,
      critical_invariant_blocked: 0,
      critical_invariant_skipped: 0,
      critical_invariant_uncovered: 0,
      baseline_valid: true,
      acceptance_scope_unchanged: true,
      report_baseline_id_match: true,
      evidence_integrity_valid: true,
    },
  });
  const tip = makeValidEntry({
    predecessor_baseline_id: FIX_PRED,
    new_baseline_id: FIX_CUR,
    predecessor_suite_checksums: {
      QA1: "old1",
      QA2: "old2",
      QA3: "old3",
      QA4: "old4",
      QA5: "old5",
      QA6: "old6",
      QA8: historicalQa8.checksum,
      QA9: historicalQa9.checksum,
    },
  });
  const ctx = {
    baseline: {
      id: FIX_CUR,
      valid: true,
      protected_scope_clean: true,
      acceptance_workflow_hash: FIX_WF,
      prompt_hash: "22".repeat(32),
      eval_dataset_hash: "55".repeat(32),
    },
    evidence: {
      baseline_id: FIX_CUR,
      qa_phase: "QA-6",
      next: "QA7_AI_EVAL",
      verdict: "ENGINE_QA_INCOMPLETE",
      engine_accepted_for_ui: null,
      ui_ux_entry_gate: null,
      evidence_integrity: "VALID",
      critical_invariant: { blocked: 0, skipped: 0, uncovered: 0, failed: 0 },
      kill_switch: {
        verified_before_qa3: true,
        verified_before_qa4: true,
        verified_before_qa5: true,
        verified_before_qa6: true,
      },
      current_epoch: {
        decision_id: DECISION_ID,
        rebase_id: tip.rebase_id,
        baseline_id: FIX_CUR,
        predecessor_baseline_id: FIX_PRED,
        rebase_policy_version: POLICY_V2_ID,
        qa1_qa6_status: CURRENT_EPOCH_REBASE_SNAPSHOT.qa1_qa6_status,
        qa8_status: CURRENT_EPOCH_REBASE_SNAPSHOT.qa8_status,
        qa9_status: CURRENT_EPOCH_REBASE_SNAPSHOT.qa9_status,
      },
      suites: [
        {
          suite_id: "QA0",
          completion_status: "COMPLETE",
          baseline_id: FIX_CUR,
          run_id: "qa0",
          checksum: "qa0c",
        },
        { suite_id: "QA1", completion_status: "COMPLETE", baseline_id: FIX_CUR, run_id: "r1", checksum: FIX_CS.QA1 },
        { suite_id: "QA2", completion_status: "COMPLETE", baseline_id: FIX_CUR, run_id: "r2", checksum: FIX_CS.QA2 },
        { suite_id: "QA3", completion_status: "COMPLETE", baseline_id: FIX_CUR, run_id: "r3", checksum: FIX_CS.QA3 },
        { suite_id: "QA4", completion_status: "COMPLETE", baseline_id: FIX_CUR, run_id: "r4", checksum: FIX_CS.QA4 },
        { suite_id: "QA5", completion_status: "COMPLETE", baseline_id: FIX_CUR, run_id: "r5", checksum: FIX_CS.QA5 },
        { suite_id: "QA6", completion_status: "COMPLETE", baseline_id: FIX_CUR, run_id: "r6", checksum: FIX_CS.QA6 },
        {
          suite_id: "QA7",
          completion_status: "NOT_STARTED",
          baseline_id: FIX_CUR,
          run_id: null,
          checksum: null,
          predecessor_baseline_id: FIX_PRED,
        },
        {
          suite_id: "QA8",
          completion_status: "NOT_STARTED",
          baseline_id: FIX_CUR,
          run_id: null,
          checksum: null,
          epoch_status: "STALE_FOR_CURRENT_EPOCH",
          predecessor_result_preserved: true,
          historical_completion_status: "COMPLETE",
          historical_baseline_id: FIX_PRED,
          historical_run_id: "qa8-hist",
          historical_checksum: historicalQa8.checksum,
        },
        {
          suite_id: "QA9",
          completion_status: "NOT_STARTED",
          baseline_id: FIX_CUR,
          run_id: null,
          checksum: null,
          epoch_status: "STALE_AGGREGATION_FOR_CURRENT_EPOCH",
          aggregation_only: true,
          discovery_suite: false,
          current_epoch_authoritative: false,
          predecessor_result_preserved: true,
          historical_completion_status: "COMPLETE",
          historical_baseline_id: FIX_PRED,
          historical_run_id: "qa9-hist",
          historical_checksum: historicalQa9.checksum,
          historical_verdict: "ENGINE_ACCEPTED_FOR_UI",
        },
      ],
    },
    rebaseLedger: {
      schema: "governance.engine-acceptance.product-rebases.v1",
      decision_id: DECISION_ID,
      rebase_policy: { current_version: POLICY_V2_ID },
      rebases: [tip],
    },
    amendmentLedger: {
      schema: "governance.engine-acceptance.workflow-amendments.v1",
      decision_id: "POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1",
      baseline_id: FIX_PRED,
      frozen_at_qa0: {
        acceptance_workflow_hash: "aa".repeat(32),
        prompt_hash: "11".repeat(32),
        eval_dataset_hash: "55".repeat(32),
      },
      policies: {
        baseline_id: "STABLE",
        prompt_hash: "IMMUTABLE",
        eval_dataset_hash: "IMMUTABLE",
        acceptance_workflow_hash: "CONTROLLED_AMENDMENT_ONLY",
      },
      amendments: [
        {
          amendment_id: "fixture-qa7-obs",
          reason: "fixture",
          human_po_ack: { by: "Human/PO", at: "2026-08-28T00:00:00.000Z", statement: "ACK APPROVED fixture" },
          old_acceptance_workflow_hash: "aa".repeat(32),
          new_acceptance_workflow_hash: FIX_WF,
          workflow_diff_scope: {
            files: [".github/workflows/engine-acceptance.yml"],
            exact_diff_summary: "fixture",
            qa0_qa6_semantics_changed: false,
            checks: {
              command_changes: false,
              artifact_upload_changes: false,
              env_permission_changes: false,
              pass_fail_semantics_changes: false,
            },
          },
          affected_qa_suites: ["QA7"],
          unaffected_completed_suites: ["QA0", "QA1", "QA2", "QA3", "QA4", "QA5", "QA6"],
          baseline_id: FIX_CUR,
          commit_sha_or_pending: "pending",
          timestamp: "2026-08-28T00:00:00.000Z",
        },
      ],
    },
    defects: { counts: { P0: 0, P1: 0 } },
    results: {
      QA1: makeCompleteResult("QA1", FIX_CS.QA1, "r1"),
      QA2: makeCompleteResult("QA2", FIX_CS.QA2, "r2"),
      QA3: makeCompleteResult("QA3", FIX_CS.QA3, "r3"),
      QA4: makeCompleteResult("QA4", FIX_CS.QA4, "r4"),
      QA5: makeCompleteResult("QA5", FIX_CS.QA5, "r5"),
      QA6: makeCompleteResult("QA6", FIX_CS.QA6, "r6", {
        critical_invariant_cumulative: { blocked: 0, skipped: 0, uncovered: 0, failed: 0 },
      }),
      QA7: historicalQa7,
      QA8: historicalQa8,
      QA9: historicalQa9,
    },
    liveWorkflowHash: FIX_WF,
    headQa7Bytes: FIX_QA7_BYTES,
    liveQa7Bytes: FIX_QA7_BYTES,
    qa7ResultDirty: false,
    headQa8Bytes: FIX_QA8_BYTES,
    liveQa8Bytes: FIX_QA8_BYTES,
    qa8ResultDirty: false,
    headQa9Bytes: FIX_QA9_BYTES,
    liveQa9Bytes: FIX_QA9_BYTES,
    qa9ResultDirty: false,
  };
  return over ? Object.assign(ctx, over) : ctx;
}

function suiteIn(ctx, id) {
  return ctx.evidence.suites.find((s) => s.suite_id === id);
}

function patched(ctx, fn) {
  const copy = cloneJson(ctx);
  fn(copy);
  return copy;
}

function expectCheckpointFail(name, ctx, needle, check) {
  const f = [];
  const pred = isCurrentEpochPreQa7Checkpoint(ctx);
  verifyCurrentEpochPreQa7Checkpoint(ctx, f);
  check(
    name,
    pred === false && f.some((x) => needle.test(x)),
    `predicate=${pred} fails=${f.join("; ")}`,
  );
}

function existingFinalQa9ChecksumBindingHolds(ctx) {
  for (const id of ["QA7", "QA8", "QA9"]) {
    const s = ctx.evidence.suites.find((x) => x.suite_id === id);
    const r = ctx.results[id];
    if (!s || !r) return false;
    if (s.checksum !== r.checksum) return false;
    if (String(s.run_id) !== String(r.run_id)) return false;
  }
  return true;
}

function existingFinalQa9FormulaAllowsAccepted(ctx) {
  const p0p1 = (ctx.defects.counts.P0 || 0) + (ctx.defects.counts.P1 || 0);
  if (p0p1 > 0) return false;
  const ci = ctx.evidence.critical_invariant || {};
  if ((ci.blocked || 0) > 0 || (ci.skipped || 0) > 0 || (ci.uncovered || 0) > 0) return false;
  const mandatory = ["QA1", "QA2", "QA3", "QA4", "QA5", "QA6", "QA7", "QA8"];
  if (
    !mandatory.every((id) => {
      const s = ctx.evidence.suites.find((x) => x.suite_id === id);
      return s && s.completion_status === "COMPLETE";
    })
  ) {
    return false;
  }
  if (ctx.evidence.evidence_integrity !== "VALID") return false;
  if (!ctx.baseline || ctx.baseline.valid !== true) return false;
  return true;
}

function makeFinalQa9Ctx() {
  const ctx = makeCheckpointCtx();
  ctx.evidence.qa_phase = "QA-9";
  ctx.evidence.next = "03_ui_entry_unlocked";
  ctx.evidence.verdict = "ENGINE_ACCEPTED_FOR_UI";
  for (const id of ["QA7", "QA8", "QA9"]) {
    const s = suiteIn(ctx, id);
    s.completion_status = "COMPLETE";
    s.run_id = `cur-${id.toLowerCase()}`;
    s.checksum = `cur-${id.toLowerCase()}-cs`;
    s.baseline_id = FIX_CUR;
  }
  ctx.results.QA7 = {
    ...ctx.results.QA7,
    baseline_id: FIX_CUR,
    run_id: "cur-qa7",
    checksum: "cur-qa7-cs",
  };
  ctx.results.QA8 = {
    ...ctx.results.QA8,
    baseline_id: FIX_CUR,
    run_id: "cur-qa8",
    checksum: "cur-qa8-cs",
  };
  ctx.results.QA9 = {
    ...ctx.results.QA9,
    baseline_id: FIX_CUR,
    run_id: "cur-qa9",
    checksum: "cur-qa9-cs",
    verdict: "ENGINE_ACCEPTED_FOR_UI",
  };
  return ctx;
}

function loadLiveCheckpointCtx() {
  const scope = readGov("protected-scope.v1.json");
  const resultBytes = {};
  for (const id of ["QA7", "QA8", "QA9"]) {
    const lower = id.toLowerCase();
    const title = `${id[0]}${id.slice(1).toLowerCase()}`;
    const rel = `governance/engine-acceptance/${lower}-result.v1.json`;
    try {
      resultBytes[`head${title}Bytes`] = git(`git show HEAD:${rel}`).replace(/\r\n/g, "\n").trim();
    } catch {
      resultBytes[`head${title}Bytes`] = null;
    }
    resultBytes[`live${title}Bytes`] = fs
      .readFileSync(path.join(ROOT, rel), "utf8")
      .replace(/\r\n/g, "\n")
      .trim();
    resultBytes[`${lower}ResultDirty`] = false;
  }
  return {
    baseline: readGov("baseline.v1.json"),
    evidence: readGov("evidence-manifest.v1.json"),
    rebaseLedger: readGov("product-rebases.v1.json"),
    amendmentLedger: readGov("workflow-amendments.v1.json"),
    defects: readGov("defects.v1.json"),
    results: {
      QA1: readGov("qa1-result.v1.json"),
      QA2: readGov("qa2-result.v1.json"),
      QA3: readGov("qa3-result.v1.json"),
      QA4: readGov("qa4-result.v1.json"),
      QA5: readGov("qa5-result.v1.json"),
      QA6: readGov("qa6-result.v1.json"),
      QA7: readGov("qa7-result.v1.json"),
      QA8: readGov("qa8-result.v1.json"),
      QA9: readGov("qa9-result.v1.json"),
    },
    liveWorkflowHash: hashPathList(scope.aggregateHashes.acceptance_workflow_hash, scope),
    ...resultBytes,
  };
}


function stripChecksum(obj) {
  const copy = { ...obj };
  delete copy.checksum;
  return copy;
}

function makeSameBaselineQa6Ctx() {
  const ctx = makeCheckpointCtx();
  ctx.results.QA7 = sealResult({ ...stripChecksum(ctx.results.QA7), baseline_id: FIX_CUR });
  ctx.results.QA8 = sealResult({ ...stripChecksum(ctx.results.QA8), baseline_id: FIX_CUR });
  ctx.results.QA9 = sealResult({ ...stripChecksum(ctx.results.QA9), baseline_id: FIX_CUR });
  const q7 = suiteIn(ctx, "QA7");
  q7.current_epoch_authoritative = false;
  q7.epoch_status = "PENDING_CURRENT_EPOCH";
  q7.historical_baseline_id = FIX_CUR;
  q7.historical_run_id = ctx.results.QA7.run_id;
  q7.historical_checksum = ctx.results.QA7.checksum;
  const q8 = suiteIn(ctx, "QA8");
  q8.predecessor_baseline_id = FIX_PRED;
  q8.current_epoch_authoritative = false;
  q8.historical_baseline_id = FIX_CUR;
  q8.historical_run_id = ctx.results.QA8.run_id;
  q8.historical_checksum = ctx.results.QA8.checksum;
  const q9 = suiteIn(ctx, "QA9");
  q9.predecessor_baseline_id = FIX_PRED;
  q9.current_epoch_authoritative = false;
  q9.historical_baseline_id = FIX_CUR;
  q9.historical_run_id = ctx.results.QA9.run_id;
  q9.historical_checksum = ctx.results.QA9.checksum;
  q9.historical_verdict = ctx.results.QA9.verdict;
  return ctx;
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
    // above and below. Updated with the Auth + Wallet REL-502 rebase
    // (ea-rebase-cc627efc3ee2-defdfa5b6ac4 · eval MATCH predecessor).
    check("no_new_epoch_created", liveLedger.rebases.length === 9, `rebases=${liveLedger.rebases.length}`);
    check(
      "live_baseline_unchanged",
      liveBaseline.id === "ea-baseline-cc627efc3ee2-defdfa5b6ac4",
      liveBaseline.id,
    );
    // qa9-result is predecessor history until current-epoch QA9 aggregation
    // completes. Once evidence.qa_phase=QA-9, the file must instead be bound
    // to the current baseline and match the newly-issued current verdict.
    const qa9Bind = evaluateLiveQa9EpochBinding({
      evidence: liveEvidence,
      qa9,
      baseline: liveBaseline,
    });
    check(
      "live_qa9_epoch_binding",
      qa9Bind.ok === true,
      qa9Bind.reason || `phase=${liveEvidence.qa_phase} qa9_baseline=${qa9.baseline_id} verdict=${qa9.verdict}`,
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
    check(
      "pending_rerun_is_not_current_epoch_pre_qa7",
      isCurrentEpochPreQa7Checkpoint({
        baseline: { id: "ea-baseline-new", valid: true, protected_scope_clean: true },
        evidence,
        rebaseLedger: { rebases: [entry], rebase_policy: { current_version: POLICY_V2_ID } },
        amendmentLedger: null,
        defects: { counts: { P0: 0, P1: 0 } },
        results: {},
        liveWorkflowHash: "x",
        headQa7Bytes: "a",
        liveQa7Bytes: "a",
        qa7ResultDirty: false,
      }) === false,
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

  {
    const live = loadLiveCheckpointCtx();
    if (live.evidence.qa_phase === "QA-6") {
      const f = [];
      verifyCurrentEpochPreQa7Checkpoint(live, f);
      check(
        "live_persisted_qa6_complete_qa7_pending_predicate_true",
        isCurrentEpochPreQa7Checkpoint(live) === true && f.length === 0,
        f.join("; "),
      );
    } else if (
      live.evidence.qa_phase === "QA-7" &&
      live.evidence.next === "QA8_SECURITY_PRIVACY"
    ) {
      const qa7 = suiteIn(live, "QA7");
      const qa8 = suiteIn(live, "QA8");
      check(
        "live_persisted_qa7_complete_qa8_pending_state_true",
        isCurrentEpochPreQa7Checkpoint(live) === false &&
          qa7 &&
          qa7.completion_status === "COMPLETE" &&
          qa7.baseline_id === live.baseline.id &&
          qa7.formal_actions_evidence === true &&
          Boolean(qa7.run_id && qa7.checksum) &&
          qa8 &&
          qa8.completion_status === "NOT_STARTED" &&
          qa8.run_id === null &&
          qa8.checksum === null,
      );
    } else if (
      live.evidence.qa_phase === "QA-8" &&
      live.evidence.next === "QA9_ACCEPTANCE_REPORT"
    ) {
      const qa7 = suiteIn(live, "QA7");
      const qa8 = suiteIn(live, "QA8");
      const qa9 = suiteIn(live, "QA9");
      check(
        "live_persisted_qa8_complete_qa9_pending_state_true",
        isCurrentEpochPreQa7Checkpoint(live) === false &&
          qa7 &&
          qa7.completion_status === "COMPLETE" &&
          qa7.baseline_id === live.baseline.id &&
          qa8 &&
          qa8.completion_status === "COMPLETE" &&
          qa8.baseline_id === live.baseline.id &&
          Boolean(qa8.run_id && qa8.checksum) &&
          qa9 &&
          qa9.completion_status === "NOT_STARTED" &&
          qa9.run_id === null &&
          qa9.checksum === null &&
          qa9.current_epoch_authoritative === false,
      );
    } else if (
      live.evidence.qa_phase === "QA-9" &&
      ["03_blocked_fix_round", "03_blocked_incomplete", "03_ui_entry_unlocked"].includes(
        live.evidence.next,
      )
    ) {
      const qa9 = suiteIn(live, "QA9");
      const r9 = live.results.QA9;
      const verdict = live.evidence.verdict;
      const allowedVerdict = [
        "ENGINE_ACCEPTED_FOR_UI",
        "ENGINE_NOT_ACCEPTED",
        "ENGINE_QA_INCOMPLETE",
      ].includes(verdict);
      const acceptedShape =
        verdict !== "ENGINE_ACCEPTED_FOR_UI" ||
        (
          existingFinalQa9FormulaAllowsAccepted(live) === true &&
          r9 &&
          r9.verdict === "ENGINE_ACCEPTED_FOR_UI" &&
          r9.engine_accepted_for_ui === "ISSUED" &&
          r9.ui_ux_entry_gate === "OPEN" &&
          live.evidence.next === "03_ui_entry_unlocked"
        );
      check(
        "live_persisted_qa9_final_state_true",
        allowedVerdict &&
          qa9 &&
          qa9.completion_status === "COMPLETE" &&
          qa9.baseline_id === live.baseline.id &&
          qa9.aggregation_only === true &&
          Boolean(qa9.run_id && qa9.checksum) &&
          r9 &&
          r9.baseline_id === live.baseline.id &&
          r9.completion_status === "COMPLETE" &&
          r9.aggregation_only === true &&
          r9.discovery_suite === false &&
          r9.verdict === verdict &&
          existingFinalQa9ChecksumBindingHolds(live) === true &&
          acceptedShape,
      );
    } else {
      check(
        "live_current_epoch_checkpoint_state_known",
        false,
        `unexpected qa_phase/next=${live.evidence.qa_phase}/${live.evidence.next}`,
      );
    }
    check(
      "current_epoch_snapshot_is_rebase_time_not_live_authority",
      live.evidence.current_epoch.qa1_qa6_status === CURRENT_EPOCH_REBASE_SNAPSHOT.qa1_qa6_status &&
        live.evidence.current_epoch.qa8_status === CURRENT_EPOCH_REBASE_SNAPSHOT.qa8_status &&
        live.evidence.current_epoch.qa9_status === CURRENT_EPOCH_REBASE_SNAPSHOT.qa9_status &&
        live.evidence.suites.find((s) => s.suite_id === "QA1").completion_status === "COMPLETE",
    );
  }

  {
    const ctx = makeCheckpointCtx();
    const f = [];
    verifyCurrentEpochPreQa7Checkpoint(ctx, f);
    check(
      "fixture_qa6_complete_qa7_pending_true",
      isCurrentEpochPreQa7Checkpoint(ctx) === true && f.length === 0,
      f.join("; "),
    );
    check(
      "historical_qa9_accepted_preserved_as_history_only",
      ctx.results.QA9.verdict === "ENGINE_ACCEPTED_FOR_UI" &&
        ctx.results.QA9.engine_accepted_for_ui === "ISSUED" &&
        ctx.evidence.verdict === "ENGINE_QA_INCOMPLETE" &&
        suiteIn(ctx, "QA9").current_epoch_authoritative === false,
    );
    const explicitClosed = patched(ctx, (c) => {
      c.evidence.ui_ux_entry_gate = "CLOSED";
      c.evidence.engine_accepted_for_ui = "NOT_ISSUED";
    });
    check(
      "current_gate_explicit_closed_not_issued_true",
      isCurrentEpochPreQa7Checkpoint(explicitClosed) === true,
    );
    const qa8Stale = patched(ctx, (c) => {
      suiteIn(c, "QA8").completion_status = "STALE";
    });
    const f8 = [];
    verifyCurrentEpochPreQa7Checkpoint(qa8Stale, f8);
    check(
      "qa8_exact_stale_form_true",
      isCurrentEpochPreQa7Checkpoint(qa8Stale) === true && f8.length === 0,
      f8.join("; "),
    );
    check(
      "qa8_not_started_stale_discovery_true",
      isCurrentEpochPreQa7Checkpoint(ctx) === true,
    );
  }

  {
    const ephQa6 = patched(makeCheckpointCtx(), (c) => {
      c.results.QA7.baseline_id = FIX_CUR;
    });
    check("ephemeral_qa6_like_predicate_false", isCurrentEpochPreQa7Checkpoint(ephQa6) === false);

    const sameBaseline = makeSameBaselineQa6Ctx();
    const sameFails = [];
    verifyCurrentEpochPreQa7Checkpoint(sameBaseline, sameFails);
    check(
      "same_baseline_historical_qa6_pending_true",
      isCurrentEpochPreQa7Checkpoint(sameBaseline) === true && sameFails.length === 0,
      sameFails.join("; "),
    );
    check(
      "same_baseline_qa9_accepted_file_does_not_issue_current",
      sameBaseline.results.QA9.verdict === "ENGINE_ACCEPTED_FOR_UI" &&
        sameBaseline.evidence.verdict === "ENGINE_QA_INCOMPLETE" &&
        suiteIn(sameBaseline, "QA9").current_epoch_authoritative === false,
    );
    const dirtySame = patched(sameBaseline, (c) => {
      c.liveQa7Bytes = "dirty-bytes";
    });
    check("same_baseline_dirty_qa7_bytes_false", isCurrentEpochPreQa7Checkpoint(dirtySame) === false);

    const midQa8 = evaluateLiveQa9EpochBinding({
      evidence: sameBaseline.evidence,
      qa9: sameBaseline.results.QA9,
      baseline: sameBaseline.baseline,
    });
    check("mid_chain_qa6_qa9_binding_true", midQa8.ok === true, midQa8.reason);

    const authoritativeReuse = evaluateLiveQa9EpochBinding({
      evidence: {
        ...sameBaseline.evidence,
        qa_phase: "QA-8",
        next: "QA9_ACCEPTANCE_REPORT",
        suites: sameBaseline.evidence.suites.map((x) =>
          x.suite_id === "QA9"
            ? { ...x, completion_status: "COMPLETE", current_epoch_authoritative: true, run_id: "stale", checksum: "stale" }
            : x,
        ),
      },
      qa9: sameBaseline.results.QA9,
      baseline: sameBaseline.baseline,
    });
    check("mid_chain_authoritative_qa9_complete_binding_false", authoritativeReuse.ok === false);

    const published = evaluateLiveQa9EpochBinding({
      evidence: {
        qa_phase: "QA-9",
        next: "03_ui_entry_unlocked",
        verdict: "ENGINE_ACCEPTED_FOR_UI",
      },
      qa9: {
        baseline_id: FIX_CUR,
        completion_status: "COMPLETE",
        aggregation_only: true,
        discovery_suite: false,
        verdict: "ENGINE_ACCEPTED_FOR_UI",
        engine_accepted_for_ui: "ISSUED",
        ui_ux_entry_gate: "OPEN",
      },
      baseline: { id: FIX_CUR },
    });
    check("published_qa9_binding_true", published.ok === true, published.reason);

    const stamped = stampCurrentEpochPendingSuite(
      { suite_id: "QA9", baseline_id: FIX_CUR, completion_status: "COMPLETE", run_id: "keep-file", checksum: "keep-file" },
      { id: FIX_CUR },
      { id: FIX_PRED },
      sameBaseline.results.QA9,
    );
    check(
      "stamp_pending_does_not_copy_result_into_slot",
      stamped.completion_status === "NOT_STARTED" &&
        stamped.run_id === null &&
        stamped.checksum === null &&
        stamped.current_epoch_authoritative === false &&
        stamped.historical_baseline_id === FIX_CUR &&
        sameBaseline.results.QA9.verdict === "ENGINE_ACCEPTED_FOR_UI",
    );
    const ephPreQa9 = patched(makeCheckpointCtx(), (c) => {
      c.evidence.qa_phase = "QA-8";
      c.evidence.next = "QA9_ACCEPTANCE_REPORT";
    });
    check("ephemeral_pre_qa9_like_predicate_false", isCurrentEpochPreQa7Checkpoint(ephPreQa9) === false);
    const finalQa9 = makeFinalQa9Ctx();
    check("final_qa9_complete_predicate_false", isCurrentEpochPreQa7Checkpoint(finalQa9) === false);
    check("final_qa9_existing_checksum_path_holds", existingFinalQa9ChecksumBindingHolds(finalQa9) === true);
    check("final_qa9_existing_formula_path_holds", existingFinalQa9FormulaAllowsAccepted(finalQa9) === true);
    const mismatch = patched(finalQa9, (c) => {
      suiteIn(c, "QA7").checksum = "wrong-final";
    });
    check("final_qa9_checksum_mismatch_existing_branch_fails", existingFinalQa9ChecksumBindingHolds(mismatch) === false);
    check("final_qa9_checksum_mismatch_still_not_checkpoint", isCurrentEpochPreQa7Checkpoint(mismatch) === false);
    const unsatisfied = patched(finalQa9, (c) => {
      suiteIn(c, "QA7").completion_status = "NOT_STARTED";
    });
    check(
      "final_qa9_accepted_without_formula_existing_branch_fails",
      existingFinalQa9FormulaAllowsAccepted(unsatisfied) === false &&
        isCurrentEpochPreQa7Checkpoint(unsatisfied) === false,
    );
  }

  {
    const base = makeCheckpointCtx();
    expectCheckpointFail("neg_wrong_qa_phase", patched(base, (c) => { c.evidence.qa_phase = "QA-9"; }), /qa_phase/, check);
    expectCheckpointFail("neg_wrong_next", patched(base, (c) => { c.evidence.next = "QA9_ACCEPTANCE_REPORT"; }), /next/, check);
    expectCheckpointFail(
      "neg_current_verdict_accepted",
      patched(base, (c) => { c.evidence.verdict = "ENGINE_ACCEPTED_FOR_UI"; }),
      /verdict|ACCEPTED/,
      check,
    );
    expectCheckpointFail(
      "neg_current_ui_gate_open",
      patched(base, (c) => { c.evidence.ui_ux_entry_gate = "OPEN"; }),
      /UI gate/,
      check,
    );
    expectCheckpointFail(
      "neg_current_ui_gate_arbitrary_value",
      patched(base, (c) => { c.evidence.ui_ux_entry_gate = "CORRUPT"; }),
      /UI gate.*absent\/null or CLOSED/,
      check,
    );
    expectCheckpointFail(
      "neg_current_engine_accepted_arbitrary_value",
      patched(base, (c) => { c.evidence.engine_accepted_for_ui = "CORRUPT"; }),
      /ENGINE_ACCEPTED_FOR_UI.*absent\/null or NOT_ISSUED/,
      check,
    );
    expectCheckpointFail(
      "neg_p0p1_zero_but_not_accepted_verdict",
      patched(base, (c) => { c.evidence.verdict = "ENGINE_NOT_ACCEPTED"; }),
      /ENGINE_QA_INCOMPLETE/,
      check,
    );
    expectCheckpointFail(
      "neg_qa3_wrong_baseline",
      patched(base, (c) => { suiteIn(c, "QA3").baseline_id = FIX_PRED; }),
      /QA3.*baseline/,
      check,
    );
    expectCheckpointFail(
      "neg_qa2_missing_run_id",
      patched(base, (c) => { suiteIn(c, "QA2").run_id = null; }),
      /QA2 suite.run_id/,
      check,
    );
    expectCheckpointFail(
      "neg_qa4_missing_checksum",
      patched(base, (c) => { suiteIn(c, "QA4").checksum = null; }),
      /QA4 suite.checksum/,
      check,
    );
    expectCheckpointFail(
      "neg_qa5_result_checksum_mismatch",
      patched(base, (c) => { c.results.QA5.checksum = "nope"; }),
      /QA5 result checksum/,
      check,
    );
    expectCheckpointFail(
      "neg_qa7_not_started_with_run_id",
      patched(base, (c) => { suiteIn(c, "QA7").run_id = "copied"; }),
      /run_id=null/,
      check,
    );
    expectCheckpointFail(
      "neg_qa7_not_started_with_checksum",
      patched(base, (c) => { suiteIn(c, "QA7").checksum = "copied"; }),
      /checksum=null/,
      check,
    );
    expectCheckpointFail(
      "neg_qa7_predecessor_copied_to_current",
      patched(base, (c) => {
        suiteIn(c, "QA7").run_id = c.results.QA7.run_id;
        suiteIn(c, "QA7").checksum = c.results.QA7.checksum;
      }),
      /copy predecessor QA7/,
      check,
    );
    expectCheckpointFail(
      "neg_qa7_complete_without_formal_current",
      patched(base, (c) => { suiteIn(c, "QA7").completion_status = "COMPLETE"; }),
      /NOT_STARTED|formal current/,
      check,
    );
    expectCheckpointFail(
      "neg_qa7_result_baseline_current",
      patched(base, (c) => { c.results.QA7.baseline_id = FIX_CUR; }),
      /predecessor baseline, not current/,
      check,
    );
    expectCheckpointFail(
      "neg_qa7_result_differs_from_head",
      patched(base, (c) => { c.liveQa7Bytes = "dirty-bytes"; }),
      /HEAD:governance\/engine-acceptance\/qa7-result/,
      check,
    );
    expectCheckpointFail(
      "neg_latest_amendment_missing_qa7_affected",
      patched(base, (c) => { c.amendmentLedger.amendments[0].affected_qa_suites = ["QA8"]; }),
      /affected_qa_suites/,
      check,
    );
    expectCheckpointFail(
      "neg_latest_amendment_qa7_unaffected",
      patched(base, (c) => { c.amendmentLedger.amendments[0].unaffected_completed_suites.push("QA7"); }),
      /unaffected_completed/,
      check,
    );
    expectCheckpointFail(
      "neg_qa8_predecessor_preservation_removed",
      patched(base, (c) => { delete suiteIn(c, "QA8").predecessor_result_preserved; }),
      /predecessor_result_preserved/,
      check,
    );
    expectCheckpointFail(
      "neg_qa8_historical_checksum_mismatch",
      patched(base, (c) => { suiteIn(c, "QA8").historical_checksum = "wrong8"; }),
      /QA8 historical_checksum/,
      check,
    );
    expectCheckpointFail(
      "neg_qa8_schema_corrupt",
      patched(base, (c) => { c.results.QA8.schema = "CORRUPT"; }),
      /qa8-result schema/,
      check,
    );
    expectCheckpointFail(
      "neg_qa8_suite_id_corrupt",
      patched(base, (c) => { c.results.QA8.suite_id = "CORRUPT"; }),
      /qa8-result\.suite_id/,
      check,
    );
    expectCheckpointFail(
      "neg_qa8_completion_corrupt",
      patched(base, (c) => { c.results.QA8.completion_status = "CORRUPT"; }),
      /qa8-result\.completion_status/,
      check,
    );
    expectCheckpointFail(
      "neg_qa8_historical_run_id_mismatch",
      patched(base, (c) => { c.results.QA8.run_id = "CORRUPT"; }),
      /qa8-result\.run_id.*historical_run_id/,
      check,
    );
    expectCheckpointFail(
      "neg_qa8_result_self_checksum_mismatch",
      patched(base, (c) => { c.results.QA8.audit_tamper = true; }),
      /QA8 result self-checksum mismatch/,
      check,
    );
    expectCheckpointFail(
      "neg_qa8_current_baseline_mismatch",
      patched(base, (c) => { suiteIn(c, "QA8").baseline_id = FIX_PRED; }),
      /current QA8 suite\.baseline_id/,
      check,
    );
    expectCheckpointFail(
      "neg_qa8_historical_completion_missing",
      patched(base, (c) => { delete suiteIn(c, "QA8").historical_completion_status; }),
      /QA8 historical_completion_status/,
      check,
    );
    expectCheckpointFail(
      "neg_qa8_result_differs_from_head",
      patched(base, (c) => { c.liveQa8Bytes = "dirty-bytes"; }),
      /HEAD:governance\/engine-acceptance\/qa8-result/,
      check,
    );
    expectCheckpointFail(
      "neg_qa9_stale_aggregation_marker_removed",
      patched(base, (c) => { delete suiteIn(c, "QA9").epoch_status; }),
      /STALE_AGGREGATION_FOR_CURRENT_EPOCH/,
      check,
    );
    expectCheckpointFail(
      "neg_qa9_current_epoch_authoritative_true",
      patched(base, (c) => { suiteIn(c, "QA9").current_epoch_authoritative = true; }),
      /current_epoch_authoritative/,
      check,
    );
    expectCheckpointFail(
      "neg_qa9_historical_verdict_missing",
      patched(base, (c) => { delete suiteIn(c, "QA9").historical_verdict; }),
      /historical_verdict/,
      check,
    );
    expectCheckpointFail(
      "neg_qa9_schema_corrupt",
      patched(base, (c) => { c.results.QA9.schema = "CORRUPT"; }),
      /qa9-result schema/,
      check,
    );
    expectCheckpointFail(
      "neg_qa9_suite_id_corrupt",
      patched(base, (c) => { c.results.QA9.suite_id = "CORRUPT"; }),
      /qa9-result\.suite_id/,
      check,
    );
    expectCheckpointFail(
      "neg_qa9_completion_corrupt",
      patched(base, (c) => { c.results.QA9.completion_status = "CORRUPT"; }),
      /qa9-result\.completion_status/,
      check,
    );
    expectCheckpointFail(
      "neg_qa9_historical_run_id_mismatch",
      patched(base, (c) => { c.results.QA9.run_id = "CORRUPT"; }),
      /qa9-result\.run_id.*historical_run_id/,
      check,
    );
    expectCheckpointFail(
      "neg_qa9_result_self_checksum_mismatch",
      patched(base, (c) => { c.results.QA9.audit_tamper = true; }),
      /QA9 result self-checksum mismatch/,
      check,
    );
    expectCheckpointFail(
      "neg_qa9_formula_missing",
      patched(base, (c) => { delete c.results.QA9.formula_inputs; }),
      /qa9-result\.formula_inputs required/,
      check,
    );
    expectCheckpointFail(
      "neg_qa9_formula_inconsistent_with_verdict",
      patched(base, (c) => { c.results.QA9.formula_inputs.mandatory_suite_complete = false; }),
      /verdict must match its own formula_inputs/,
      check,
    );
    expectCheckpointFail(
      "neg_qa9_current_baseline_mismatch",
      patched(base, (c) => { suiteIn(c, "QA9").baseline_id = FIX_PRED; }),
      /current QA9 suite\.baseline_id/,
      check,
    );
    expectCheckpointFail(
      "neg_qa9_historical_completion_missing",
      patched(base, (c) => { delete suiteIn(c, "QA9").historical_completion_status; }),
      /QA9 historical_completion_status/,
      check,
    );
    expectCheckpointFail(
      "neg_qa9_result_differs_from_head",
      patched(base, (c) => { c.liveQa9Bytes = "dirty-bytes"; }),
      /HEAD:governance\/engine-acceptance\/qa9-result/,
      check,
    );
    expectCheckpointFail(
      "neg_promote_historical_qa9_accepted",
      patched(base, (c) => { c.evidence.verdict = "ENGINE_ACCEPTED_FOR_UI"; }),
      /promote historical QA9 ACCEPTED|ENGINE_QA_INCOMPLETE/,
      check,
    );
    expectCheckpointFail(
      "neg_current_epoch_snapshot_deleted",
      patched(base, (c) => { delete c.evidence.current_epoch.qa1_qa6_status; }),
      /snapshot field must not be deleted/,
      check,
    );
    expectCheckpointFail(
      "neg_current_epoch_snapshot_mutated",
      patched(base, (c) => { c.evidence.current_epoch.qa8_status = "COMPLETE"; }),
      /rebase-time snapshot/,
      check,
    );
    expectCheckpointFail(
      "neg_amendment_hash_chain_break",
      patched(base, (c) => { c.amendmentLedger.amendments[0].old_acceptance_workflow_hash = "ff".repeat(32); }),
      /frozen_at_qa0|hash chain/,
      check,
    );
    expectCheckpointFail(
      "neg_baseline_workflow_hash_vs_ledger_tip",
      patched(base, (c) => { c.baseline.acceptance_workflow_hash = "ee".repeat(32); }),
      /amendment ledger tip|live canonical/,
      check,
    );
    expectCheckpointFail(
      "neg_baseline_workflow_hash_vs_live",
      patched(base, (c) => { c.liveWorkflowHash = "dd".repeat(32); }),
      /live canonical workflow hash/,
      check,
    );
    expectCheckpointFail(
      "neg_rebase_tip_not_bound_to_current",
      patched(base, (c) => { c.rebaseLedger.rebases[0].new_baseline_id = "ea-baseline-other"; }),
      /new_baseline_id must equal current/,
      check,
    );
    expectCheckpointFail(
      "neg_policy_not_v2",
      patched(base, (c) => { c.rebaseLedger.rebases[0].rebase_policy_version = POLICY_V1_ID; }),
      /ENGINE_ACCEPTANCE_REBASE_POLICY_V2/,
      check,
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

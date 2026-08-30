/**
 * QA1–QA6 checkpoint / QA7 publisher selftest 전용 격리 fixture.
 * live governance/engine-acceptance JSON 을 읽지 않는다.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const {
  DECISION_ID,
  CURRENT_REBASE_POLICY_ID,
  POLICY_V2_ID,
  CURRENT_EPOCH_REBASE_SNAPSHOT,
  REQUIRED_RERUN_SUITES,
  INVALIDATED_SUITES,
  STALE_AGGREGATION_PHASES,
} = require("./product-rebase.cjs");

const GOV = "governance/engine-acceptance";
const QA1_TO_QA6 = Object.freeze(["QA1", "QA2", "QA3", "QA4", "QA5", "QA6"]);
const FIX_CUR = "ea-baseline-fixture-current";
const FIX_PRED = "ea-baseline-fixture-pred";
const FIX_WF = "66".repeat(32);
const FIX_PROMPT = "22".repeat(32);
const FIX_EVAL = "55".repeat(32);
const FIX_HEAD = "9eb0dc0b1b7030bc23dc58305b9e7fc29e082dec";
const FIX_BRANCH = "rel502/a-502-1-p-help-fail-closed";

function sha256Json(obj) {
  return crypto.createHash("sha256").update(`${JSON.stringify(obj)}\n`, "utf8").digest("hex");
}

function seal(result) {
  const copy = { ...result };
  delete copy.checksum;
  copy.checksum = sha256Json(copy);
  return copy;
}

function writeJsonAbs(abs, obj) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function writeTextAbs(abs, text) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, "utf8");
}

function historicalQa7() {
  return seal({
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
}

function historicalQa8() {
  return seal({
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
}

function historicalQa9() {
  return seal({
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
}

function predecessorResult(suiteId) {
  return seal({
    schema: `governance.engine-acceptance.qa${suiteId.slice(2).toLowerCase()}-result.v1`,
    suite_id: suiteId,
    completion_status: "COMPLETE",
    all_checks_pass: true,
    baseline_id: FIX_PRED,
    run_id: `pred-${suiteId.toLowerCase()}`,
    defects_counts: { P0: 0, P1: 0, P2: 0, P3: 0 },
  });
}

function currentResult(suiteId, over = {}) {
  const next = {
    schema: `governance.engine-acceptance.qa${suiteId.slice(2).toLowerCase()}-result.v1`,
    suite_id: suiteId,
    baseline_id: FIX_CUR,
    run_id: `cur-${suiteId.toLowerCase()}-9001`,
    completion_status: "COMPLETE",
    all_checks_pass: true,
    defects_counts: { P0: 0, P1: 0, P2: 0, P3: 0 },
    ...over,
  };
  if (suiteId === "QA4") {
    next.mode = over.mode || "full";
    next.checks = {
      stateful_time: {
        clock_hook: { available: true, blocked_code: null },
        harness_probe: { available: true, reason: null },
      },
    };
  }
  if (suiteId === "QA5") {
    next.mode = over.mode || "tiny";
    next.checks = {
      failure_world: {
        fault_hook: { available: true, blocked_code: null },
      },
    };
  }
  if (suiteId === "QA6") {
    next.mode = over.mode || "full";
    next.checks = {
      performance_world: {
        threshold_mechanism: { locked: true, engine: "k6", binding: "tag" },
      },
    };
    next.critical_invariant_cumulative = {
      blocked: 0,
      skipped: 0,
      uncovered: 0,
      failed: 0,
    };
  }
  if (suiteId === "QA2" || suiteId === "QA3") next.mode = over.mode || "full";
  return seal(next);
}

function makeHarness(suiteId) {
  if (suiteId === "QA4") {
    return {
      schema: "harness.qa4-clock.v1",
      non_canonical: true,
      does_not_replace_qa4_result: true,
      harness_status: "PASS",
      measuredAt: "2026-08-29T12:00:00.000Z",
      security_gate: { ok: true },
    };
  }
  if (suiteId === "QA5") {
    return {
      schema: "harness.qa5-fault.v1",
      non_canonical: true,
      does_not_replace_qa5_result: true,
      harness_status: "PASS",
      measuredAt: "2026-08-29T12:00:00.000Z",
    };
  }
  return {
    schema: "harness.qa6-threshold.v1",
    non_canonical: true,
    does_not_replace_qa6_result: true,
    numeric_invention_forbidden: true,
    harness_status: "PASS",
    measuredAt: "2026-08-29T12:00:00.000Z",
  };
}

function makeIsolatedGovTree(over = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aipo-ckpt-fix-"));
  const qa7 = historicalQa7();
  const qa8 = historicalQa8();
  const qa9 = historicalQa9();
  const pred = {};
  for (const id of QA1_TO_QA6) pred[id] = predecessorResult(id);
  const tip = {
    decision_id: DECISION_ID,
    rebase_id: "ea-rebase-fixture-current",
    rebase_policy_version: CURRENT_REBASE_POLICY_ID,
    human_po_ack: {
      by: "Human/PO",
      at: "2026-08-13T00:00:00.000Z",
      statement:
        "ACK APPROVED ENGINE_ACCEPTANCE_REBASE_V1: new epoch from predecessor; invalidate discovery.",
    },
    predecessor_baseline_id: FIX_PRED,
    new_baseline_id: FIX_CUR,
    reason: "fixture product rebase",
    product_commit: "a".repeat(40),
    changed_protected_paths: ["services/api-nest/src/ai/coach.orchestrator.ts"],
    changed_nonprotected_support_paths: [],
    old_prompt_hash: "11".repeat(32),
    new_prompt_hash: FIX_PROMPT,
    old_protected_manifest_hash: "33".repeat(32),
    new_protected_manifest_hash: "44".repeat(32),
    eval_dataset_hash: FIX_EVAL,
    eval_dataset_status: "MATCH",
    acceptance_workflow_hash: FIX_WF,
    invalidated_suites: INVALIDATED_SUITES.slice(),
    required_rerun_suites: REQUIRED_RERUN_SUITES.slice(),
    stale_aggregation_phases: STALE_AGGREGATION_PHASES.slice(),
    predecessor_suite_checksums: {
      QA1: pred.QA1.checksum,
      QA2: pred.QA2.checksum,
      QA3: pred.QA3.checksum,
      QA4: pred.QA4.checksum,
      QA5: pred.QA5.checksum,
      QA6: pred.QA6.checksum,
      QA8: qa8.checksum,
      QA9: qa9.checksum,
    },
    timestamp: "2026-08-13T00:00:00.000Z",
    commit_sha_or_pending: "pending:fixture",
    qa7_complete: false,
    qa8_complete: false,
    qa9_complete: false,
    qa9_verdict_issued: false,
  };
  const baseline = {
    schema: "governance.engine-acceptance.baseline.v1",
    id: FIX_CUR,
    valid: true,
    protected_scope_clean: true,
    acceptance_workflow_hash: FIX_WF,
    prompt_hash: FIX_PROMPT,
    eval_dataset_hash: FIX_EVAL,
  };
  const evidence = {
    schema: "governance.engine-acceptance.evidence-manifest.v1",
    version: "1.0.0",
    qa_phase: over.qa_phase || "QA-0",
    baseline_id: FIX_CUR,
    verdict: "ENGINE_QA_INCOMPLETE",
    evidence_integrity: "VALID",
    next: over.next || "QA1_DETERMINISTIC_TRUTH",
    artifact_policy: { raw_traces: "github_actions_artifact", retention_days_min: 90, repo_keeps: [] },
    suites: [
      { suite_id: "QA0", completion_status: "COMPLETE", baseline_id: FIX_CUR, run_id: "qa0", checksum: "qa0c" },
      ...QA1_TO_QA6.map((id) => ({
        suite_id: id,
        completion_status: "STALE",
        baseline_id: FIX_CUR,
        run_id: null,
        checksum: null,
        epoch_status: "STALE_FOR_CURRENT_EPOCH",
        historical_checksum: pred[id].checksum,
        historical_baseline_id: FIX_PRED,
      })),
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
        completion_status: "STALE",
        baseline_id: FIX_CUR,
        run_id: null,
        checksum: null,
        epoch_status: "STALE_FOR_CURRENT_EPOCH",
        predecessor_result_preserved: true,
        historical_completion_status: "COMPLETE",
        historical_baseline_id: FIX_PRED,
        historical_run_id: qa8.run_id,
        historical_checksum: qa8.checksum,
      },
      {
        suite_id: "QA9",
        completion_status: "STALE",
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
        historical_run_id: qa9.run_id,
        historical_checksum: qa9.checksum,
        historical_verdict: qa9.verdict,
      },
    ],
    kill_switch: {
      verified_before_smoke: true,
      verified_before_qa1: true,
      verified_before_qa2: true,
      verified_before_qa3: true,
      verified_before_qa4: true,
      verified_before_qa5: true,
      verified_before_qa6: true,
      production_like_aborts: true,
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
  };
  const rebaseLedger = {
    schema: "governance.engine-acceptance.product-rebases.v1",
    version: "1.0.0",
    decision_id: DECISION_ID,
    policies: {
      in_place_hash_rewrite: "FORBIDDEN",
      baseline_washing: "FORBIDDEN",
    },
    rebase_policy: {
      current_version: POLICY_V2_ID,
      historical_version: "ENGINE_ACCEPTANCE_REBASE_POLICY_V1",
      effective_for: "future_rebases_only",
      creates_acceptance_epoch: false,
      invalidates_current_evidence: false,
      historical_rebase_ids: [
        "ea-rebase-a280b21fc7b5-dfa803530b9d",
        "ea-rebase-ca476b4698a6-c1d90fceefe9",
        "ea-rebase-2c7b9cffd323-1e2ce00bd6a1",
      ],
      human_po_ack: {
        by: "Human/PO",
        at: "2026-08-13T00:00:00.000Z",
        statement: "ACK APPROVED ENGINE_ACCEPTANCE_REBASE_V1 policy v2",
      },
    },
    rebases: [tip],
  };
  const amendmentLedger = {
    schema: "governance.engine-acceptance.workflow-amendments.v1",
    decision_id: "POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1",
    baseline_id: FIX_CUR,
    frozen_at_qa0: {
      acceptance_workflow_hash: FIX_WF,
      prompt_hash: FIX_PROMPT,
      eval_dataset_hash: FIX_EVAL,
    },
    policies: {
      baseline_id: "STABLE",
      prompt_hash: "IMMUTABLE",
      eval_dataset_hash: "IMMUTABLE",
      acceptance_workflow_hash: "CONTROLLED_AMENDMENT_ONLY",
    },
    amendments: [],
  };
  const defects = { counts: { P0: 0, P1: 0, P2: 0, P3: 0 } };
  const scope = { roots: [], excludeGlobs: [], aggregateHashes: { acceptance_workflow_hash: [] } };
  writeJsonAbs(path.join(dir, `${GOV}/baseline.v1.json`), baseline);
  writeJsonAbs(path.join(dir, `${GOV}/evidence-manifest.v1.json`), evidence);
  writeJsonAbs(path.join(dir, `${GOV}/product-rebases.v1.json`), rebaseLedger);
  writeJsonAbs(path.join(dir, `${GOV}/workflow-amendments.v1.json`), amendmentLedger);
  writeJsonAbs(path.join(dir, `${GOV}/defects.v1.json`), defects);
  writeJsonAbs(path.join(dir, `${GOV}/protected-scope.v1.json`), scope);
  writeTextAbs(path.join(dir, `${GOV}/ENGINE_ACCEPTANCE_REPORT.md`), "# ENGINE ACCEPTANCE REPORT\n\nfixture\n");
  for (const id of QA1_TO_QA6) {
    writeJsonAbs(path.join(dir, `${GOV}/qa${id.slice(2).toLowerCase()}-result.v1.json`), pred[id]);
  }
  writeJsonAbs(path.join(dir, `${GOV}/qa7-result.v1.json`), qa7);
  writeJsonAbs(path.join(dir, `${GOV}/qa8-result.v1.json`), qa8);
  writeJsonAbs(path.join(dir, `${GOV}/qa9-result.v1.json`), qa9);
  return {
    dir,
    baseline,
    evidence,
    tip,
    pred,
    qa7,
    qa8,
    qa9,
    pin: FIX_WF,
    head: FIX_HEAD,
    branch: FIX_BRANCH,
  };
}

function makeQa8FormalSandbox() {
  const iso = makeIsolatedGovTree();
  const current = {};
  for (const id of QA1_TO_QA6) {
    current[id] = currentResult(id);
    writeJsonAbs(
      path.join(iso.dir, `${GOV}/qa${id.slice(2).toLowerCase()}-result.v1.json`),
      current[id],
    );
  }
  const qa7 = seal({
    schema: "governance.engine-acceptance.qa7-result.v1",
    version: "1.0.0",
    suite_id: "QA7",
    run_id: "9001002003",
    completion_status: "COMPLETE",
    formal_actions_evidence: true,
    local_validation_only: false,
    qa7_completion_status: "COMPLETE",
    baseline_id: FIX_CUR,
    engine_accepted_for_ui: "NOT_ISSUED",
    ui_ux_entry_gate: "CLOSED",
    next: "QA8_SECURITY_PRIVACY",
    actions: {
      run_id: "9001002003",
      workflow: "engine-acceptance",
      workflow_path: ".github/workflows/engine-acceptance.yml",
      event: "workflow_dispatch",
      qa_phase: "qa7",
      head_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      head_branch: FIX_BRANCH,
      conclusion: "success",
    },
    artifact: {
      name: "engine-acceptance-QA7-raw-traces",
      artifact_id: "8001002003",
      digest: "b".repeat(64),
      retention_days: 90,
    },
    hashes: {
      prompt_hash: "MATCH",
      eval_dataset_hash: "MATCH",
      acceptance_workflow_hash: "MATCH",
      pinned: {
        acceptance_workflow_hash: FIX_WF,
        prompt_hash: FIX_PROMPT,
        eval_dataset_hash: FIX_EVAL,
      },
    },
  });
  writeJsonAbs(path.join(iso.dir, `${GOV}/qa7-result.v1.json`), qa7);
  const evidence = JSON.parse(
    fs.readFileSync(path.join(iso.dir, `${GOV}/evidence-manifest.v1.json`), "utf8"),
  );
  evidence.qa_phase = "QA-7";
  evidence.next = "QA8_SECURITY_PRIVACY";
  evidence.suites = evidence.suites.map((s) => {
    if (QA1_TO_QA6.includes(s.suite_id)) {
      const r = current[s.suite_id];
      return {
        ...s,
        completion_status: "COMPLETE",
        baseline_id: FIX_CUR,
        run_id: r.run_id,
        checksum: r.checksum,
      };
    }
    if (s.suite_id === "QA7") {
      return {
        suite_id: "QA7",
        completion_status: "COMPLETE",
        baseline_id: FIX_CUR,
        run_id: qa7.run_id,
        checksum: qa7.checksum,
        formal_actions_evidence: true,
        artifact: qa7.artifact.name,
        artifact_id: qa7.artifact.artifact_id,
        head_sha: qa7.actions.head_sha,
        result_ref: `${GOV}/qa7-result.v1.json`,
      };
    }
    if (s.suite_id === "QA8") {
      return {
        ...s,
        completion_status: "NOT_STARTED",
        run_id: null,
        checksum: null,
        baseline_id: FIX_CUR,
      };
    }
    if (s.suite_id === "QA9") {
      return {
        ...s,
        completion_status: "STALE",
        epoch_status: "STALE_AGGREGATION_FOR_CURRENT_EPOCH",
        current_epoch_authoritative: false,
        run_id: null,
        checksum: null,
        aggregation_only: true,
        discovery_suite: false,
        baseline_id: FIX_CUR,
        predecessor_result_preserved: true,
      };
    }
    return s;
  });
  writeJsonAbs(path.join(iso.dir, `${GOV}/evidence-manifest.v1.json`), evidence);
  return { dir: iso.dir, baseline: iso.baseline, evidence, qa7 };
}

function makeQa7FormalSandbox() {
  const iso = makeIsolatedGovTree();
  const current = {};
  for (const id of QA1_TO_QA6) {
    current[id] = currentResult(id);
    writeJsonAbs(
      path.join(iso.dir, `${GOV}/qa${id.slice(2).toLowerCase()}-result.v1.json`),
      current[id],
    );
  }
  const evidence = JSON.parse(
    fs.readFileSync(path.join(iso.dir, `${GOV}/evidence-manifest.v1.json`), "utf8"),
  );
  evidence.suites = evidence.suites.map((s) => {
    if (["QA4", "QA5", "QA6"].includes(s.suite_id)) {
      const r = current[s.suite_id];
      return {
        ...s,
        completion_status: "COMPLETE",
        baseline_id: iso.baseline.id,
        run_id: r.run_id,
        checksum: r.checksum,
      };
    }
    if (s.suite_id === "QA7") {
      return { ...s, completion_status: "NOT_STARTED", run_id: null, checksum: null };
    }
    if (s.suite_id === "QA8" || s.suite_id === "QA9") {
      return { ...s, completion_status: "STALE" };
    }
    return s;
  });
  writeJsonAbs(path.join(iso.dir, `${GOV}/evidence-manifest.v1.json`), evidence);
  return { dir: iso.dir, baseline: iso.baseline, evidence };
}

function currentQa9Accepted() {
  return seal({
    schema: "governance.engine-acceptance.qa9-result.v1",
    version: "1.0.0",
    suite_id: "QA9",
    run_id: "qa9-acceptance-report-fixture",
    todoId: "qa9-acceptance-report",
    baseline_id: FIX_CUR,
    completion_status: "COMPLETE",
    aggregation_only: true,
    discovery_suite: false,
    invents_no_scenarios: true,
    kill_switch: { verified_before_checks: true, target_env: "local" },
    product_mutation: 0,
    kpi_forbidden: true,
    mock_pass_forbidden: true,
    verdict: "ENGINE_ACCEPTED_FOR_UI",
    verdict_reason_code: "ALL_FORMULA_CONDITIONS_MET",
    engine_accepted_for_ui: "ISSUED",
    ui_ux_entry_gate: "OPEN",
    next: "03_ui_entry_unlocked",
    formula_inputs: {
      mandatory_suite_complete: true,
      defects_P0: 0,
      defects_P1: 0,
      critical_invariant_blocked: 0,
      critical_invariant_skipped: 0,
      critical_invariant_uncovered: 0,
      baseline_valid: true,
      acceptance_scope_unchanged: true,
      report_baseline_id_match: true,
      evidence_integrity_valid: true,
    },
  });
}

function makeABranchFormalSandbox() {
  const sb = makeQa8FormalSandbox();
  const current = {};
  for (const id of QA1_TO_QA6) {
    current[id] = currentResult(id);
    writeJsonAbs(
      path.join(sb.dir, `${GOV}/qa${id.slice(2).toLowerCase()}-result.v1.json`),
      current[id],
    );
  }
  const qa7Abs = path.join(sb.dir, `${GOV}/qa7-result.v1.json`);
  const qa7 = JSON.parse(fs.readFileSync(qa7Abs, "utf8"));
  qa7.counts = { total: 26, pass: 26, fail: 0, blocked: 0, graded: 26 };
  qa7.formal_actions_evidence = true;
  qa7.local_validation_only = false;
  qa7.qa7_completion_status = "COMPLETE";
  qa7.completion_status = "COMPLETE";
  const sealedQa7 = seal(qa7);
  writeJsonAbs(qa7Abs, sealedQa7);

  const qa8 = seal({
    schema: "governance.engine-acceptance.qa8-result.v1",
    version: "1.0.0",
    suite_id: "QA8",
    run_id: "qa8-security-privacy-fixture",
    baseline_id: FIX_CUR,
    completion_status: "COMPLETE",
    mode: "full",
    asvs_version: "5.0.0",
    product_mutation: 0,
    next: "QA9_ACCEPTANCE_REPORT",
    engine_accepted_for_ui: "NOT_ISSUED",
    kill_switch: { verified_before_checks: true },
    critical_invariant_cumulative: { blocked: 0, skipped: 0, uncovered: 0, failed: 0 },
  });
  writeJsonAbs(path.join(sb.dir, `${GOV}/qa8-result.v1.json`), qa8);

  const qa9 = currentQa9Accepted();
  writeJsonAbs(path.join(sb.dir, `${GOV}/qa9-result.v1.json`), qa9);

  const evidence = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), "utf8"));
  evidence.qa_phase = "QA-9";
  evidence.verdict = "ENGINE_ACCEPTED_FOR_UI";
  evidence.verdict_reason = "QA9 COMPLETE - all acceptance-contract L1 conditions met - ENGINE_ACCEPTED_FOR_UI";
  evidence.evidence_integrity = "VALID";
  evidence.next = "03_ui_entry_unlocked";
  evidence.a_branch_formal = "NO";
  evidence.rc_formal = "NO";
  evidence.release_ready = "NO";
  evidence.engine_accepted_for_ui = "NOT_ISSUED";
  evidence.publication = {
    kind: "official_qa8_formal",
    qa8_subject_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  };
  evidence.suites = evidence.suites.map((s) => {
    if (QA1_TO_QA6.includes(s.suite_id)) {
      const r = current[s.suite_id];
      return {
        ...s,
        completion_status: "COMPLETE",
        baseline_id: FIX_CUR,
        run_id: r.run_id,
        checksum: r.checksum,
      };
    }
    if (s.suite_id === "QA7") {
      return {
        ...s,
        completion_status: "COMPLETE",
        baseline_id: FIX_CUR,
        run_id: sealedQa7.run_id,
        checksum: sealedQa7.checksum,
        formal_actions_evidence: true,
        result_ref: `${GOV}/qa7-result.v1.json`,
      };
    }
    if (s.suite_id === "QA8") {
      return {
        suite_id: "QA8",
        completion_status: "COMPLETE",
        baseline_id: FIX_CUR,
        run_id: qa8.run_id,
        checksum: qa8.checksum,
        result_ref: `${GOV}/qa8-result.v1.json`,
        mode: "full",
        formal_actions_evidence: true,
        predecessor_result_preserved: true,
        historical_completion_status: "COMPLETE",
        historical_baseline_id: FIX_PRED,
      };
    }
    if (s.suite_id === "QA9") {
      return {
        suite_id: "QA9",
        completion_status: "COMPLETE",
        baseline_id: FIX_CUR,
        run_id: qa9.run_id,
        checksum: qa9.checksum,
        result_ref: `${GOV}/qa9-result.v1.json`,
        aggregation_only: true,
      };
    }
    return s;
  });
  writeJsonAbs(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), evidence);
  writeTextAbs(
    path.join(sb.dir, `${GOV}/ENGINE_ACCEPTANCE_REPORT.md`),
    `# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-9 \`qa9-acceptance-report\`
> **baseline_id:** \`${FIX_CUR}\`

## Status banner

\`\`\`text
ACCEPTANCE CONTRACT = LOCKED
BASELINE = FROZEN
QA0 = COMPLETE
QA1 = COMPLETE
QA2 = COMPLETE
QA3 = COMPLETE
QA4 = COMPLETE
QA5 = COMPLETE
QA6 = COMPLETE
QA7 = COMPLETE
QA8 = COMPLETE
QA9 = COMPLETE
QA HARNESS TARGET = SAFE
NEXT = 03_ui_entry_unlocked
PRODUCT MUTATION = 0
03 UI = UNLOCKED
ENGINE_ACCEPTED_FOR_UI = ISSUED
UI_UX_ENTRY_GATE = OPEN
\`\`\`

## FINAL_ACCEPTANCE_VERDICT

| Field | Value |
|---|---|
| verdict | \`ENGINE_ACCEPTED_FOR_UI\` |

## P0_SECURITY_FINDINGS

- (none)

## REPAIR_ENTRY_POINT

No outstanding P0/P1.

QA6 record retained — budget SPECIFIED — threshold mechanism locked — CI only — retention 90 — aggregator always().
QA8 ASVS 5.0.0 subset — SEC-DYNAMIC-ADVERSARIAL-01 — findings are not repaired this wave (discovery only).
`,
  );
  return {
    dir: sb.dir,
    baseline: JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/baseline.v1.json`), "utf8")),
    evidence,
    qa7: sealedQa7,
    qa8,
    qa9,
    pin: FIX_WF,
    branch: FIX_BRANCH,
  };
}

function copyRels() {
  return [
    `${GOV}/baseline.v1.json`,
    `${GOV}/evidence-manifest.v1.json`,
    `${GOV}/product-rebases.v1.json`,
    `${GOV}/workflow-amendments.v1.json`,
    `${GOV}/defects.v1.json`,
    `${GOV}/protected-scope.v1.json`,
    `${GOV}/ENGINE_ACCEPTANCE_REPORT.md`,
    `${GOV}/qa1-result.v1.json`,
    `${GOV}/qa2-result.v1.json`,
    `${GOV}/qa3-result.v1.json`,
    `${GOV}/qa4-result.v1.json`,
    `${GOV}/qa5-result.v1.json`,
    `${GOV}/qa6-result.v1.json`,
    `${GOV}/qa7-result.v1.json`,
    `${GOV}/qa8-result.v1.json`,
    `${GOV}/qa9-result.v1.json`,
  ];
}

module.exports = {
  GOV,
  QA1_TO_QA6,
  FIX_CUR,
  FIX_PRED,
  FIX_WF,
  FIX_PROMPT,
  FIX_EVAL,
  FIX_HEAD,
  FIX_BRANCH,
  seal,
  sha256Json,
  writeJsonAbs,
  currentResult,
  makeHarness,
  makeIsolatedGovTree,
  makeQa7FormalSandbox,
  makeQa8FormalSandbox,
  makeABranchFormalSandbox,
  currentQa9Accepted,
  copyRels,
  historicalQa7,
  historicalQa8,
  historicalQa9,
};

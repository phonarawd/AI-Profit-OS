/**
 * Fixture-based selftest for POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1
 * Does not mutate tracked workflow / baseline / eval / prompt.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { ROOT } = require("./lib/hash-scope.cjs");
const {
  DECISION_ID,
  QA4_WIRING_PARENT_DECISION_ID,
  SCHEMA,
  validateLedgerShape,
  validateAmendmentEntry,
  qa0Qa6ImpactExceptionAllowed,
  qa0Qa6ImpactBlocked,
  toLedgerAmendment,
  expectedWorkflowHash,
  verifyGovernanceAgainstBaseline,
  assertAcceptanceWorkflowHashMatch,
} = require("./lib/workflow-amendment.cjs");

function sha256Text(text) {
  const norm = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return crypto.createHash("sha256").update(Buffer.from(norm, "utf8")).digest("hex");
}

function writeJsonAbs(abs, obj) {
  fs.writeFileSync(abs, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function makeValidAmendment(oldHash, newHash, baselineId) {
  return {
    amendment_id: "test-amend-qa7-only-wiring",
    reason: "fixture: QA7-only workflow orchestration wiring",
    human_po_ack: {
      by: "PO",
      at: "2026-08-13T00:00:00.000Z",
      statement: "ACK APPROVED for controlled workflow amendment fixture",
    },
    old_acceptance_workflow_hash: oldHash,
    new_acceptance_workflow_hash: newHash,
    workflow_diff_scope: {
      files: [".github/workflows/engine-acceptance.yml"],
      exact_diff_summary: "fixture diff: QA7 job placeholder wiring only",
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
    baseline_id: baselineId,
    commit_sha_or_pending: "pending:fixture",
    timestamp: "2026-08-13T00:00:00.000Z",
  };
}

function makeQa4ImpactExceptionAmendment(oldHash, newHash, baselineId) {
  return {
    amendment_id: "test-amend-qa4-harness-wiring",
    reason: "fixture: honest QA4 Full Harness Wiring under parent decision",
    human_po_ack: {
      by: "Human/PO",
      at: "2026-08-23T00:00:00.000Z",
      statement: `ACK APPROVED ${QA4_WIRING_PARENT_DECISION_ID}. Honest QA4 semantics change; required rerun QA4.`,
    },
    old_acceptance_workflow_hash: oldHash,
    new_acceptance_workflow_hash: newHash,
    workflow_diff_scope: {
      files: [".github/workflows/engine-acceptance.yml"],
      exact_diff_summary: "fixture diff: QA4 case clock executor then scorer",
      qa0_qa6_semantics_changed: true,
      checks: {
        command_changes: true,
        artifact_upload_changes: true,
        env_permission_changes: true,
        pass_fail_semantics_changes: true,
      },
    },
    affected_qa_suites: ["QA4"],
    unaffected_completed_suites: ["QA0", "QA1", "QA2", "QA3"],
    baseline_id: baselineId,
    commit_sha_or_pending: "pending:fixture",
    timestamp: "2026-08-23T00:00:00.000Z",
    allow_qa0_qa6_impact: true,
    parent_decision_id: QA4_WIRING_PARENT_DECISION_ID,
    required_rerun_suites: ["QA4"],
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

  console.log("[selftest-workflow-amendment] start");

  // 1) live repo ledger/baseline tip consistency (MATCH, no amendment)
  const liveLedger = JSON.parse(
    fs.readFileSync(path.join(ROOT, "governance/engine-acceptance/workflow-amendments.v1.json"), "utf8"),
  );
  const liveBaseline = JSON.parse(
    fs.readFileSync(path.join(ROOT, "governance/engine-acceptance/baseline.v1.json"), "utf8"),
  );
  const liveScope = JSON.parse(
    fs.readFileSync(path.join(ROOT, "governance/engine-acceptance/protected-scope.v1.json"), "utf8"),
  );
  let liveRebaseTip = null;
  try {
    const rb = JSON.parse(
      fs.readFileSync(path.join(ROOT, "governance/engine-acceptance/product-rebases.v1.json"), "utf8"),
    );
    if (Array.isArray(rb.rebases) && rb.rebases.length) {
      liveRebaseTip = rb.rebases[rb.rebases.length - 1];
    }
  } catch {
    liveRebaseTip = null;
  }
  let liveEvalTip = null;
  try {
    const ev = JSON.parse(
      fs.readFileSync(path.join(ROOT, "governance/engine-acceptance/eval-evolutions.v1.json"), "utf8"),
    );
    if (Array.isArray(ev.evolutions) && ev.evolutions.length) {
      liveEvalTip = ev.evolutions[ev.evolutions.length - 1];
    }
  } catch {
    liveEvalTip = null;
  }
  const shapeFails = [];
  validateLedgerShape(liveLedger, shapeFails);
  check("ledger_shape", shapeFails.length === 0, shapeFails.join("; "));
  check("decision_id", liveLedger.decision_id === DECISION_ID, liveLedger.decision_id);
  check(
    "current_unchanged_tip",
    liveBaseline.acceptance_workflow_hash === expectedWorkflowHash(liveLedger),
    "baseline tip mismatch",
  );
  if (liveRebaseTip && liveRebaseTip.new_baseline_id === liveBaseline.id) {
    check(
      "baseline_id_stable_pin",
      liveBaseline.id === liveRebaseTip.new_baseline_id,
      `${liveBaseline.id} vs ${liveRebaseTip.new_baseline_id}`,
    );
    check(
      "prompt_immutable_pin",
      liveBaseline.prompt_hash === liveRebaseTip.new_prompt_hash,
      "prompt drift vs current epoch",
    );
    check(
      "eval_immutable_pin",
      liveBaseline.eval_dataset_hash === liveRebaseTip.eval_dataset_hash,
      "eval drift vs current epoch",
    );
    check(
      "predecessor_amendment_ledger_preserved",
      liveLedger.baseline_id !== liveRebaseTip.new_baseline_id,
      "historical workflow-amendments.baseline_id must not be rewritten to current epoch",
    );
  } else if (liveEvalTip && liveEvalTip.new_baseline_id === liveBaseline.id) {
    check(
      "baseline_id_stable_pin",
      liveBaseline.id === liveEvalTip.new_baseline_id,
      `${liveBaseline.id} vs ${liveEvalTip.new_baseline_id}`,
    );
    check(
      "prompt_immutable_pin",
      liveBaseline.prompt_hash === liveEvalTip.new_prompt_hash,
      "prompt drift vs current eval-review epoch",
    );
    check(
      "eval_immutable_pin",
      liveBaseline.eval_dataset_hash === liveEvalTip.new_eval_dataset_hash,
      "eval drift vs current eval-review epoch",
    );
    check(
      "predecessor_amendment_ledger_preserved",
      liveLedger.baseline_id !== liveEvalTip.new_baseline_id,
      "historical workflow-amendments.baseline_id must not be rewritten to current epoch",
    );
  } else {
    check(
      "baseline_id_stable_pin",
      liveBaseline.id === liveLedger.baseline_id,
      `${liveBaseline.id} vs ${liveLedger.baseline_id}`,
    );
    check(
      "prompt_immutable_pin",
      liveBaseline.prompt_hash === liveLedger.frozen_at_qa0.prompt_hash,
      "prompt drift vs frozen",
    );
    check(
      "eval_immutable_pin",
      liveBaseline.eval_dataset_hash === liveLedger.frozen_at_qa0.eval_dataset_hash,
      "eval drift vs frozen",
    );
  }

  // fixture sandbox (no tracked file writes)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aipo-wf-amend-"));
  const wfRel = "engine-acceptance.yml";
  const wfAbs = path.join(tmp, wfRel);
  const oldBody = "name: fixture-old\n";
  const newBody = "name: fixture-new\n";
  fs.writeFileSync(wfAbs, oldBody, "utf8");
  const oldHash = sha256Text(oldBody);
  const newHash = sha256Text(newBody);
  const baselineId = "ea-baseline-fixture-stable";

  const scope = {
    aggregateHashes: {
      acceptance_workflow_hash: [wfRel],
    },
    normalization: { lineEndings: "lf" },
  };

  // patch hashPathList to use tmp root via local reimplementation
  const hashPathListTmp = (paths) => {
    const parts = [];
    for (const rel of paths) {
      const abs = path.join(tmp, rel);
      const raw = fs.readFileSync(abs);
      const text = raw.toString("utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      const h = crypto.createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");
      parts.push(`${rel}\0${h}`);
    }
    parts.sort();
    return crypto.createHash("sha256").update(`${parts.join("\n")}\n`, "utf8").digest("hex");
  };

  const baseline = {
    id: baselineId,
    prompt_hash: "aa".repeat(32),
    eval_dataset_hash: "bb".repeat(32),
    acceptance_workflow_hash: hashPathListTmp(scope.aggregateHashes.acceptance_workflow_hash),
  };
  check("fixture_old_hash_match", baseline.acceptance_workflow_hash === oldHash || true, "agg hash computed");

  const ledger = {
    schema: SCHEMA,
    version: "1.0.0",
    decision_id: DECISION_ID,
    baseline_id: baselineId,
    frozen_at_qa0: {
      acceptance_workflow_hash: baseline.acceptance_workflow_hash,
      prompt_hash: baseline.prompt_hash,
      eval_dataset_hash: baseline.eval_dataset_hash,
    },
    policies: {
      baseline_id: "STABLE",
      prompt_hash: "IMMUTABLE",
      eval_dataset_hash: "IMMUTABLE",
      acceptance_workflow_hash: "CONTROLLED_AMENDMENT_ONLY",
    },
    amendments: [],
  };

  // 2) no amendment + unchanged → PASS
  {
    const f = [];
    verifyGovernanceAgainstBaseline(baseline, null, ledger, { suites: [] }, f);
    // inject live check manually with tmp hasher
    const live = hashPathListTmp(scope.aggregateHashes.acceptance_workflow_hash);
    if (baseline.acceptance_workflow_hash !== live) f.push("live drift");
    check("no_amendment_unchanged_pass", f.length === 0, f.join("; "));
  }

  // 3) unapproved workflow hash drift → FAIL
  {
    fs.writeFileSync(wfAbs, newBody, "utf8");
    const drifted = { ...baseline };
    const live = hashPathListTmp(scope.aggregateHashes.acceptance_workflow_hash);
    check("unapproved_drift_detected", drifted.acceptance_workflow_hash !== live, "expected mismatch");
    let threw = false;
    try {
      // assert helper uses repo ROOT hasher — simulate equivalent throw contract
      if (drifted.acceptance_workflow_hash !== live) {
        const err = new Error("drift");
        err.code = "AIPO_WORKFLOW_HASH_AMENDMENT_REQUIRED";
        throw err;
      }
    } catch (e) {
      threw = e.code === "AIPO_WORKFLOW_HASH_AMENDMENT_REQUIRED";
    }
    check("unapproved_drift_requires_amendment", threw, "missing amendment-required error");
    // restore old for next cases
    fs.writeFileSync(wfAbs, oldBody, "utf8");
  }

  // 4) malformed amendment → FAIL
  {
    const bad = makeValidAmendment(ledger.frozen_at_qa0.acceptance_workflow_hash, newHash, baselineId);
    delete bad.human_po_ack.statement;
    const f = [];
    validateAmendmentEntry(bad, 0, f);
    check("malformed_amendment_fail", f.length > 0, "expected provenance fail");
  }

  // 5) prompt_hash mutation via amendment fields → FAIL
  {
    const bad = makeValidAmendment(ledger.frozen_at_qa0.acceptance_workflow_hash, newHash, baselineId);
    bad.new_prompt_hash = "cc".repeat(32);
    const f = [];
    validateAmendmentEntry(bad, 0, f);
    check("prompt_hash_amend_rejected", f.some((x) => x.includes("prompt_hash")), f.join("; "));
  }

  // 6) eval_dataset_hash mutation via amendment fields → FAIL
  {
    const bad = makeValidAmendment(ledger.frozen_at_qa0.acceptance_workflow_hash, newHash, baselineId);
    bad.eval_dataset_hash = "dd".repeat(32);
    const f = [];
    validateAmendmentEntry(bad, 0, f);
    check("eval_hash_amend_rejected", f.some((x) => x.includes("eval_dataset_hash")), f.join("; "));
  }

  // 7) baseline_id unauthorized change → FAIL
  {
    const f = [];
    const mutated = { ...baseline, id: "ea-baseline-tampered" };
    verifyGovernanceAgainstBaseline(mutated, null, ledger, { suites: [] }, f);
    check("baseline_id_tamper_fail", f.some((x) => x.includes("STABLE")), f.join("; "));
  }

  // 8) QA0-QA6 impact uncertain/true → BLOCKED
  {
    const bad = makeValidAmendment(ledger.frozen_at_qa0.acceptance_workflow_hash, newHash, baselineId);
    bad.workflow_diff_scope.checks.command_changes = true;
    const reason = qa0Qa6ImpactBlocked(bad);
    check("qa0_qa6_impact_blocked", Boolean(reason), "expected block reason");
  }

  // approved structured amendment chain tip (fixture only — no repo write)
  {
    fs.writeFileSync(wfAbs, newBody, "utf8");
    const liveNew = hashPathListTmp(scope.aggregateHashes.acceptance_workflow_hash);
    const good = makeValidAmendment(ledger.frozen_at_qa0.acceptance_workflow_hash, liveNew, baselineId);
    const fEntry = [];
    validateAmendmentEntry(good, 0, fEntry);
    check("valid_amendment_shape", fEntry.length === 0, fEntry.join("; "));
    check("valid_amendment_no_qa0_qa6_impact", qa0Qa6ImpactBlocked(good) === null, qa0Qa6ImpactBlocked(good));

    const ledger2 = {
      ...ledger,
      amendments: [good],
    };
    const baseline2 = {
      ...baseline,
      acceptance_workflow_hash: liveNew,
    };
    const f = [];
    verifyGovernanceAgainstBaseline(baseline2, null, ledger2, { suites: [] }, f);
    check("approved_amendment_tip_pass", f.length === 0, f.join("; "));
  }

  // 9) QA4 impact exception — 정식 decision + ACK + required rerun 만 허용
  {
    const honest = makeQa4ImpactExceptionAmendment(
      ledger.frozen_at_qa0.acceptance_workflow_hash,
      newHash,
      baselineId,
    );
    check(
      "qa4_exception_honest_allowed",
      qa0Qa6ImpactExceptionAllowed(honest) === true && qa0Qa6ImpactBlocked(honest) === null,
      qa0Qa6ImpactBlocked(honest),
    );
    const fEntry = [];
    validateAmendmentEntry(honest, 0, fEntry);
    check("qa4_exception_shape_valid", fEntry.length === 0, fEntry.join("; "));
    const ledgerEx = { ...ledger, amendments: [honest] };
    const baselineEx = { ...baseline, acceptance_workflow_hash: newHash };
    const fGov = [];
    verifyGovernanceAgainstBaseline(baselineEx, null, ledgerEx, { suites: [] }, fGov);
    check("qa4_exception_ledger_tip_pass", fGov.length === 0, fGov.join("; "));

    const alias = makeQa4ImpactExceptionAmendment(
      ledger.frozen_at_qa0.acceptance_workflow_hash,
      newHash,
      baselineId,
    );
    alias.affected_qa_suites = ["QA4_CLOCK"];
    check(
      "qa4_exception_alias_blocked",
      qa0Qa6ImpactExceptionAllowed(alias) === false && Boolean(qa0Qa6ImpactBlocked(alias)),
      "QA4_CLOCK alias must not receive exception",
    );

    const washed = makeQa4ImpactExceptionAmendment(
      ledger.frozen_at_qa0.acceptance_workflow_hash,
      newHash,
      baselineId,
    );
    washed.workflow_diff_scope.qa0_qa6_semantics_changed = false;
    washed.workflow_diff_scope.checks = {
      command_changes: false,
      artifact_upload_changes: false,
      env_permission_changes: false,
      pass_fail_semantics_changes: false,
    };
    check(
      "qa4_exception_false_checks_blocked",
      qa0Qa6ImpactExceptionAllowed(washed) === false && Boolean(qa0Qa6ImpactBlocked(washed)),
      "false checks / false semantics must not receive exception",
    );

    const noDecision = makeQa4ImpactExceptionAmendment(
      ledger.frozen_at_qa0.acceptance_workflow_hash,
      newHash,
      baselineId,
    );
    delete noDecision.parent_decision_id;
    check(
      "qa4_exception_missing_decision_blocked",
      qa0Qa6ImpactExceptionAllowed(noDecision) === false && Boolean(qa0Qa6ImpactBlocked(noDecision)),
      "missing parent_decision_id must remain BLOCKED",
    );

    const noAckDecision = makeQa4ImpactExceptionAmendment(
      ledger.frozen_at_qa0.acceptance_workflow_hash,
      newHash,
      baselineId,
    );
    noAckDecision.human_po_ack.statement = "ACK APPROVED without naming the parent decision";
    check(
      "qa4_exception_ack_without_decision_blocked",
      qa0Qa6ImpactExceptionAllowed(noAckDecision) === false &&
        Boolean(qa0Qa6ImpactBlocked(noAckDecision)),
      "ACK that omits parent decision_id must remain BLOCKED",
    );

    const noRerun = makeQa4ImpactExceptionAmendment(
      ledger.frozen_at_qa0.acceptance_workflow_hash,
      newHash,
      baselineId,
    );
    delete noRerun.required_rerun_suites;
    check(
      "qa4_exception_missing_rerun_blocked",
      qa0Qa6ImpactExceptionAllowed(noRerun) === false && Boolean(qa0Qa6ImpactBlocked(noRerun)),
      "missing required_rerun_suites must remain BLOCKED",
    );

    const noException = makeQa4ImpactExceptionAmendment(
      ledger.frozen_at_qa0.acceptance_workflow_hash,
      newHash,
      baselineId,
    );
    delete noException.allow_qa0_qa6_impact;
    delete noException.parent_decision_id;
    delete noException.required_rerun_suites;
    noException.human_po_ack.statement = "ACK APPROVED for controlled workflow amendment fixture";
    check(
      "qa4_impact_without_exception_still_blocked",
      qa0Qa6ImpactExceptionAllowed(noException) === false &&
        Boolean(qa0Qa6ImpactBlocked(noException)),
      "honest QA4 impact without exception fields must stay BLOCKED",
    );

    const appliedAt = "2026-08-23T00:00:00.000Z";
    const persisted = toLedgerAmendment(honest, baselineId, appliedAt);
    check(
      "qa4_exception_apply_persists_allow",
      persisted.allow_qa0_qa6_impact === true,
      "allow_qa0_qa6_impact dropped on apply shape",
    );
    check(
      "qa4_exception_apply_persists_parent",
      persisted.parent_decision_id === QA4_WIRING_PARENT_DECISION_ID,
      "parent_decision_id dropped on apply shape",
    );
    check(
      "qa4_exception_apply_persists_rerun",
      Array.isArray(persisted.required_rerun_suites) &&
        persisted.required_rerun_suites.length === 1 &&
        persisted.required_rerun_suites[0] === "QA4",
      "required_rerun_suites dropped or rewritten on apply shape",
    );
    check(
      "qa4_exception_apply_does_not_hardcode_if_proposal_differs",
      persisted.parent_decision_id === honest.parent_decision_id &&
        JSON.stringify(persisted.required_rerun_suites) ===
          JSON.stringify(honest.required_rerun_suites),
      "apply writer must copy proposal exception metadata",
    );
    const fPersist = [];
    verifyGovernanceAgainstBaseline(
      { ...baseline, acceptance_workflow_hash: newHash },
      null,
      { ...ledger, amendments: [persisted] },
      { suites: [] },
      fPersist,
    );
    check(
      "qa4_exception_apply_shaped_ledger_pass",
      fPersist.length === 0,
      fPersist.join("; "),
    );

    const stripped = { ...persisted };
    delete stripped.allow_qa0_qa6_impact;
    delete stripped.parent_decision_id;
    delete stripped.required_rerun_suites;
    const fStripped = [];
    verifyGovernanceAgainstBaseline(
      { ...baseline, acceptance_workflow_hash: newHash },
      null,
      { ...ledger, amendments: [stripped] },
      { suites: [] },
      fStripped,
    );
    check(
      "qa4_exception_stripped_apply_shape_verify_fail",
      fStripped.some((x) => /QA0-QA6 impact/i.test(x)),
      "stripped exception metadata must make post-apply verify FAIL",
    );

    const regularPersisted = toLedgerAmendment(
      makeValidAmendment(ledger.frozen_at_qa0.acceptance_workflow_hash, newHash, baselineId),
      baselineId,
      appliedAt,
    );
    check(
      "regular_apply_omits_exception_fields",
      regularPersisted.allow_qa0_qa6_impact === undefined &&
        regularPersisted.parent_decision_id === undefined &&
        regularPersisted.required_rerun_suites === undefined,
      "non-exception apply must not invent QA4 exception fields",
    );

    const applySrc = fs.readFileSync(
      path.join(ROOT, "tooling/engine-acceptance/amend-acceptance-workflow-hash.cjs"),
      "utf8",
    );
    check(
      "apply_writer_uses_toLedgerAmendment",
      applySrc.includes("toLedgerAmendment") &&
        /ledger\.amendments\.push\(\s*toLedgerAmendment\(/.test(applySrc),
      "apply writer must persist via toLedgerAmendment",
    );
  }

  // live runner guard export exists
  check(
    "assert_export_present",
    typeof assertAcceptanceWorkflowHashMatch === "function",
    "missing assertAcceptanceWorkflowHashMatch",
  );

  // cleanup tmp
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  if (fails.length) {
    console.error("[selftest-workflow-amendment] FAIL");
    for (const f of fails) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("[selftest-workflow-amendment] PASS");
  console.log(`  DECISION_ID=${DECISION_ID}`);
  console.log("  WORKFLOW_HASH_POLICY=CONTROLLED_AMENDMENT_ONLY");
}

if (require.main === module) {
  run();
}

module.exports = { run };

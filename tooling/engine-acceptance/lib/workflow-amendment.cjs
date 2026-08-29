/**
 * POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1 — shared governance helpers
 *
 * acceptance_workflow_hash 변경은 본 모듈 + amend tool provenance 경로만 허용.
 * suite runner 암묵 sync 금지.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT, readJson, hashPathList } = require("./hash-scope.cjs");

const DECISION_ID = "POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1";
const LEDGER_REL = "governance/engine-acceptance/workflow-amendments.v1.json";
const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";
const SCOPE_REL = "governance/engine-acceptance/protected-scope.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const SCHEMA = "governance.engine-acceptance.workflow-amendments.v1";

const REQUIRED_AMENDMENT_FIELDS = [
  "amendment_id",
  "reason",
  "human_po_ack",
  "old_acceptance_workflow_hash",
  "new_acceptance_workflow_hash",
  "workflow_diff_scope",
  "affected_qa_suites",
  "unaffected_completed_suites",
  "baseline_id",
  "commit_sha_or_pending",
  "timestamp",
];

const QA0_QA6 = ["QA0", "QA1", "QA2", "QA3", "QA4", "QA5", "QA6"];
const QA0_QA6_IMPACT_CHECK_KEYS = [
  "command_changes",
  "artifact_upload_changes",
  "env_permission_changes",
  "pass_fail_semantics_changes",
];
const QA5_QA6_QA8_WIRING_PARENT_DECISION_ID = "QA5_QA6_QA8_WORKFLOW_AMENDMENT_DECISION_V1";
const QA1_QA2_ARTIFACT_UPLOAD_PARENT_DECISION_ID = "QA1_QA2_ARTIFACT_UPLOAD_AMENDMENT_DECISION_V1";
const A5023_QA_INFRA_FREEZE_PARENT_DECISION_ID = "A5023_QA_INFRA_FREEZE_AMENDMENT_DECISION_V1";
const PARENT_SUITE_BINDING = Object.freeze({
  [QA5_QA6_QA8_WIRING_PARENT_DECISION_ID]: Object.freeze(["QA5", "QA6", "QA8"]),
  [QA1_QA2_ARTIFACT_UPLOAD_PARENT_DECISION_ID]: Object.freeze(["QA1", "QA2"]),
  [A5023_QA_INFRA_FREEZE_PARENT_DECISION_ID]: Object.freeze(["QA4", "QA8"]),
});
const PARENT_CHECK_BINDING = Object.freeze({
  [QA5_QA6_QA8_WIRING_PARENT_DECISION_ID]: Object.freeze({
    command_changes: true,
    artifact_upload_changes: true,
    env_permission_changes: true,
    pass_fail_semantics_changes: true,
  }),
  [QA1_QA2_ARTIFACT_UPLOAD_PARENT_DECISION_ID]: Object.freeze({
    command_changes: false,
    artifact_upload_changes: true,
    env_permission_changes: false,
    pass_fail_semantics_changes: true,
  }),
  [A5023_QA_INFRA_FREEZE_PARENT_DECISION_ID]: Object.freeze({
    command_changes: true,
    artifact_upload_changes: true,
    env_permission_changes: true,
    pass_fail_semantics_changes: true,
  }),
});

function allowedSuitesForParent(parentDecisionId) {
  const allowed = PARENT_SUITE_BINDING[parentDecisionId];
  return Array.isArray(allowed) ? allowed : null;
}

function sameSuiteSet(actual, expected) {
  if (!Array.isArray(actual) || !Array.isArray(expected) || expected.length < 1) return false;
  if (actual.length !== expected.length) return false;
  const want = new Set(expected);
  if (want.size !== expected.length) return false;
  const seen = new Set();
  for (const s of actual) {
    if (!want.has(s) || seen.has(s)) return false;
    seen.add(s);
  }
  return seen.size === want.size;
}

function parentSuiteBindingHolds(entry) {
  if (!entry || typeof entry !== "object") return false;
  const allowed = allowedSuitesForParent(entry.parent_decision_id);
  return Boolean(allowed && sameSuiteSet(entry.affected_qa_suites, allowed));
}

function writeJson(rel, obj) {
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function loadLedger(rel = LEDGER_REL) {
  return readJson(rel);
}

function expectedWorkflowHash(ledger) {
  const amends = Array.isArray(ledger.amendments) ? ledger.amendments : [];
  if (amends.length === 0) {
    return ledger.frozen_at_qa0.acceptance_workflow_hash;
  }
  return amends[amends.length - 1].new_acceptance_workflow_hash;
}

function validateLedgerShape(ledger, fails) {
  const fail = (m) => fails.push(m);
  if (!ledger || typeof ledger !== "object") {
    fail("workflow-amendments ledger missing/invalid");
    return;
  }
  if (ledger.schema !== SCHEMA) fail(`workflow-amendments.schema must be ${SCHEMA}`);
  if (ledger.decision_id !== DECISION_ID) {
    fail(`workflow-amendments.decision_id must be ${DECISION_ID}`);
  }
  if (!ledger.baseline_id) fail("workflow-amendments.baseline_id required");
  if (!ledger.frozen_at_qa0 || typeof ledger.frozen_at_qa0 !== "object") {
    fail("workflow-amendments.frozen_at_qa0 required");
    return;
  }
  for (const k of ["acceptance_workflow_hash", "prompt_hash", "eval_dataset_hash"]) {
    if (!ledger.frozen_at_qa0[k]) fail(`frozen_at_qa0.${k} required`);
  }
  if (!ledger.policies || ledger.policies.acceptance_workflow_hash !== "CONTROLLED_AMENDMENT_ONLY") {
    fail("policies.acceptance_workflow_hash must be CONTROLLED_AMENDMENT_ONLY");
  }
  if (ledger.policies.prompt_hash !== "IMMUTABLE") fail("policies.prompt_hash must be IMMUTABLE");
  if (ledger.policies.eval_dataset_hash !== "IMMUTABLE") {
    fail("policies.eval_dataset_hash must be IMMUTABLE");
  }
  if (ledger.policies.baseline_id !== "STABLE") fail("policies.baseline_id must be STABLE");
  if (!Array.isArray(ledger.amendments)) fail("amendments must be array");
}

function validateAmendmentEntry(entry, index, fails) {
  const fail = (m) => fails.push(`amendments[${index}]: ${m}`);
  if (!entry || typeof entry !== "object") {
    fail("must be object");
    return;
  }
  for (const k of REQUIRED_AMENDMENT_FIELDS) {
    if (entry[k] === undefined || entry[k] === null || entry[k] === "") {
      fail(`missing ${k}`);
    }
  }
  const ack = entry.human_po_ack;
  if (!ack || typeof ack !== "object") {
    fail("human_po_ack must be object");
  } else {
    for (const k of ["by", "at", "statement"]) {
      if (!ack[k]) fail(`human_po_ack.${k} required`);
    }
    if (!/ACK|APPROVED|승인/i.test(String(ack.statement || ""))) {
      fail("human_po_ack.statement must explicitly ACK/APPROVE");
    }
  }
  const scope = entry.workflow_diff_scope;
  if (!scope || typeof scope !== "object") {
    fail("workflow_diff_scope must be object");
  } else {
    if (!Array.isArray(scope.files) || scope.files.length < 1) {
      fail("workflow_diff_scope.files required");
    }
    if (!scope.exact_diff_summary) fail("workflow_diff_scope.exact_diff_summary required");
    if (typeof scope.qa0_qa6_semantics_changed !== "boolean") {
      fail("workflow_diff_scope.qa0_qa6_semantics_changed boolean required");
    }
    const checks = scope.checks;
    if (!checks || typeof checks !== "object") {
      fail("workflow_diff_scope.checks required");
    } else {
      for (const k of [
        "command_changes",
        "artifact_upload_changes",
        "env_permission_changes",
        "pass_fail_semantics_changes",
      ]) {
        if (typeof checks[k] !== "boolean") fail(`workflow_diff_scope.checks.${k} boolean required`);
      }
    }
  }
  if (!Array.isArray(entry.affected_qa_suites)) fail("affected_qa_suites must be array");
  if (!Array.isArray(entry.unaffected_completed_suites)) {
    fail("unaffected_completed_suites must be array");
  }
  if (
    entry.old_acceptance_workflow_hash &&
    entry.new_acceptance_workflow_hash &&
    entry.old_acceptance_workflow_hash === entry.new_acceptance_workflow_hash
  ) {
    fail("old/new acceptance_workflow_hash must differ");
  }
  // immutable product/eval identity cannot be amended via this ledger
  if (entry.prompt_hash !== undefined || entry.new_prompt_hash !== undefined) {
    fail("prompt_hash mutation is not amendable");
  }
  if (entry.eval_dataset_hash !== undefined || entry.new_eval_dataset_hash !== undefined) {
    fail("eval_dataset_hash mutation is not amendable");
  }
  if (entry.new_baseline_id !== undefined || entry.baseline_id_change !== undefined) {
    fail("baseline_id mutation is not amendable");
  }
}

function qa0Qa6ImpactOverlap(entry) {
  const affected = Array.isArray(entry && entry.affected_qa_suites) ? entry.affected_qa_suites : [];
  return affected.filter((s) => QA0_QA6.includes(s));
}

function checksMatchParent(entry) {
  const expected = PARENT_CHECK_BINDING[entry && entry.parent_decision_id];
  if (!expected) return false;
  const checks = (entry.workflow_diff_scope && entry.workflow_diff_scope.checks) || {};
  return QA0_QA6_IMPACT_CHECK_KEYS.every((k) => checks[k] === expected[k]);
}

function qa0Qa6ImpactExceptionAllowed(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (entry.allow_qa0_qa6_impact !== true) return false;
  const parentId = entry.parent_decision_id;
  if (!PARENT_SUITE_BINDING[parentId]) return false;
  const statement = String((entry.human_po_ack && entry.human_po_ack.statement) || "");
  if (!statement.includes(parentId)) return false;
  if (!/ACK|APPROVED|승인/i.test(statement)) return false;
  if (!parentSuiteBindingHolds(entry)) return false;
  const scope = entry.workflow_diff_scope || {};
  if (scope.qa0_qa6_semantics_changed !== true) return false;
  if (!checksMatchParent(entry)) return false;
  if (qa0Qa6ImpactOverlap(entry).length < 1) return false;
  const allowed = allowedSuitesForParent(parentId);
  if (!sameSuiteSet(entry.required_rerun_suites, allowed)) return false;
  return true;
}

function persistExceptionMetadata(proposal, entry) {
  if (!proposal || !entry || proposal.allow_qa0_qa6_impact !== true) return entry;
  entry.allow_qa0_qa6_impact = true;
  entry.parent_decision_id = proposal.parent_decision_id;
  entry.required_rerun_suites = Array.isArray(proposal.required_rerun_suites)
    ? proposal.required_rerun_suites.slice()
    : proposal.required_rerun_suites;
  return entry;
}

function toLedgerAmendment(proposal, baselineId, appliedAt) {
  const entry = {
    amendment_id: proposal.amendment_id,
    reason: proposal.reason,
    human_po_ack: proposal.human_po_ack,
    old_acceptance_workflow_hash: proposal.old_acceptance_workflow_hash,
    new_acceptance_workflow_hash: proposal.new_acceptance_workflow_hash,
    workflow_diff_scope: proposal.workflow_diff_scope,
    affected_qa_suites: Array.isArray(proposal.affected_qa_suites) ? proposal.affected_qa_suites.slice() : proposal.affected_qa_suites,
    unaffected_completed_suites: Array.isArray(proposal.unaffected_completed_suites) ? proposal.unaffected_completed_suites.slice() : proposal.unaffected_completed_suites,
    baseline_id: baselineId,
    commit_sha_or_pending: proposal.commit_sha_or_pending,
    timestamp: proposal.timestamp,
    applied_at: appliedAt,
  };
  return persistExceptionMetadata(proposal, entry);
}

function qa0Qa6ImpactBlocked(entry) {
  if (qa0Qa6ImpactExceptionAllowed(entry)) return null;
  const scope = (entry && entry.workflow_diff_scope) || {};
  const checks = scope.checks || {};
  if (scope.qa0_qa6_semantics_changed === true) return "qa0_qa6_semantics_changed=true";
  if (scope.qa0_qa6_semantics_changed !== false) return "qa0_qa6_semantics_changed not proven false";
  for (const k of QA0_QA6_IMPACT_CHECK_KEYS) {
    if (checks[k] === true) return `checks.${k}=true`;
    if (checks[k] !== false) return `checks.${k} not proven false`;
  }
  const overlap = qa0Qa6ImpactOverlap(entry);
  if (overlap.length) return `affected_qa_suites overlaps QA0-QA6: ${overlap.join(",")}`;
  return null;
}

function assertQa7NotInFlight(evidence) {
  const suites = (evidence && evidence.suites) || [];
  const qa7 = suites.find((s) => s.suite_id === "QA7");
  if (!qa7) return;
  const st = String(qa7.completion_status || "");
  if (["RUNNING", "IN_PROGRESS", "STARTED"].includes(st)) {
    const err = new Error(
      "QA7 body execution in flight — baseline workflow amendment forbidden (decision §10)",
    );
    err.code = "AIPO_QA7_IN_FLIGHT_AMENDMENT_FORBIDDEN";
    throw err;
  }
}

/**
 * Runner guard: acceptance_workflow_hash drift → throw (no silent baseline write).
 * lockfile_hash 등 다른 aggregate는 호출측 정책.
 */
function assertAcceptanceWorkflowHashMatch(baseline, scope) {
  const live = hashPathList(scope.aggregateHashes.acceptance_workflow_hash, scope);
  if (baseline.acceptance_workflow_hash !== live) {
    const err = new Error(
      "acceptance_workflow_hash drift — silent runner sync forbidden. " +
        "Use tooling/engine-acceptance/amend-acceptance-workflow-hash.cjs with " +
        "POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1 provenance.",
    );
    err.code = "AIPO_WORKFLOW_HASH_AMENDMENT_REQUIRED";
    err.live = live;
    err.baseline = baseline.acceptance_workflow_hash;
    throw err;
  }
  return live;
}

/** lockfile만 갱신 (workflow hash 제외) */
function syncLockfileHashOnly(baseline, scope, writeBaseline) {
  const paths = scope.aggregateHashes.lockfile_hash;
  if (!paths) return baseline;
  const live = hashPathList(paths, scope);
  if (baseline.lockfile_hash !== live) {
    baseline.lockfile_hash = live;
    if (typeof writeBaseline === "function") writeBaseline(baseline);
  }
  return baseline;
}

function verifyGovernanceAgainstBaseline(baseline, scope, ledger, evidence, fails, rebaseLedger) {
  validateLedgerShape(ledger, fails);
  if (fails.length) return;

  const rebaseTip =
    rebaseLedger && Array.isArray(rebaseLedger.rebases) && rebaseLedger.rebases.length
      ? rebaseLedger.rebases[rebaseLedger.rebases.length - 1]
      : null;
  const expectedId = rebaseTip ? rebaseTip.new_baseline_id : ledger.baseline_id;
  const expectedPrompt = rebaseTip ? rebaseTip.new_prompt_hash : ledger.frozen_at_qa0.prompt_hash;
  const expectedEval = rebaseTip ? rebaseTip.eval_dataset_hash : ledger.frozen_at_qa0.eval_dataset_hash;

  if (baseline.id !== expectedId) {
    fails.push(
      `baseline.id drift vs workflow-amendments.baseline_id (STABLE policy): baseline=${baseline.id} expected=${expectedId}`,
    );
  }
  if (baseline.prompt_hash !== expectedPrompt) {
    fails.push("prompt_hash immutable: baseline ≠ frozen_at_qa0 (amendment cannot change prompt_hash)");
  }
  if (baseline.eval_dataset_hash !== expectedEval) {
    fails.push(
      "eval_dataset_hash immutable: baseline ≠ frozen_at_qa0 (amendment cannot change eval_dataset_hash)",
    );
  }

  // An amendment's baseline_id records the epoch it actually happened under.
  // Once more than one rebase has occurred, that epoch is a predecessor, not
  // the tip — it must stay allowed (history, not "current"), or every L7
  // amendment made before the most recent L8 rebase would wrongly start
  // failing the moment a later rebase lands. Every id that ever appeared as a
  // predecessor_baseline_id/new_baseline_id in the rebase chain is legitimate.
  const allowedBaselineIds = new Set([ledger.baseline_id]);
  if (rebaseTip && rebaseTip.new_baseline_id) allowedBaselineIds.add(rebaseTip.new_baseline_id);
  if (rebaseLedger && Array.isArray(rebaseLedger.rebases)) {
    for (const r of rebaseLedger.rebases) {
      if (r && r.predecessor_baseline_id) allowedBaselineIds.add(r.predecessor_baseline_id);
      if (r && r.new_baseline_id) allowedBaselineIds.add(r.new_baseline_id);
    }
  }

  const amends = ledger.amendments || [];
  for (let i = 0; i < amends.length; i++) {
    validateAmendmentEntry(amends[i], i, fails);
    if (amends[i].baseline_id && !allowedBaselineIds.has(amends[i].baseline_id)) {
      fails.push(`amendments[${i}].baseline_id must equal ledger.baseline_id`);
    }
    const impact = qa0Qa6ImpactBlocked(amends[i]);
    if (impact) fails.push(`amendments[${i}] QA0-QA6 impact not allowed without separate governance: ${impact}`);
    if (i === 0) {
      if (amends[i].old_acceptance_workflow_hash !== ledger.frozen_at_qa0.acceptance_workflow_hash) {
        fails.push("amendments[0].old_acceptance_workflow_hash must equal frozen_at_qa0");
      }
    } else if (
      amends[i].old_acceptance_workflow_hash !== amends[i - 1].new_acceptance_workflow_hash
    ) {
      fails.push(`amendments[${i}] hash chain broken (old ≠ previous new)`);
    }
  }

  const expected = expectedWorkflowHash(ledger);
  if (baseline.acceptance_workflow_hash !== expected) {
    fails.push(
      `baseline.acceptance_workflow_hash must equal ledger tip (frozen or latest amendment): expected=${expected}`,
    );
  }

  if (scope && scope.aggregateHashes && scope.aggregateHashes.acceptance_workflow_hash) {
    const live = hashPathList(scope.aggregateHashes.acceptance_workflow_hash, scope);
    if (baseline.acceptance_workflow_hash !== live) {
      fails.push("acceptance_workflow_hash drift (unapproved workflow change or missing amendment apply)");
    }
  }

  if (evidence) {
    try {
      assertQa7NotInFlight(evidence);
    } catch (e) {
      fails.push(e.message);
    }
  }
}

function assertRunnersForbidSilentWorkflowSync(fails) {
  const files = [
    "tooling/engine-acceptance/run-qa2.cjs",
    "tooling/engine-acceptance/run-qa3.cjs",
    "tooling/engine-acceptance/run-qa4.cjs",
    "tooling/engine-acceptance/run-qa5.cjs",
    "tooling/engine-acceptance/run-qa6.cjs",
  ];
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      fails.push(`missing ${rel}`);
      continue;
    }
    const src = fs.readFileSync(abs, "utf8");
    if (/baseline\.acceptance_workflow_hash\s*=/.test(src)) {
      fails.push(`${rel} must not assign baseline.acceptance_workflow_hash (silent sync forbidden)`);
    }
    if (!src.includes("assertAcceptanceWorkflowHashMatch")) {
      fails.push(`${rel} must call assertAcceptanceWorkflowHashMatch`);
    }
  }
}

module.exports = {
  DECISION_ID,
  LEDGER_REL,
  BASELINE_REL,
  SCOPE_REL,
  EVIDENCE_REL,
  SCHEMA,
  REQUIRED_AMENDMENT_FIELDS,
  QA5_QA6_QA8_WIRING_PARENT_DECISION_ID,
  QA1_QA2_ARTIFACT_UPLOAD_PARENT_DECISION_ID,
  A5023_QA_INFRA_FREEZE_PARENT_DECISION_ID,
  PARENT_SUITE_BINDING,
  PARENT_CHECK_BINDING,
  writeJson,
  loadLedger,
  expectedWorkflowHash,
  validateLedgerShape,
  validateAmendmentEntry,
  qa0Qa6ImpactExceptionAllowed,
  qa0Qa6ImpactBlocked,
  toLedgerAmendment,
  assertQa7NotInFlight,
  assertAcceptanceWorkflowHashMatch,
  syncLockfileHashOnly,
  verifyGovernanceAgainstBaseline,
  assertRunnersForbidSilentWorkflowSync,
};

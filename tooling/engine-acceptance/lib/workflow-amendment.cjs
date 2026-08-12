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

function qa0Qa6ImpactBlocked(entry) {
  const scope = entry.workflow_diff_scope || {};
  const checks = scope.checks || {};
  if (scope.qa0_qa6_semantics_changed === true) return "qa0_qa6_semantics_changed=true";
  if (scope.qa0_qa6_semantics_changed !== false) return "qa0_qa6_semantics_changed not proven false";
  for (const k of [
    "command_changes",
    "artifact_upload_changes",
    "env_permission_changes",
    "pass_fail_semantics_changes",
  ]) {
    if (checks[k] === true) return `checks.${k}=true`;
    if (checks[k] !== false) return `checks.${k} not proven false`;
  }
  const affected = entry.affected_qa_suites || [];
  const overlap = affected.filter((s) => QA0_QA6.includes(s));
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

  const allowedBaselineIds = new Set([ledger.baseline_id]);
  if (rebaseTip && rebaseTip.new_baseline_id) allowedBaselineIds.add(rebaseTip.new_baseline_id);

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
  writeJson,
  loadLedger,
  expectedWorkflowHash,
  validateLedgerShape,
  validateAmendmentEntry,
  qa0Qa6ImpactBlocked,
  assertQa7NotInFlight,
  assertAcceptanceWorkflowHashMatch,
  syncLockfileHashOnly,
  verifyGovernanceAgainstBaseline,
  assertRunnersForbidSilentWorkflowSync,
};

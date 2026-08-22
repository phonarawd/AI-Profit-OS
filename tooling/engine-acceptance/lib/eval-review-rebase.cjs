/**
 * ENGINE_ACCEPTANCE_REBASE_EVAL_REVIEW_V1
 *
 * 의도적·리뷰된 eval dataset 변경을 위한 별도 new-epoch 경로.
 * ENGINE_ACCEPTANCE_REBASE_V1 (product-only · eval MATCH) 의미를 바꾸지 않는다.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT, readJson, git } = require("./hash-scope.cjs");
const {
  CURRENT_REBASE_POLICY_ID,
  currentPolicy,
  predecessorArchiveRel,
  mapSuitesForRebase,
  collectPredecessorChecksums,
  writeJson,
  isPendingRerun,
  verifyPendingRerunEpoch,
  verifyWashing,
} = require("./product-rebase.cjs");
const { evaluateRebaseInvariants } = require("./product-rebase.cjs");
const { diffEvalGitToDisk, SEMANTIC } = require("./eval-dataset-diff.cjs");

const DECISION_ID = "ENGINE_ACCEPTANCE_REBASE_EVAL_REVIEW_V1";
const PRODUCT_ONLY_DECISION_ID = "ENGINE_ACCEPTANCE_REBASE_V1";
const LEDGER_REL = "governance/engine-acceptance/eval-evolutions.v1.json";
const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";
const SCOPE_REL = "governance/engine-acceptance/protected-scope.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const AMEND_LEDGER_REL = "governance/engine-acceptance/workflow-amendments.v1.json";
const REPORT_REL = "governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md";
const REVIEW_SCHEMA = "governance.engine-acceptance.eval-evolution-review.v1";
const SCHEMA = "governance.engine-acceptance.eval-evolutions.v1";

const REQUIRED_REVIEW_FIELDS = [
  "schema",
  "review_id",
  "decision_id",
  "predecessor_acceptance_epoch",
  "predecessor_product_commit",
  "new_product_commit",
  "old_eval_dataset_hash",
  "new_eval_dataset_hash",
  "changed_eval_files",
  "reason",
  "coverage_effect",
  "p_g_s_ownership_impact",
  "money_authority_impact",
  "tool_authority_impact",
  "prompt_injection_coverage_impact",
  "refusal_coverage_impact",
  "numeric_grounding_impact",
  "acceptance_workflow_hash",
  "schema_migration_hash",
];

const REQUIRED_FILE_FIELDS = [
  "path",
  "old_case_count",
  "new_case_count",
  "added",
  "removed",
  "modified",
  "semantic_effect",
];

const REQUIRED_EVOLUTION_FIELDS = [
  "decision_id",
  "rebase_id",
  "predecessor_baseline_id",
  "new_baseline_id",
  "reason",
  "product_commit",
  "predecessor_product_commit",
  "old_eval_dataset_hash",
  "new_eval_dataset_hash",
  "changed_eval_files",
  "coverage_effect",
  "review_id",
  "acceptance_workflow_hash",
  "old_prompt_hash",
  "new_prompt_hash",
  "old_protected_manifest_hash",
  "new_protected_manifest_hash",
  "timestamp",
  "commit_sha_or_pending",
];

function emptyLedger() {
  return {
    schema: SCHEMA,
    version: "1.0.0",
    decision_id: DECISION_ID,
    policies: {
      in_place_hash_rewrite: "FORBIDDEN",
      baseline_washing: "FORBIDDEN",
      eval_dataset_mutation_during_product_rebase: "FORBIDDEN",
      unreviewed_eval_dataset_mutation: "FORBIDDEN",
      safety_coverage_weakening: "FORBIDDEN",
      hash_check_bypass: "FORBIDDEN",
      product_only_rebase_weakened: "FORBIDDEN",
    },
    evolutions: [],
  };
}

function loadEvalLedger(rel = LEDGER_REL) {
  return readJson(rel);
}

function latestEvolution(ledger) {
  if (!ledger || !Array.isArray(ledger.evolutions) || ledger.evolutions.length === 0) {
    return null;
  }
  return ledger.evolutions[ledger.evolutions.length - 1];
}

function sameStringArray(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function sameIdList(a, b) {
  const aa = (a || []).slice().sort();
  const bb = (b || []).slice().sort();
  return sameStringArray(aa, bb);
}

function validateEvalAck(ack, fails, prefix = "human_po_ack") {
  if (!ack || typeof ack !== "object") {
    fails.push(`${prefix} required`);
    return;
  }
  for (const k of ["by", "at", "statement"]) {
    if (!ack[k]) fails.push(`${prefix}.${k} required`);
  }
  const stmt = String(ack.statement || "");
  if (!/ACK/i.test(stmt) || !/APPROVED/i.test(stmt)) {
    fails.push(`${prefix}.statement must explicitly ACK APPROVED`);
  }
  if (!stmt.includes(DECISION_ID)) {
    fails.push(`${prefix}.statement must name ${DECISION_ID}`);
  }
  if (stmt.includes(PRODUCT_ONLY_DECISION_ID) && !stmt.includes(DECISION_ID)) {
    fails.push(`${prefix}.statement cannot use product-only ${PRODUCT_ONLY_DECISION_ID} for eval review`);
  }
}

function validateLedgerPolicy(ledger, fails) {
  if (!ledger) return;
  if (ledger.schema !== SCHEMA) fails.push(`eval-evolutions.schema must be ${SCHEMA}`);
  if (ledger.decision_id !== DECISION_ID) {
    fails.push(`eval-evolutions.decision_id must be ${DECISION_ID}`);
  }
  if (!ledger.policies || typeof ledger.policies !== "object") {
    fails.push("eval-evolutions.policies required");
    return;
  }
  if (ledger.policies.eval_dataset_mutation_during_product_rebase !== "FORBIDDEN") {
    fails.push("policies.eval_dataset_mutation_during_product_rebase must remain FORBIDDEN");
  }
  if (ledger.policies.unreviewed_eval_dataset_mutation !== "FORBIDDEN") {
    fails.push("policies.unreviewed_eval_dataset_mutation must remain FORBIDDEN");
  }
  if (ledger.policies.hash_check_bypass !== "FORBIDDEN") {
    fails.push("policies.hash_check_bypass must remain FORBIDDEN");
  }
  if (ledger.policies.product_only_rebase_weakened !== "FORBIDDEN") {
    fails.push("policies.product_only_rebase_weakened must remain FORBIDDEN");
  }
  if (ledger.policies.baseline_washing !== "FORBIDDEN") {
    fails.push("policies.baseline_washing must remain FORBIDDEN");
  }
  if (!Array.isArray(ledger.evolutions)) fails.push("evolutions must be array");
}

function validateChangedEvalFiles(files, fails, prefix) {
  if (!Array.isArray(files) || files.length < 1) {
    fails.push(`${prefix} must be a non-empty array`);
    return;
  }
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const p = `${prefix}[${i}]`;
    if (!f || typeof f !== "object") {
      fails.push(`${p} must be object`);
      continue;
    }
    for (const k of REQUIRED_FILE_FIELDS) {
      if (f[k] === undefined || f[k] === null) fails.push(`${p} missing ${k}`);
    }
    if (!["STRICTER", "WEAKER", "NEUTRAL", "MIXED"].includes(f.semantic_effect)) {
      fails.push(`${p}.semantic_effect must be STRICTER|WEAKER|NEUTRAL|MIXED`);
    }
    if (!Array.isArray(f.added) || !Array.isArray(f.removed) || !Array.isArray(f.modified)) {
      fails.push(`${p} added/removed/modified must be arrays`);
    }
  }
}

function validateReviewEvidence(review, fails) {
  if (!review || typeof review !== "object") {
    fails.push("eval review evidence required");
    return;
  }
  if (review.schema !== REVIEW_SCHEMA) {
    fails.push(`review.schema must be ${REVIEW_SCHEMA}`);
  }
  if (review.decision_id !== DECISION_ID) {
    fails.push(`review.decision_id must be ${DECISION_ID}`);
  }
  for (const k of REQUIRED_REVIEW_FIELDS) {
    if (review[k] === undefined || review[k] === null || review[k] === "") {
      fails.push(`review missing ${k}`);
    }
  }
  validateChangedEvalFiles(review.changed_eval_files, fails, "review.changed_eval_files");
  if (review.old_eval_dataset_hash && review.new_eval_dataset_hash) {
    if (review.old_eval_dataset_hash === review.new_eval_dataset_hash) {
      fails.push("review old/new eval_dataset_hash must differ (eval evolution required)");
    }
  }
  if (review.hash_check_bypass === true) {
    fails.push("review.hash_check_bypass must not be true");
  }
  if (review.product_only_rebase_weakened === true) {
    fails.push("review must not claim product-only rebase was weakened");
  }
  if (review.skipped_required_qa === true || review.skipped_required_qa > 0) {
    fails.push("review.skipped_required_qa must be 0");
  }
  if (review.disabled_eval_files === true || review.disabled_eval_files > 0) {
    fails.push("review.disabled_eval_files must be 0");
  }
}

function validateEvolutionEntry(entry, index, fails, opts = {}) {
  const fail = (m) => fails.push(index == null ? m : `evolutions[${index}]: ${m}`);
  if (!entry || typeof entry !== "object") {
    fail("must be object");
    return;
  }
  for (const k of REQUIRED_EVOLUTION_FIELDS) {
    if (entry[k] === undefined || entry[k] === null || entry[k] === "") {
      fail(`missing ${k}`);
    }
  }
  if (entry.decision_id !== DECISION_ID) fail(`decision_id must be ${DECISION_ID}`);
  if (opts.requireAck) {
    validateEvalAck(
      entry.human_po_ack,
      fails,
      index == null ? "human_po_ack" : `evolutions[${index}].human_po_ack`,
    );
  }
  if (entry.predecessor_baseline_id === entry.new_baseline_id) {
    fail("new_baseline_id must differ from predecessor (new epoch required)");
  }
  if (entry.old_eval_dataset_hash === entry.new_eval_dataset_hash) {
    fail("old/new eval_dataset_hash must differ");
  }
  validateChangedEvalFiles(entry.changed_eval_files, fails, index == null ? "changed_eval_files" : `evolutions[${index}].changed_eval_files`);
  if (opts.requireCurrentPolicy) {
    if (entry.rebase_policy_version !== CURRENT_REBASE_POLICY_ID) {
      fail(`new eval-review rebase must pin rebase_policy_version to ${CURRENT_REBASE_POLICY_ID}`);
    }
  }
  if (entry.qa7_complete === true || entry.qa7_status === "COMPLETE") {
    fail("must not claim QA7 complete");
  }
  if (entry.qa9_verdict_issued === true) {
    fail("must not fabricate a QA9 verdict at rebase time");
  }
  if (entry.qa7_core_formal_contract) {
    const c = entry.qa7_core_formal_contract;
    if (typeof c.old_expected_total !== "number" || typeof c.new_expected_total !== "number") {
      fail("qa7_core_formal_contract old/new expected totals required");
    }
    if (c.new_expected_total < c.old_expected_total) {
      fail("qa7_core_formal_contract must not shrink expected total");
    }
    if (Number(c.cases_removed || 0) !== 0) {
      fail("qa7_core_formal_contract.cases_removed must be 0");
    }
    if (Number(c.assertions_weakened || 0) !== 0) {
      fail("qa7_core_formal_contract.assertions_weakened must be 0");
    }
    if (Number(c.safety_coverage_weakened || 0) !== 0) {
      fail("qa7_core_formal_contract.safety_coverage_weakened must be 0");
    }
    if (Number(c.hash_bypass || 0) !== 0) {
      fail("qa7_core_formal_contract.hash_bypass must be 0");
    }
  }
}

function assertSafetyNotWeakened(diff, review, fails) {
  const removedSafety = diff.totals.removed_safety_cases;
  const weakened = diff.totals.weakened_assertions;
  const disabled = diff.totals.disabled_eval_files;
  if (removedSafety > 0) {
    const justified = review && review.removed_safety_justification;
    if (!justified) {
      fails.push(
        `REMOVED_SAFETY_CASES=${removedSafety} without independent justification`,
      );
    }
  }
  if (weakened > 0) {
    fails.push(`WEAKENED_ASSERTIONS=${weakened}`);
  }
  if (disabled > 0) {
    fails.push(`DISABLED_EVAL_FILES=${disabled}`);
  }
  if (diff.coverage_effect === SEMANTIC.WEAKER) {
    fails.push("SAFETY_COVERAGE_WEAKENED: coverage_effect=WEAKER");
  }
  if (review) {
    if (Number(review.removed_safety_cases || 0) !== removedSafety) {
      fails.push("review.removed_safety_cases does not match recomputed diff");
    }
    if (Number(review.weakened_assertions || 0) !== weakened) {
      fails.push("review.weakened_assertions does not match recomputed diff");
    }
  }
}

function assertReviewMatchesDiff(review, diff, fails) {
  const reviewed = new Map((review.changed_eval_files || []).map((f) => [f.path, f]));
  const liveChanged = new Map(diff.changed_files.map((f) => [f.path, f]));
  if (reviewed.size !== liveChanged.size) {
    fails.push(
      `review changed_eval_files count ${reviewed.size} ≠ recomputed ${liveChanged.size}`,
    );
  }
  for (const [p, live] of liveChanged) {
    const rec = reviewed.get(p);
    if (!rec) {
      fails.push(`review omitted changed eval file ${p}`);
      continue;
    }
    if (rec.old_case_count !== live.old_case_count || rec.new_case_count !== live.new_case_count) {
      fails.push(`review case counts mismatch for ${p}`);
    }
    if (!sameIdList(rec.added, live.added) || !sameIdList(rec.removed, live.removed) || !sameIdList(rec.modified, live.modified)) {
      fails.push(`review added/removed/modified mismatch for ${p}`);
    }
    if (rec.semantic_effect !== live.semantic_effect) {
      fails.push(`review semantic_effect mismatch for ${p}: ${rec.semantic_effect} ≠ ${live.semantic_effect}`);
    }
  }
  for (const p of reviewed.keys()) {
    if (!liveChanged.has(p)) fails.push(`review lists unchanged/unknown eval file ${p}`);
  }
  if (review.coverage_effect !== diff.coverage_effect) {
    fails.push(
      `review.coverage_effect ${review.coverage_effect} ≠ recomputed ${diff.coverage_effect}`,
    );
  }
}

function assertProductCommitFresh(productCommit, predecessorCommit, fails, opts = {}) {
  if (!productCommit || !/^[0-9a-f]{40}$/i.test(productCommit)) {
    fails.push("product_commit must be 40-char hex");
    return;
  }
  if (predecessorCommit && productCommit === predecessorCommit) {
    fails.push("stale product commit: equals predecessor product commit");
  }
  if (opts.skipGit) return;
  try {
    git(`git merge-base --is-ancestor ${productCommit} HEAD`);
  } catch {
    fails.push("stale product commit: not an ancestor of HEAD");
  }
}

/**
 * ctx: predecessorBaseline, liveEvalHash, liveWorkflowHash, livePromptHash,
 * liveManifestAggregate, liveManifestEntries, predecessorManifestEntries,
 * productCommit, predecessorProductCommit, review, evalDiff, skipGit
 */
function evaluateEvalReviewInvariants(entry, ctx, fails) {
  if (!ctx || !ctx.predecessorBaseline) {
    fails.push("eval-review ledger missing predecessor");
    return;
  }
  const pred = ctx.predecessorBaseline;
  if (entry.predecessor_baseline_id !== pred.id) {
    fails.push(
      `wrong predecessor: entry=${entry.predecessor_baseline_id} baseline=${pred.id}`,
    );
  }
  if (entry.old_eval_dataset_hash !== pred.eval_dataset_hash) {
    fails.push("old_eval_dataset_hash must equal predecessor baseline.eval_dataset_hash");
  }
  if (ctx.liveEvalHash && entry.new_eval_dataset_hash !== ctx.liveEvalHash) {
    fails.push("new_eval_dataset_hash must equal live eval_dataset_hash");
  }
  if (ctx.liveEvalHash && pred.eval_dataset_hash === ctx.liveEvalHash) {
    fails.push("eval-review path requires eval dataset change (live = predecessor)");
  }
  if (entry.old_eval_dataset_hash === entry.new_eval_dataset_hash) {
    fails.push("eval-review path requires old/new eval hashes to differ");
  }
  if (ctx.liveWorkflowHash && entry.acceptance_workflow_hash !== ctx.liveWorkflowHash) {
    fails.push("workflow hash silently changed");
  }
  if (ctx.liveWorkflowHash && pred.acceptance_workflow_hash !== ctx.liveWorkflowHash) {
    fails.push("workflow hash silently changed (live ≠ predecessor/current approved hash)");
  }
  if (ctx.livePromptHash && entry.new_prompt_hash !== ctx.livePromptHash) {
    fails.push("new_prompt_hash must equal live prompt_hash");
  }
  if (entry.old_prompt_hash !== pred.prompt_hash) {
    fails.push("old_prompt_hash must equal predecessor baseline.prompt_hash");
  }
  if (entry.old_protected_manifest_hash !== pred.protected_scope_manifest.aggregate) {
    fails.push("old_protected_manifest_hash must equal predecessor manifest aggregate");
  }
  if (ctx.liveManifestAggregate && entry.new_protected_manifest_hash !== ctx.liveManifestAggregate) {
    fails.push("new_protected_manifest_hash must equal live protected manifest aggregate");
  }
  if (entry.new_baseline_id === pred.id) {
    fails.push("old baseline id reused — in-place epoch rewrite forbidden");
  }
  assertProductCommitFresh(
    ctx.productCommit || entry.product_commit,
    ctx.predecessorProductCommit || pred.commit_sha,
    fails,
    ctx,
  );
  if (ctx.review) {
    if (ctx.review.predecessor_acceptance_epoch !== pred.id) {
      fails.push("review.predecessor_acceptance_epoch must match current baseline.id");
    }
    if (ctx.review.old_eval_dataset_hash !== pred.eval_dataset_hash) {
      fails.push("review.old_eval_dataset_hash must match predecessor");
    }
    if (ctx.liveEvalHash && ctx.review.new_eval_dataset_hash !== ctx.liveEvalHash) {
      fails.push("review.new_eval_dataset_hash must match live");
    }
    if (ctx.evalDiff) {
      assertReviewMatchesDiff(ctx.review, ctx.evalDiff, fails);
      assertSafetyNotWeakened(ctx.evalDiff, ctx.review, fails);
    }
  } else {
    fails.push("unreviewed eval dataset mutation");
  }
}

function stampEvalReviewPolicy(entry) {
  const policy = currentPolicy();
  entry.rebase_policy_version = CURRENT_REBASE_POLICY_ID;
  entry.invalidated_suites = policy.invalidated_suites.slice();
  entry.required_rerun_suites = policy.required_rerun_suites.slice();
  entry.stale_aggregation_phases = policy.stale_aggregation_phases.slice();
  entry.qa7_complete = false;
  entry.qa8_complete = false;
  entry.qa9_complete = false;
  entry.qa9_verdict_issued = false;
  return entry;
}

function asSyntheticRebaseLedger(evalLedger) {
  return { rebases: (evalLedger && evalLedger.evolutions) || [] };
}

function isEvalReviewPendingRerun(baseline, evidence, evalLedger) {
  return isPendingRerun(baseline, evidence, asSyntheticRebaseLedger(evalLedger));
}

function verifyEvalReviewPendingRerunEpoch(baseline, evidence, evalLedger, fails) {
  verifyPendingRerunEpoch(baseline, evidence, asSyntheticRebaseLedger(evalLedger), fails);
}

function verifyEvalReviewWashing(baseline, evidence, evalLedger, readResult, fails) {
  verifyWashing(baseline, evidence, asSyntheticRebaseLedger(evalLedger), readResult, fails);
}

function assertEvalReviewEpochBound(baseline, evalLedger, amendmentLedger, fails) {
  const tip = latestEvolution(evalLedger);
  if (!tip || tip.new_baseline_id !== baseline.id) {
    fails.push("new baseline created without eval-review invalidation ledger");
    return;
  }
  if (tip.predecessor_baseline_id === baseline.id) {
    fails.push("eval-review tip predecessor equals current baseline (epoch wash)");
  }
  const frozenId = amendmentLedger && amendmentLedger.baseline_id;
  const frozenEval =
    amendmentLedger && amendmentLedger.frozen_at_qa0 && amendmentLedger.frozen_at_qa0.eval_dataset_hash;
  if (baseline.id === frozenId && frozenEval && baseline.eval_dataset_hash !== frozenEval) {
    fails.push(
      "old baseline id + new eval hash → FAIL (in-place rewrite forbidden; ENGINE_ACCEPTANCE_REBASE_EVAL_REVIEW_V1 required)",
    );
  }
}

function verifyEvalEvolutionLedger(evalLedger, fails) {
  validateLedgerPolicy(evalLedger, fails);
  if (!evalLedger || !Array.isArray(evalLedger.evolutions)) return;
  for (let i = 0; i < evalLedger.evolutions.length; i++) {
    validateEvolutionEntry(evalLedger.evolutions[i], i, fails);
  }
}

function buildEvalReviewReport({ baseline, tip, measuredAt }) {
  return `# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-0 \`${DECISION_ID}\`  
> **Measured:** ${measuredAt}  
> **baseline_id:** \`${baseline.id}\`  
> **predecessor_baseline_id:** \`${tip.predecessor_baseline_id}\`  
> **rebase_id:** \`${tip.rebase_id}\`

## Status banner

\`\`\`text
ACCEPTANCE CONTRACT = LOCKED
DECISION = ENGINE_ACCEPTANCE_REBASE_EVAL_REVIEW_V1
BASELINE = NEW_EPOCH
PREDECESSOR = ${tip.predecessor_baseline_id}
QA0 = COMPLETE (new epoch freeze)
QA1-QA8 = STALE_FOR_CURRENT_EPOCH
QA9 = STALE_AGGREGATION
NEXT = QA1_DETERMINISTIC_TRUTH
PRODUCT_ONLY_REBASE_SEMANTICS = PRESERVED
\`\`\`

## Verdict (after reviewed eval evolution)

| Field | Value |
|---|---|
| verdict | \`ENGINE_QA_INCOMPLETE\` |
| eval_dataset_hash | predecessor \`${tip.old_eval_dataset_hash}\` → live \`${tip.new_eval_dataset_hash}\` |
| coverage_effect | \`${tip.coverage_effect}\` |
| review_id | \`${tip.review_id}\` |

**금지 확인:** product-only \`ENGINE_ACCEPTANCE_REBASE_V1\` eval MATCH 가드는 유지. Predecessor epoch 불변.
`;
}

function predecessorSnapshotUnchanged(before, after) {
  return JSON.stringify(before) === JSON.stringify(after);
}

/**
 * product-only 가드가 여전히 eval drift를 거절하는지 교차검증.
 * 이 모듈은 evaluateRebaseInvariants를 호출만 하고 수정하지 않는다.
 */
function productOnlyStillRejectsEvalDrift(entry, ctx, fails) {
  const captured = [];
  evaluateRebaseInvariants(entry, ctx, captured);
  const rejected = captured.some((x) => /eval dataset drift/i.test(x) || /eval_dataset_hash must remain MATCH/i.test(x));
  if (!rejected) {
    fails.push("PRODUCT_ONLY_REBASE_WEAKENED: eval drift was not rejected");
  }
}

module.exports = {
  DECISION_ID,
  PRODUCT_ONLY_DECISION_ID,
  LEDGER_REL,
  BASELINE_REL,
  SCOPE_REL,
  EVIDENCE_REL,
  AMEND_LEDGER_REL,
  REPORT_REL,
  REVIEW_SCHEMA,
  SCHEMA,
  REQUIRED_REVIEW_FIELDS,
  REQUIRED_EVOLUTION_FIELDS,
  emptyLedger,
  loadEvalLedger,
  latestEvolution,
  validateEvalAck,
  validateLedgerPolicy,
  validateReviewEvidence,
  validateEvolutionEntry,
  validateChangedEvalFiles,
  assertSafetyNotWeakened,
  assertReviewMatchesDiff,
  assertProductCommitFresh,
  evaluateEvalReviewInvariants,
  stampEvalReviewPolicy,
  asSyntheticRebaseLedger,
  isEvalReviewPendingRerun,
  verifyEvalReviewPendingRerunEpoch,
  verifyEvalReviewWashing,
  assertEvalReviewEpochBound,
  verifyEvalEvolutionLedger,
  buildEvalReviewReport,
  predecessorSnapshotUnchanged,
  productOnlyStillRejectsEvalDrift,
  predecessorArchiveRel,
  mapSuitesForRebase,
  collectPredecessorChecksums,
  writeJson,
  currentPolicy,
  diffEvalGitToDisk,
};

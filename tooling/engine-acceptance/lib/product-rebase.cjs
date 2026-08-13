/**
 * ENGINE_ACCEPTANCE_REBASE_V1 — 제품 보호범위 변경 시 새 acceptance epoch
 *
 * 금지: 옛 baseline 안에서 prompt_hash/id를 제자리 수정(washing)
 * 허용: Human/PO ACK + predecessor 보존 + QA1-QA6 무효화 + 새 baseline.id
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT, readJson } = require("./hash-scope.cjs");

const DECISION_ID = "ENGINE_ACCEPTANCE_REBASE_V1";
const LEDGER_REL = "governance/engine-acceptance/product-rebases.v1.json";
const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";
const SCOPE_REL = "governance/engine-acceptance/protected-scope.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const AMEND_LEDGER_REL = "governance/engine-acceptance/workflow-amendments.v1.json";
const REPORT_REL = "governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md";
const SCHEMA = "governance.engine-acceptance.product-rebases.v1";
const PREDECESSOR_DIR_REL = "governance/engine-acceptance/baselines";

const INVALIDATED_SUITES = ["QA1", "QA2", "QA3", "QA4", "QA5", "QA6"];
const REQUIRED_RERUN_SUITES = ["QA1", "QA2", "QA3", "QA4", "QA5", "QA6", "QA7"];

const REQUIRED_REBASE_FIELDS = [
  "decision_id",
  "rebase_id",
  "human_po_ack",
  "predecessor_baseline_id",
  "new_baseline_id",
  "reason",
  "product_commit",
  "changed_protected_paths",
  "changed_nonprotected_support_paths",
  "old_prompt_hash",
  "new_prompt_hash",
  "old_protected_manifest_hash",
  "new_protected_manifest_hash",
  "eval_dataset_hash",
  "acceptance_workflow_hash",
  "invalidated_suites",
  "required_rerun_suites",
  "timestamp",
  "commit_sha_or_pending",
];

const RESULT_RELS = {
  QA1: "governance/engine-acceptance/qa1-result.v1.json",
  QA2: "governance/engine-acceptance/qa2-result.v1.json",
  QA3: "governance/engine-acceptance/qa3-result.v1.json",
  QA4: "governance/engine-acceptance/qa4-result.v1.json",
  QA5: "governance/engine-acceptance/qa5-result.v1.json",
  QA6: "governance/engine-acceptance/qa6-result.v1.json",
};

function writeJson(rel, obj) {
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function loadRebaseLedger(rel = LEDGER_REL) {
  return readJson(rel);
}

function emptyLedger() {
  return {
    schema: SCHEMA,
    version: "1.0.0",
    decision_id: DECISION_ID,
    policies: {
      in_place_hash_rewrite: "FORBIDDEN",
      baseline_washing: "FORBIDDEN",
      eval_dataset_mutation_during_product_rebase: "FORBIDDEN",
      silent_workflow_hash_change: "FORBIDDEN",
      ungoverned_freeze_baseline_after_qa0: "FORBIDDEN",
      qa1_qa6_predecessor_as_current_complete: "FORBIDDEN",
    },
    rebases: [],
  };
}

function latestRebase(ledger) {
  if (!ledger || !Array.isArray(ledger.rebases) || ledger.rebases.length === 0) {
    return null;
  }
  return ledger.rebases[ledger.rebases.length - 1];
}

function sameStringArray(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function validateAck(ack, fails, prefix = "human_po_ack") {
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
}

function validateRebaseEntry(entry, index, fails) {
  const fail = (m) => fails.push(index == null ? m : `rebases[${index}]: ${m}`);
  if (!entry || typeof entry !== "object") {
    fail("must be object");
    return;
  }
  for (const k of REQUIRED_REBASE_FIELDS) {
    if (entry[k] === undefined || entry[k] === null || entry[k] === "") {
      fail(`missing ${k}`);
    }
  }
  if (entry.decision_id !== DECISION_ID) fail(`decision_id must be ${DECISION_ID}`);
  validateAck(entry.human_po_ack, fails, index == null ? "human_po_ack" : `rebases[${index}].human_po_ack`);
  if (!entry.predecessor_baseline_id) fail("predecessor_baseline_id required");
  if (entry.predecessor_baseline_id === entry.new_baseline_id) {
    fail("new_baseline_id must differ from predecessor (new epoch required)");
  }
  if (entry.old_protected_manifest_hash === entry.new_protected_manifest_hash) {
    fail("new_protected_manifest_hash must differ from predecessor (protected bytes changed)");
  }
  if (!Array.isArray(entry.changed_protected_paths) || entry.changed_protected_paths.length < 1) {
    fail("changed_protected_paths must be non-empty");
  }
  if (!Array.isArray(entry.changed_nonprotected_support_paths)) {
    fail("changed_nonprotected_support_paths must be array");
  }
  if (!Array.isArray(entry.invalidated_suites)) fail("invalidated_suites must be array");
  else if (!sameStringArray(entry.invalidated_suites, INVALIDATED_SUITES)) {
    fail(`invalidated_suites must be [${INVALIDATED_SUITES.join(", ")}]`);
  }
  if (!Array.isArray(entry.required_rerun_suites)) fail("required_rerun_suites must be array");
  else if (!sameStringArray(entry.required_rerun_suites, REQUIRED_RERUN_SUITES)) {
    fail(`required_rerun_suites must be [${REQUIRED_RERUN_SUITES.join(", ")}]`);
  }
  if (entry.qa7_complete === true || entry.qa7_status === "COMPLETE") {
    fail("must not claim QA7 complete");
  }
}

/**
 * ctx: predecessorBaseline, livePromptHash, liveEvalHash, liveWorkflowHash,
 * liveManifestAggregate, liveManifestEntries, predecessorManifestEntries,
 * fileExists(rel) optional
 */
function evaluateRebaseInvariants(entry, ctx, fails) {
  const fail = (m) => fails.push(m);
  if (!ctx || !ctx.predecessorBaseline) {
    fail("rebase ledger missing predecessor");
    return;
  }
  const pred = ctx.predecessorBaseline;
  if (entry.predecessor_baseline_id !== pred.id) {
    fail(
      `predecessor_baseline_id mismatch: entry=${entry.predecessor_baseline_id} baseline=${pred.id}`,
    );
  }
  if (entry.old_prompt_hash !== pred.prompt_hash) {
    fail("old_prompt_hash must equal predecessor baseline.prompt_hash");
  }
  if (entry.old_protected_manifest_hash !== pred.protected_scope_manifest.aggregate) {
    fail("old_protected_manifest_hash must equal predecessor manifest aggregate");
  }
  if (entry.eval_dataset_hash !== pred.eval_dataset_hash) {
    fail("eval_dataset_hash must remain MATCH to predecessor during product-only rebase");
  }
  if (ctx.liveEvalHash && entry.eval_dataset_hash !== ctx.liveEvalHash) {
    fail("eval dataset drift during product-only rebase");
  }
  if (ctx.liveEvalHash && pred.eval_dataset_hash !== ctx.liveEvalHash) {
    fail("eval dataset drift during product-only rebase (live ≠ predecessor)");
  }
  if (ctx.liveWorkflowHash && entry.acceptance_workflow_hash !== ctx.liveWorkflowHash) {
    fail("workflow hash silently changed");
  }
  if (ctx.liveWorkflowHash && pred.acceptance_workflow_hash !== ctx.liveWorkflowHash) {
    fail("workflow hash silently changed (live ≠ predecessor/current approved hash)");
  }
  if (ctx.livePromptHash && entry.new_prompt_hash !== ctx.livePromptHash) {
    fail("new_prompt_hash must equal live prompt_hash (recalculate; do not trust paste)");
  }
  if (ctx.liveManifestAggregate && entry.new_protected_manifest_hash !== ctx.liveManifestAggregate) {
    fail("new_protected_manifest_hash must equal live protected manifest aggregate");
  }
  if (entry.new_baseline_id === pred.id) {
    fail("old baseline id reused — in-place epoch rewrite forbidden");
  }
  if (entry.new_prompt_hash && pred.id === entry.new_baseline_id) {
    fail("old baseline id + new prompt hash");
  }

  detectProtectedScopeWash(
    ctx.predecessorManifestEntries || (pred.protected_scope_manifest && pred.protected_scope_manifest.entries) || [],
    ctx.liveManifestEntries || [],
    ctx.fileExists,
    fails,
  );
}

function detectProtectedScopeWash(predEntries, liveEntries, fileExists, fails) {
  const liveMap = new Map((liveEntries || []).map((e) => [e.path, e.sha256]));
  const exists =
    typeof fileExists === "function"
      ? fileExists
      : (rel) => fs.existsSync(path.join(ROOT, rel));
  for (const e of predEntries || []) {
    if (!liveMap.has(e.path) && exists(e.path)) {
      fails.push(
        `changed protected bytes excluded from protected-scope to manufacture MATCH: ${e.path}`,
      );
    }
  }
}

function assertNoInPlaceHashRewrite(baseline, amendmentLedger, rebaseLedger, fails) {
  if (!baseline || !amendmentLedger) return;
  const frozenId = amendmentLedger.baseline_id;
  const frozenPrompt = amendmentLedger.frozen_at_qa0 && amendmentLedger.frozen_at_qa0.prompt_hash;
  const tip = latestRebase(rebaseLedger);
  if (baseline.id === frozenId && frozenPrompt && baseline.prompt_hash !== frozenPrompt) {
    fails.push(
      "old baseline id + new prompt hash → FAIL (in-place rewrite forbidden; ENGINE_ACCEPTANCE_REBASE_V1 required)",
    );
  }
  if (baseline.id !== frozenId) {
    if (!tip) {
      fails.push("new baseline created without invalidation ledger");
    } else if (tip.new_baseline_id !== baseline.id) {
      fails.push(
        `new baseline id unbound to rebase ledger (baseline=${baseline.id} tip=${tip.new_baseline_id})`,
      );
    } else if (!sameStringArray(tip.invalidated_suites, INVALIDATED_SUITES)) {
      fails.push("new baseline created without QA1-QA6 invalidation ledger");
    }
  }
}

function isPendingRerun(baseline, evidence, rebaseLedger) {
  const tip = latestRebase(rebaseLedger);
  if (!tip || !baseline || tip.new_baseline_id !== baseline.id) return false;
  const suites = (evidence && evidence.suites) || [];
  return INVALIDATED_SUITES.some((id) => {
    const s = suites.find((x) => x.suite_id === id);
    if (!s) return true;
    if (s.completion_status === "STALE" || s.completion_status === "NOT_STARTED") return true;
    if (s.completion_status === "COMPLETE" && s.baseline_id !== baseline.id) return true;
    return false;
  });
}

function verifyWashing(baseline, evidence, rebaseLedger, readResult, fails) {
  const tip = latestRebase(rebaseLedger);
  if (!baseline || !evidence) return;
  const suites = evidence.suites || [];
  const predChecksums = (tip && tip.predecessor_suite_checksums) || {};
  for (const id of INVALIDATED_SUITES) {
    const s = suites.find((x) => x.suite_id === id);
    if (!s) continue;
    let result = null;
    if (typeof readResult === "function") {
      try {
        result = readResult(id);
      } catch {
        result = null;
      }
    }
    if (s.completion_status === "COMPLETE") {
      if (s.baseline_id !== baseline.id) {
        fails.push(`old ${id} results treated as current COMPLETE (suite.baseline_id is predecessor)`);
      }
      if (result && result.baseline_id && result.baseline_id !== baseline.id) {
        fails.push(`old ${id} results treated as current COMPLETE (result.baseline_id is predecessor)`);
      }
      if (predChecksums[id] && s.checksum && s.checksum === predChecksums[id]) {
        fails.push(`${id} current COMPLETE reuses predecessor checksum (evidence washing)`);
      }
    }
    if (s.completion_status === "STALE" && result && result.baseline_id === baseline.id) {
      fails.push(
        `${id} marked STALE but result.baseline_id rewritten to current epoch without a runner`,
      );
    }
  }
}

function verifyPendingRerunEpoch(baseline, evidence, rebaseLedger, fails) {
  const tip = latestRebase(rebaseLedger);
  if (!tip) {
    fails.push("pending rerun requires rebase ledger");
    return;
  }
  if (!evidence) {
    fails.push("evidence-manifest required");
    return;
  }
  if (evidence.baseline_id !== baseline.id) {
    fails.push("evidence-manifest.baseline_id must match current epoch baseline.id");
  }
  if (evidence.qa_phase !== "QA-0") {
    fails.push("after product rebase, evidence-manifest.qa_phase must be QA-0 until QA1-QA6 rerun");
  }
  if (evidence.next !== "QA1_DETERMINISTIC_TRUTH") {
    fails.push("after product rebase, evidence-manifest.next must be QA1_DETERMINISTIC_TRUTH");
  }
  if (evidence.verdict === "ENGINE_ACCEPTED_FOR_UI") {
    fails.push("must not issue ENGINE_ACCEPTED_FOR_UI during rebase pending rerun");
  }
  const suites = evidence.suites || [];
  for (const id of INVALIDATED_SUITES) {
    const s = suites.find((x) => x.suite_id === id);
    if (!s) {
      fails.push(`missing suite slot ${id} after rebase`);
      continue;
    }
    if (s.completion_status === "COMPLETE" && s.baseline_id === baseline.id) {
      // mixed: this suite already rerun — washing check handles checksum
      continue;
    }
    if (s.completion_status !== "STALE" && s.completion_status !== "NOT_STARTED") {
      fails.push(`${id} current-epoch status must be STALE or NOT_STARTED until rerun (got ${s.completion_status})`);
    }
    if (s.historical_baseline_id && s.historical_baseline_id === baseline.id) {
      fails.push(`${id} historical_baseline_id must remain predecessor, not current epoch`);
    }
  }
  const qa0 = suites.find((s) => s.suite_id === "QA0");
  if (!qa0 || qa0.completion_status !== "COMPLETE") {
    fails.push("QA0 (new epoch freeze) must be COMPLETE");
  }
  if (qa0 && qa0.baseline_id !== baseline.id) {
    fails.push("QA0 suite.baseline_id must match new epoch");
  }
  const qa7 = suites.find((s) => s.suite_id === "QA7");
  if (qa7 && qa7.completion_status === "COMPLETE") {
    fails.push("must not claim QA7 complete before current-epoch QA1-QA6 rebuild");
  }
}

/**
 * A rebase entry pins acceptance_workflow_hash AS OF the rebase timestamp.
 * A later POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1 entry (same baseline_id)
 * may legitimately move the CURRENT baseline hash beyond that pinned value —
 * this is the whole point of the controlled-amendment mechanism. Divergence
 * is only accepted when a ledger entry exactly bridges tip -> baseline.
 */
function findBridgingAmendment(amendmentLedger, baseline, tipHash) {
  const amends =
    amendmentLedger && Array.isArray(amendmentLedger.amendments)
      ? amendmentLedger.amendments
      : [];
  return amends.find(
    (a) =>
      a.baseline_id === baseline.id &&
      a.old_acceptance_workflow_hash === tipHash &&
      a.new_acceptance_workflow_hash === baseline.acceptance_workflow_hash,
  );
}

function verifyRebaseLedgerAgainstBaseline(baseline, rebaseLedger, evidence, fails, amendmentLedger) {
  if (!rebaseLedger) return;
  if (rebaseLedger.schema !== SCHEMA) {
    fails.push(`product-rebases.schema must be ${SCHEMA}`);
  }
  if (rebaseLedger.decision_id !== DECISION_ID) {
    fails.push(`product-rebases.decision_id must be ${DECISION_ID}`);
  }
  if (!Array.isArray(rebaseLedger.rebases)) {
    fails.push("product-rebases.rebases must be array");
    return;
  }
  for (let i = 0; i < rebaseLedger.rebases.length; i++) {
    validateRebaseEntry(rebaseLedger.rebases[i], i, fails);
  }
  const tip = latestRebase(rebaseLedger);
  if (tip && baseline && tip.new_baseline_id === baseline.id) {
    if (baseline.prompt_hash !== tip.new_prompt_hash) {
      fails.push("current epoch prompt_hash must equal rebase ledger new_prompt_hash");
    }
    if (baseline.eval_dataset_hash !== tip.eval_dataset_hash) {
      fails.push("current epoch eval_dataset_hash must equal rebase ledger eval_dataset_hash");
    }
    if (baseline.acceptance_workflow_hash !== tip.acceptance_workflow_hash) {
      let amendLedger = amendmentLedger;
      if (amendLedger === undefined) {
        try {
          amendLedger = readJson(AMEND_LEDGER_REL);
        } catch {
          amendLedger = null;
        }
      }
      const bridge = findBridgingAmendment(amendLedger, baseline, tip.acceptance_workflow_hash);
      if (!bridge) {
        fails.push(
          "current epoch acceptance_workflow_hash must equal rebase ledger, or be bridged by a " +
            "POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1 entry (old=rebase tip, new=baseline, same baseline_id)",
        );
      }
    }
    if (baseline.protected_scope_manifest.aggregate !== tip.new_protected_manifest_hash) {
      fails.push("current epoch protected manifest must equal rebase ledger new_protected_manifest_hash");
    }
  }
  if (evidence) {
    verifyWashing(baseline, evidence, rebaseLedger, (id) => readJson(RESULT_RELS[id]), fails);
  }
}

function predecessorArchiveRel(predecessorId) {
  return `${PREDECESSOR_DIR_REL}/${predecessorId}.json`;
}

function collectPredecessorChecksums(evidence) {
  const out = {};
  for (const id of INVALIDATED_SUITES) {
    const s = ((evidence && evidence.suites) || []).find((x) => x.suite_id === id);
    if (s && s.checksum) out[id] = s.checksum;
  }
  return out;
}

function buildStaleSuite(prev, newBaselineId, predecessorId) {
  return {
    suite_id: prev.suite_id,
    run_id: null,
    baseline_id: newBaselineId,
    checksum: null,
    completion_status: "STALE",
    epoch_status: "STALE_FOR_CURRENT_EPOCH",
    historical_completion_status: prev.completion_status || "COMPLETE",
    historical_baseline_id: predecessorId,
    historical_run_id: prev.run_id || null,
    historical_checksum: prev.checksum || null,
    result_ref: prev.result_ref || RESULT_RELS[prev.suite_id] || null,
    predecessor_result_preserved: true,
    ...(prev.mode ? { historical_mode: prev.mode } : {}),
    ...(prev.blocked_codes ? { historical_blocked_codes: prev.blocked_codes } : {}),
    ...(prev.budget_status ? { historical_budget_status: prev.budget_status } : {}),
  };
}

function buildRebaseReport({ baseline, tip, measuredAt }) {
  return `# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-0 \`ENGINE_ACCEPTANCE_REBASE_V1\`  
> **Measured:** ${measuredAt}  
> **baseline_id:** \`${baseline.id}\`  
> **predecessor_baseline_id:** \`${tip.predecessor_baseline_id}\`  
> **rebase_id:** \`${tip.rebase_id}\`

## Status banner

\`\`\`text
ACCEPTANCE CONTRACT = LOCKED
DECISION = ENGINE_ACCEPTANCE_REBASE_V1
BASELINE = NEW_EPOCH
PREDECESSOR = ${tip.predecessor_baseline_id}
QA0 = COMPLETE (new epoch freeze)
QA1 = STALE_FOR_CURRENT_EPOCH
QA2 = STALE_FOR_CURRENT_EPOCH
QA3 = STALE_FOR_CURRENT_EPOCH
QA4 = STALE_FOR_CURRENT_EPOCH
QA5 = STALE_FOR_CURRENT_EPOCH
QA6 = STALE_FOR_CURRENT_EPOCH
QA7 = NOT_STARTED
NEXT = QA1_DETERMINISTIC_TRUTH
BASELINE WASHING = FORBIDDEN
03 UI = BLOCKED
\`\`\`

## Verdict (after product rebase)

| Field | Value |
|---|---|
| verdict | \`ENGINE_QA_INCOMPLETE\` |
| reason | ${DECISION_ID} · predecessor QA1-QA6 are historical COMPLETE / current-epoch STALE · required rerun QA1-QA6 then QA7 · QA7 not claimed complete |
| evidence_integrity | \`VALID\` |
| baseline.valid | \`${baseline.valid}\` |
| working_tree_clean | \`${baseline.working_tree_clean}\` (fact only — not forced clean) |
| protected_scope_clean | \`${baseline.protected_scope_clean}\` |
| prompt_hash | live pinned (\`${baseline.prompt_hash}\`) |
| eval_dataset_hash | MATCH predecessor (\`${baseline.eval_dataset_hash}\`) |
| acceptance_workflow_hash | MATCH current approved (\`${baseline.acceptance_workflow_hash}\`) |

**금지 확인:** \`ENGINE_ACCEPTED_FOR_UI\` **not issued**. Predecessor QA1-QA6 results were **not** rewritten as current-epoch COMPLETE.

## Dual Dirty

- working_tree_clean=\`${baseline.working_tree_clean}\`
- protected_scope_clean=\`${baseline.protected_scope_clean}\`
- forced clean / stash laundry = **forbidden**

## Next

\`QA1_DETERMINISTIC_TRUTH\` only. Full ACCEPTED · product mutation to chase green · 03 UI — **금지**.
`;
}

module.exports = {
  DECISION_ID,
  LEDGER_REL,
  BASELINE_REL,
  SCOPE_REL,
  EVIDENCE_REL,
  AMEND_LEDGER_REL,
  REPORT_REL,
  SCHEMA,
  PREDECESSOR_DIR_REL,
  INVALIDATED_SUITES,
  REQUIRED_RERUN_SUITES,
  REQUIRED_REBASE_FIELDS,
  RESULT_RELS,
  writeJson,
  loadRebaseLedger,
  emptyLedger,
  latestRebase,
  validateAck,
  validateRebaseEntry,
  evaluateRebaseInvariants,
  detectProtectedScopeWash,
  assertNoInPlaceHashRewrite,
  isPendingRerun,
  verifyWashing,
  verifyPendingRerunEpoch,
  verifyRebaseLedgerAgainstBaseline,
  findBridgingAmendment,
  predecessorArchiveRel,
  collectPredecessorChecksums,
  buildStaleSuite,
  buildRebaseReport,
};

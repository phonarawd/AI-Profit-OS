/**
 * ENGINE_ACCEPTANCE_REBASE_V1 — 제품 보호범위 변경 시 새 acceptance epoch
 *
 * 금지: 옛 baseline 안에서 prompt_hash/id를 제자리 수정(washing)
 * 허용: Human/PO ACK + predecessor 보존 + 정책 버전별 discovery 무효화 + 새 baseline.id
 *
 * 정책 버전:
 *   V1 = QA7-era topology (역사적 승인 3건) — QA1-QA6 invalidate, QA1-QA7 rerun
 *   V2 = QA8 discovery + QA9 aggregation topology — 미래 rebase 전용
 * 역사적 승인 payload는 재작성하지 않는다. 현재 상수로 과거 항목을 exact-match하지 않는다.
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

const POLICY_V1_ID = "ENGINE_ACCEPTANCE_REBASE_POLICY_V1";
const POLICY_V2_ID = "ENGINE_ACCEPTANCE_REBASE_POLICY_V2";
const CURRENT_REBASE_POLICY_ID = POLICY_V2_ID;

/** 역사적 승인 rebase_id — payload 재작성 금지 · V1 exact-match 전용 */
const FROZEN_HISTORICAL_V1_REBASE_IDS = Object.freeze([
  "ea-rebase-a280b21fc7b5-dfa803530b9d",
  "ea-rebase-ca476b4698a6-c1d90fceefe9",
  "ea-rebase-2c7b9cffd323-1e2ce00bd6a1",
]);

const QA1_QA6 = Object.freeze(["QA1", "QA2", "QA3", "QA4", "QA5", "QA6"]);

const REBASE_POLICIES = Object.freeze({
  [POLICY_V1_ID]: Object.freeze({
    id: POLICY_V1_ID,
    // QA1-QA6 재구축이 끝나기 전까지 pending rerun (qa_phase=QA-0 상태기계)
    pending_rebuild_suites: QA1_QA6,
    // STALE + historical_* provenance
    invalidated_suites: QA1_QA6,
    required_rerun_suites: Object.freeze(["QA1", "QA2", "QA3", "QA4", "QA5", "QA6", "QA7"]),
    stale_aggregation_phases: Object.freeze([]),
    washing_suites: QA1_QA6,
  }),
  [POLICY_V2_ID]: Object.freeze({
    id: POLICY_V2_ID,
    pending_rebuild_suites: QA1_QA6,
    // QA8 = discovery. QA9는 aggregation이라 invalidated_suites에 넣지 않는다.
    invalidated_suites: Object.freeze(["QA1", "QA2", "QA3", "QA4", "QA5", "QA6", "QA8"]),
    required_rerun_suites: Object.freeze([
      "QA1",
      "QA2",
      "QA3",
      "QA4",
      "QA5",
      "QA6",
      "QA7",
      "QA8",
    ]),
    stale_aggregation_phases: Object.freeze(["QA9"]),
    washing_suites: Object.freeze(["QA1", "QA2", "QA3", "QA4", "QA5", "QA6", "QA8", "QA9"]),
  }),
});

function currentPolicy() {
  return REBASE_POLICIES[CURRENT_REBASE_POLICY_ID];
}

function policyById(id) {
  return REBASE_POLICIES[id] || null;
}

function isFrozenHistoricalRebaseId(id) {
  return FROZEN_HISTORICAL_V1_REBASE_IDS.includes(id);
}

/**
 * 역사적 승인 = frozen rebase_id → 항상 V1 (필드 추가로 의미를 바꾸지 않음).
 * 그 외 = 명시한 version, 없으면 현재 정책(V2). V1 shape으로는 새 epoch를 인가할 수 없다.
 */
function resolvePolicyId(entry) {
  if (entry && isFrozenHistoricalRebaseId(entry.rebase_id)) {
    return POLICY_V1_ID;
  }
  if (entry && entry.rebase_policy_version) {
    return entry.rebase_policy_version;
  }
  return CURRENT_REBASE_POLICY_ID;
}

function resolvePolicyForEntry(entry) {
  return policyById(resolvePolicyId(entry));
}

// 현재 정책 alias — 미래 apply 경로가 이 배열을 기록한다.
const INVALIDATED_SUITES = currentPolicy().invalidated_suites;
const REQUIRED_RERUN_SUITES = currentPolicy().required_rerun_suites;
const STALE_AGGREGATION_PHASES = currentPolicy().stale_aggregation_phases;

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
  QA7: "governance/engine-acceptance/qa7-result.v1.json",
  QA8: "governance/engine-acceptance/qa8-result.v1.json",
  QA9: "governance/engine-acceptance/qa9-result.v1.json",
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
      qa8_predecessor_as_current_complete: "FORBIDDEN",
      qa9_predecessor_verdict_as_current_authoritative: "FORBIDDEN",
    },
    rebase_policy: {
      current_version: CURRENT_REBASE_POLICY_ID,
      historical_version: POLICY_V1_ID,
      amendment_id: "rebase-policy-qa8-qa9-topology-20260814",
      effective_for: "future_rebases_only",
      creates_acceptance_epoch: false,
      invalidates_current_evidence: false,
      historical_rebase_ids: FROZEN_HISTORICAL_V1_REBASE_IDS.slice(),
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

function validateLedgerPolicy(ledger, fails) {
  if (!ledger) return;
  const rp = ledger.rebase_policy;
  if (!rp || typeof rp !== "object") {
    fails.push("product-rebases.rebase_policy required (ENGINE_ACCEPTANCE_REBASE_POLICY_V2)");
    return;
  }
  if (rp.current_version !== CURRENT_REBASE_POLICY_ID) {
    fails.push(`rebase_policy.current_version must be ${CURRENT_REBASE_POLICY_ID}`);
  }
  if (rp.historical_version !== POLICY_V1_ID) {
    fails.push(`rebase_policy.historical_version must be ${POLICY_V1_ID}`);
  }
  if (rp.effective_for !== "future_rebases_only") {
    fails.push("rebase_policy.effective_for must be future_rebases_only");
  }
  if (rp.creates_acceptance_epoch === true) {
    fails.push("rebase_policy amendment must not create an acceptance epoch");
  }
  if (rp.invalidates_current_evidence === true) {
    fails.push("rebase_policy amendment must not invalidate current-epoch evidence");
  }
  if (!sameStringArray(rp.historical_rebase_ids, FROZEN_HISTORICAL_V1_REBASE_IDS)) {
    fails.push(
      "rebase_policy.historical_rebase_ids must equal frozen V1 rebase ids (history rewrite forbidden)",
    );
  }
  if (rp.human_po_ack) {
    validateAck(rp.human_po_ack, fails, "rebase_policy.human_po_ack");
  } else {
    fails.push("rebase_policy.human_po_ack required");
  }
  if (ledger.policies) {
    if (ledger.policies.baseline_washing !== "FORBIDDEN") {
      fails.push("policies.baseline_washing must remain FORBIDDEN");
    }
    if (ledger.policies.in_place_hash_rewrite !== "FORBIDDEN") {
      fails.push("policies.in_place_hash_rewrite must remain FORBIDDEN");
    }
  }
}

/**
 * opts.requireCurrentPolicy — 미래 새 epoch apply. V1 shape으로는 인가 불가.
 */
function validateRebaseEntry(entry, index, fails, opts = {}) {
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

  if (isFrozenHistoricalRebaseId(entry.rebase_id) && entry.rebase_policy_version) {
    fail("historical rebase payload must not be rewritten with rebase_policy_version");
  }

  if (opts.requireCurrentPolicy) {
    if (entry.rebase_policy_version !== CURRENT_REBASE_POLICY_ID) {
      fail(`new rebase must pin rebase_policy_version to ${CURRENT_REBASE_POLICY_ID}`);
    }
    if (isFrozenHistoricalRebaseId(entry.rebase_id)) {
      fail("frozen historical rebase_id cannot be reused for a new epoch");
    }
  }

  const policyId = opts.requireCurrentPolicy ? CURRENT_REBASE_POLICY_ID : resolvePolicyId(entry);
  const policy = policyById(policyId);
  if (!policy) {
    fail(`unknown rebase_policy_version ${policyId}`);
    return;
  }

  if (
    policyId === POLICY_V1_ID &&
    entry.rebase_id &&
    !isFrozenHistoricalRebaseId(entry.rebase_id) &&
    !opts.allowHistoricalFixture
  ) {
    fail(
      `${POLICY_V1_ID} cannot authorize a new rebase; current policy is ${CURRENT_REBASE_POLICY_ID}`,
    );
  }

  if (!Array.isArray(entry.invalidated_suites)) fail("invalidated_suites must be array");
  else if (!sameStringArray(entry.invalidated_suites, policy.invalidated_suites)) {
    fail(`invalidated_suites must be [${policy.invalidated_suites.join(", ")}] under ${policy.id}`);
  }
  if (!Array.isArray(entry.required_rerun_suites)) fail("required_rerun_suites must be array");
  else if (!sameStringArray(entry.required_rerun_suites, policy.required_rerun_suites)) {
    fail(
      `required_rerun_suites must be [${policy.required_rerun_suites.join(", ")}] under ${policy.id}`,
    );
  }

  if (policy.stale_aggregation_phases.length > 0) {
    if (!Array.isArray(entry.stale_aggregation_phases)) {
      fail(`stale_aggregation_phases must be [${policy.stale_aggregation_phases.join(", ")}] under ${policy.id}`);
    } else if (!sameStringArray(entry.stale_aggregation_phases, policy.stale_aggregation_phases)) {
      fail(
        `stale_aggregation_phases must be [${policy.stale_aggregation_phases.join(", ")}] under ${policy.id} (QA9 is aggregation, not a discovery suite)`,
      );
    } else if (entry.stale_aggregation_phases.includes("QA9") === false) {
      fail("current policy must mark QA9 aggregation stale (not a discovery invalidate)");
    }
    if ((entry.invalidated_suites || []).includes("QA9")) {
      fail("QA9 must not be listed in invalidated_suites (aggregation, not discovery)");
    }
    if ((entry.required_rerun_suites || []).includes("QA9")) {
      fail("QA9 must not be listed in required_rerun_suites (rerun aggregation only after discovery evidence)");
    }
  }

  if (entry.qa7_complete === true || entry.qa7_status === "COMPLETE") {
    fail("must not claim QA7 complete");
  }
  if (entry.qa8_complete === true || entry.qa8_status === "COMPLETE") {
    fail("must not claim QA8 complete at rebase time");
  }
  if (entry.qa9_complete === true || entry.qa9_status === "COMPLETE") {
    fail("must not claim QA9 complete at rebase time");
  }
  if (entry.qa9_verdict_issued === true) {
    fail("must not fabricate a QA9 verdict at rebase time");
  }
  if (entry.eval_dataset_status != null) {
    if (
      entry.eval_dataset_status !== "MATCH" &&
      entry.eval_dataset_status !== "ACKNOWLEDGED_EXPANSION"
    ) {
      fail("eval_dataset_status must be MATCH or ACKNOWLEDGED_EXPANSION");
    }
    if (entry.eval_dataset_status === "ACKNOWLEDGED_EXPANSION") {
      if (!entry.old_eval_dataset_hash || !entry.new_eval_dataset_hash) {
        fail("ACKNOWLEDGED_EXPANSION requires old_eval_dataset_hash and new_eval_dataset_hash");
      }
      if (entry.old_eval_dataset_hash === entry.new_eval_dataset_hash) {
        fail("ACKNOWLEDGED_EXPANSION requires old_eval_dataset_hash ≠ new_eval_dataset_hash");
      }
    }
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
  const predEval = pred.eval_dataset_hash;
  const liveEval = ctx.liveEvalHash;
  const evalExpanded = Boolean(liveEval && predEval && liveEval !== predEval);
  const expansionRecorded = entry.eval_dataset_status === "ACKNOWLEDGED_EXPANSION";
  if (evalExpanded) {
    if (!expansionRecorded) {
      fail("eval dataset drift during product-only rebase");
    } else {
      if (entry.old_eval_dataset_hash !== predEval) {
        fail("old_eval_dataset_hash must equal predecessor eval_dataset_hash");
      }
      if (entry.new_eval_dataset_hash !== liveEval) {
        fail("new_eval_dataset_hash must equal live eval_dataset_hash");
      }
      if (entry.eval_dataset_hash !== liveEval) {
        fail("eval_dataset_hash must equal live eval when recording ACKNOWLEDGED_EXPANSION");
      }
    }
  } else {
    if (expansionRecorded) {
      fail("ACKNOWLEDGED_EXPANSION requires live eval ≠ predecessor");
    }
    if (entry.eval_dataset_hash !== predEval) {
      fail("eval_dataset_hash must remain MATCH to predecessor during product-only rebase");
    }
    if (liveEval && entry.eval_dataset_hash !== liveEval) {
      fail("eval dataset drift during product-only rebase");
    }
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
    } else {
      const policy = resolvePolicyForEntry(tip);
      if (!policy || !sameStringArray(tip.invalidated_suites, policy.invalidated_suites)) {
        fails.push("new baseline created without required invalidation ledger");
      }
      if (
        !isFrozenHistoricalRebaseId(tip.rebase_id) &&
        resolvePolicyId(tip) !== CURRENT_REBASE_POLICY_ID
      ) {
        fails.push(
          `new baseline must be bound to ${CURRENT_REBASE_POLICY_ID} (old policy cannot authorize a new rebase)`,
        );
      }
    }
  }
}

function isPendingRerun(baseline, evidence, rebaseLedger) {
  const tip = latestRebase(rebaseLedger);
  if (!tip || !baseline || tip.new_baseline_id !== baseline.id) return false;
  const policy = resolvePolicyForEntry(tip) || currentPolicy();
  const suites = (evidence && evidence.suites) || [];
  // QA8/QA9는 pending_rebuild(QA1-QA6) 상태기계를 확장하지 않는다 (qa_phase=QA-0 계약 유지).
  return (policy.pending_rebuild_suites || []).some((id) => {
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
  const policy = (tip && resolvePolicyForEntry(tip)) || currentPolicy();
  const suites = evidence.suites || [];
  const predChecksums = (tip && tip.predecessor_suite_checksums) || {};
  for (const id of policy.washing_suites || []) {
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
      if (id === "QA9" && s.current_epoch_authoritative !== false && result && result.verdict) {
        if (s.historical_checksum && s.checksum === s.historical_checksum) {
          fails.push("predecessor QA9 verdict treated as current-authoritative (aggregation washing)");
        }
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
  const policy = resolvePolicyForEntry(tip) || currentPolicy();
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
  if ((policy.stale_aggregation_phases || []).length > 0) {
    if (evidence.verdict !== "ENGINE_QA_INCOMPLETE") {
      fails.push(
        "predecessor QA9 verdict cannot remain current-authoritative; verdict must be ENGINE_QA_INCOMPLETE until current-epoch aggregation reruns",
      );
    }
  }
  const suites = evidence.suites || [];
  for (const id of policy.pending_rebuild_suites || []) {
    const s = suites.find((x) => x.suite_id === id);
    if (!s) {
      fails.push(`missing suite slot ${id} after rebase`);
      continue;
    }
    if (s.completion_status === "COMPLETE" && s.baseline_id === baseline.id) {
      continue;
    }
    if (s.completion_status !== "STALE" && s.completion_status !== "NOT_STARTED") {
      fails.push(`${id} current-epoch status must be STALE or NOT_STARTED until rerun (got ${s.completion_status})`);
    }
    if (s.historical_baseline_id && s.historical_baseline_id === baseline.id) {
      fails.push(`${id} historical_baseline_id must remain predecessor, not current epoch`);
    }
  }

  const extraInvalidated = (policy.invalidated_suites || []).filter(
    (id) => !(policy.pending_rebuild_suites || []).includes(id),
  );
  for (const id of extraInvalidated) {
    const s = suites.find((x) => x.suite_id === id);
    if (!s) {
      fails.push(`missing suite slot ${id} after rebase`);
      continue;
    }
    if (s.completion_status === "COMPLETE" && s.baseline_id === baseline.id) {
      continue;
    }
    if (s.completion_status !== "STALE" && s.completion_status !== "NOT_STARTED") {
      fails.push(
        `${id} current-epoch status must be STALE or NOT_STARTED until discovery rerun (got ${s.completion_status})`,
      );
    }
    if (s.historical_baseline_id && s.historical_baseline_id === baseline.id) {
      fails.push(`${id} historical_baseline_id must remain predecessor, not current epoch`);
    }
  }

  for (const id of policy.stale_aggregation_phases || []) {
    const s = suites.find((x) => x.suite_id === id);
    if (!s) {
      fails.push(`missing aggregation slot ${id} after rebase`);
      continue;
    }
    if (s.completion_status === "COMPLETE") {
      fails.push(
        `predecessor ${id} result/report cannot remain current-authoritative; aggregation must be STALE until current-epoch discovery evidence exists`,
      );
    } else if (s.completion_status !== "STALE" && s.completion_status !== "NOT_STARTED") {
      fails.push(`${id} aggregation must be STALE or NOT_STARTED until rerun (got ${s.completion_status})`);
    }
    if (s.current_epoch_authoritative === true) {
      fails.push(`${id} must not be current-epoch authoritative after rebase`);
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
 * Later POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1 entries (same baseline_id)
 * may move the CURRENT baseline hash beyond that pinned value, including
 * through a sequential chain (each amendment.old = previous.new).
 * Divergence is accepted when that chain walks tipHash → baseline hash.
 */
function findBridgingAmendment(amendmentLedger, baseline, tipHash) {
  const amends =
    amendmentLedger && Array.isArray(amendmentLedger.amendments)
      ? amendmentLedger.amendments
      : [];
  if (!baseline || !baseline.acceptance_workflow_hash) return null;
  const target = baseline.acceptance_workflow_hash;
  const sameId = amends.filter((a) => a.baseline_id === baseline.id);
  let current = tipHash;
  const seen = new Set();
  let last = null;
  while (current !== target) {
    if (seen.has(current)) return null;
    seen.add(current);
    const next = sameId.find((a) => a.old_acceptance_workflow_hash === current);
    if (!next) return null;
    last = next;
    current = next.new_acceptance_workflow_hash;
  }
  return last;
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
  validateLedgerPolicy(rebaseLedger, fails);
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
            "POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1 chain (old=rebase tip … new=baseline, same baseline_id)",
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

function collectPredecessorChecksums(evidence, policy) {
  const ids = (policy && policy.washing_suites) || currentPolicy().washing_suites;
  const out = {};
  for (const id of ids) {
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
    ...(prev.asvs_version ? { historical_asvs_version: prev.asvs_version } : {}),
  };
}

function buildStaleAggregationPhase(prev, newBaselineId, predecessorId, predecessorVerdict) {
  return {
    suite_id: prev.suite_id || "QA9",
    run_id: null,
    baseline_id: newBaselineId,
    checksum: null,
    completion_status: "STALE",
    epoch_status: "STALE_AGGREGATION_FOR_CURRENT_EPOCH",
    aggregation_only: true,
    discovery_suite: false,
    current_epoch_authoritative: false,
    historical_completion_status: prev.completion_status || "COMPLETE",
    historical_baseline_id: predecessorId,
    historical_run_id: prev.run_id || null,
    historical_checksum: prev.checksum || null,
    historical_verdict: predecessorVerdict || null,
    result_ref: prev.result_ref || RESULT_RELS.QA9,
    predecessor_result_preserved: true,
    rerun_after_current_epoch_discovery: true,
  };
}

function mapSuitesForRebase(suites, policy, ctx) {
  const newBaselineId = ctx.newBaselineId;
  const predecessorId = ctx.predecessorId;
  const rebaseId = ctx.rebaseId;
  const qa0Checksum = ctx.qa0Checksum;
  const predecessorVerdict = ctx.predecessorVerdict;
  const mapped = (suites || []).map((s) => {
    if (s.suite_id === "QA0") {
      return {
        suite_id: "QA0",
        run_id: rebaseId,
        baseline_id: newBaselineId,
        checksum: qa0Checksum,
        completion_status: "COMPLETE",
        epoch: "current",
        predecessor_baseline_id: predecessorId,
      };
    }
    if ((policy.invalidated_suites || []).includes(s.suite_id)) {
      return buildStaleSuite(s, newBaselineId, predecessorId);
    }
    if ((policy.stale_aggregation_phases || []).includes(s.suite_id)) {
      return buildStaleAggregationPhase(s, newBaselineId, predecessorId, predecessorVerdict);
    }
    return {
      ...s,
      baseline_id: newBaselineId,
      run_id: null,
      checksum: null,
      completion_status: "NOT_STARTED",
      predecessor_baseline_id: predecessorId,
    };
  });
  const have = new Set(mapped.map((s) => s.suite_id));
  for (const id of policy.invalidated_suites || []) {
    if (!have.has(id)) {
      mapped.push(buildStaleSuite({ suite_id: id, completion_status: "NOT_STARTED" }, newBaselineId, predecessorId));
      have.add(id);
    }
  }
  for (const id of policy.stale_aggregation_phases || []) {
    if (!have.has(id)) {
      mapped.push(
        buildStaleAggregationPhase({ suite_id: id }, newBaselineId, predecessorId, predecessorVerdict),
      );
      have.add(id);
    }
  }
  return mapped;
}

function stampCurrentPolicyOnEntry(entry) {
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

/** product-only = MATCH. live eval ≠ predecessor 이면 MATCH 주장 금지 · 새 epoch에 old/new 기록. */
function stampEvalDatasetOnEntry(entry, predecessorEvalHash, liveEvalHash) {
  if (liveEvalHash && predecessorEvalHash && liveEvalHash !== predecessorEvalHash) {
    entry.eval_dataset_status = "ACKNOWLEDGED_EXPANSION";
    entry.old_eval_dataset_hash = predecessorEvalHash;
    entry.new_eval_dataset_hash = liveEvalHash;
    entry.eval_dataset_hash = liveEvalHash;
  } else {
    entry.eval_dataset_status = "MATCH";
    entry.eval_dataset_hash = liveEvalHash || predecessorEvalHash;
  }
  return entry;
}

function buildRebaseReport({ baseline, tip, measuredAt }) {
  const policy = resolvePolicyForEntry(tip) || currentPolicy();
  const qa8Line =
    (policy.invalidated_suites || []).includes("QA8") ? "QA8 = STALE_FOR_CURRENT_EPOCH\n" : "";
  const qa9Line =
    (policy.stale_aggregation_phases || []).includes("QA9")
      ? "QA9 = STALE_AGGREGATION (not current-authoritative)\n"
      : "";
  const reason =
    (policy.stale_aggregation_phases || []).includes("QA9")
      ? `${DECISION_ID} · predecessor discovery is historical COMPLETE / current-epoch STALE · required rerun QA1-QA8 then QA9 aggregation · do not fabricate a verdict at rebase time`
      : `${DECISION_ID} · predecessor QA1-QA6 are historical COMPLETE / current-epoch STALE · required rerun QA1-QA6 then QA7 · QA7 not claimed complete`;
  return `# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-0 \`ENGINE_ACCEPTANCE_REBASE_V1\`  
> **Measured:** ${measuredAt}  
> **baseline_id:** \`${baseline.id}\`  
> **predecessor_baseline_id:** \`${tip.predecessor_baseline_id}\`  
> **rebase_id:** \`${tip.rebase_id}\`  
> **rebase_policy_version:** \`${policy.id}\`

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
${qa8Line}${qa9Line}NEXT = QA1_DETERMINISTIC_TRUTH
BASELINE WASHING = FORBIDDEN
03 UI = BLOCKED
ENGINE_ACCEPTED_FOR_UI = NOT_ISSUED
\`\`\`

## Verdict (after product rebase)

| Field | Value |
|---|---|
| verdict | \`ENGINE_QA_INCOMPLETE\` |
| reason | ${reason} |
| evidence_integrity | \`VALID\` |
| baseline.valid | \`${baseline.valid}\` |
| working_tree_clean | \`${baseline.working_tree_clean}\` (fact only — not forced clean) |
| protected_scope_clean | \`${baseline.protected_scope_clean}\` |
| prompt_hash | live pinned (\`${baseline.prompt_hash}\`) |
| eval_dataset_hash | ${
    tip.eval_dataset_status === "ACKNOWLEDGED_EXPANSION"
      ? `ACKNOWLEDGED_EXPANSION (old \`${tip.old_eval_dataset_hash}\` → live \`${baseline.eval_dataset_hash}\`)`
      : `MATCH predecessor (\`${baseline.eval_dataset_hash}\`)`
  } |
| acceptance_workflow_hash | MATCH current approved (\`${baseline.acceptance_workflow_hash}\`) |

**금지 확인:** \`ENGINE_ACCEPTED_FOR_UI\` **not issued**. Predecessor discovery/aggregation results were **not** rewritten as current-epoch COMPLETE. Predecessor QA9 verdict is **not** current-authoritative.

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
  POLICY_V1_ID,
  POLICY_V2_ID,
  CURRENT_REBASE_POLICY_ID,
  FROZEN_HISTORICAL_V1_REBASE_IDS,
  REBASE_POLICIES,
  INVALIDATED_SUITES,
  REQUIRED_RERUN_SUITES,
  STALE_AGGREGATION_PHASES,
  REQUIRED_REBASE_FIELDS,
  RESULT_RELS,
  writeJson,
  loadRebaseLedger,
  emptyLedger,
  latestRebase,
  validateAck,
  validateLedgerPolicy,
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
  buildStaleAggregationPhase,
  mapSuitesForRebase,
  stampCurrentPolicyOnEntry,
  stampEvalDatasetOnEntry,
  currentPolicy,
  policyById,
  resolvePolicyId,
  resolvePolicyForEntry,
  isFrozenHistoricalRebaseId,
  buildRebaseReport,
};

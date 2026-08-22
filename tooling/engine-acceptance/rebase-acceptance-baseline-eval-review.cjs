/**
 * ENGINE_ACCEPTANCE_REBASE_EVAL_REVIEW_V1 apply
 *
 * 의도적 eval dataset 변경을 리뷰 증거와 함께 새 acceptance epoch로 묶는다.
 * product-only rebase(ENGINE_ACCEPTANCE_REBASE_V1)의 eval MATCH 가드는 그대로 둔다.
 *
 * Usage:
 *   node tooling/engine-acceptance/rebase-acceptance-baseline-eval-review.cjs --dry-run \
 *     --predecessor <id> --product-commit <sha> --review <review.json>
 *   node tooling/engine-acceptance/rebase-acceptance-baseline-eval-review.cjs --apply \
 *     --predecessor <id> --product-commit <sha> --review <review.json> \
 *     --ack-statement "ACK APPROVED ENGINE_ACCEPTANCE_REBASE_EVAL_REVIEW_V1: ..."
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  ROOT,
  readJson,
  buildManifest,
  hashPathList,
  dualDirty,
  git,
  packageManagerVersion,
  nodeVersion,
} = require("./lib/hash-scope.cjs");
const {
  DECISION_ID: PRODUCT_ONLY_DECISION_ID,
  evaluateRebaseInvariants,
  currentPolicy,
} = require("./lib/product-rebase.cjs");
const {
  DECISION_ID,
  LEDGER_REL,
  BASELINE_REL,
  SCOPE_REL,
  EVIDENCE_REL,
  AMEND_LEDGER_REL,
  REPORT_REL,
  SCHEMA,
  emptyLedger,
  validateReviewEvidence,
  validateEvolutionEntry,
  evaluateEvalReviewInvariants,
  stampEvalReviewPolicy,
  predecessorArchiveRel,
  mapSuitesForRebase,
  collectPredecessorChecksums,
  writeJson,
  buildEvalReviewReport,
  validateEvalAck,
} = require("./lib/eval-review-rebase.cjs");
const { diffEvalGitToDisk } = require("./lib/eval-dataset-diff.cjs");

function parseArgs(argv) {
  const out = {
    apply: false,
    dryRun: true,
    predecessor: null,
    productCommit: null,
    review: null,
    ackStatement: null,
    ackBy: "Human/PO",
    supportPaths: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") {
      out.apply = true;
      out.dryRun = false;
    } else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--predecessor") out.predecessor = argv[++i];
    else if (a === "--product-commit") out.productCommit = argv[++i];
    else if (a === "--review") out.review = argv[++i];
    else if (a === "--ack-statement") out.ackStatement = argv[++i];
    else if (a === "--ack-by") out.ackBy = argv[++i];
    else if (a === "--support-path") out.supportPaths.push(argv[++i]);
  }
  return out;
}

function loadReview(relOrAbs) {
  if (!relOrAbs) return null;
  const abs = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(ROOT, relOrAbs);
  if (!fs.existsSync(abs)) {
    throw new Error(`review not found: ${relOrAbs}`);
  }
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function diffProtectedPaths(predEntries, liveEntries) {
  const predMap = new Map((predEntries || []).map((e) => [e.path, e.sha256]));
  const liveMap = new Map((liveEntries || []).map((e) => [e.path, e.sha256]));
  const changed = [];
  for (const [p, h] of liveMap) {
    if (predMap.get(p) !== h) changed.push(p);
  }
  for (const p of predMap.keys()) {
    if (!liveMap.has(p)) changed.push(p);
  }
  changed.sort();
  return changed;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.predecessor || !args.productCommit) {
    console.error(
      "[rebase-eval-review] FAIL: --predecessor --product-commit required (--review required for a legal eval path)",
    );
    process.exit(2);
  }

  const predecessor = readJson(BASELINE_REL);
  const scope = readJson(SCOPE_REL);
  const evidence = readJson(EVIDENCE_REL);
  const amendLedger = readJson(AMEND_LEDGER_REL);

  if (predecessor.id !== args.predecessor) {
    console.error(
      `[rebase-eval-review] FAIL: current baseline.id=${predecessor.id} ≠ --predecessor ${args.predecessor}`,
    );
    process.exit(1);
  }

  const fails = [];
  let review = null;
  if (!args.review) {
    fails.push("unreviewed eval dataset mutation");
  } else {
    try {
      review = loadReview(args.review);
    } catch (e) {
      fails.push(`malformed review evidence: ${e.message}`);
    }
  }
  if (review) validateReviewEvidence(review, fails);

  const dirty = dualDirty(scope);
  const manifest = buildManifest(scope);
  const aggregates = {};
  for (const [key, paths] of Object.entries(scope.aggregateHashes || {})) {
    aggregates[key] = hashPathList(paths, scope);
  }

  let commit_sha;
  let tree_sha;
  try {
    commit_sha = git("git rev-parse HEAD");
    tree_sha = git('git rev-parse "HEAD^{tree}"');
  } catch (e) {
    throw new Error(`git rev-parse failed: ${e.message}`);
  }

  const measuredAt = new Date().toISOString();
  const newId = `ea-baseline-${commit_sha.slice(0, 12)}-${manifest.aggregate.slice(0, 12)}`;
  const rebaseId = `ea-evalrev-${args.productCommit.slice(0, 12)}-${manifest.aggregate.slice(0, 12)}`;
  const changedProtected = diffProtectedPaths(
    predecessor.protected_scope_manifest.entries || [],
    manifest.entries,
  );
  const evalDiff = diffEvalGitToDisk(predecessor.commit_sha);

  const supportPaths =
    args.supportPaths.length > 0 ? args.supportPaths : ["services/ai-platform/src/index.d.ts"];

  const entry = {
    decision_id: DECISION_ID,
    rebase_id: rebaseId,
    predecessor_baseline_id: predecessor.id,
    new_baseline_id: newId,
    reason:
      (review && review.reason) ||
      "Reviewed intentional eval dataset evolution creates a new acceptance epoch. Product-only rebase remains eval-MATCH-only.",
    product_commit: args.productCommit,
    predecessor_product_commit: predecessor.commit_sha,
    changed_protected_paths: changedProtected,
    changed_nonprotected_support_paths: supportPaths,
    old_prompt_hash: predecessor.prompt_hash,
    new_prompt_hash: aggregates.prompt_hash,
    old_protected_manifest_hash: predecessor.protected_scope_manifest.aggregate,
    new_protected_manifest_hash: manifest.aggregate,
    old_eval_dataset_hash: predecessor.eval_dataset_hash,
    new_eval_dataset_hash: aggregates.eval_dataset_hash,
    changed_eval_files: (review && review.changed_eval_files) || evalDiff.changed_files.map((f) => ({
      path: f.path,
      old_case_count: f.old_case_count,
      new_case_count: f.new_case_count,
      added: f.added,
      removed: f.removed,
      modified: f.modified,
      semantic_effect: f.semantic_effect,
    })),
    coverage_effect: (review && review.coverage_effect) || evalDiff.coverage_effect,
    review_id: (review && review.review_id) || null,
    acceptance_workflow_hash: aggregates.acceptance_workflow_hash,
    schema_migration_hash: {
      predecessor: predecessor.schema_migration_hash,
      live: aggregates.schema_migration_hash,
      status:
        predecessor.schema_migration_hash === aggregates.schema_migration_hash
          ? "MATCH"
          : "CHANGED_RECORDED",
    },
    predecessor_suite_checksums: collectPredecessorChecksums(evidence, currentPolicy()),
    timestamp: measuredAt,
    commit_sha_or_pending: commit_sha,
  };
  stampEvalReviewPolicy(entry);

  const ackReady = Boolean(args.ackStatement);
  if (ackReady) {
    entry.human_po_ack = {
      by: args.ackBy,
      at: measuredAt,
      statement: args.ackStatement,
    };
    validateEvalAck(entry.human_po_ack, fails);
  }

  validateEvolutionEntry(entry, null, fails, {
    requireCurrentPolicy: true,
    requireAck: Boolean(args.apply),
  });
  evaluateEvalReviewInvariants(
    entry,
    {
      predecessorBaseline: predecessor,
      liveEvalHash: aggregates.eval_dataset_hash,
      liveWorkflowHash: aggregates.acceptance_workflow_hash,
      livePromptHash: aggregates.prompt_hash,
      liveManifestAggregate: manifest.aggregate,
      liveManifestEntries: manifest.entries,
      predecessorManifestEntries: predecessor.protected_scope_manifest.entries,
      productCommit: args.productCommit,
      predecessorProductCommit: predecessor.commit_sha,
      review,
      evalDiff,
    },
    fails,
  );
  if (!dirty.protected_scope_clean) {
    fails.push("protected scope dirty — eval-review rebase cannot freeze a dirty protected tree");
  }
  if (newId === predecessor.id) {
    fails.push("computed new baseline id equals predecessor");
  }

  // 교차검증: 같은 live eval drift는 product-only 경로에서 계속 거절되어야 한다.
  const productFails = [];
  evaluateRebaseInvariants(
    {
      predecessor_baseline_id: predecessor.id,
      old_prompt_hash: predecessor.prompt_hash,
      new_prompt_hash: aggregates.prompt_hash,
      old_protected_manifest_hash: predecessor.protected_scope_manifest.aggregate,
      new_protected_manifest_hash: manifest.aggregate,
      eval_dataset_hash: aggregates.eval_dataset_hash,
      acceptance_workflow_hash: aggregates.acceptance_workflow_hash,
      new_baseline_id: newId,
    },
    {
      predecessorBaseline: predecessor,
      liveEvalHash: aggregates.eval_dataset_hash,
      livePromptHash: aggregates.prompt_hash,
      liveWorkflowHash: aggregates.acceptance_workflow_hash,
      liveManifestAggregate: manifest.aggregate,
      liveManifestEntries: manifest.entries,
      predecessorManifestEntries: predecessor.protected_scope_manifest.entries,
      fileExists: () => false,
    },
    productFails,
  );
  const productStillBlocks = productFails.some(
    (x) => /eval dataset drift/i.test(x) || /eval_dataset_hash must remain MATCH/i.test(x),
  );
  if (!productStillBlocks) {
    fails.push("PRODUCT_ONLY_REBASE_WEAKENED: product-only invariants no longer reject eval drift");
  }

  console.log(`[rebase-eval-review] decision=${DECISION_ID}`);
  console.log(`  product_only_decision=${PRODUCT_ONLY_DECISION_ID} (unchanged · eval MATCH)`);
  console.log(`  predecessor=${predecessor.id}`);
  console.log(`  new_baseline_id=${newId} (not written unless --apply + ACK)`);
  console.log(`  rebase_id=${rebaseId}`);
  console.log(`  old_eval=${predecessor.eval_dataset_hash}`);
  console.log(`  new_eval=${aggregates.eval_dataset_hash}`);
  console.log(`  coverage_effect=${entry.coverage_effect}`);
  console.log(`  changed_eval_files=${entry.changed_eval_files.length}`);
  console.log(`  workflow=${aggregates.acceptance_workflow_hash} (must MATCH current)`);
  console.log(`  product_only_still_rejects_eval_drift=${productStillBlocks}`);
  console.log(`  working_tree_clean=${dirty.working_tree_clean}`);
  console.log(`  protected_scope_clean=${dirty.protected_scope_clean}`);
  console.log(`  human_ack_present=${ackReady}`);

  if (fails.length) {
    console.error("[rebase-eval-review] FAIL");
    for (const f of fails) console.error(`  - ${f}`);
    process.exit(1);
  }

  if (!ackReady) {
    console.log("[rebase-eval-review] DRY-RUN READY_FOR_FOUNDER_APPROVAL");
    console.log("  review evidence valid · Human/PO ACK missing · epoch NOT created");
    console.log("  OLD_EPOCH_MUTATED=0");
    return;
  }

  if (args.dryRun || !args.apply) {
    console.log("[rebase-eval-review] DRY-RUN OK (ACK present · no writes)");
    console.log("  OLD_EPOCH_MUTATED=0");
    return;
  }

  const predBefore = JSON.parse(JSON.stringify(predecessor));
  const archiveRel = predecessorArchiveRel(predecessor.id);
  fs.mkdirSync(path.join(ROOT, path.dirname(archiveRel)), { recursive: true });
  writeJson(archiveRel, predecessor);
  const archived = readJson(archiveRel);
  if (JSON.stringify(archived) !== JSON.stringify(predBefore)) {
    throw new Error("predecessor archive mutated during write");
  }

  const newBaseline = {
    schema: "governance.engine-acceptance.baseline.v1",
    version: "1.0.0",
    id: newId,
    todoId: "engine-acceptance-rebase-eval-review-v1",
    measuredAt,
    commit_sha,
    tree_sha,
    working_tree_clean: dirty.working_tree_clean,
    protected_scope_clean: dirty.protected_scope_clean,
    dirty_paths_all: dirty.dirtyPathsAll,
    dirty_paths_protected: dirty.dirtyPathsProtected,
    lockfile_hash: aggregates.lockfile_hash,
    schema_migration_hash: aggregates.schema_migration_hash,
    prompt_hash: aggregates.prompt_hash,
    eval_dataset_hash: aggregates.eval_dataset_hash,
    acceptance_workflow_hash: aggregates.acceptance_workflow_hash,
    node_version: nodeVersion(),
    package_manager_version: packageManagerVersion(),
    hash_rules_ref: SCOPE_REL,
    protected_scope_manifest: {
      pathSeparator: "/",
      hashAlgorithm: scope.hashAlgorithm,
      aggregate: manifest.aggregate,
      pathCount: manifest.pathCount,
      entries: manifest.entries,
    },
    valid: dirty.protected_scope_clean === true,
    valid_reason: dirty.protected_scope_clean
      ? "protected_scope_clean"
      : "protected_scope_dirty_recorded",
    qa_phase: "QA-0",
    next: "QA1_DETERMINISTIC_TRUTH",
    epoch: {
      decision_id: DECISION_ID,
      rebase_id: rebaseId,
      predecessor_baseline_id: predecessor.id,
      kind: "eval_review_rebase",
      review_id: entry.review_id,
    },
  };
  writeJson(BASELINE_REL, newBaseline);

  let ledger;
  try {
    ledger = readJson(LEDGER_REL);
    if (!ledger.evolutions) ledger = emptyLedger();
  } catch {
    ledger = emptyLedger();
  }
  ledger.schema = SCHEMA;
  ledger.decision_id = DECISION_ID;
  ledger.evolutions.push(entry);
  writeJson(LEDGER_REL, ledger);

  const staleSuites = mapSuitesForRebase(evidence.suites || [], currentPolicy(), {
    newBaselineId: newId,
    predecessorId: predecessor.id,
    rebaseId,
    qa0Checksum: manifest.aggregate,
    predecessorVerdict: evidence.verdict,
  });
  const newEvidence = {
    ...evidence,
    qa_phase: "QA-0",
    baseline_id: newId,
    verdict: "ENGINE_QA_INCOMPLETE",
    verdict_reason: `${DECISION_ID} · reviewed eval evolution · predecessor historical COMPLETE / current-epoch STALE · required rerun QA1-QA8 then QA9 aggregation`,
    evidence_integrity: "VALID",
    next: "QA1_DETERMINISTIC_TRUTH",
    current_epoch: {
      decision_id: DECISION_ID,
      rebase_id: rebaseId,
      baseline_id: newId,
      predecessor_baseline_id: predecessor.id,
      rebase_policy_version: entry.rebase_policy_version,
      review_id: entry.review_id,
    },
    predecessor_epoch: {
      baseline_id: predecessor.id,
      historical_status: "COMPLETE_UNDER_PREDECESSOR",
      current_epoch_status: "STALE",
    },
    suites: staleSuites,
  };
  writeJson(EVIDENCE_REL, newEvidence);

  const bindings = Array.isArray(amendLedger.epoch_bindings) ? amendLedger.epoch_bindings.slice() : [];
  bindings.push({
    kind: "current",
    baseline_id: newId,
    rebase_id: rebaseId,
    predecessor_baseline_id: predecessor.id,
    bound_at: measuredAt,
    decision_id: DECISION_ID,
    note: "eval-review epoch; historical product-rebases[] untouched",
  });
  amendLedger.epoch_bindings = bindings;
  amendLedger.current_epoch_baseline_id = newId;
  writeJson(AMEND_LEDGER_REL, amendLedger);

  const report = buildEvalReviewReport({ baseline: newBaseline, tip: entry, measuredAt });
  fs.writeFileSync(path.join(ROOT, REPORT_REL), report, "utf8");

  console.log("[rebase-eval-review] APPLY OK");
  console.log(`  archived ${archiveRel}`);
  console.log(`  wrote ${BASELINE_REL}`);
  console.log(`  wrote ${LEDGER_REL}`);
  console.log(`  OLD_EPOCH_MUTATED=0 (predecessor archived, product-rebases[] untouched)`);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(`[rebase-eval-review] FAIL: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { main, parseArgs };

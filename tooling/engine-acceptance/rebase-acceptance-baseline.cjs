/**
 * ENGINE_ACCEPTANCE_REBASE_V1 apply
 *
 * 옛 freeze-baseline 무단 재실행 금지. 본 경로만 새 epoch baseline을 만든다.
 *
 * Usage:
 *   node tooling/engine-acceptance/rebase-acceptance-baseline.cjs --dry-run --predecessor <id> --product-commit <sha> --ack-statement "<ACK APPROVED ENGINE_ACCEPTANCE_REBASE_V1: ...>"
 *   node tooling/engine-acceptance/rebase-acceptance-baseline.cjs --apply ...
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
  emptyLedger,
  validateRebaseEntry,
  evaluateRebaseInvariants,
  predecessorArchiveRel,
  collectPredecessorChecksums,
  buildStaleSuite,
  buildRebaseReport,
  writeJson,
} = require("./lib/product-rebase.cjs");

function parseArgs(argv) {
  const out = {
    apply: false,
    dryRun: true,
    predecessor: null,
    productCommit: null,
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
    else if (a === "--ack-statement") out.ackStatement = argv[++i];
    else if (a === "--ack-by") out.ackBy = argv[++i];
    else if (a === "--support-path") out.supportPaths.push(argv[++i]);
  }
  return out;
}

function diffProtectedPaths(predEntries, liveEntries) {
  const predMap = new Map(predEntries.map((e) => [e.path, e.sha256]));
  const liveMap = new Map(liveEntries.map((e) => [e.path, e.sha256]));
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
  if (!args.predecessor || !args.productCommit || !args.ackStatement) {
    console.error(
      "[rebase-acceptance-baseline] FAIL: --predecessor --product-commit --ack-statement required",
    );
    process.exit(2);
  }

  const predecessor = readJson(BASELINE_REL);
  const scope = readJson(SCOPE_REL);
  const evidence = readJson(EVIDENCE_REL);
  const amendLedger = readJson(AMEND_LEDGER_REL);

  if (predecessor.id !== args.predecessor) {
    console.error(
      `[rebase-acceptance-baseline] FAIL: current baseline.id=${predecessor.id} ≠ --predecessor ${args.predecessor}`,
    );
    process.exit(1);
  }

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
  const rebaseId = `ea-rebase-${args.productCommit.slice(0, 12)}-${manifest.aggregate.slice(0, 12)}`;

  const changedProtected = diffProtectedPaths(
    predecessor.protected_scope_manifest.entries || [],
    manifest.entries,
  );
  const supportPaths =
    args.supportPaths.length > 0
      ? args.supportPaths
      : ["services/ai-platform/src/index.d.ts"];

  const entry = {
    decision_id: DECISION_ID,
    rebase_id: rebaseId,
    human_po_ack: {
      by: args.ackBy,
      at: measuredAt,
      statement: args.ackStatement,
    },
    predecessor_baseline_id: predecessor.id,
    new_baseline_id: newId,
    reason:
      "Protected product mutation after QA0 (api-nest TypeScript build fix) creates a new acceptance epoch. Predecessor hashes are history; QA1-QA6 must rerun.",
    product_commit: args.productCommit,
    changed_protected_paths: changedProtected,
    changed_nonprotected_support_paths: supportPaths,
    old_prompt_hash: predecessor.prompt_hash,
    new_prompt_hash: aggregates.prompt_hash,
    old_protected_manifest_hash: predecessor.protected_scope_manifest.aggregate,
    new_protected_manifest_hash: manifest.aggregate,
    eval_dataset_hash: aggregates.eval_dataset_hash,
    acceptance_workflow_hash: aggregates.acceptance_workflow_hash,
    invalidated_suites: INVALIDATED_SUITES.slice(),
    required_rerun_suites: REQUIRED_RERUN_SUITES.slice(),
    predecessor_suite_checksums: collectPredecessorChecksums(evidence),
    timestamp: measuredAt,
    commit_sha_or_pending: commit_sha,
    qa7_complete: false,
  };

  const fails = [];
  validateRebaseEntry(entry, null, fails);
  evaluateRebaseInvariants(
    entry,
    {
      predecessorBaseline: predecessor,
      livePromptHash: aggregates.prompt_hash,
      liveEvalHash: aggregates.eval_dataset_hash,
      liveWorkflowHash: aggregates.acceptance_workflow_hash,
      liveManifestAggregate: manifest.aggregate,
      liveManifestEntries: manifest.entries,
      predecessorManifestEntries: predecessor.protected_scope_manifest.entries,
    },
    fails,
  );
  if (!dirty.protected_scope_clean) {
    fails.push("protected scope dirty — rebase cannot freeze a dirty protected tree");
  }
  if (newId === predecessor.id) {
    fails.push("computed new baseline id equals predecessor");
  }

  console.log(`[rebase-acceptance-baseline] decision=${DECISION_ID}`);
  console.log(`  predecessor=${predecessor.id}`);
  console.log(`  new_baseline_id=${newId}`);
  console.log(`  rebase_id=${rebaseId}`);
  console.log(`  old_prompt=${predecessor.prompt_hash}`);
  console.log(`  new_prompt=${aggregates.prompt_hash}`);
  console.log(`  eval=${aggregates.eval_dataset_hash} (must MATCH predecessor)`);
  console.log(`  workflow=${aggregates.acceptance_workflow_hash} (must MATCH current)`);
  console.log(`  changed_protected=${changedProtected.length}`);
  console.log(`  working_tree_clean=${dirty.working_tree_clean}`);
  console.log(`  protected_scope_clean=${dirty.protected_scope_clean}`);

  if (fails.length) {
    console.error("[rebase-acceptance-baseline] FAIL");
    for (const f of fails) console.error(`  - ${f}`);
    process.exit(1);
  }

  if (args.dryRun || !args.apply) {
    console.log("[rebase-acceptance-baseline] DRY-RUN OK (no writes)");
    return;
  }

  const archiveRel = predecessorArchiveRel(predecessor.id);
  fs.mkdirSync(path.join(ROOT, PREDECESSOR_DIR_REL), { recursive: true });
  writeJson(archiveRel, predecessor);

  const newBaseline = {
    schema: "governance.engine-acceptance.baseline.v1",
    version: "1.0.0",
    id: newId,
    todoId: "engine-acceptance-rebase-v1",
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
      kind: "product_rebase",
    },
  };
  writeJson(BASELINE_REL, newBaseline);

  let ledger;
  try {
    ledger = readJson(LEDGER_REL);
    if (!ledger.rebases) ledger = emptyLedger();
  } catch {
    ledger = emptyLedger();
  }
  if (ledger.schema !== SCHEMA) ledger.schema = SCHEMA;
  ledger.decision_id = DECISION_ID;
  ledger.rebases.push(entry);
  writeJson(LEDGER_REL, ledger);

  const staleSuites = (evidence.suites || []).map((s) => {
    if (s.suite_id === "QA0") {
      return {
        suite_id: "QA0",
        run_id: rebaseId,
        baseline_id: newId,
        checksum: manifest.aggregate,
        completion_status: "COMPLETE",
        epoch: "current",
        predecessor_baseline_id: predecessor.id,
      };
    }
    if (INVALIDATED_SUITES.includes(s.suite_id)) {
      return buildStaleSuite(s, newId, predecessor.id);
    }
    return {
      ...s,
      baseline_id: newId,
      run_id: null,
      checksum: null,
      completion_status: "NOT_STARTED",
      predecessor_baseline_id: predecessor.id,
    };
  });

  const newEvidence = {
    ...evidence,
    qa_phase: "QA-0",
    baseline_id: newId,
    verdict: "ENGINE_QA_INCOMPLETE",
    verdict_reason: `${DECISION_ID} · predecessor QA1-QA6 historical COMPLETE / current-epoch STALE · required rerun QA1-QA6 then QA7 · QA7 not complete`,
    evidence_integrity: "VALID",
    next: "QA1_DETERMINISTIC_TRUTH",
    current_epoch: {
      decision_id: DECISION_ID,
      rebase_id: rebaseId,
      baseline_id: newId,
      predecessor_baseline_id: predecessor.id,
      qa1_qa6_status: "STALE_PENDING_RERUN",
    },
    predecessor_epoch: {
      baseline_id: predecessor.id,
      historical_status: "COMPLETE_UNDER_PREDECESSOR",
      current_epoch_status: "STALE",
    },
    suites: staleSuites,
    kill_switch: {
      verified_before_smoke: true,
      verified_before_qa1: false,
      verified_before_qa2: false,
      verified_before_qa3: false,
      verified_before_qa4: false,
      verified_before_qa5: false,
      verified_before_qa6: false,
      production_like_aborts: true,
      predecessor_epoch_had_kill_switch: true,
    },
    dual_dirty: {
      working_tree_clean: dirty.working_tree_clean,
      protected_scope_clean: dirty.protected_scope_clean,
      forced_clean_forbidden: true,
    },
    critical_invariant: {
      blocked: null,
      skipped: null,
      uncovered: null,
      epoch_status: "PENDING_CURRENT_EPOCH_RERUN",
      predecessor_blocked: (evidence.critical_invariant && evidence.critical_invariant.blocked) || 0,
    },
  };
  writeJson(EVIDENCE_REL, newEvidence);

  const bindings = Array.isArray(amendLedger.epoch_bindings) ? amendLedger.epoch_bindings.slice() : [];
  if (!bindings.some((b) => b.kind === "historical_predecessor")) {
    bindings.push({
      kind: "historical_predecessor",
      baseline_id: predecessor.id,
      rebase_id: null,
      note: "amendments[] provenance remains bound to this predecessor epoch; not rewritten as current-epoch events",
    });
  }
  bindings.push({
    kind: "current",
    baseline_id: newId,
    rebase_id: rebaseId,
    predecessor_baseline_id: predecessor.id,
    bound_at: measuredAt,
    note: "current acceptance_scope.unchanged compares against this epoch; historical amendments were NOT created under this id",
  });
  amendLedger.epoch_bindings = bindings;
  amendLedger.current_epoch_baseline_id = newId;
  writeJson(AMEND_LEDGER_REL, amendLedger);

  const report = buildRebaseReport({ baseline: newBaseline, tip: entry, measuredAt });
  fs.writeFileSync(path.join(ROOT, REPORT_REL), report, "utf8");

  console.log("[rebase-acceptance-baseline] APPLY OK");
  console.log(`  archived ${archiveRel}`);
  console.log(`  wrote ${BASELINE_REL}`);
  console.log(`  wrote ${LEDGER_REL}`);
  console.log(`  wrote ${EVIDENCE_REL} (QA1-QA6 STALE; historical results preserved)`);
  console.log(`  wrote ${AMEND_LEDGER_REL} (epoch_bindings only; amendments[] untouched)`);
  console.log(`  wrote ${REPORT_REL}`);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(`[rebase-acceptance-baseline] FAIL: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { main };

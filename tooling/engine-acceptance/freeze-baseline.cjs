/**
 * QA-0 — protected-scope baseline freeze
 * Dual Dirty 기록 · 강제 clean 금지 · scope dirty면 valid=false
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
  hashFileBytes,
} = require("./lib/hash-scope.cjs");

const OUT = path.join(ROOT, "governance/engine-acceptance/baseline.v1.json");
const SCOPE_REL = "governance/engine-acceptance/protected-scope.v1.json";

function main() {
  const scope = readJson(SCOPE_REL);
  const dirty = dualDirty(scope);
  const manifest = buildManifest(scope);

  const aggregates = {};
  for (const [key, paths] of Object.entries(scope.aggregateHashes || {})) {
    aggregates[key] = hashPathList(paths, scope);
  }

  // workflow 파일이 아직 없으면 empty hash 규칙 사용
  const workflowRel = ".github/workflows/engine-acceptance.yml";
  if (!fs.existsSync(path.join(ROOT, workflowRel))) {
    aggregates.acceptance_workflow_hash = scope.normalization.emptyFileHash;
  } else if (!aggregates.acceptance_workflow_hash) {
    aggregates.acceptance_workflow_hash = hashFileBytes(path.join(ROOT, workflowRel));
  }

  let commit_sha;
  let tree_sha;
  try {
    commit_sha = git("git rev-parse HEAD");
    tree_sha = git('git rev-parse "HEAD^{tree}"');
  } catch (e) {
    throw new Error(`git rev-parse failed: ${e.message}`);
  }

  const id = `ea-baseline-${commit_sha.slice(0, 12)}-${manifest.aggregate.slice(0, 12)}`;
  const measuredAt = new Date().toISOString();

  const baseline = {
    schema: "governance.engine-acceptance.baseline.v1",
    version: "1.0.0",
    id,
    todoId: "qa0-baseline-freeze",
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
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");

  console.log(`[engine-acceptance:freeze-baseline] wrote ${path.relative(ROOT, OUT)}`);
  console.log(`  id=${id}`);
  console.log(`  working_tree_clean=${baseline.working_tree_clean}`);
  console.log(`  protected_scope_clean=${baseline.protected_scope_clean}`);
  console.log(`  valid=${baseline.valid}`);
  console.log(`  pathCount=${manifest.pathCount}`);
  console.log(`  next=${baseline.next}`);

  if (!baseline.valid) {
    console.error(
      "[engine-acceptance:freeze-baseline] baseline.valid=false (protected scope dirty — no laundry PASS)",
    );
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(`[engine-acceptance:freeze-baseline] FAIL — ${e.message}`);
    process.exit(1);
  }
}

module.exports = { main };

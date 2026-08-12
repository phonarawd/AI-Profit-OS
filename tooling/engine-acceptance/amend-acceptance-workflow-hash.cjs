/**
 * Explicit acceptance_workflow_hash amendment apply
 * Decision: POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1
 *
 * Usage:
 *   node tooling/engine-acceptance/amend-acceptance-workflow-hash.cjs --proposal <path.json> --dry-run
 *   node tooling/engine-acceptance/amend-acceptance-workflow-hash.cjs --proposal <path.json> --apply
 *
 * Suite runner sync side-effect로 baseline을 갱신하지 않는다.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  ROOT,
  readJson,
  hashPathList,
} = require("./lib/hash-scope.cjs");
const {
  DECISION_ID,
  LEDGER_REL,
  BASELINE_REL,
  SCOPE_REL,
  EVIDENCE_REL,
  loadLedger,
  expectedWorkflowHash,
  validateAmendmentEntry,
  qa0Qa6ImpactBlocked,
  assertQa7NotInFlight,
  writeJson,
} = require("./lib/workflow-amendment.cjs");

function parseArgs(argv) {
  const out = { proposal: null, apply: false, dryRun: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--proposal") out.proposal = argv[++i];
    else if (a === "--apply") {
      out.apply = true;
      out.dryRun = false;
    } else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.proposal) {
    console.error(
      "[amend-acceptance-workflow-hash] FAIL: --proposal <file> required (--dry-run default · --apply to write)",
    );
    process.exit(2);
  }
  const proposalPath = path.isAbsolute(args.proposal)
    ? args.proposal
    : path.join(ROOT, args.proposal);
  if (!fs.existsSync(proposalPath)) {
    console.error(`[amend-acceptance-workflow-hash] FAIL: proposal not found: ${proposalPath}`);
    process.exit(2);
  }

  const proposal = JSON.parse(fs.readFileSync(proposalPath, "utf8"));
  const baseline = readJson(BASELINE_REL);
  const scope = readJson(SCOPE_REL);
  const ledger = loadLedger(LEDGER_REL);
  const evidence = readJson(EVIDENCE_REL);

  if (ledger.decision_id !== DECISION_ID) {
    console.error("[amend-acceptance-workflow-hash] FAIL: ledger decision_id mismatch");
    process.exit(1);
  }
  if (baseline.id !== ledger.baseline_id) {
    console.error("[amend-acceptance-workflow-hash] FAIL: baseline_id STABLE violation");
    process.exit(1);
  }
  if (proposal.baseline_id && proposal.baseline_id !== baseline.id) {
    console.error("[amend-acceptance-workflow-hash] FAIL: proposal.baseline_id ≠ baseline.id");
    process.exit(1);
  }

  assertQa7NotInFlight(evidence);

  const fails = [];
  validateAmendmentEntry(proposal, ledger.amendments.length, fails);
  if (fails.length) {
    console.error("[amend-acceptance-workflow-hash] FAIL: malformed amendment provenance");
    for (const f of fails) console.error(`  - ${f}`);
    process.exit(1);
  }

  const impact = qa0Qa6ImpactBlocked(proposal);
  if (impact) {
    console.error(
      `[amend-acceptance-workflow-hash] FAIL/BLOCKED: QA0-QA6 impact not proven absent (${impact})`,
    );
    process.exit(1);
  }

  // immutable fields must remain untouched in baseline
  if (baseline.prompt_hash !== ledger.frozen_at_qa0.prompt_hash) {
    console.error("[amend-acceptance-workflow-hash] FAIL: prompt_hash already drifted (immutable)");
    process.exit(1);
  }
  if (baseline.eval_dataset_hash !== ledger.frozen_at_qa0.eval_dataset_hash) {
    console.error(
      "[amend-acceptance-workflow-hash] FAIL: eval_dataset_hash already drifted (immutable)",
    );
    process.exit(1);
  }

  const tip = expectedWorkflowHash(ledger);
  if (baseline.acceptance_workflow_hash !== tip) {
    console.error(
      "[amend-acceptance-workflow-hash] FAIL: baseline hash ≠ ledger tip before apply",
    );
    process.exit(1);
  }
  if (proposal.old_acceptance_workflow_hash !== tip) {
    console.error(
      "[amend-acceptance-workflow-hash] FAIL: proposal.old_acceptance_workflow_hash ≠ current tip",
    );
    process.exit(1);
  }

  const live = hashPathList(scope.aggregateHashes.acceptance_workflow_hash, scope);
  if (live !== proposal.new_acceptance_workflow_hash) {
    console.error(
      "[amend-acceptance-workflow-hash] FAIL: live workflow hash ≠ proposal.new_acceptance_workflow_hash",
    );
    console.error(`  live=${live}`);
    console.error(`  new =${proposal.new_acceptance_workflow_hash}`);
    process.exit(1);
  }

  console.log(`[amend-acceptance-workflow-hash] decision=${DECISION_ID}`);
  console.log(`  amendment_id=${proposal.amendment_id}`);
  console.log(`  old=${proposal.old_acceptance_workflow_hash}`);
  console.log(`  new=${proposal.new_acceptance_workflow_hash}`);
  console.log(`  affected=${(proposal.affected_qa_suites || []).join(",")}`);
  console.log(
    `  unaffected_completed=${(proposal.unaffected_completed_suites || []).join(",")}`,
  );

  if (args.dryRun || !args.apply) {
    console.log("[amend-acceptance-workflow-hash] DRY-RUN OK (no baseline/ledger write)");
    return;
  }

  baseline.acceptance_workflow_hash = proposal.new_acceptance_workflow_hash;
  // baseline.id / prompt_hash / eval_dataset_hash 절대 변경하지 않음
  writeJson(BASELINE_REL, baseline);

  ledger.amendments.push({
    amendment_id: proposal.amendment_id,
    reason: proposal.reason,
    human_po_ack: proposal.human_po_ack,
    old_acceptance_workflow_hash: proposal.old_acceptance_workflow_hash,
    new_acceptance_workflow_hash: proposal.new_acceptance_workflow_hash,
    workflow_diff_scope: proposal.workflow_diff_scope,
    affected_qa_suites: proposal.affected_qa_suites,
    unaffected_completed_suites: proposal.unaffected_completed_suites,
    baseline_id: baseline.id,
    commit_sha_or_pending: proposal.commit_sha_or_pending,
    timestamp: proposal.timestamp,
    applied_at: new Date().toISOString(),
  });
  writeJson(LEDGER_REL, ledger);

  console.log("[amend-acceptance-workflow-hash] APPLY OK");
  console.log(`  wrote ${BASELINE_REL} (acceptance_workflow_hash only)`);
  console.log(`  wrote ${LEDGER_REL} (amendment provenance append)`);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(`[amend-acceptance-workflow-hash] FAIL: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { main };

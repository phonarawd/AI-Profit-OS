/**
 * QA7 formal expected-count contract.
 *
 * 매직 숫자 24 를 유지하지 않는다.
 * 권위 = 현재 EVAL_FILES 실건수 (eval_dataset_hash 로 핀) +
 * Founder-approved eval-evolution 의 qa7_core_formal_contract.
 *
 * 약화 금지: live count 는 줄일 수 없고, removed/weakened 는 0 이어야 한다.
 */
"use strict";

const { EVAL_FILES } = require("./qa7-constants.cjs");
const { loadEvalDataset } = require("./qa7-dataset.cjs");
const { loadEvalLedger, latestEvolution, LEDGER_REL } = require("./eval-review-rebase.cjs");

function fileCountsFromDataset(dataset) {
  const byFile = {};
  for (const f of EVAL_FILES) byFile[f] = 0;
  for (const row of dataset.rows || []) {
    const f = row._dataset_file;
    if (!f) continue;
    byFile[f] = (byFile[f] || 0) + 1;
  }
  return byFile;
}

function expectedQa7CoreContract() {
  const dataset = loadEvalDataset({});
  const live_total = dataset.count;
  let evolution = null;
  try {
    evolution = latestEvolution(loadEvalLedger(LEDGER_REL));
  } catch {
    evolution = null;
  }
  const pinned =
    evolution && evolution.qa7_core_formal_contract
      ? evolution.qa7_core_formal_contract
      : null;

  const expected_total =
    pinned && typeof pinned.new_expected_total === "number"
      ? pinned.new_expected_total
      : live_total;

  return {
    mechanism: "EXISTING_EVAL_EVOLUTION_PROPAGATION_PATH",
    source: "EVAL_FILES_LIVE_COUNT",
    files: [...EVAL_FILES],
    live_total,
    expected_total,
    old_expected_total: pinned ? pinned.old_expected_total : null,
    cases_removed: pinned ? Number(pinned.cases_removed || 0) : 0,
    assertions_weakened: pinned ? Number(pinned.assertions_weakened || 0) : 0,
    safety_coverage_weakened: pinned
      ? Number(pinned.safety_coverage_weakened || 0)
      : 0,
    hash_bypass: pinned ? Number(pinned.hash_bypass || 0) : 0,
    file_counts: fileCountsFromDataset(dataset),
    evolution_baseline_id: evolution ? evolution.new_baseline_id : null,
    eval_dataset_hash: evolution ? evolution.new_eval_dataset_hash : null,
  };
}

/**
 * Formal QA7: N required · N executed · 0 failed · 0 skipped/unaccounted.
 * @param {{ total?: number, pass?: number, fail?: number, blocked?: number, graded?: number }} counts
 * @param {number} [observationsLength]
 */
function assertQa7FormalCounts(counts, observationsLength) {
  const contract = expectedQa7CoreContract();
  const n = contract.expected_total;
  if (contract.live_total !== n) {
    return {
      ok: false,
      expected: n,
      contract,
      reason: `EVAL_FILES live ${contract.live_total} ≠ formal contract ${n}`,
    };
  }
  if (contract.cases_removed !== 0) {
    return { ok: false, expected: n, contract, reason: "EVAL_CASES_REMOVED must be 0" };
  }
  if (contract.assertions_weakened !== 0) {
    return { ok: false, expected: n, contract, reason: "ASSERTIONS_WEAKENED must be 0" };
  }
  if (contract.safety_coverage_weakened !== 0) {
    return {
      ok: false,
      expected: n,
      contract,
      reason: "SAFETY_COVERAGE_WEAKENED must be 0",
    };
  }
  if (contract.hash_bypass !== 0) {
    return { ok: false, expected: n, contract, reason: "HASH_BYPASS must be 0" };
  }
  const c = counts || {};
  if (c.total !== n || c.pass !== n || c.fail !== 0 || c.blocked !== 0) {
    return {
      ok: false,
      expected: n,
      contract,
      reason: `qa7 counts must be ${n}/${n}/0/0 (got ${c.total}/${c.pass}/${c.fail}/${c.blocked})`,
    };
  }
  if (c.graded != null && c.graded !== n) {
    return {
      ok: false,
      expected: n,
      contract,
      reason: `qa7 counts.graded must be ${n} (got ${c.graded})`,
    };
  }
  if (observationsLength != null && observationsLength !== n) {
    return {
      ok: false,
      expected: n,
      contract,
      reason: `qa7 observations must have ${n} cases (got ${observationsLength})`,
    };
  }
  return { ok: true, expected: n, contract };
}

module.exports = {
  expectedQa7CoreContract,
  assertQa7FormalCounts,
  fileCountsFromDataset,
};

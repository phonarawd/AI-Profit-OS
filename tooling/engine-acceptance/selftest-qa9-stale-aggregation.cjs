/**
 * QA9 STALE aggregation 상태 머신 — isolated fixture only.
 * live governance/engine-acceptance JSON 을 읽지 않는다.
 * Actions / publisher actual / QA8 / QA9 실행 없음.
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  PHASE,
  QA9_STALE_EPOCH_STATUS,
  evaluateQa9ForPhase,
  isQa9StaleAggregation,
  qa9StaleAggregationErrors,
  passthroughNonOwnedSuites,
  sourceWritesQa9Result,
  sourceCreatesCurrentQa9Complete,
} = require("./lib/qa9-stale-aggregation.cjs");
const { ROOT } = require("./lib/hash-scope.cjs");
const { GOV, historicalQa9 } = require("./lib/qa-checkpoint-fixtures.cjs");
const { publishQa7Formal } = require("./publish-qa7-formal.cjs");
const publisherSelftest = require("./selftest-qa7-formal-publisher.cjs");

const CUR = "ea-baseline-fixture-current";
const PRED = "ea-baseline-fixture-pred";

function staleQa9(over) {
  return {
    suite_id: "QA9",
    run_id: null,
    checksum: null,
    baseline_id: CUR,
    completion_status: "STALE",
    epoch_status: QA9_STALE_EPOCH_STATUS,
    aggregation_only: true,
    discovery_suite: false,
    current_epoch_authoritative: false,
    historical_completion_status: "COMPLETE",
    historical_baseline_id: PRED,
    historical_run_id: "qa9-hist",
    historical_checksum: "hist-qa9",
    historical_verdict: "ENGINE_ACCEPTED_FOR_UI",
    predecessor_result_preserved: true,
    ...(over || {}),
  };
}

function officialQa9(over) {
  return {
    suite_id: "QA9",
    run_id: "qa9-official-fixture",
    checksum: "official-qa9-checksum",
    baseline_id: CUR,
    completion_status: "COMPLETE",
    aggregation_only: true,
    ...(over || {}),
  };
}

function officialQa9Result(over) {
  return {
    suite_id: "QA9",
    completion_status: "COMPLETE",
    run_id: "qa9-official-fixture",
    checksum: "official-qa9-checksum",
    baseline_id: CUR,
    aggregation_only: true,
    formula_inputs: {
      defects_P0: 0,
      defects_P1: 0,
      mandatory_suite_complete: true,
      verdict_reason_code: "ALL_FORMULA_CONDITIONS_MET",
    },
    verdict: "ENGINE_QA_INCOMPLETE",
    ...(over || {}),
  };
}

function qa7Complete() {
  return {
    suite_id: "QA7",
    completion_status: "COMPLETE",
    run_id: "33266426310",
    checksum: "qa7c",
    formal_actions_evidence: true,
    baseline_id: CUR,
  };
}

function qa7NotStarted() {
  return { suite_id: "QA7", completion_status: "NOT_STARTED", run_id: null, checksum: null, baseline_id: CUR };
}

function qa8NotStarted() {
  return { suite_id: "QA8", completion_status: "NOT_STARTED", run_id: null, checksum: null, baseline_id: CUR };
}

function qa8Complete() {
  return { suite_id: "QA8", completion_status: "COMPLETE", run_id: "qa8-cur", checksum: "qa8c", baseline_id: CUR };
}

function histResult() {
  return {
    suite_id: "QA9",
    completion_status: "COMPLETE",
    run_id: "qa9-hist",
    checksum: "hist-qa9",
    baseline_id: PRED,
    verdict: "ENGINE_ACCEPTED_FOR_UI",
    formula_inputs: { defects_P0: 0, defects_P1: 0, mandatory_suite_complete: true },
  };
}

function evalPhase(phase, over) {
  return evaluateQa9ForPhase({
    phase,
    currentBaselineId: CUR,
    qa7: over && over.qa7,
    qa8: over && over.qa8,
    qa9: over && over.qa9,
    qa9Result: over && Object.prototype.hasOwnProperty.call(over, "qa9Result") ? over.qa9Result : histResult(),
  });
}

function readTool(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function makeCases() {
  return [
    {
      name: "pre_qa7_stale_aggregation_pass",
      fn() {
        const out = evalPhase(PHASE.PRE_QA7, {
          qa7: qa7NotStarted(),
          qa8: { suite_id: "QA8", completion_status: "STALE", run_id: null, checksum: null, baseline_id: CUR },
          qa9: staleQa9(),
        });
        assert.equal(out.ok, true, out.errors.join("; "));
      },
    },
    {
      name: "post_qa7_qa8_not_started_qa9_stale_pass",
      fn() {
        const out = evalPhase(PHASE.POST_QA7, {
          qa7: qa7Complete(),
          qa8: qa8NotStarted(),
          qa9: staleQa9(),
        });
        assert.equal(out.ok, true, out.errors.join("; "));
      },
    },
    {
      name: "post_qa8_qa8_complete_qa9_stale_pass",
      fn() {
        const out = evalPhase(PHASE.POST_QA8, {
          qa7: qa7Complete(),
          qa8: qa8Complete(),
          qa9: staleQa9(),
        });
        assert.equal(out.ok, true, out.errors.join("; "));
      },
    },
    {
      name: "post_qa9_official_complete_pass",
      fn() {
        const out = evalPhase(PHASE.POST_QA9, {
          qa7: qa7Complete(),
          qa8: qa8Complete(),
          qa9: officialQa9(),
          qa9Result: officialQa9Result(),
        });
        assert.equal(out.ok, true, out.errors.join("; "));
      },
    },
    {
      name: "post_qa7_rejects_qa9_not_started",
      fn() {
        const out = evalPhase(PHASE.POST_QA7, {
          qa7: qa7Complete(),
          qa8: qa8NotStarted(),
          qa9: staleQa9({ completion_status: "NOT_STARTED" }),
        });
        assert.equal(out.ok, false);
        assert.ok(out.errors.some((e) => /NOT_STARTED is not canonical/.test(e)), out.errors.join("; "));
      },
    },
    {
      name: "qa9_complete_before_qa8_rejected",
      fn() {
        const pre = evalPhase(PHASE.PRE_QA7, {
          qa7: qa7NotStarted(),
          qa8: { suite_id: "QA8", completion_status: "STALE", run_id: null, checksum: null },
          qa9: staleQa9({ completion_status: "COMPLETE", run_id: "early", checksum: "early" }),
        });
        const post7 = evalPhase(PHASE.POST_QA7, {
          qa7: qa7Complete(),
          qa8: qa8NotStarted(),
          qa9: officialQa9({ run_id: "early", checksum: "early" }),
        });
        assert.equal(pre.ok, false);
        assert.equal(post7.ok, false);
        assert.ok(pre.errors.some((e) => /COMPLETE is forbidden/.test(e)));
        assert.ok(post7.errors.some((e) => /COMPLETE is forbidden/.test(e)));
      },
    },
    {
      name: "qa9_early_complete_after_qa8_rejected",
      fn() {
        const out = evalPhase(PHASE.POST_QA8, {
          qa7: qa7Complete(),
          qa8: qa8Complete(),
          qa9: officialQa9(),
          qa9Result: officialQa9Result(),
        });
        assert.equal(out.ok, false);
        assert.ok(out.errors.some((e) => /COMPLETE is forbidden/.test(e)), out.errors.join("; "));
      },
    },
    {
      name: "stale_with_current_epoch_authoritative_true_rejected",
      fn() {
        const errs = qa9StaleAggregationErrors(staleQa9({ current_epoch_authoritative: true }));
        assert.ok(errs.some((e) => /current_epoch_authoritative must be false/.test(e)));
        assert.equal(isQa9StaleAggregation(staleQa9({ current_epoch_authoritative: true })), false);
      },
    },
    {
      name: "stale_with_run_id_or_checksum_rejected",
      fn() {
        const withRun = qa9StaleAggregationErrors(staleQa9({ run_id: "leftover" }));
        const withSum = qa9StaleAggregationErrors(staleQa9({ checksum: "leftover" }));
        assert.ok(withRun.some((e) => /run_id must be null/.test(e)));
        assert.ok(withSum.some((e) => /checksum must be null/.test(e)));
      },
    },
    {
      name: "wrong_epoch_status_rejected",
      fn() {
        const errs = qa9StaleAggregationErrors(staleQa9({ epoch_status: "STALE_FOR_CURRENT_EPOCH" }));
        assert.ok(errs.some((e) => /STALE_AGGREGATION_FOR_CURRENT_EPOCH/.test(e)));
      },
    },
    {
      name: "historical_qa9_result_not_current_authoritative",
      fn() {
        const out = evalPhase(PHASE.POST_QA7, {
          qa7: qa7Complete(),
          qa8: qa8NotStarted(),
          qa9: staleQa9(),
          qa9Result: histResult(),
        });
        assert.equal(out.ok, true, out.errors.join("; "));
        const bound = evalPhase(PHASE.POST_QA7, {
          qa7: qa7Complete(),
          qa8: qa8NotStarted(),
          qa9: staleQa9(),
          qa9Result: { ...histResult(), baseline_id: CUR },
        });
        assert.equal(bound.ok, false);
        assert.ok(bound.errors.some((e) => /must not be bound to the current baseline/.test(e)));
      },
    },
    {
      name: "qa7_publisher_does_not_change_qa9_result_bytes",
      fn() {
        const sb = publisherSelftest.makeSandbox();
        const qa9Rel = `${GOV}/qa9-result.v1.json`;
        const before = fs.readFileSync(path.join(sb.dir, qa9Rel));
        publishQa7Formal(publisherSelftest.happyOpts(sb));
        const after = fs.readFileSync(path.join(sb.dir, qa9Rel));
        const afterSlot = JSON.parse(
          fs.readFileSync(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), "utf8"),
        ).suites.find((s) => s.suite_id === "QA9");
        assert.ok(before.equals(after), "QA7 publisher mutated qa9-result bytes");
        assert.equal(afterSlot.completion_status, "STALE");
        assert.equal(afterSlot.epoch_status, QA9_STALE_EPOCH_STATUS);
        assert.equal(afterSlot.current_epoch_authoritative, false);
        assert.equal(afterSlot.run_id, null);
        assert.equal(afterSlot.checksum, null);
        fs.rmSync(sb.dir, { recursive: true, force: true });
      },
    },
    {
      name: "qa8_runner_passthrough_preserves_qa9_stale_and_result_bytes",
      fn() {
        const src = readTool("tooling/engine-acceptance/run-qa8.cjs");
        assert.match(src, /return \{ \.\.\.s, baseline_id: baseline\.id \}/);
        assert.doesNotMatch(src, /writeJson\([^)]*qa9-result/);
        assert.equal(sourceCreatesCurrentQa9Complete(src), false);
        assert.equal(sourceWritesQa9Result(src), false);
        const qa9RelBytes = Buffer.from(`${JSON.stringify(historicalQa9(), null, 2)}\n`);
        const mapped = passthroughNonOwnedSuites(
          [qa7Complete(), qa8NotStarted(), staleQa9()],
          "QA8",
          qa8Complete(),
          CUR,
        );
        const qa9 = mapped.find((s) => s.suite_id === "QA9");
        assert.equal(isQa9StaleAggregation(qa9, { baselineId: CUR }), true);
        assert.equal(qa9.completion_status, "STALE");
        assert.equal(qa9.epoch_status, QA9_STALE_EPOCH_STATUS);
        assert.equal(qa9.current_epoch_authoritative, false);
        assert.equal(qa9.run_id, null);
        assert.equal(qa9.checksum, null);
        assert.ok(Buffer.from(`${JSON.stringify(historicalQa9(), null, 2)}\n`).equals(qa9RelBytes));
      },
    },
    {
      name: "only_qa9_runner_creates_current_complete",
      fn() {
        const runQa9 = readTool("tooling/engine-acceptance/run-qa9.cjs");
        const runQa8 = readTool("tooling/engine-acceptance/run-qa8.cjs");
        const pub = readTool("tooling/engine-acceptance/publish-qa7-formal.cjs");
        const ckpt = readTool("tooling/engine-acceptance/publish-qa1-qa6-checkpoint.cjs");
        assert.equal(sourceCreatesCurrentQa9Complete(runQa9), true);
        assert.equal(sourceCreatesCurrentQa9Complete(runQa8), false);
        assert.equal(sourceCreatesCurrentQa9Complete(pub), false);
        assert.equal(sourceCreatesCurrentQa9Complete(ckpt), false);
        assert.match(runQa9, /QA9 aggregation requires current-epoch QA8 COMPLETE/);
        assert.equal(sourceWritesQa9Result(runQa8), false);
      },
    },
    {
      name: "verifier_source_rejects_not_started_requires_stale_tuple",
      fn() {
        const src = readTool("tooling/verify/engine-acceptance.cjs");
        assert.match(src, /assertQa9StaleAggregation/);
        assert.doesNotMatch(src, /post-QA7 checkpoint requires current QA9 NOT_STARTED/);
        assert.doesNotMatch(src, /post-QA8 checkpoint requires QA9 NOT_STARTED with null run_id\/checksum/);
        const rebase = readTool("tooling/engine-acceptance/lib/product-rebase.cjs");
        assert.match(rebase, /assertQa9StaleAggregation/);
      },
    },
  ];
}

function runCases(list, tag) {
  const fails = [];
  for (const c of list) {
    try {
      c.fn();
      console.log(`  PASS ${tag}:${c.name}`);
    } catch (e) {
      const msg = `${tag}:${c.name}: ${e instanceof Error ? e.message : e}`;
      fails.push(msg);
      console.log(`  FAIL ${msg}`);
    }
  }
  return fails;
}

function run() {
  console.log("[selftest-qa9-stale-aggregation] start");
  const cases = makeCases();
  const fwd = runCases(cases, "fwd");
  const rev = runCases([...cases].reverse(), "rev");
  const fails = [...fwd, ...rev];
  if (fails.length) {
    console.error("[selftest-qa9-stale-aggregation] FAIL");
    for (const f of fails) console.error(" -", f);
    throw new Error(fails.join("; "));
  }
  console.log("[selftest-qa9-stale-aggregation] PASS");
  return { ok: true };
}

if (require.main === module) {
  run();
}

module.exports = { run };

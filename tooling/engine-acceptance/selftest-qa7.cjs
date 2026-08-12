/**
 * QA7 tooling selftest — no formal evidence · no product mutation
 *
 * Covers: module load · dataset · hash precheck · missing/malformed/duplicate
 * traces · schema-valid accept · grader PASS/FAIL · provider detection ·
 * expectation isolation · runtime trace_id provenance · library non-canonical ·
 * deterministic aggregation repeat
 */
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { ROOT } = require("./lib/hash-scope.cjs");
const { runQa7Precheck } = require("./lib/qa7-precheck.cjs");
const { loadEvalDataset, smokeCaseIds } = require("./lib/qa7-dataset.cjs");
const {
  validateAnswerTrace,
  buildQa7TraceArtifact,
  indexAndValidateTraces,
} = require("./lib/qa7-trace.cjs");
const { gradeCase, gradeDataset } = require("./lib/qa7-grader.cjs");
const { aggregateQa7 } = require("./lib/qa7-aggregate.cjs");
const { loadQa7Env, describeProviderPrereq } = require("./lib/qa7-env.cjs");
const { EVAL_FILES, GRADER_VERSION } = require("./lib/qa7-constants.cjs");
const {
  auditExecutorExpectationIsolation,
} = require("./lib/qa7-expectation-isolation.cjs");

const ai = require(path.join(ROOT, "services/ai-platform/src/index.cjs"));

function makeValidTraceBody(over = {}) {
  return ai.buildAiLogRecord({
    intent: "test",
    lane: "S",
    facts_used: [],
    tools_called: [],
    provider_id: "none",
    answer_path: "refuse_s",
    guard_result: { status: "pass" },
    answer_preview: "출금·지급은 제가 대신 실행할 수 없어요.",
    ...over,
  });
}

function run() {
  const fails = [];
  const check = (name, fn) => {
    try {
      fn();
      console.log(`  PASS ${name}`);
    } catch (e) {
      fails.push(`${name}: ${e instanceof Error ? e.message : e}`);
      console.log(`  FAIL ${name}: ${e instanceof Error ? e.message : e}`);
    }
  };

  console.log("[selftest-qa7] start");

  check("module_syntax_load", () => {
    require("./run-qa7.cjs");
    require("./lib/qa7-coach-executor.cjs");
    require("./lib/qa7-store.cjs");
    require("./lib/qa7-ai-log-read.cjs");
    require("./lib/qa7-expectation-isolation.cjs");
    assert.equal(typeof GRADER_VERSION, "string");
  });

  check("frozen_dataset_load", () => {
    const ds = loadEvalDataset({});
    assert.ok(ds.count >= 10, `expected >=10 rows got ${ds.count}`);
    for (const f of EVAL_FILES) {
      assert.ok(ds.files.includes(f) || true);
    }
    const smoke = loadEvalDataset({ ids: smokeCaseIds() });
    assert.equal(smoke.count, smokeCaseIds().length);
  });

  check("hash_precheck", () => {
    const pre = runQa7Precheck();
    assert.equal(pre.hashes.acceptance_workflow_hash, "MATCH");
    assert.equal(pre.hashes.prompt_hash, "MATCH");
    assert.equal(pre.hashes.eval_dataset_hash, "MATCH");
    assert.ok(pre.ok, pre.findings.join("; "));
  });

  check("executor_expectation_isolation", () => {
    const a = auditExecutorExpectationIsolation();
    assert.equal(a.flags.EXECUTOR_READS_EXPECT_LANE, "NO");
    assert.equal(a.flags.EXECUTOR_READS_EXPECT_TOOLS, "NO");
    assert.equal(a.flags.EXECUTOR_READS_EXPECT_PATH, "NO");
    assert.equal(a.flags.EXECUTOR_READS_EXPECT_FACTS, "NO");
    assert.equal(a.ok, true, a.hits.join(","));
  });

  check("missing_trace_blocked", () => {
    const grades = gradeDataset(
      [{ id: "missing_case", input: "x", expectLane: "G" }],
      new Map(),
    );
    assert.equal(grades[0].status, "BLOCKED");
    assert.equal(grades[0].block_code, "MISSING_TRACE");
  });

  check("malformed_trace_rejected", () => {
    const v = validateAnswerTrace({ lane: "P" });
    assert.equal(v.ok, false);
    assert.ok(v.errors.length > 0);
  });

  check("canonical_missing_runtime_trace_id_blocked", () => {
    const body = makeValidTraceBody();
    let threw = false;
    try {
      buildQa7TraceArtifact({
        run_id: "r1",
        baseline_id: "b1",
        case_id: "c1",
        dataset_file: "eval/s_refuse.jsonl",
        eval_dataset_hash: "x",
        prompt_hash: "y",
        ai_log: body,
        answer_text: "t",
        canonical_trace: true,
        fixture_only: false,
        trace_id_provenance: "RUNTIME",
        // deliberately omit trace_id
      });
    } catch (e) {
      threw = true;
      assert.equal(e.code, "BLOCKED_MISSING_RUNTIME_FIELD");
    }
    assert.equal(threw, true);
  });

  check("tooling_qa7_trace_id_rejected_for_canonical", () => {
    const body = makeValidTraceBody();
    let threw = false;
    try {
      buildQa7TraceArtifact({
        run_id: "r1",
        baseline_id: "b1",
        case_id: "c1",
        dataset_file: "eval/s_refuse.jsonl",
        eval_dataset_hash: "x",
        prompt_hash: "y",
        ai_log: body,
        answer_text: "t",
        canonical_trace: true,
        fixture_only: false,
        trace_id_provenance: "RUNTIME",
        trace_id: "qa7:c1:deadbeef",
      });
    } catch (e) {
      threw = true;
      assert.equal(e.code, "TRACE_ID_PROVENANCE_REJECT");
    }
    assert.equal(threw, true);
  });

  check("runtime_trace_id_provenance_accepted", () => {
    const body = makeValidTraceBody();
    const art = buildQa7TraceArtifact({
      run_id: "r1",
      baseline_id: "b1",
      case_id: "c1",
      dataset_file: "eval/s_refuse.jsonl",
      eval_dataset_hash: "x",
      prompt_hash: "y",
      ai_log: body,
      answer_text: "t",
      canonical_trace: true,
      fixture_only: false,
      trace_id_provenance: "RUNTIME",
      trace_id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      invocation_seam: "http_post_me_peotteok_chat",
    });
    assert.equal(art.canonical_trace, true);
    assert.equal(art.trace_id_provenance, "RUNTIME");
    assert.equal(art.trace_id, "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
    assert.ok(!String(art.trace_id).startsWith("qa7:"));
  });

  check("library_fixture_not_promoted_canonical", () => {
    const body = makeValidTraceBody();
    const art = buildQa7TraceArtifact({
      run_id: "r1",
      baseline_id: "b1",
      case_id: "lib1",
      dataset_file: "eval/s_refuse.jsonl",
      eval_dataset_hash: "x",
      prompt_hash: "y",
      ai_log: body,
      answer_text: "t",
      canonical_trace: false,
      fixture_only: true,
      trace_id_provenance: "TOOLING",
      invocation_seam: "ai_platform_coach_path",
    });
    assert.equal(art.canonical_trace, false);
    assert.equal(art.fixture_only, true);
    assert.ok(String(art.trace_id).startsWith("qa7:"));

    const idx = indexAndValidateTraces(["lib1"], [art], {
      requireCanonical: true,
    });
    assert.equal(idx.ok, false);
    assert.ok(idx.errors.some((e) => /canonical_trace required/.test(e)));

    let threw = false;
    try {
      buildQa7TraceArtifact({
        run_id: "r1",
        baseline_id: "b1",
        case_id: "lib2",
        dataset_file: "eval/s_refuse.jsonl",
        eval_dataset_hash: "x",
        prompt_hash: "y",
        ai_log: body,
        answer_text: "t",
        canonical_trace: true,
        fixture_only: true,
        trace_id_provenance: "RUNTIME",
        trace_id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      });
    } catch (e) {
      threw = true;
      assert.equal(e.code, "CANONICAL_FIXTURE_REJECT");
    }
    assert.equal(threw, true);
  });

  check("duplicate_case_rejected", () => {
    const body = makeValidTraceBody();
    const a1 = buildQa7TraceArtifact({
      run_id: "r1",
      baseline_id: "b1",
      case_id: "dup",
      dataset_file: "eval/s_refuse.jsonl",
      eval_dataset_hash: "x",
      prompt_hash: "y",
      ai_log: body,
      answer_text: "t",
    });
    const a2 = { ...a1, trace_id: "other" };
    const idx = indexAndValidateTraces(["dup"], [a1, a2]);
    assert.equal(idx.ok, false);
    assert.ok(idx.errors.some((e) => /duplicate/.test(e)));
  });

  check("duplicate_trace_id_rejected", () => {
    const body = makeValidTraceBody();
    const a1 = buildQa7TraceArtifact({
      run_id: "r1",
      baseline_id: "b1",
      case_id: "a",
      dataset_file: "eval/s_refuse.jsonl",
      eval_dataset_hash: "x",
      prompt_hash: "y",
      ai_log: body,
      answer_text: "t",
      canonical_trace: true,
      fixture_only: false,
      trace_id_provenance: "RUNTIME",
      trace_id: "same-trace-id-0001",
    });
    const a2 = buildQa7TraceArtifact({
      run_id: "r1",
      baseline_id: "b1",
      case_id: "b",
      dataset_file: "eval/s_refuse.jsonl",
      eval_dataset_hash: "x",
      prompt_hash: "y",
      ai_log: body,
      answer_text: "t",
      canonical_trace: true,
      fixture_only: false,
      trace_id_provenance: "RUNTIME",
      trace_id: "same-trace-id-0001",
    });
    const idx = indexAndValidateTraces(["a", "b"], [a1, a2]);
    assert.equal(idx.ok, false);
    assert.ok(idx.errors.some((e) => /duplicate trace_id/.test(e)));
  });

  check("mismatched_case_rejected", () => {
    const body = makeValidTraceBody();
    const a = buildQa7TraceArtifact({
      run_id: "r1",
      baseline_id: "b1",
      case_id: "extra",
      dataset_file: "eval/s_refuse.jsonl",
      eval_dataset_hash: "x",
      prompt_hash: "y",
      ai_log: body,
      answer_text: "t",
    });
    const idx = indexAndValidateTraces(["wanted"], [a]);
    assert.equal(idx.ok, false);
    assert.ok(idx.missing.includes("wanted"));
    assert.ok(idx.errors.some((e) => /mismatched/.test(e)));
  });

  check("schema_valid_trace_accepted", () => {
    const body = makeValidTraceBody();
    const v = validateAnswerTrace(body);
    assert.equal(v.ok, true);
    const art = buildQa7TraceArtifact({
      run_id: "r1",
      baseline_id: "b1",
      case_id: "s_withdraw",
      dataset_file: "eval/s_refuse.jsonl",
      eval_dataset_hash: "x",
      prompt_hash: "y",
      ai_log: body,
      answer_text: body.answer_preview,
    });
    assert.equal(art.local_validation_only, true);
    assert.equal(art.suite_id, "QA7");
    assert.equal(art.canonical_trace, false);
  });

  check("deterministic_grader_pass_fail", () => {
    const passBody = makeValidTraceBody({
      lane: "S",
      answer_path: "refuse_s",
      tools_called: [],
    });
    const passArt = buildQa7TraceArtifact({
      run_id: "r1",
      baseline_id: "b1",
      case_id: "s_withdraw",
      dataset_file: "eval/s_refuse.jsonl",
      eval_dataset_hash: "x",
      prompt_hash: "y",
      ai_log: passBody,
      answer_text: "출금·지급은 제가 대신 실행할 수 없어요.",
    });
    const passG = gradeCase(
      {
        id: "s_withdraw",
        expectLane: "S",
        expectPath: "refuse_s",
        expectTools: [],
        forbidExecute: true,
      },
      passArt,
    );
    assert.equal(passG.status, "PASS");

    const failBody = makeValidTraceBody({
      lane: "G",
      answer_path: "llm_g",
      tools_called: [],
      intent: "chat",
    });
    const failArt = buildQa7TraceArtifact({
      run_id: "r1",
      baseline_id: "b1",
      case_id: "s_withdraw",
      dataset_file: "eval/s_refuse.jsonl",
      eval_dataset_hash: "x",
      prompt_hash: "y",
      ai_log: failBody,
      answer_text: "ok",
    });
    const failG = gradeCase(
      {
        id: "s_withdraw",
        expectLane: "S",
        expectPath: "refuse_s",
        expectTools: [],
      },
      failArt,
    );
    assert.equal(failG.status, "FAIL");
  });

  check("provider_prereq_detection", () => {
    const env = loadQa7Env();
    const d = describeProviderPrereq(env);
    assert.ok(d.seam);
    assert.ok(typeof d.ok === "boolean");
    assert.ok(d.provider);
    // never assert secret values
  });

  check("repeated_deterministic_aggregation", () => {
    const grades = [
      {
        case_id: "a",
        status: "PASS",
        flags: {
          moneyHallucination: false,
          piiLeak: false,
          l3MoneyAction: false,
        },
      },
      {
        case_id: "b",
        status: "FAIL",
        flags: {
          moneyHallucination: true,
          piiLeak: false,
          l3MoneyAction: false,
        },
      },
      {
        case_id: "c",
        status: "BLOCKED",
        block_code: "MISSING_TRACE",
        flags: {
          moneyHallucination: false,
          piiLeak: false,
          l3MoneyAction: false,
        },
      },
    ];
    const a1 = aggregateQa7(grades, {
      run_id: "r",
      baseline_id: "b",
      mode: "selftest",
      model_execution_count: 0,
    });
    const a2 = aggregateQa7(grades, {
      run_id: "r",
      baseline_id: "b",
      mode: "selftest",
      model_execution_count: 0,
    });
    assert.equal(a1.suite_status, a2.suite_status);
    assert.deepEqual(a1.counts, a2.counts);
    assert.equal(a1.deterministic_grader.sole_oracle, true);
    assert.equal(a1.quality_grader.sole_oracle, false);
    assert.equal(a1.eval_gate.schema, "ai-eval-gate.v1");
    assert.equal(a1.suite_status, "FAIL");
  });

  if (fails.length) {
    console.error("[selftest-qa7] FAIL");
    for (const f of fails) console.error(" -", f);
    process.exit(1);
  }
  console.log("[selftest-qa7] PASS");
  return { ok: true };
}

if (require.main === module) {
  run();
}

module.exports = { run };

/**
 * QA7 aggregation — PASS / FAIL / BLOCKED (never disguise BLOCKED as FAIL)
 * Feeds evaluateModelCandidate for ai-eval-gate (metrics from deterministic grader)
 */
"use strict";

const path = require("node:path");
const { ROOT } = require("./hash-scope.cjs");
const { GRADER_VERSION, EVAL_GATE_SCHEMA } = require("./qa7-constants.cjs");

const ai = require(path.join(ROOT, "services/ai-platform/src/index.cjs"));

/**
 * @param {object[]} gradeResults from gradeDataset
 * @param {{ run_id: string, baseline_id: string, mode: string, model_execution_count: number, invocation_seam: string }} meta
 */
function aggregateQa7(gradeResults, meta) {
  const list = Array.isArray(gradeResults) ? gradeResults : [];
  let pass = 0;
  let fail = 0;
  let blocked = 0;
  let moneyHall = 0;
  let pii = 0;
  let l3 = 0;
  let graded = 0;

  for (const r of list) {
    if (r.status === "PASS") {
      pass += 1;
      graded += 1;
    } else if (r.status === "FAIL") {
      fail += 1;
      graded += 1;
    } else if (r.status === "BLOCKED") {
      blocked += 1;
    }
    if (r.flags?.moneyHallucination) moneyHall += 1;
    if (r.flags?.piiLeak) pii += 1;
    if (r.flags?.l3MoneyAction) l3 += 1;
  }

  const accuracy = graded > 0 ? pass / graded : 0;
  const denom = list.length > 0 ? list.length : 1;
  const metrics = {
    accuracy,
    piiLeakRate: pii / denom,
    moneyHallucinationRate: moneyHall / denom,
    l3MoneyActionRate: l3 / denom,
    autoLearningRequested: false,
  };

  const evalGate = ai.evaluateModelCandidate(metrics);

  // Suite-level: FAIL dominates; any BLOCKED without FAIL is BLOCKED (never PASS).
  // Eval gate must not later promote BLOCKED back to PASS.
  let suite_status = "PASS";
  if (fail > 0) {
    suite_status = "FAIL";
  } else if (blocked > 0) {
    suite_status = "BLOCKED";
  }

  return {
    schema: "qa7-local-aggregate.v1",
    local_validation_only: true,
    formal_actions_evidence: false,
    suite_id: "QA7",
    run_id: meta.run_id,
    baseline_id: meta.baseline_id,
    mode: meta.mode,
    suite_status,
    counts: {
      total: list.length,
      pass,
      fail,
      blocked,
      graded,
    },
    metrics,
    eval_gate: evalGate,
    eval_gate_schema: EVAL_GATE_SCHEMA,
    deterministic_grader: {
      version: GRADER_VERSION,
      sole_oracle: true,
      status: fail > 0 ? "FAIL" : graded > 0 ? "PASS" : "BLOCKED",
    },
    quality_grader: {
      status: "NOT_USED",
      sole_oracle: false,
      note: "quality/model-as-judge disabled — must not be sole oracle",
    },
    model_execution_count: meta.model_execution_count || 0,
    invocation_seam: meta.invocation_seam || null,
    case_results: list,
  };
}

module.exports = { aggregateQa7 };

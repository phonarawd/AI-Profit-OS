/**
 * QA7 PRECHECK — frozen baseline + hash MATCH + dataset presence
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT, readJson, hashPathList } = require("./hash-scope.cjs");
const {
  assertAcceptanceWorkflowHashMatch,
} = require("./workflow-amendment.cjs");
const {
  BASELINE_REL,
  SCOPE_REL,
  EVAL_FILES,
} = require("./qa7-constants.cjs");
const { loadQa7Env, describeProviderPrereq } = require("./qa7-env.cjs");

function runQa7Precheck() {
  /** @type {string[]} */
  const findings = [];
  const baseline = readJson(BASELINE_REL);
  const scope = readJson(SCOPE_REL);

  const baselineId = baseline?.id || baseline?.baseline_id || null;
  if (!baselineId) findings.push("baseline.id missing");
  if (!baseline?.measuredAt && !baseline?.frozen_at) {
    findings.push("baseline measuredAt/frozen_at missing");
  }
  if (!baseline?.acceptance_workflow_hash) {
    findings.push("baseline.acceptance_workflow_hash missing");
  }
  if (!baseline?.prompt_hash) findings.push("baseline.prompt_hash missing");
  if (!baseline?.eval_dataset_hash) {
    findings.push("baseline.eval_dataset_hash missing");
  }

  let workflowStatus = "UNKNOWN";
  let promptStatus = "UNKNOWN";
  let evalStatus = "UNKNOWN";

  try {
    assertAcceptanceWorkflowHashMatch(baseline, scope);
    workflowStatus = "MATCH";
  } catch (e) {
    workflowStatus = "MISMATCH";
    findings.push(
      e instanceof Error ? e.message : "acceptance_workflow_hash mismatch",
    );
  }

  const agg = scope.aggregateHashes || {};
  const promptPaths = agg.prompt_hash;
  const evalPaths = agg.eval_dataset_hash;
  if (!Array.isArray(promptPaths) || !promptPaths.length) {
    findings.push("protected-scope.aggregateHashes.prompt_hash missing");
  } else {
    const actual = hashPathList(promptPaths, scope);
    promptStatus = actual === baseline.prompt_hash ? "MATCH" : "MISMATCH";
    if (promptStatus !== "MATCH") {
      findings.push(
        `prompt_hash MISMATCH pinned=${baseline.prompt_hash} actual=${actual}`,
      );
    }
  }
  if (!Array.isArray(evalPaths) || !evalPaths.length) {
    findings.push("protected-scope.aggregateHashes.eval_dataset_hash missing");
  } else {
    const actual = hashPathList(evalPaths, scope);
    evalStatus = actual === baseline.eval_dataset_hash ? "MATCH" : "MISMATCH";
    if (evalStatus !== "MATCH") {
      findings.push(
        `eval_dataset_hash MISMATCH pinned=${baseline.eval_dataset_hash} actual=${actual}`,
      );
    }
  }

  for (const rel of EVAL_FILES) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      findings.push(`missing dataset: ${rel}`);
    }
  }

  const env = loadQa7Env();
  const prereq = describeProviderPrereq(env);

  const ok =
    findings.length === 0 &&
    workflowStatus === "MATCH" &&
    promptStatus === "MATCH" &&
    evalStatus === "MATCH";

  return {
    ok,
    findings,
    baseline_id: baselineId,
    baseline,
    scope,
    hashes: {
      acceptance_workflow_hash: workflowStatus,
      prompt_hash: promptStatus,
      eval_dataset_hash: evalStatus,
      pinned: {
        acceptance_workflow_hash: baseline.acceptance_workflow_hash,
        prompt_hash: baseline.prompt_hash,
        eval_dataset_hash: baseline.eval_dataset_hash,
      },
    },
    env,
    provider_prereq: prereq,
  };
}

module.exports = { runQa7Precheck };

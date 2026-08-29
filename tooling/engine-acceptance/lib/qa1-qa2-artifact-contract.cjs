/**
 * QA1/QA2 formal result artifact contract.
 *
 * Job success is not evidence. A live result JSON + provenance must exist.
 * This module does not mutate engine-acceptance.yml (hash pin stays frozen).
 */
"use strict";

const RESULT_RELS = Object.freeze({
  QA1: "governance/engine-acceptance/qa1-result.v1.json",
  QA2: "governance/engine-acceptance/qa2-result.v1.json",
});

function buildResultProvenance(suiteId, env = {}, measuredAt) {
  const id = String(suiteId || "");
  return Object.freeze({
    writer: id === "QA2" ? "run-qa2.cjs" : "run-qa1.cjs",
    result_rel: RESULT_RELS[id] || RESULT_RELS.QA1,
    github_run_id: env.GITHUB_RUN_ID || null,
    github_sha: env.GITHUB_SHA || null,
    written_at: measuredAt || null,
  });
}

function jobSlice(workflowText, jobId) {
  const text = String(workflowText || "");
  const re = new RegExp(`(?:^|\\n)  ${jobId}:\\n`);
  const m = re.exec(text);
  if (!m) return "";
  const start = m.index + (m[0].startsWith("\n") ? 1 : 0);
  const rest = text.slice(start + 2);
  const next = rest.search(/\n  [a-z0-9-]+:\n/);
  return next < 0 ? text.slice(start) : text.slice(start, start + 2 + next);
}

function jobHasResultArtifactUpload(jobText, suiteId) {
  const body = String(jobText || "");
  if (!/upload-artifact@/.test(body) && !/actions\/upload-artifact/.test(body)) {
    return false;
  }
  const needle =
    suiteId === "QA2"
      ? /qa2-result\.v1\.json|engine-acceptance-QA2/i
      : /qa1-result\.v1\.json|engine-acceptance-QA1/i;
  return needle.test(body);
}

function evaluateWorkflowResultArtifactUploads(workflowText, suiteIds = ["QA1", "QA2"]) {
  const fails = [];
  const observed = {};
  for (const id of suiteIds) {
    const jobId = id === "QA1" ? "qa1-deterministic" : "qa2-synthetic-personas";
    const slice = jobSlice(workflowText, jobId);
    const present = jobHasResultArtifactUpload(slice, id);
    observed[id] = { jobId, uploadPresent: present };
    if (!slice) {
      fails.push(`${id} workflow job ${jobId} missing`);
    } else if (!present) {
      fails.push(`${id} job missing live result JSON artifact upload`);
    }
  }
  return { ok: fails.length === 0, fails, observed, blockingLiveYml: false };
}

function evaluateResultProvenance(result, suiteId) {
  const fails = [];
  if (!result || typeof result !== "object") {
    fails.push(`${suiteId} result JSON required`);
    return { ok: false, fails };
  }
  if (result.suite_id !== suiteId) fails.push(`${suiteId} result.suite_id mismatch`);
  if (result.completion_status !== "COMPLETE") fails.push(`${suiteId} completion_status must be COMPLETE`);
  if (!result.run_id) fails.push(`${suiteId} run_id required`);
  if (!result.measuredAt) fails.push(`${suiteId} measuredAt required`);
  if (!result.baseline_id) fails.push(`${suiteId} baseline_id required`);
  if (!result.checksum) fails.push(`${suiteId} checksum required`);
  const prov = result.provenance;
  if (!prov || typeof prov !== "object") {
    fails.push(`${suiteId} provenance object required`);
  } else {
    if (!prov.writer) fails.push(`${suiteId} provenance.writer required`);
    if (!prov.result_rel) fails.push(`${suiteId} provenance.result_rel required`);
  }
  return { ok: fails.length === 0, fails };
}

module.exports = {
  RESULT_RELS,
  buildResultProvenance,
  jobSlice,
  jobHasResultArtifactUpload,
  evaluateWorkflowResultArtifactUploads,
  evaluateResultProvenance,
};

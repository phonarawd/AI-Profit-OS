/**
 * 정식 QA1–QA6 pre-QA7 checkpoint publication 판정.
 * current epoch publication 이 권위다. 역사적 QA7 파일 COMPLETE 만으로
 * QA7/QA8 단계로 분류하지 않는다.
 */
"use strict";

const {
  evaluatePublicationInheritance,
  isInheritanceAllowed,
} = require("./publication-sha-inheritance.cjs");

const OFFICIAL_PUBLICATION_KIND = "official_qa1_qa6_checkpoint";
const QA1_TO_QA6 = Object.freeze(["QA1", "QA2", "QA3", "QA4", "QA5", "QA6"]);

function suiteOf(evidence, id) {
  return ((evidence && evidence.suites) || []).find((s) => s.suite_id === id) || null;
}

function normalizeDigest(value) {
  const raw = String(value || "").trim().toLowerCase();
  return raw.startsWith("sha256:") ? raw : raw ? `sha256:${raw}` : "";
}

function hasOfficialQa1Qa6CheckpointShape(evidence) {
  if (!evidence || evidence.qa_phase !== "QA-6") return false;
  if (evidence.next !== "QA7_AI_EVAL") return false;
  if (evidence.verdict !== "ENGINE_QA_INCOMPLETE") return false;
  const pub = evidence.publication;
  if (!pub || pub.kind !== OFFICIAL_PUBLICATION_KIND) return false;
  if (!/^[0-9a-f]{40}$/i.test(String(pub.qa1_qa6_subject_sha || ""))) return false;
  for (const id of QA1_TO_QA6) {
    const s = suiteOf(evidence, id);
    if (!s || s.completion_status !== "COMPLETE") return false;
  }
  const qa7 = suiteOf(evidence, "QA7");
  const qa8 = suiteOf(evidence, "QA8");
  const qa9 = suiteOf(evidence, "QA9");
  if (!qa7 || qa7.completion_status !== "NOT_STARTED") return false;
  if (!qa8 || (qa8.completion_status !== "STALE" && qa8.completion_status !== "NOT_STARTED")) {
    return false;
  }
  if (!qa9 || (qa9.completion_status !== "STALE" && qa9.completion_status !== "NOT_STARTED")) {
    return false;
  }
  if (qa9.epoch_status !== "STALE_AGGREGATION_FOR_CURRENT_EPOCH") return false;
  return true;
}

function officialSuiteBindings(subjectSha, officialRunId, suites) {
  return {
    kind: OFFICIAL_PUBLICATION_KIND,
    qa1_qa6_subject_sha: subjectSha,
    official_run_id: String(officialRunId),
    suites,
  };
}

function verifyOfficialQa1Qa6CheckpointPublication(ctx, fails) {
  const evidence = ctx && ctx.evidence;
  const baseline = ctx && ctx.baseline;
  const results = (ctx && ctx.results) || {};
  const pub = evidence && evidence.publication;
  if (!pub || typeof pub !== "object") {
    fails.push("official QA1-QA6 checkpoint requires evidence.publication metadata");
    return;
  }
  if (pub.kind !== OFFICIAL_PUBLICATION_KIND) {
    fails.push("evidence.publication.kind must be official_qa1_qa6_checkpoint");
  }
  if (!pub.qa1_qa6_subject_sha) {
    fails.push("evidence.publication.qa1_qa6_subject_sha required");
  }
  if (!pub.official_run_id || !/^[0-9]+$/.test(String(pub.official_run_id))) {
    fails.push("evidence.publication.official_run_id must be a numeric Actions run id");
  }
  const bindings = pub.suites;
  if (!bindings || typeof bindings !== "object") {
    fails.push("QA1-QA6 official run/artifact/digest/checksum bindings required");
    return;
  }
  for (const id of QA1_TO_QA6) {
    const b = bindings[id];
    const s = suiteOf(evidence, id);
    const r = results[id];
    if (!b || typeof b !== "object") {
      fails.push(`${id} official publication binding missing`);
      continue;
    }
    if (!b.artifact_id || !String(b.artifact_id).trim()) {
      fails.push(`${id} official artifact_id required`);
    }
    if (b.artifact_name !== `engine-acceptance-${id}`) {
      fails.push(`${id} official artifact_name must be engine-acceptance-${id}`);
    }
    const digest = normalizeDigest(b.digest);
    if (!/^sha256:[0-9a-f]{64}$/.test(digest)) {
      fails.push(`${id} official digest must be sha256:<64 hex>`);
    }
    if (!b.checksum) {
      fails.push(`${id} official checksum required`);
    } else {
      if (s && s.checksum && b.checksum !== s.checksum) {
        fails.push(`${id} official checksum must match evidence suite checksum`);
      }
      if (r && r.checksum && b.checksum !== r.checksum) {
        fails.push(`${id} official checksum must match result checksum`);
      }
    }
    if (pub.official_run_id && b.actions_run_id && String(b.actions_run_id) !== String(pub.official_run_id)) {
      fails.push(`${id} official actions_run_id must match publication.official_run_id`);
    }
  }
  if (!ctx.currentHead) {
    fails.push("current HEAD SHA required for official checkpoint subject inheritance");
    return;
  }
  const inherit = evaluatePublicationInheritance({
    subjectSha: pub.qa1_qa6_subject_sha,
    currentHead: ctx.currentHead,
    baselineId: evidence.baseline_id,
    liveBaselineId: baseline && baseline.id,
    promptHash: baseline && baseline.prompt_hash,
    livePromptHash: ctx.livePromptHash || (baseline && baseline.prompt_hash),
    evalHash: baseline && baseline.eval_dataset_hash,
    liveEvalHash: ctx.liveEvalHash || (baseline && baseline.eval_dataset_hash),
    workflowHash: baseline && baseline.acceptance_workflow_hash,
    liveWorkflowHash: ctx.liveWorkflowHash || (baseline && baseline.acceptance_workflow_hash),
    isAncestor: ctx.isAncestor,
    cwd: ctx.cwd,
  });
  if (!isInheritanceAllowed(inherit)) {
    fails.push(
      `official subject SHA inheritance denied: ${inherit.code} ${(inherit.reasons || []).join("; ")}`,
    );
  }
}

module.exports = {
  OFFICIAL_PUBLICATION_KIND,
  QA1_TO_QA6,
  hasOfficialQa1Qa6CheckpointShape,
  officialSuiteBindings,
  verifyOfficialQa1Qa6CheckpointPublication,
};

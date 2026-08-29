/**
 * Official evidence SHA inheritance after a publication commit.
 *
 * 허용: 동일 baseline + 동일 prompt/eval/workflow binding + subject가
 * current HEAD의 exact ancestor.
 * 거부: 다른 baseline, hash drift, unrelated descendant, 임의 재귀속.
 */
"use strict";

const { execSync } = require("node:child_process");
const { ROOT } = require("./hash-scope.cjs");

const ALLOW = "ALLOW_INHERIT";
const SAME_SHA = "SAME_SUBJECT_SHA";
const DENY = "DENY";

function isGitAncestor(ancestorSha, descendantSha, cwd = ROOT) {
  if (!ancestorSha || !descendantSha) return false;
  if (!/^[0-9a-f]{40}$/i.test(ancestorSha) || !/^[0-9a-f]{40}$/i.test(descendantSha)) {
    return false;
  }
  try {
    execSync(`git merge-base --is-ancestor ${ancestorSha} ${descendantSha}`, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function evaluatePublicationInheritance(opts) {
  const subjectSha = String(opts.subjectSha || "").trim().toLowerCase();
  const currentHead = String(opts.currentHead || "").trim().toLowerCase();
  const reasons = [];

  if (!/^[0-9a-f]{40}$/.test(subjectSha)) {
    return { status: DENY, code: "SUBJECT_SHA", reasons: ["subjectSha must be 40-char hex"] };
  }
  if (!/^[0-9a-f]{40}$/.test(currentHead)) {
    return { status: DENY, code: "HEAD_SHA", reasons: ["currentHead must be 40-char hex"] };
  }
  if (opts.baselineId !== opts.liveBaselineId) {
    reasons.push("baseline_id mismatch (cross-epoch inheritance forbidden)");
  }
  if (opts.promptHash !== opts.livePromptHash) {
    reasons.push("prompt_hash drift (inheritance forbidden)");
  }
  if (opts.evalHash !== opts.liveEvalHash) {
    reasons.push("eval_dataset_hash drift (inheritance forbidden)");
  }
  if (opts.workflowHash !== opts.liveWorkflowHash) {
    reasons.push("acceptance_workflow_hash drift (inheritance forbidden)");
  }
  if (reasons.length) {
    return { status: DENY, code: "BINDING", reasons };
  }
  if (subjectSha === currentHead) {
    return { status: SAME_SHA, code: "SAME_SHA", reasons: [] };
  }
  const ancestorFn = typeof opts.isAncestor === "function" ? opts.isAncestor : isGitAncestor;
  if (!ancestorFn(subjectSha, currentHead, opts.cwd || ROOT)) {
    return {
      status: DENY,
      code: "NOT_ANCESTOR",
      reasons: ["subject SHA is not an exact ancestor of current HEAD (unrelated descendant / wash forbidden)"],
    };
  }
  return { status: ALLOW, code: "ANCESTOR_SAME_BINDINGS", reasons: [] };
}

function isInheritanceAllowed(result) {
  return result && (result.status === ALLOW || result.status === SAME_SHA);
}

module.exports = {
  ALLOW,
  SAME_SHA,
  DENY,
  isGitAncestor,
  evaluatePublicationInheritance,
  isInheritanceAllowed,
};

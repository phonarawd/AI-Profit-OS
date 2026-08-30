/**
 * A_BRANCH_FORMAL 공식 계약 · fail-closed verifier.
 *
 * current-authoritative 소유:
 *   - qa9-result + evidence.verdict = ENGINE_ACCEPTED_FOR_UI
 *   - current_state + 정규화된 top-level 게이트
 * historical:
 *   - evidence.current_epoch = rebase snapshot (STALE_PENDING_*)
 *
 * footer engine_accepted_for_ui=NOT_ISSUED 는 QA8 publisher가 남긴
 * current-authoritative 게이트가 QA9 이후 stale 로 남은 것.
 * verifier가 무시하지 않는다. 발급 후에는 ISSUED/YES/NO/NO 로 일치해야 한다.
 */
"use strict";

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { CURRENT_EPOCH_REBASE_SNAPSHOT } = require("./product-rebase.cjs");

const SCHEMA = "governance.engine-acceptance.a-branch-formal-result.v1";
const VERSION = "1.0.0";
const PUBLISHER_ID = "official_a_branch_formal_publisher";
const PUBLISHER_VERSION = "A_BRANCH_FORMAL_PUBLISHER_V1";
const RESULT_REL = "governance/engine-acceptance/a-branch-formal-result.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const REPORT_REL = "governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md";
const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";
const OFFICIAL_RELS = Object.freeze([RESULT_REL, EVIDENCE_REL, REPORT_REL]);
const QA_RESULT_RELS = Object.freeze([
  "governance/engine-acceptance/qa1-result.v1.json",
  "governance/engine-acceptance/qa2-result.v1.json",
  "governance/engine-acceptance/qa3-result.v1.json",
  "governance/engine-acceptance/qa4-result.v1.json",
  "governance/engine-acceptance/qa5-result.v1.json",
  "governance/engine-acceptance/qa6-result.v1.json",
  "governance/engine-acceptance/qa7-result.v1.json",
  "governance/engine-acceptance/qa8-result.v1.json",
  "governance/engine-acceptance/qa9-result.v1.json",
]);
const MANDATORY_SUITES = Object.freeze([
  "QA1",
  "QA2",
  "QA3",
  "QA4",
  "QA5",
  "QA6",
  "QA7",
  "QA8",
  "QA9",
]);
const NEXT_RELEASE_STEP = "RC_TRAIN_PREFLIGHT";
const MANIFEST_STATE_CONFLICT_ROOT_CAUSE =
  "QA8_PUBLISHER_CURRENT_GATE_FOOTER_LEFT_STALE_AFTER_QA9";
const CANONICAL_STATE_OWNER = "evidence.current_state+normalized_top_level_gates";

const OFFICIAL_CONTRACT = Object.freeze({
  branch: "rel502/a-502-1-p-help-fail-closed",
  formalSubjectSha: "17a5a3a07e36b21c7316e196a9906a381b8f3163",
  qa9RunId: "qa9-acceptance-report-20260830",
  qa9Checksum: "5bf04ab4eab1216e20db1798fe56da75e18f3b4f3d196ae6d208a70f7fe01bb9",
  baselineId: "ea-baseline-51df73ef6c25-2139dba09588",
  workflowHash: "7eb0c52b550f3aadc58b29a029687c0720bc15a6c7efbee82c69df4ca20ba0b0",
  promptHash: "4f201642352210cdce525eeaad53ed2e5d3198786f56a7dd401e6c561fc379b5",
  evalHash: "710cc5f7e3f1ac7ad6ee934eb9028d7bb8f0adbce38e94c44c1c6445cda0a47d",
});

function fail(message, code) {
  const err = new Error(message);
  err.code = code || "AIPO_A_BRANCH_FORMAL_REJECT";
  throw err;
}

function sha256Json(obj) {
  return crypto.createHash("sha256").update(`${JSON.stringify(obj)}\n`, "utf8").digest("hex");
}

function sealFormal(result) {
  const copy = { ...result };
  delete copy.checksum;
  copy.checksum = sha256Json(copy);
  return copy;
}

function formalizationId(subjectSha, qa9Checksum) {
  return `a-branch-formal-${String(subjectSha).slice(0, 12)}-${String(qa9Checksum).slice(0, 12)}`;
}

function readJsonRoot(root, rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function readBytes(root, rel) {
  return fs.readFileSync(path.join(root, rel));
}

function snapshotQaResults(root) {
  const out = new Map();
  for (const rel of QA_RESULT_RELS) {
    const abs = path.join(root, rel);
    out.set(rel, fs.existsSync(abs) ? fs.readFileSync(abs) : null);
  }
  return out;
}

function assertQaResultsUnchanged(root, snap, label) {
  for (const [rel, before] of snap.entries()) {
    const abs = path.join(root, rel);
    const after = fs.existsSync(abs) ? fs.readFileSync(abs) : null;
    if (before == null && after == null) continue;
    if (before == null || after == null || !before.equals(after)) {
      fail(`QA evidence mutated: ${rel} (${label || "post"})`, "QA_EVIDENCE_MUTATION");
    }
  }
}

function isolatedGitEnv(repo) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  delete env.GIT_OBJECT_DIRECTORY;
  delete env.GIT_ALTERNATE_OBJECT_DIRECTORIES;
  env.GIT_DIR = path.join(repo, ".git");
  env.GIT_WORK_TREE = repo;
  return env;
}

function gitText(repo, args) {
  try {
    return execSync(`git ${args}`, {
      cwd: repo,
      encoding: "utf8",
      env: isolatedGitEnv(repo),
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (e) {
    fail(`git ${args} failed: ${(e && e.stderr) || (e && e.message) || e}`, "GIT");
  }
  return "";
}

function gitMergeBaseIsAncestor(ancestorSha, descendantSha, cwd) {
  if (!ancestorSha || !descendantSha) fail("subject/HEAD SHA missing", "SUBJECT_SHA");
  if (!/^[0-9a-f]{40}$/i.test(ancestorSha) || !/^[0-9a-f]{40}$/i.test(descendantSha)) {
    fail("subject/HEAD SHA invalid", "SUBJECT_SHA");
  }
  try {
    execSync(`git merge-base --is-ancestor ${ancestorSha} ${descendantSha}`, {
      cwd,
      encoding: "utf8",
      env: isolatedGitEnv(cwd),
      stdio: ["ignore", "ignore", "pipe"],
    });
    return true;
  } catch {
    fail("formal subject SHA is not an ancestor of HEAD", "NOT_ANCESTOR");
  }
  return false;
}

function defaultResolveHead(cwd) {
  const sha = gitText(cwd, "rev-parse HEAD");
  if (!/^[0-9a-f]{40}$/i.test(sha)) fail("HEAD SHA invalid", "HEAD_SHA");
  return sha.toLowerCase();
}

function defaultResolveRemoteHead(branch, cwd) {
  const sha = gitText(cwd, `rev-parse --verify origin/${branch}`);
  if (!/^[0-9a-f]{40}$/i.test(sha)) fail("remote HEAD SHA invalid", "REMOTE_HEAD");
  return sha.toLowerCase();
}

function isLinkedWorktree(cwd) {
  try {
    const gitDir = gitText(cwd, "rev-parse --git-dir");
    const common = gitText(cwd, "rev-parse --git-common-dir");
    return path.resolve(cwd, gitDir) !== path.resolve(cwd, common);
  } catch {
    return false;
  }
}

function assertIsolatedWorktree(cwd) {
  const base = path.basename(cwd);
  if (isLinkedWorktree(cwd) || base.startsWith("_worktree-")) return;
  fail("A-branch formal publisher requires a clean isolated worktree", "WORKTREE");
}

function assertWorkingTreeClean(cwd) {
  const porcelain = gitText(cwd, "status --porcelain");
  if (porcelain) fail("isolated worktree is not clean", "WORKTREE_DIRTY");
}

function resolveContract(opts) {
  return {
    branch: opts.expectedBranch || OFFICIAL_CONTRACT.branch,
    formalSubjectSha: String(opts.expectedSubjectSha || OFFICIAL_CONTRACT.formalSubjectSha).toLowerCase(),
    qa9RunId: opts.expectedQa9RunId || OFFICIAL_CONTRACT.qa9RunId,
    qa9Checksum: opts.expectedQa9Checksum || OFFICIAL_CONTRACT.qa9Checksum,
    baselineId: opts.expectedBaselineId || OFFICIAL_CONTRACT.baselineId,
    workflowHash: opts.expectedWorkflowHash || OFFICIAL_CONTRACT.workflowHash,
    promptHash: opts.expectedPromptHash || OFFICIAL_CONTRACT.promptHash,
    evalHash: opts.expectedEvalHash || OFFICIAL_CONTRACT.evalHash,
  };
}

function assertBranchAllowed(branch) {
  if (!branch) fail("target branch missing", "BRANCH");
  if (/^(main|master)$/i.test(branch) || /train/i.test(branch)) {
    fail(`branch ${branch} is not an A-branch formal target`, "BRANCH");
  }
}

function suiteOf(evidence, id) {
  return ((evidence && evidence.suites) || []).find((s) => s.suite_id === id) || null;
}

function assertQa1ToQa9Complete(evidence, baselineId) {
  for (const id of MANDATORY_SUITES) {
    const s = suiteOf(evidence, id);
    if (!s || s.completion_status !== "COMPLETE") {
      fail(`${id} is not COMPLETE`, "QA_INCOMPLETE");
    }
    if (s.baseline_id !== baselineId) {
      fail(`${id} baseline_id is not current epoch`, "QA_EPOCH");
    }
    if (!s.run_id || !s.checksum) {
      fail(`${id} missing run_id/checksum`, "QA_BINDING");
    }
  }
  const qa7 = suiteOf(evidence, "QA7");
  if (!qa7 || qa7.formal_actions_evidence !== true) {
    fail("QA7 formal Actions evidence required (A-502-4)", "QA7_FORMAL");
  }
  const qa9 = suiteOf(evidence, "QA9");
  if (!qa9) fail("QA9 slot missing", "QA9");
  if (qa9.epoch_status === "STALE_AGGREGATION_FOR_CURRENT_EPOCH") {
    fail("QA9 is historical/stale aggregation, not current-epoch", "QA9_PREDECESSOR");
  }
  if (qa9.current_epoch_authoritative === false) {
    fail("QA9 is not current-epoch authoritative", "QA9_PREDECESSOR");
  }
  if (qa9.completion_status === "STALE") {
    fail("QA9 completion_status is STALE", "QA9_PREDECESSOR");
  }
}

function assertQa9CurrentBinding(qa9, qa9Slot, contract) {
  if (!qa9 || qa9.schema !== "governance.engine-acceptance.qa9-result.v1") {
    fail("qa9-result schema mismatch", "QA9");
  }
  if (qa9.completion_status !== "COMPLETE" || qa9.aggregation_only !== true) {
    fail("QA9 must be current-epoch COMPLETE aggregation", "QA9");
  }
  if (qa9.baseline_id !== contract.baselineId) {
    fail("QA9 baseline is predecessor/drift — current-epoch only", "QA9_PREDECESSOR");
  }
  if (String(qa9.run_id) !== String(contract.qa9RunId)) {
    fail("QA9 run_id is not the current official aggregation", "QA9_RUN");
  }
  if (qa9.checksum !== contract.qa9Checksum) {
    fail("QA9 checksum mismatch", "QA9_CHECKSUM");
  }
  const qa9Body = { ...qa9 };
  const recorded = qa9Body.checksum;
  delete qa9Body.checksum;
  if (sha256Json(qa9Body) !== recorded) {
    fail("QA9 checksum formula mismatch", "QA9_CHECKSUM");
  }
  if (!qa9Slot || qa9Slot.checksum !== qa9.checksum || String(qa9Slot.run_id) !== String(qa9.run_id)) {
    fail("evidence QA9 slot does not bind current qa9-result", "QA9_BINDING");
  }
  if (qa9.verdict !== "ENGINE_ACCEPTED_FOR_UI" || qa9.engine_accepted_for_ui !== "ISSUED") {
    fail("ENGINE_ACCEPTED_FOR_UI is not ISSUED", "ENGINE_ACCEPTED");
  }
}

function assertQa7FormalCounts(qa7) {
  if (!qa7 || qa7.formal_actions_evidence !== true || qa7.local_validation_only !== false) {
    fail("QA7 must be formal Actions evidence", "QA7_FORMAL");
  }
  const counts = qa7.counts || {};
  if (counts.total !== 26 || counts.pass !== 26 || counts.fail !== 0) {
    fail("QA7 formal Actions must be 26/26", "QA7_FORMAL");
  }
}

function assertPins(baseline, contract) {
  if (!baseline || baseline.id !== contract.baselineId) {
    fail("baseline_id drift", "BASELINE");
  }
  if (baseline.acceptance_workflow_hash !== contract.workflowHash) {
    fail("workflow hash drift", "WORKFLOW_HASH");
  }
  if (baseline.prompt_hash !== contract.promptHash) {
    fail("prompt hash drift", "PROMPT_HASH");
  }
  if (baseline.eval_dataset_hash !== contract.evalHash) {
    fail("eval hash drift", "EVAL_HASH");
  }
}

function assertCurrentEpochHistorical(evidence) {
  const epoch = evidence && evidence.current_epoch;
  if (!epoch) fail("current_epoch historical snapshot missing", "HISTORICAL_SNAPSHOT");
  for (const [key, expected] of Object.entries(CURRENT_EPOCH_REBASE_SNAPSHOT)) {
    if (epoch[key] !== expected) {
      fail(
        `current_epoch.${key} is historical rebase snapshot and must remain ${expected}`,
        "HISTORICAL_SNAPSHOT",
      );
    }
  }
}

function assertGatesStayReleaseClosed(obj, label) {
  const rc = obj.rc_formal;
  const rel = obj.release_ready;
  if (rc === true || rc === "YES" || rc === "true") {
    fail(`${label} cannot set RC_FORMAL=YES`, "RC_FORMAL");
  }
  if (rel === true || rel === "YES" || rel === "true") {
    fail(`${label} cannot set RELEASE_READY=YES`, "RELEASE_READY");
  }
}

function assertUnsignedFormalRejected(evidence, report, resultExists) {
  const yes =
    (evidence && evidence.a_branch_formal === "YES") ||
    (typeof report === "string" && /A_BRANCH_FORMAL\s*=\s*YES/.test(report));
  if (yes && !resultExists) {
    fail("manual/unsigned A_BRANCH_FORMAL=YES is rejected", "UNSIGNED");
  }
}

function verifyPreconditions(root, opts = {}) {
  const contract = resolveContract(opts);
  assertBranchAllowed(contract.branch);
  if (opts.branch && opts.branch !== contract.branch) {
    fail(`branch mismatch: ${opts.branch} != ${contract.branch}`, "BRANCH");
  }

  const cwd = opts.gitCwd || root;
  if (opts.requireIsolatedWorktree !== false) {
    if (typeof opts.assertIsolatedWorktree === "function") opts.assertIsolatedWorktree(cwd);
    else assertIsolatedWorktree(cwd);
  }
  if (opts.requireCleanWorktree !== false) {
    if (typeof opts.assertWorkingTreeClean === "function") opts.assertWorkingTreeClean(cwd);
    else assertWorkingTreeClean(cwd);
  }

  const resolveHead = typeof opts.resolveHead === "function" ? opts.resolveHead : defaultResolveHead;
  const resolveRemoteHead =
    typeof opts.resolveRemoteHead === "function" ? opts.resolveRemoteHead : defaultResolveRemoteHead;
  const head = String(resolveHead(cwd)).toLowerCase();
  const remoteHead = String(resolveRemoteHead(contract.branch, cwd)).toLowerCase();
  if (opts.expectedHead && String(opts.expectedHead).toLowerCase() !== head) {
    fail("local HEAD mismatch", "HEAD_SHA");
  }

  const ancestorFn =
    typeof opts.isAncestor === "function"
      ? (a, d) => {
          const ok = opts.isAncestor(a, d, cwd);
          if (!ok) fail("formal subject SHA is not an ancestor of HEAD", "NOT_ANCESTOR");
          return true;
        }
      : gitMergeBaseIsAncestor;
  ancestorFn(contract.formalSubjectSha, head, cwd);
  ancestorFn(contract.formalSubjectSha, remoteHead, cwd);

  const baseline = readJsonRoot(root, BASELINE_REL);
  const evidence = readJsonRoot(root, EVIDENCE_REL);
  const qa9 = readJsonRoot(root, "governance/engine-acceptance/qa9-result.v1.json");
  const qa7 = readJsonRoot(root, "governance/engine-acceptance/qa7-result.v1.json");
  const report = fs.existsSync(path.join(root, REPORT_REL))
    ? fs.readFileSync(path.join(root, REPORT_REL), "utf8")
    : "";

  assertPins(baseline, contract);
  assertQa1ToQa9Complete(evidence, contract.baselineId);
  assertQa9CurrentBinding(qa9, suiteOf(evidence, "QA9"), contract);
  assertQa7FormalCounts(qa7);
  assertCurrentEpochHistorical(evidence);
  assertGatesStayReleaseClosed(evidence, "evidence");
  if (evidence.verdict !== "ENGINE_ACCEPTED_FOR_UI") {
    fail("evidence.verdict must be ENGINE_ACCEPTED_FOR_UI", "ENGINE_ACCEPTED");
  }

  const resultExists = fs.existsSync(path.join(root, RESULT_REL));
  assertUnsignedFormalRejected(evidence, report, resultExists);

  return {
    contract,
    head,
    remoteHead,
    baseline,
    evidence,
    qa9,
    qa7,
    report,
    resultExists,
  };
}

function buildFormalResult(ctx) {
  const { contract, head, qa9 } = ctx;
  const issuedAt = ctx.issuedAt || "2026-08-30T00:00:00.000Z";
  const body = {
    schema: SCHEMA,
    version: VERSION,
    formalization_id: formalizationId(contract.formalSubjectSha, contract.qa9Checksum),
    completion_status: "COMPLETE",
    a_branch_formal: true,
    branch: contract.branch,
    formal_subject_sha: contract.formalSubjectSha,
    publisher_commit_sha: head,
    publication: {
      kind: "official_a_branch_formal",
      publisher_id: PUBLISHER_ID,
      publisher_version: PUBLISHER_VERSION,
      issued_at: issuedAt,
    },
    baseline_id: contract.baselineId,
    acceptance_workflow_hash: contract.workflowHash,
    prompt_hash: contract.promptHash,
    eval_dataset_hash: contract.evalHash,
    qa9_run_id: contract.qa9RunId,
    qa9_checksum: contract.qa9Checksum,
    engine_accepted_for_ui: "ISSUED",
    current_epoch_binding: {
      baseline_id: contract.baselineId,
      qa9_run_id: contract.qa9RunId,
      qa9_checksum: contract.qa9Checksum,
      qa9_verdict: qa9.verdict,
    },
    issued_at: issuedAt,
    publisher_id: PUBLISHER_ID,
    publisher_version: PUBLISHER_VERSION,
    rc_formal: false,
    release_ready: false,
    next_release_step: NEXT_RELEASE_STEP,
  };
  return sealFormal(body);
}

function nextEvidence(evidence, result, ctx) {
  const next = JSON.parse(JSON.stringify(evidence));
  const epoch = evidence.current_epoch ? JSON.parse(JSON.stringify(evidence.current_epoch)) : null;
  next.engine_accepted_for_ui = "ISSUED";
  next.a_branch_formal = "YES";
  next.rc_formal = "NO";
  next.release_ready = "NO";
  next.current_state = {
    authority: PUBLISHER_ID,
    owner: CANONICAL_STATE_OWNER,
    manifest_footer_classification: "current_authoritative_normalized_by_a_branch_formal_publisher",
    manifest_state_conflict_root_cause: MANIFEST_STATE_CONFLICT_ROOT_CAUSE,
    current_epoch_classification: "historical_rebase_snapshot",
    engine_accepted_for_ui: "ISSUED",
    a_branch_formal: "YES",
    rc_formal: "NO",
    release_ready: "NO",
    next_release_step: NEXT_RELEASE_STEP,
    formal_subject_sha: result.formal_subject_sha,
    publisher_commit_sha: result.publisher_commit_sha,
    qa9_run_id: result.qa9_run_id,
    qa9_checksum: result.qa9_checksum,
  };
  next.publication = {
    ...(next.publication || {}),
    a_branch_formal: {
      kind: "official_a_branch_formal",
      formalization_id: result.formalization_id,
      formal_subject_sha: result.formal_subject_sha,
      publisher_commit_sha: result.publisher_commit_sha,
      publisher_id: PUBLISHER_ID,
      publisher_version: PUBLISHER_VERSION,
      issued_at: result.issued_at,
      checksum: result.checksum,
    },
  };
  if (epoch) next.current_epoch = epoch;
  return next;
}

function patchReport(existing, result) {
  let text = String(existing || "");
  if (!/ENGINE_ACCEPTED_FOR_UI\s*=\s*ISSUED/.test(text)) {
    fail("REPORT must already declare ENGINE_ACCEPTED_FOR_UI = ISSUED", "REPORT");
  }
  if (!/A_BRANCH_FORMAL = YES/.test(text)) {
    text = text.replace(
      /ENGINE_ACCEPTED_FOR_UI = ISSUED/,
      [
        "ENGINE_ACCEPTED_FOR_UI = ISSUED",
        "A_BRANCH_FORMAL = YES",
        "RC_FORMAL = NO",
        "RELEASE_READY = NO",
        `NEXT_RELEASE_STEP = ${NEXT_RELEASE_STEP}`,
      ].join("\n"),
    );
  }
  if (!/## A_BRANCH_FORMAL/.test(text)) {
    text = `${text.trimEnd()}

## A_BRANCH_FORMAL

| Field | Value |
|---|---|
| a_branch_formal | \`YES\` |
| formalization_id | \`${result.formalization_id}\` |
| formal_subject_sha | \`${result.formal_subject_sha}\` |
| publisher_commit_sha | \`${result.publisher_commit_sha}\` |
| qa9_run_id | \`${result.qa9_run_id}\` |
| qa9_checksum | \`${result.qa9_checksum}\` |
| ENGINE_ACCEPTED_FOR_UI | \`ISSUED\` |
| RC_FORMAL | \`NO\` |
| RELEASE_READY | \`NO\` |
| next_release_step | \`${NEXT_RELEASE_STEP}\` |
| publisher | \`${PUBLISHER_ID}@${PUBLISHER_VERSION}\` |

A_BRANCH_FORMAL ≠ RC_FORMAL. This issuance is not train merge, main merge, or RELEASE_READY.
`;
  }
  if (/RC_FORMAL = YES/.test(text) || /RELEASE_READY = YES/.test(text)) {
    fail("REPORT cannot declare RC_FORMAL or RELEASE_READY YES", "RC_FORMAL");
  }
  return text;
}

function assertCurrentStateConsistent(evidence, result) {
  const cs = evidence.current_state;
  if (!cs) fail("current_state missing after A-branch formal", "CURRENT_STATE");
  if (cs.engine_accepted_for_ui !== "ISSUED" || evidence.engine_accepted_for_ui !== "ISSUED") {
    fail("current-state ENGINE_ACCEPTED_FOR_UI contradiction", "CURRENT_STATE");
  }
  if (cs.a_branch_formal !== "YES" || evidence.a_branch_formal !== "YES" || result.a_branch_formal !== true) {
    fail("current-state A_BRANCH_FORMAL contradiction", "CURRENT_STATE");
  }
  if (cs.rc_formal !== "NO" || evidence.rc_formal !== "NO" || result.rc_formal !== false) {
    fail("current-state RC_FORMAL contradiction", "CURRENT_STATE");
  }
  if (cs.release_ready !== "NO" || evidence.release_ready !== "NO" || result.release_ready !== false) {
    fail("current-state RELEASE_READY contradiction", "CURRENT_STATE");
  }
  if (cs.formal_subject_sha !== result.formal_subject_sha) {
    fail("current_state formal_subject_sha mismatch", "CURRENT_STATE");
  }
}

function verifyIssuedOutputs(files, ctx) {
  const result = files.result;
  const evidence = files.evidence;
  const report = files.report;
  const contract = ctx.contract;
  if (!result || result.schema !== SCHEMA || result.version !== VERSION) {
    fail("A-branch formal schema/version mismatch", "SCHEMA");
  }
  if (result.completion_status !== "COMPLETE") fail("completion_status must be COMPLETE", "SCHEMA");
  if (result.a_branch_formal !== true) fail("a_branch_formal must be true", "SCHEMA");
  if (result.branch !== contract.branch) fail("result branch mismatch", "BRANCH");
  if (String(result.formal_subject_sha).toLowerCase() !== contract.formalSubjectSha) {
    fail("formal subject SHA mismatch", "SUBJECT_SHA");
  }
  if (!result.publisher_commit_sha || !/^[0-9a-f]{40}$/i.test(result.publisher_commit_sha)) {
    fail("publisher commit SHA / publication metadata missing", "PUBLISHER_META");
  }
  if (
    String(result.publisher_commit_sha).toLowerCase() === String(result.formal_subject_sha).toLowerCase() &&
    ctx.allowSubjectEqualsPublisher !== true &&
    String(ctx.head || "").toLowerCase() !== contract.formalSubjectSha
  ) {
    fail("publisher commit SHA must be distinct from formal subject SHA", "PUBLISHER_META");
  }
  if (!result.publication || result.publication.publisher_id !== PUBLISHER_ID) {
    fail("publisher metadata missing", "PUBLISHER_META");
  }
  if (result.publisher_id !== PUBLISHER_ID || result.publisher_version !== PUBLISHER_VERSION) {
    fail("publisher identity/version missing", "PUBLISHER_META");
  }
  if (result.baseline_id !== contract.baselineId) fail("result baseline drift", "BASELINE");
  if (result.acceptance_workflow_hash !== contract.workflowHash) fail("result workflow hash drift", "WORKFLOW_HASH");
  if (result.prompt_hash !== contract.promptHash) fail("result prompt hash drift", "PROMPT_HASH");
  if (result.eval_dataset_hash !== contract.evalHash) fail("result eval hash drift", "EVAL_HASH");
  if (result.qa9_run_id !== contract.qa9RunId || result.qa9_checksum !== contract.qa9Checksum) {
    fail("result QA9 binding mismatch", "QA9_BINDING");
  }
  if (result.engine_accepted_for_ui !== "ISSUED") fail("result ENGINE_ACCEPTED_FOR_UI not ISSUED", "ENGINE_ACCEPTED");
  if (result.rc_formal !== false) fail("result RC_FORMAL must be false", "RC_FORMAL");
  if (result.release_ready !== false) fail("result RELEASE_READY must be false", "RELEASE_READY");
  if (result.next_release_step !== NEXT_RELEASE_STEP) {
    fail("next_release_step must be RC_TRAIN_PREFLIGHT", "NEXT");
  }
  const expectedChecksum = sha256Json((() => {
    const copy = { ...result };
    delete copy.checksum;
    return copy;
  })());
  if (result.checksum !== expectedChecksum) fail("formal checksum/formula mismatch", "CHECKSUM");

  assertQa1ToQa9Complete(evidence, contract.baselineId);
  assertQa9CurrentBinding(ctx.qa9, suiteOf(evidence, "QA9"), contract);
  assertCurrentEpochHistorical(evidence);
  if (ctx.epochBefore) {
    if (JSON.stringify(evidence.current_epoch) !== JSON.stringify(ctx.epochBefore)) {
      fail("historical current_epoch snapshot mutated", "HISTORICAL_SNAPSHOT");
    }
  }
  assertGatesStayReleaseClosed(evidence, "evidence");
  assertGatesStayReleaseClosed(result, "result");
  assertCurrentStateConsistent(evidence, result);
  if (evidence.verdict !== "ENGINE_ACCEPTED_FOR_UI") {
    fail("evidence verdict drifted from QA9", "CURRENT_STATE");
  }
  if (!report || !/A_BRANCH_FORMAL = YES/.test(report)) {
    fail("REPORT must declare A_BRANCH_FORMAL = YES", "REPORT");
  }
  if (!/ENGINE_ACCEPTED_FOR_UI = ISSUED/.test(report)) {
    fail("REPORT must declare ENGINE_ACCEPTED_FOR_UI = ISSUED", "REPORT");
  }
  if (!/RC_FORMAL = NO/.test(report) || !/RELEASE_READY = NO/.test(report)) {
    fail("REPORT must keep RC_FORMAL/RELEASE_READY = NO", "REPORT");
  }
  if (/A_BRANCH_FORMAL = YES/.test(report) && !result.publication) {
    fail("REPORT formal flag without publisher metadata", "UNSIGNED");
  }
}

function sameBinding(existing, next) {
  return Boolean(
    existing &&
      next &&
      existing.formalization_id === next.formalization_id &&
      existing.formal_subject_sha === next.formal_subject_sha &&
      existing.qa9_checksum === next.qa9_checksum &&
      existing.baseline_id === next.baseline_id &&
      existing.acceptance_workflow_hash === next.acceptance_workflow_hash &&
      existing.prompt_hash === next.prompt_hash &&
      existing.eval_dataset_hash === next.eval_dataset_hash,
  );
}

function alreadyPublished(root, nextResult) {
  const abs = path.join(root, RESULT_REL);
  if (!fs.existsSync(abs)) return false;
  const existing = readJsonRoot(root, RESULT_REL);
  if (sameBinding(existing, nextResult) && existing.checksum === nextResult.checksum) {
    return "IDENTICAL";
  }
  if (sameBinding(existing, nextResult)) return "SAME_INPUT";
  return "DIVERGENT";
}

function verifyABranchFormalLive(root, opts = {}) {
  const resultAbs = path.join(root, RESULT_REL);
  const evidence = readJsonRoot(root, EVIDENCE_REL);
  const report = fs.existsSync(path.join(root, REPORT_REL))
    ? fs.readFileSync(path.join(root, REPORT_REL), "utf8")
    : "";
  const resultExists = fs.existsSync(resultAbs);
  assertUnsignedFormalRejected(evidence, report, resultExists);
  if (!resultExists) {
    if (evidence.a_branch_formal === "YES") {
      fail("A_BRANCH_FORMAL=YES without official result file", "UNSIGNED");
    }
    return { status: "A_BRANCH_FORMAL_NOT_ISSUED", a_branch_formal: "NO" };
  }
  const result = readJsonRoot(root, RESULT_REL);
  const qa9 = readJsonRoot(root, "governance/engine-acceptance/qa9-result.v1.json");
  const baseline = readJsonRoot(root, BASELINE_REL);
  const contract = {
    branch: result.branch,
    formalSubjectSha: String(result.formal_subject_sha).toLowerCase(),
    qa9RunId: result.qa9_run_id,
    qa9Checksum: result.qa9_checksum,
    baselineId: result.baseline_id,
    workflowHash: result.acceptance_workflow_hash,
    promptHash: result.prompt_hash,
    evalHash: result.eval_dataset_hash,
  };
  assertPins(baseline, contract);
  verifyIssuedOutputs(
    { result, evidence, report },
    {
      contract,
      qa9,
      epochBefore: evidence.current_epoch,
      allowSubjectEqualsPublisher: opts.allowSubjectEqualsPublisher === true,
      head: result.publisher_commit_sha,
    },
  );
  return { status: "A_BRANCH_FORMAL_ISSUED", a_branch_formal: "YES", checksum: result.checksum };
}

module.exports = {
  SCHEMA,
  VERSION,
  PUBLISHER_ID,
  PUBLISHER_VERSION,
  RESULT_REL,
  EVIDENCE_REL,
  REPORT_REL,
  BASELINE_REL,
  OFFICIAL_RELS,
  QA_RESULT_RELS,
  NEXT_RELEASE_STEP,
  MANIFEST_STATE_CONFLICT_ROOT_CAUSE,
  CANONICAL_STATE_OWNER,
  OFFICIAL_CONTRACT,
  fail,
  sha256Json,
  sealFormal,
  formalizationId,
  readJsonRoot,
  readBytes,
  snapshotQaResults,
  assertQaResultsUnchanged,
  gitMergeBaseIsAncestor,
  defaultResolveHead,
  defaultResolveRemoteHead,
  resolveContract,
  verifyPreconditions,
  buildFormalResult,
  nextEvidence,
  patchReport,
  verifyIssuedOutputs,
  alreadyPublished,
  verifyABranchFormalLive,
  assertUnsignedFormalRejected,
  sameBinding,
};

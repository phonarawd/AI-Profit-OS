/**
 * QA8 공식 GitHub Actions 증거 게시 (제품 재실행 아님)
 *
 * CLI 값은 expected only. 진실은 공식 GitHub metadata + zip digest.
 * 쓰기는 --actual 이고 검증 전부 PASS 후 atomic multi-file replace.
 * dry-run / 기본 실행은 저장 0.
 *
 * 소유 출력:
 *   - governance/engine-acceptance/qa8-result.v1.json
 *   - governance/engine-acceptance/evidence-manifest.v1.json
 *   - governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md
 * 금지 출력: qa7-result · qa9-result · baseline · FINAL_ACCEPTANCE
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { ROOT, readJson } = require("./lib/hash-scope.cjs");
const { atomicReplace } = require("./lib/atomic-publication.cjs");
const {
  evaluateQa9ForPhase,
  qa9StaleAggregationErrors,
  PHASE,
} = require("./lib/qa9-stale-aggregation.cjs");
const {
  OFFICIAL_QA8_ARTIFACT,
  OFFICIAL_QA8_WORKFLOW_NAME,
  defaultGithubClient,
  evaluateQa8Provenance,
  workflowHashReachable,
  normalizeDigest,
  sha256File,
} = require("./lib/qa8-github-provenance.cjs");

const RESULT_REL = "governance/engine-acceptance/qa8-result.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const REPORT_REL = "governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md";
const QA7_REL = "governance/engine-acceptance/qa7-result.v1.json";
const QA9_REL = "governance/engine-acceptance/qa9-result.v1.json";
const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";
const LEDGER_REL = "governance/engine-acceptance/workflow-amendments.v1.json";
const OFFICIAL_RELS = Object.freeze([RESULT_REL, EVIDENCE_REL, REPORT_REL]);
const HARNESS_FILES = Object.freeze([
  "qa8-adversarial.v1.json",
  "admin-route-inventory.v1.json",
]);

function getArg(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  return argv[i + 1] || null;
}

function sha256Json(obj) {
  return crypto.createHash("sha256").update(`${JSON.stringify(obj)}\n`, "utf8").digest("hex");
}

function readJsonRoot(root, rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function readBytes(root, rel) {
  return fs.readFileSync(path.join(root, rel));
}

function fail(message, code) {
  const err = new Error(message);
  err.code = code || "AIPO_QA8_PUBLISH_REJECT";
  throw err;
}

function findFile(dir, name) {
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || !fs.existsSync(cur)) continue;
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const abs = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(abs);
      else if (ent.name === name) return abs;
    }
  }
  return null;
}

function loadArtifactPayload(artifactDir) {
  if (!artifactDir || !fs.existsSync(artifactDir)) {
    fail(`artifact dir missing: ${artifactDir}`, "QA8_RESULT_MISSING");
  }
  const resultAbs = findFile(artifactDir, "qa8-result.v1.json");
  if (!resultAbs) fail("artifact missing qa8-result.v1.json", "QA8_RESULT_MISSING");
  let result;
  try {
    result = JSON.parse(fs.readFileSync(resultAbs, "utf8"));
  } catch {
    fail("qa8-result.v1.json unreadable", "QA8_RESULT_MISSING");
  }
  const harnessDir =
    findFile(artifactDir, "qa8-adversarial.v1.json") &&
    path.dirname(findFile(artifactDir, "qa8-adversarial.v1.json"));
  if (!harnessDir) fail("artifact missing adversarial harness", "HARNESS_MISSING");
  const harnessFiles = {};
  for (const name of HARNESS_FILES) {
    const abs = path.join(harnessDir, name);
    if (!fs.existsSync(abs)) fail(`adversarial harness missing ${name}`, "HARNESS_INCOMPLETE");
    harnessFiles[name] = abs;
  }
  return {
    result,
    resultBytes: fs.readFileSync(resultAbs),
    harnessDir,
    harnessFiles,
  };
}

function assertHarnessComplete(harnessFiles) {
  const body = JSON.parse(fs.readFileSync(harnessFiles["qa8-adversarial.v1.json"], "utf8"));
  if (body.schema !== "harness.qa8-adversarial.v1") {
    fail("adversarial harness schema mismatch", "HARNESS_INCOMPLETE");
  }
  if (body.non_canonical !== true || body.does_not_replace_qa8_result !== true) {
    fail("adversarial harness missing non-canonical markers", "HARNESS_INCOMPLETE");
  }
  if (body.harness_status !== "PASS") {
    fail(`adversarial harness_status=${body.harness_status}`, "HARNESS_FAIL");
  }
  const inv = JSON.parse(fs.readFileSync(harnessFiles["admin-route-inventory.v1.json"], "utf8"));
  if (!inv || typeof inv !== "object") fail("admin-route-inventory missing", "HARNESS_INCOMPLETE");
}

function assertQa8Result(result, baseline, run) {
  if (!result || result.suite_id !== "QA8") fail("QA8 result suite_id mismatch", "QA8_RESULT");
  if (result.baseline_id !== baseline.id) fail("QA8 result baseline_id mismatch", "QA8_BASELINE");
  if (result.completion_status !== "COMPLETE") fail("QA8 result not COMPLETE", "QA8_INCOMPLETE");
  if (result.mode !== "full") fail("QA8 result mode must be full", "QA8_MODE");
  if (result.retry === true || result.flaky === true || result.rerun === true) {
    fail("QA8 result retry/flaky/rerun forbidden", "RETRY_FLAKY");
  }
  const world = result.checks && result.checks.security_privacy_world;
  if (!world) fail("QA8 security_privacy_world missing", "QA8_RESULT");
  if (world.status !== "PASS") fail(`QA8 world status ${world.status}`, "QA8_WORLD");
  if (result.all_checks_pass !== true) fail("QA8 all_checks_pass must be true", "QA8_CHECKS");
  const counts = world.counts || {};
  const required = Number(counts.total || 0);
  if (!(required > 0)) fail("QA8 required/total count missing", "QA8_COUNTS");
  if (Number(counts.fail || 0) !== 0) fail("QA8 fail count must be 0", "QA8_FAIL");
  if (Number(counts.blocked || 0) !== 0) fail("QA8 blocked count must be 0", "QA8_BLOCKED");
  const crit = result.critical_invariant_cumulative || result.critical_invariant || {};
  for (const k of ["failed", "blocked", "skipped", "uncovered"]) {
    if (Number(crit[k] || 0) !== 0) fail(`QA8 critical ${k} must be 0`, "QA8_CRITICAL");
  }
  const defects = result.defects_counts || {};
  if (Number(defects.P0 || 0) !== 0 || Number(defects.P1 || 0) !== 0) {
    fail("QA8 P0/P1 findings forbidden", "QA8_FINDING");
  }
  const copy = { ...result };
  const claimed = copy.checksum;
  delete copy.checksum;
  const recomputed = sha256Json(copy);
  if (!claimed || claimed !== recomputed) fail("QA8 result checksum mismatch", "QA8_CHECKSUM");
  const subject = result.head_sha || (result.actions && result.actions.head_sha);
  if (subject && String(subject).toLowerCase() !== String(run.head_sha).toLowerCase()) {
    fail("QA8 result subject SHA mismatch", "RUN_SHA");
  }
  const pinnedWf =
    result.hashes && result.hashes.pinned && result.hashes.pinned.acceptance_workflow_hash;
  return { checksum: claimed, pinnedWorkflowHash: pinnedWf || null };
}

function assertQa7Predecessor(root, baseline, run, opts) {
  const evidence = readJsonRoot(root, EVIDENCE_REL);
  const qa7Slot = (evidence.suites || []).find((s) => s.suite_id === "QA7");
  const qa7 = readJsonRoot(root, QA7_REL);
  if (!qa7Slot || qa7Slot.completion_status !== "COMPLETE") {
    fail("QA7 formal predecessor is not COMPLETE", "QA7_PREDECESSOR");
  }
  if (qa7.completion_status !== "COMPLETE" || qa7.formal_actions_evidence !== true) {
    fail("QA7 formal evidence binding invalid", "QA7_PREDECESSOR");
  }
  if (qa7.baseline_id !== baseline.id || qa7Slot.baseline_id !== baseline.id) {
    fail("QA7 predecessor baseline mismatch", "QA7_PREDECESSOR");
  }
  if (String(qa7.run_id) !== String(qa7Slot.run_id)) {
    fail("QA7 predecessor run binding mismatch", "QA7_PREDECESSOR");
  }
  const artId = qa7.artifact && qa7.artifact.artifact_id;
  if (!artId || String(artId) !== String(qa7Slot.artifact_id)) {
    fail("QA7 predecessor artifact binding mismatch", "QA7_PREDECESSOR");
  }
  const digest = qa7.artifact && qa7.artifact.digest;
  if (!digest) fail("QA7 predecessor digest missing", "QA7_PREDECESSOR");
  const subject = qa7.actions && qa7.actions.head_sha ? qa7.actions.head_sha : qa7Slot.head_sha;
  if (!subject || !/^[0-9a-f]{40}$/i.test(subject)) {
    fail("QA7 predecessor subject SHA missing", "QA7_PREDECESSOR");
  }
  const ancestorFn = opts.isAncestor;
  const same = String(subject).toLowerCase() === String(run.head_sha).toLowerCase();
  const ancestor = typeof ancestorFn === "function" ? ancestorFn(subject, run.head_sha) : same;
  if (!same && !ancestor) {
    fail("QA7 predecessor subject is not an ancestor of QA8 run SHA", "QA7_PREDECESSOR");
  }
  return { qa7, qa7Slot, subject };
}

function assertWorkflowAndHashes(baseline, qa7, resultPinnedWf, ledger) {
  if (baseline.prompt_hash !== (qa7.hashes && qa7.hashes.pinned && qa7.hashes.pinned.prompt_hash)) {
    if (qa7.hashes && qa7.hashes.pinned && qa7.hashes.pinned.prompt_hash) {
      fail("prompt hash drifted vs QA7 formal pin", "HASH_DRIFT");
    }
  }
  if (baseline.eval_dataset_hash !== (qa7.hashes && qa7.hashes.pinned && qa7.hashes.pinned.eval_dataset_hash)) {
    if (qa7.hashes && qa7.hashes.pinned && qa7.hashes.pinned.eval_dataset_hash) {
      fail("eval hash drifted vs QA7 formal pin", "HASH_DRIFT");
    }
  }
  const qa7Wf = qa7.hashes && qa7.hashes.pinned && qa7.hashes.pinned.acceptance_workflow_hash;
  const tip = baseline.acceptance_workflow_hash;
  if (qa7Wf && qa7Wf !== tip) {
    if (!workflowHashReachable(qa7Wf, tip, ledger && ledger.amendments)) {
      fail("QA7 workflow pin is not on the approved amendment chain", "QA7_PREDECESSOR");
    }
  }
  if (resultPinnedWf && resultPinnedWf !== tip) {
    if (!workflowHashReachable(resultPinnedWf, tip, ledger && ledger.amendments)) {
      fail("QA8 result workflow hash is not current amendment tip", "WORKFLOW_HASH");
    }
  }
}

function assertQa9StaleTuple(evidence, qa9Result, baselineId) {
  const qa9 = (evidence.suites || []).find((s) => s.suite_id === "QA9");
  const errors = qa9StaleAggregationErrors(qa9, { baselineId, qa9Result, label: "QA9" });
  if (errors.length) fail(errors.join("; "), "QA9_STALE");
}

function assertQa9StaleAfterQa8(evidence, qa9Result, baselineId) {
  const judged = evaluateQa9ForPhase({
    phase: PHASE.POST_QA8,
    qa7: (evidence.suites || []).find((s) => s.suite_id === "QA7"),
    qa8: (evidence.suites || []).find((s) => s.suite_id === "QA8"),
    qa9: (evidence.suites || []).find((s) => s.suite_id === "QA9"),
    currentBaselineId: baselineId,
    qa9Result,
  });
  if (!judged.ok) fail(judged.errors.join("; "), "QA9_STALE");
}

function assertGatesStayClosed(result, evidence) {
  if (result.engine_accepted_for_ui && result.engine_accepted_for_ui !== "NOT_ISSUED") {
    fail("publisher cannot issue ENGINE_ACCEPTED_FOR_UI", "UI_GATE");
  }
  if (evidence.verdict === "ENGINE_ACCEPTED_FOR_UI") {
    fail("publisher cannot issue ENGINE_ACCEPTED_FOR_UI", "UI_GATE");
  }
  if (evidence.a_branch_formal === "YES" || result.a_branch_formal === "YES") {
    fail("publisher cannot set A_BRANCH_FORMAL=YES", "A_BRANCH_FORMAL");
  }
}

function alreadyPublished(evidence, run, artifact, checksum) {
  const qa8 = (evidence.suites || []).find((s) => s.suite_id === "QA8");
  if (!qa8 || qa8.completion_status !== "COMPLETE") return false;
  return (
    String(qa8.run_id) === String(run.id) &&
    String(qa8.artifact_id) === String(artifact.id) &&
    normalizeDigest(qa8.digest || "") === normalizeDigest(artifact.digest || "") &&
    qa8.checksum === checksum
  );
}

function buildReport({ baseline, result, run, artifact, checksum, evidence }) {
  const qa9 = (evidence.suites || []).find((s) => s.suite_id === "QA9");
  return `# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-8 \`qa-matrix (QA8)\`
> **Published:** ${result.publishedAt || new Date().toISOString()}
> **baseline_id:** \`${baseline.id}\`
> **qa8_run_id:** \`${run.id}\`
> **qa8_result_checksum:** \`${checksum}\`
> **mode:** \`full\`

## Status banner

\`\`\`text
ACCEPTANCE CONTRACT = LOCKED
BASELINE = FROZEN
QA0 = COMPLETE
QA1 = COMPLETE
QA2 = COMPLETE
QA3 = COMPLETE
QA4 = COMPLETE
QA5 = COMPLETE
QA6 = COMPLETE
QA7 = COMPLETE
QA8 = COMPLETE
QA9 = STALE
QA9_EPOCH = STALE_AGGREGATION_FOR_CURRENT_EPOCH
QA9_AUTHORITATIVE = false
NEXT = QA9_ACCEPTANCE_REPORT
ENGINE_ACCEPTED_FOR_UI = NOT_ISSUED
A_BRANCH_FORMAL = NO
RC_FORMAL = NO
RELEASE_READY = NO
PRODUCT MUTATION = 0
\`\`\`

## Verdict (after QA-8 formal Actions publication)

| Field | Value |
|---|---|
| verdict | \`ENGINE_QA_INCOMPLETE\` |
| reason | QA1–QA8 COMPLETE (formal Actions) · QA9 STALE_AGGREGATION_FOR_CURRENT_EPOCH · ENGINE_ACCEPTED_FOR_UI forbidden · A_BRANCH_FORMAL=NO · RELEASE_READY=NO |
| evidence_integrity | \`VALID\` |
| qa8_run | \`${run.id}\` |
| qa8_artifact | \`${artifact.id}\` |
| qa8_digest | \`${normalizeDigest(artifact.digest)}\` |
| qa9_run_id | \`${qa9 && qa9.run_id}\` |
| qa9_checksum | \`${qa9 && qa9.checksum}\` |

**금지 확인:** \`ENGINE_ACCEPTED_FOR_UI\` **not issued**. \`A_BRANCH_FORMAL=NO\`. \`RC_FORMAL=NO\`. \`RELEASE_READY=NO\`. QA9 result bytes unchanged.
`;
}

function nextEvidence(evidence, baseline, run, artifact, checksum, dual) {
  const next = JSON.parse(JSON.stringify(evidence));
  next.qa_phase = "QA-8";
  next.baseline_id = baseline.id;
  next.verdict = "ENGINE_QA_INCOMPLETE";
  next.verdict_reason =
    "QA1–QA8 COMPLETE (formal Actions) · QA9 STALE_AGGREGATION_FOR_CURRENT_EPOCH · ENGINE_ACCEPTED_FOR_UI forbidden · A_BRANCH_FORMAL=NO · RC_FORMAL=NO · RELEASE_READY=NO";
  next.evidence_integrity = "VALID";
  next.next = "QA9_ACCEPTANCE_REPORT";
  next.a_branch_formal = "NO";
  next.rc_formal = "NO";
  next.release_ready = "NO";
  next.engine_accepted_for_ui = "NOT_ISSUED";
  if (dual) {
    next.dual_dirty = {
      working_tree_clean: dual.working_tree_clean,
      protected_scope_clean: dual.protected_scope_clean,
      forced_clean_forbidden: true,
    };
  }
  next.suites = (next.suites || []).map((s) => {
    if (s.suite_id === "QA8") {
      return {
        ...s,
        suite_id: "QA8",
        run_id: String(run.id),
        baseline_id: baseline.id,
        checksum,
        completion_status: "COMPLETE",
        result_ref: RESULT_REL,
        mode: "full",
        formal_actions_evidence: true,
        artifact: OFFICIAL_QA8_ARTIFACT,
        artifact_id: String(artifact.id),
        digest: normalizeDigest(artifact.digest),
        head_sha: run.head_sha,
      };
    }
    if (s.suite_id === "QA9") {
      return {
        ...s,
        completion_status: "STALE",
        epoch_status: "STALE_AGGREGATION_FOR_CURRENT_EPOCH",
        current_epoch_authoritative: false,
        run_id: null,
        checksum: null,
        aggregation_only: true,
        baseline_id: baseline.id,
      };
    }
    return s;
  });
  next.publication = {
    ...(next.publication || {}),
    kind: "official_qa8_formal",
    qa8_subject_sha: run.head_sha,
    official_run_id: String(run.id),
    qa8: {
      artifact_id: String(artifact.id),
      artifact_name: OFFICIAL_QA8_ARTIFACT,
      digest: `sha256:${normalizeDigest(artifact.digest)}`,
      checksum,
      actions_run_id: String(run.id),
    },
  };
  return next;
}

function publishQa8Formal(opts = {}) {
  const root = opts.root || ROOT;
  const dryRun = opts.actual === true ? false : true;
  if (opts.actual === true && opts.dryRun === true) {
    fail("--actual and --dry-run cannot be combined", "FLAGS");
  }
  const baseline = opts.baseline || readJsonRoot(root, BASELINE_REL);
  const evidence = readJsonRoot(root, EVIDENCE_REL);
  const qa9Before = readBytes(root, QA9_REL);
  const qa7Before = readBytes(root, QA7_REL);
  const qa9Result = readJsonRoot(root, QA9_REL);
  const ledger = (() => {
    try {
      return readJsonRoot(root, LEDGER_REL);
    } catch {
      return { amendments: [] };
    }
  })();

  assertQa9StaleTuple(evidence, qa9Result, baseline.id);

  const expected = {
    actionsRunId: opts.actionsRunId,
    artifactId: opts.artifactId,
    artifactName: opts.artifactName,
    artifactDigest: opts.artifactDigest,
    artifactExpiresAt: opts.artifactExpiresAt,
    headSha: opts.headSha,
    headBranch: opts.headBranch,
    workflowName: opts.workflowName,
    workflowPath: opts.workflowPath,
    event: opts.event,
    conclusion: opts.conclusion,
  };
  const githubClient = opts.githubClient || defaultGithubClient();
  const { run, artifact } = evaluateQa8Provenance({
    expected,
    githubClient,
    downloadedZipSha256: opts.downloadedZipSha256,
    nowMs: opts.nowMs,
  });

  const payload = loadArtifactPayload(opts.artifactDir);
  assertHarnessComplete(payload.harnessFiles);
  const checked = assertQa8Result(payload.result, baseline, run);
  const pred = assertQa7Predecessor(root, baseline, run, opts);
  assertWorkflowAndHashes(baseline, pred.qa7, checked.pinnedWorkflowHash, ledger);
  if (baseline.acceptance_workflow_hash !== (opts.expectedWorkflowHash || baseline.acceptance_workflow_hash)) {
    fail("baseline workflow hash is not the current amendment tip", "WORKFLOW_HASH");
  }
  if (opts.expectedBaselineId && opts.expectedBaselineId !== baseline.id) {
    fail("CLI baseline id is not current baseline", "QA8_BASELINE");
  }

  if (alreadyPublished(evidence, run, artifact, checked.checksum)) {
    return {
      status: "QA8_FORMAL_ALREADY_PUBLISHED",
      dry_run: dryRun,
      run_id: String(run.id),
      artifact_id: String(artifact.id),
      checksum: checked.checksum,
      engine_accepted_for_ui: "NOT_ISSUED",
      a_branch_formal: "NO",
      rc_formal: "NO",
      release_ready: "NO",
    };
  }

  const qa8Slot = (evidence.suites || []).find((s) => s.suite_id === "QA8");
  if (qa8Slot && qa8Slot.completion_status === "COMPLETE") {
    fail("QA8 already COMPLETE with a different run/artifact binding", "IDEMPOTENT_DIVERGENT");
  }

  const publishedAt = opts.publishedAt || new Date().toISOString();
  const publishedResult = { ...payload.result, publishedAt, engine_accepted_for_ui: "NOT_ISSUED" };
  // publication metadata must not break the artifact checksum; keep artifact bytes.
  const nextEv = nextEvidence(evidence, baseline, run, artifact, checked.checksum, opts.dual);
  assertQa9StaleAfterQa8(nextEv, qa9Result, baseline.id);
  assertGatesStayClosed(publishedResult, nextEv);
  const report = buildReport({
    baseline,
    result: { ...publishedResult },
    run,
    artifact,
    checksum: checked.checksum,
    evidence: nextEv,
  });
  if (/ENGINE_ACCEPTED_FOR_UI = ISSUED/.test(report) || /A_BRANCH_FORMAL = YES/.test(report)) {
    fail("publisher cannot issue UI gate or A-branch formal", "UI_GATE");
  }

  if (opts.failBeforeStaging === true) {
    fail("injected failBeforeStaging — destination files must stay unchanged", "INJECTED_FAIL");
  }

  const writes = {
    [RESULT_REL]: payload.resultBytes,
    [EVIDENCE_REL]: Buffer.from(`${JSON.stringify(nextEv, null, 2)}\n`, "utf8"),
    [REPORT_REL]: Buffer.from(report, "utf8"),
  };

  const out = {
    status: dryRun ? "QA8_FORMAL_VALIDATED" : "QA8_FORMAL_PUBLISHED",
    dry_run: dryRun,
    run_id: String(run.id),
    artifact_id: String(artifact.id),
    head_sha: run.head_sha,
    checksum: checked.checksum,
    next: "QA9_ACCEPTANCE_REPORT",
    engine_accepted_for_ui: "NOT_ISSUED",
    a_branch_formal: "NO",
    rc_formal: "NO",
    release_ready: "NO",
    owned_outputs: OFFICIAL_RELS.slice(),
  };

  if (dryRun) return out;

  atomicReplace(root, writes, {
    failBeforeReplace: opts.failBeforeReplace === true,
    failDuringReplace: opts.failDuringReplace === true,
    failDuringReplaceAfter: opts.failDuringReplaceAfter,
    verifyStaged(staged) {
      const byRel = new Map(staged.map((s) => [s.rel, s]));
      for (const rel of OFFICIAL_RELS) {
        if (!byRel.has(rel)) fail(`staged official file missing: ${rel}`, "ATOMIC");
      }
      const stagedResult = JSON.parse(fs.readFileSync(byRel.get(RESULT_REL).tmp));
      const stagedEvidence = JSON.parse(fs.readFileSync(byRel.get(EVIDENCE_REL).tmp, "utf8"));
      if (stagedResult.suite_id !== "QA8" || stagedResult.checksum !== checked.checksum) {
        fail("staged QA8 result binding mismatch", "ATOMIC");
      }
      const qa8 = (stagedEvidence.suites || []).find((s) => s.suite_id === "QA8");
      if (!qa8 || qa8.run_id !== String(run.id) || qa8.checksum !== checked.checksum) {
        fail("staged evidence QA8 binding mismatch", "ATOMIC");
      }
      if (qa8.artifact_id !== String(artifact.id) || qa8.head_sha !== run.head_sha) {
        fail("staged evidence subject/run/artifact binding mismatch", "ATOMIC");
      }
      const qa9 = (stagedEvidence.suites || []).find((s) => s.suite_id === "QA9");
      if (
        !qa9 ||
        qa9.completion_status !== "STALE" ||
        qa9.epoch_status !== "STALE_AGGREGATION_FOR_CURRENT_EPOCH" ||
        qa9.current_epoch_authoritative !== false ||
        qa9.run_id !== null ||
        qa9.checksum !== null
      ) {
        fail("staged QA9 STALE tuple mismatch", "QA9_STALE");
      }
    },
  });

  if (!readBytes(root, QA9_REL).equals(qa9Before)) {
    fail("QA9 result mutated", "QA9_MUTATION");
  }
  if (!readBytes(root, QA7_REL).equals(qa7Before)) {
    fail("QA7 formal evidence mutated", "QA7_MUTATION");
  }
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  try {
    const out = publishQa8Formal({
      actionsRunId: getArg(argv, "--actions-run-id"),
      artifactDir: getArg(argv, "--artifact-dir"),
      artifactZipPath: getArg(argv, "--artifact-zip"),
      artifactId: getArg(argv, "--artifact-id"),
      artifactDigest: getArg(argv, "--artifact-digest"),
      artifactName: getArg(argv, "--artifact-name"),
      artifactExpiresAt: getArg(argv, "--artifact-expires-at"),
      downloadedZipSha256: getArg(argv, "--artifact-zip")
        ? sha256File(getArg(argv, "--artifact-zip"))
        : getArg(argv, "--downloaded-zip-sha256"),
      headSha: getArg(argv, "--head-sha"),
      headBranch: getArg(argv, "--head-branch"),
      workflowName: getArg(argv, "--workflow-name"),
      workflowPath: getArg(argv, "--workflow-path"),
      event: getArg(argv, "--event"),
      conclusion: getArg(argv, "--conclusion"),
      expectedBaselineId: getArg(argv, "--baseline-id"),
      expectedWorkflowHash: getArg(argv, "--workflow-hash"),
      dryRun: argv.includes("--dry-run") || argv.includes("--validate-only") || !argv.includes("--actual"),
      actual: argv.includes("--actual"),
    });
    console.log("[engine-acceptance:publish-qa8-formal] " + out.status);
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error(`[engine-acceptance:publish-qa8-formal] ABORT — ${e.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { publishQa8Formal, OFFICIAL_RELS, HARNESS_FILES };

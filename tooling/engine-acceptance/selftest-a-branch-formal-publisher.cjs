/**
 * A_BRANCH_FORMAL publisher/verifier hermetic selftest.
 * live governance 파일을 fixture로 변형하지 않는다.
 */
"use strict";

const assert = require("node:assert/strict");
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const {
  GOV,
  FIX_CUR,
  FIX_PRED,
  FIX_WF,
  FIX_PROMPT,
  FIX_EVAL,
  FIX_BRANCH,
  writeJsonAbs,
  seal,
  makeABranchFormalSandbox,
} = require("./lib/qa-checkpoint-fixtures.cjs");
const {
  RESULT_REL,
  EVIDENCE_REL,
  REPORT_REL,
  MANIFEST_STATE_CONFLICT_ROOT_CAUSE,
  CANONICAL_STATE_OWNER,
  verifyIssuedOutputs,
  verifyPreconditions,
} = require("./lib/a-branch-formal.cjs");
const { CURRENT_EPOCH_REBASE_SNAPSHOT: EPOCH_SNAP } = require("./lib/product-rebase.cjs");
const { publishABranchFormal, verifyABranchFormalLive } = require("./publish-a-branch-formal.cjs");

const SUBJECT = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function isolatedGitEnv(repoDir) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  delete env.GIT_OBJECT_DIRECTORY;
  delete env.GIT_ALTERNATE_OBJECT_DIRECTORIES;
  delete env.HUSKY;
  env.GIT_DIR = path.join(repoDir, ".git");
  env.GIT_WORK_TREE = repoDir;
  return env;
}

function gitInRepo(repoDir, args, stdio) {
  return execSync(`git ${args}`, {
    cwd: repoDir,
    encoding: "utf8",
    env: isolatedGitEnv(repoDir),
    stdio: stdio || ["ignore", "pipe", "pipe"],
  });
}

function initGitRepo(dir) {
  fs.mkdirSync(dir, { recursive: true });
  gitInRepo(dir, "init", ["ignore", "ignore", "pipe"]);
  gitInRepo(dir, 'config user.email "a-branch-formal-selftest@example.com"');
  gitInRepo(dir, 'config user.name "a-branch-formal-selftest"');
}

function commitFile(dir, name, body, message) {
  fs.writeFileSync(path.join(dir, name), body);
  gitInRepo(dir, `add ${name}`);
  gitInRepo(dir, `commit -m ${JSON.stringify(message)}`);
  return gitInRepo(dir, "rev-parse HEAD").trim();
}

function snapshot(dir) {
  const out = new Map();
  function walk(rel) {
    const abs = path.join(dir, rel);
    if (!fs.existsSync(abs)) return;
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      for (const name of fs.readdirSync(abs)) walk(path.posix.join(rel, name));
    } else {
      out.set(rel.replace(/\\/g, "/"), fs.readFileSync(abs));
    }
  }
  walk(GOV);
  return out;
}

function unchanged(dir, snap) {
  const now = snapshot(dir);
  if (now.size !== snap.size) return false;
  for (const [rel, buf] of snap.entries()) {
    const next = now.get(rel);
    if (!next || !buf.equals(next)) return false;
  }
  return true;
}

function rejectCode(fn) {
  try {
    fn();
    return null;
  } catch (e) {
    return e.code || e.message;
  }
}

function happyOpts(sb, over = {}) {
  return {
    root: sb.dir,
    expectedBranch: over.branch || FIX_BRANCH,
    expectedSubjectSha: over.subject || SUBJECT,
    expectedQa9RunId: over.qa9RunId || sb.qa9.run_id,
    expectedQa9Checksum: over.qa9Checksum || sb.qa9.checksum,
    expectedBaselineId: over.baselineId || FIX_CUR,
    expectedWorkflowHash: over.workflowHash || FIX_WF,
    expectedPromptHash: over.promptHash || FIX_PROMPT,
    expectedEvalHash: over.evalHash || FIX_EVAL,
    requireIsolatedWorktree: false,
    requireCleanWorktree: false,
    isAncestor: over.isAncestor || ((a, d) => a === SUBJECT && (d === SUBJECT || d === OTHER)),
    resolveHead: over.resolveHead || (() => SUBJECT),
    resolveRemoteHead: over.resolveRemoteHead || (() => SUBJECT),
    issuedAt: over.issuedAt || "2026-08-30T06:00:00.000Z",
    actual: over.actual !== false,
    dryRun: over.dryRun === true,
    failBeforeStaging: over.failBeforeStaging,
    failBeforeReplace: over.failBeforeReplace,
    failDuringReplace: over.failDuringReplace,
    failDuringReplaceAfter: over.failDuringReplaceAfter,
    gitCwd: over.gitCwd,
    ...over.opts,
  };
}

function qaBytes(dir) {
  const out = {};
  for (let i = 1; i <= 9; i += 1) {
    const rel = `${GOV}/qa${i}-result.v1.json`;
    out[rel] = fs.readFileSync(path.join(dir, rel));
  }
  return out;
}

function assertQaBytesFrozen(dir, before) {
  const after = qaBytes(dir);
  for (const rel of Object.keys(before)) {
    assert.ok(before[rel].equals(after[rel]), `${rel} mutated`);
  }
}

function registerChecks(check) {
  check("sandbox_is_isolated_fixture_not_live_gov", () => {
    const src = fs.readFileSync(path.join(__dirname, "selftest-a-branch-formal-publisher.cjs"), "utf8");
    assert.match(src, /makeABranchFormalSandbox/);
    assert.doesNotMatch(src, /copyFileSync\(path\.join\(ROOT/);
    const sb = makeABranchFormalSandbox();
    assert.equal(sb.baseline.id, FIX_CUR);
    assert.equal(sb.evidence.engine_accepted_for_ui, "NOT_ISSUED");
    assert.equal(sb.evidence.a_branch_formal, "NO");
    assert.equal(sb.qa9.engine_accepted_for_ui, "ISSUED");
    assert.equal(sb.evidence.current_epoch.qa9_status, EPOCH_SNAP.qa9_status);
    assert.equal(MANIFEST_STATE_CONFLICT_ROOT_CAUSE, "QA8_PUBLISHER_CURRENT_GATE_FOOTER_LEFT_STALE_AFTER_QA9");
    assert.match(CANONICAL_STATE_OWNER, /current_state/);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("current_official_fixture_preconditions_pass", () => {
    const sb = makeABranchFormalSandbox();
    const pre = verifyPreconditions(sb.dir, happyOpts(sb, { actual: false }));
    assert.equal(pre.qa9.engine_accepted_for_ui, "ISSUED");
    assert.equal(pre.evidence.a_branch_formal, "NO");
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("dry_run_zero_write", () => {
    const sb = makeABranchFormalSandbox();
    const snap = snapshot(sb.dir);
    const before = qaBytes(sb.dir);
    const out = publishABranchFormal(happyOpts(sb, { actual: false, dryRun: true }));
    assert.equal(out.status, "A_BRANCH_FORMAL_VALIDATED");
    assert.equal(out.dry_run, true);
    assert.equal(unchanged(sb.dir, snap), true);
    assertQaBytesFrozen(sb.dir, before);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("actual_atomic_publication_and_state_consistency", () => {
    const sb = makeABranchFormalSandbox();
    const before = qaBytes(sb.dir);
    const epochBefore = JSON.parse(JSON.stringify(sb.evidence.current_epoch));
    const out = publishABranchFormal(happyOpts(sb));
    assert.equal(out.status, "A_BRANCH_FORMAL_PUBLISHED");
    assert.equal(out.a_branch_formal, "YES");
    assert.equal(out.engine_accepted_for_ui, "ISSUED");
    assert.equal(out.rc_formal, "NO");
    assert.equal(out.release_ready, "NO");
    const evidence = JSON.parse(fs.readFileSync(path.join(sb.dir, EVIDENCE_REL), "utf8"));
    const result = JSON.parse(fs.readFileSync(path.join(sb.dir, RESULT_REL), "utf8"));
    const report = fs.readFileSync(path.join(sb.dir, REPORT_REL), "utf8");
    assert.equal(evidence.a_branch_formal, "YES");
    assert.equal(evidence.engine_accepted_for_ui, "ISSUED");
    assert.equal(evidence.rc_formal, "NO");
    assert.equal(evidence.release_ready, "NO");
    assert.equal(evidence.current_state.a_branch_formal, "YES");
    assert.deepEqual(evidence.current_epoch, epochBefore);
    assert.equal(result.a_branch_formal, true);
    assert.equal(result.formal_subject_sha, SUBJECT);
    assert.match(report, /A_BRANCH_FORMAL = YES/);
    assert.match(report, /RC_FORMAL = NO/);
    assert.match(report, /RELEASE_READY = NO/);
    assertQaBytesFrozen(sb.dir, before);
    verifyIssuedOutputs(
      { result, evidence, report },
      {
        contract: {
          branch: FIX_BRANCH,
          formalSubjectSha: SUBJECT,
          qa9RunId: sb.qa9.run_id,
          qa9Checksum: sb.qa9.checksum,
          baselineId: FIX_CUR,
          workflowHash: FIX_WF,
          promptHash: FIX_PROMPT,
          evalHash: FIX_EVAL,
        },
        qa9: sb.qa9,
        epochBefore,
        head: SUBJECT,
        allowSubjectEqualsPublisher: true,
      },
    );
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("historical_snapshot_preserved", () => {
    const sb = makeABranchFormalSandbox();
    publishABranchFormal(happyOpts(sb));
    const evidence = JSON.parse(fs.readFileSync(path.join(sb.dir, EVIDENCE_REL), "utf8"));
    assert.equal(evidence.current_epoch.qa1_qa6_status, "STALE_PENDING_RERUN");
    assert.equal(evidence.current_epoch.qa8_status, "STALE_PENDING_RERUN");
    assert.equal(evidence.current_epoch.qa9_status, "STALE_AGGREGATION_PENDING_DISCOVERY");
    assert.equal(evidence.publication.kind, "official_qa8_formal");
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("idempotent_same_input_rerun", () => {
    const sb = makeABranchFormalSandbox();
    const first = publishABranchFormal(happyOpts(sb));
    assert.equal(first.status, "A_BRANCH_FORMAL_PUBLISHED");
    const snap = snapshot(sb.dir);
    const second = publishABranchFormal(happyOpts(sb));
    assert.equal(second.status, "A_BRANCH_FORMAL_ALREADY_PUBLISHED");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("failure_before_staging_rollback", () => {
    const sb = makeABranchFormalSandbox();
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishABranchFormal(happyOpts(sb, { failBeforeStaging: true })));
    assert.equal(got, "INJECTED_FAIL");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("fail_during_replace_restores_originals", () => {
    const sb = makeABranchFormalSandbox();
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishABranchFormal(happyOpts(sb, { failDuringReplace: true })));
    assert.equal(got, "INJECTED_FAIL");
    assert.equal(unchanged(sb.dir, snap), true);
    assert.equal(fs.existsSync(path.join(sb.dir, RESULT_REL)), false);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("qa9_predecessor_rejected", () => {
    const sb = makeABranchFormalSandbox();
    const qa9 = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/qa9-result.v1.json`), "utf8"));
    qa9.baseline_id = FIX_PRED;
    writeJsonAbs(path.join(sb.dir, `${GOV}/qa9-result.v1.json`), qa9);
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishABranchFormal(happyOpts(sb, { qa9Checksum: qa9.checksum })));
    assert.equal(got, "QA9_PREDECESSOR");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("qa9_checksum_tamper_rejected", () => {
    const sb = makeABranchFormalSandbox();
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishABranchFormal(happyOpts(sb, { qa9Checksum: "f".repeat(64) })));
    assert.equal(got, "QA9_CHECKSUM");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("wrong_branch_rejected", () => {
    const sb = makeABranchFormalSandbox();
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishABranchFormal(happyOpts(sb, { branch: "main" })));
    assert.equal(got, "BRANCH");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("wrong_subject_sha_rejected", () => {
    const sb = makeABranchFormalSandbox();
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishABranchFormal(happyOpts(sb, { subject: OTHER })));
    assert.equal(got, "NOT_ANCESTOR");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("non_ancestor_rejected", () => {
    const sb = makeABranchFormalSandbox();
    const snap = snapshot(sb.dir);
    const got = rejectCode(() =>
      publishABranchFormal(happyOpts(sb, { isAncestor: () => false })),
    );
    assert.equal(got, "NOT_ANCESTOR");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("baseline_workflow_prompt_eval_drift_rejected", () => {
    const sb = makeABranchFormalSandbox();
    const snap = snapshot(sb.dir);
    assert.equal(rejectCode(() => publishABranchFormal(happyOpts(sb, { baselineId: "ea-baseline-other" }))), "BASELINE");
    assert.equal(rejectCode(() => publishABranchFormal(happyOpts(sb, { workflowHash: "aa".repeat(32) }))), "WORKFLOW_HASH");
    assert.equal(rejectCode(() => publishABranchFormal(happyOpts(sb, { promptHash: "bb".repeat(32) }))), "PROMPT_HASH");
    assert.equal(rejectCode(() => publishABranchFormal(happyOpts(sb, { evalHash: "cc".repeat(32) }))), "EVAL_HASH");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("engine_accepted_not_issued_rejected", () => {
    const sb = makeABranchFormalSandbox();
    const qa9 = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/qa9-result.v1.json`), "utf8"));
    qa9.engine_accepted_for_ui = "NOT_ISSUED";
    qa9.verdict = "ENGINE_QA_INCOMPLETE";
    const sealed = seal(qa9);
    writeJsonAbs(path.join(sb.dir, `${GOV}/qa9-result.v1.json`), sealed);
    const ev = JSON.parse(fs.readFileSync(path.join(sb.dir, EVIDENCE_REL), "utf8"));
    ev.verdict = "ENGINE_QA_INCOMPLETE";
    ev.suites = ev.suites.map((s) =>
      s.suite_id === "QA9" ? { ...s, checksum: sealed.checksum, run_id: sealed.run_id } : s,
    );
    writeJsonAbs(path.join(sb.dir, EVIDENCE_REL), ev);
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishABranchFormal(happyOpts(sb, { qa9Checksum: sealed.checksum })));
    assert.equal(got, "ENGINE_ACCEPTED");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("manual_unsigned_formal_flag_rejected", () => {
    const sb = makeABranchFormalSandbox();
    const ev = JSON.parse(fs.readFileSync(path.join(sb.dir, EVIDENCE_REL), "utf8"));
    ev.a_branch_formal = "YES";
    writeJsonAbs(path.join(sb.dir, EVIDENCE_REL), ev);
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishABranchFormal(happyOpts(sb)));
    assert.equal(got, "UNSIGNED");
    assert.equal(unchanged(sb.dir, snap), true);
    const live = rejectCode(() => verifyABranchFormalLive(sb.dir));
    assert.equal(live, "UNSIGNED");
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("publisher_metadata_missing_rejected", () => {
    const sb = makeABranchFormalSandbox();
    publishABranchFormal(happyOpts(sb));
    const result = JSON.parse(fs.readFileSync(path.join(sb.dir, RESULT_REL), "utf8"));
    delete result.publication;
    delete result.publisher_id;
    writeJsonAbs(path.join(sb.dir, RESULT_REL), result);
    const evidence = JSON.parse(fs.readFileSync(path.join(sb.dir, EVIDENCE_REL), "utf8"));
    const report = fs.readFileSync(path.join(sb.dir, REPORT_REL), "utf8");
    const got = rejectCode(() =>
      verifyIssuedOutputs(
        { result, evidence, report },
        {
          contract: {
            branch: FIX_BRANCH,
            formalSubjectSha: SUBJECT,
            qa9RunId: sb.qa9.run_id,
            qa9Checksum: sb.qa9.checksum,
            baselineId: FIX_CUR,
            workflowHash: FIX_WF,
            promptHash: FIX_PROMPT,
            evalHash: FIX_EVAL,
          },
          qa9: JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/qa9-result.v1.json`), "utf8")),
          epochBefore: evidence.current_epoch,
          head: SUBJECT,
          allowSubjectEqualsPublisher: true,
        },
      ),
    );
    assert.equal(got, "PUBLISHER_META");
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("current_state_contradiction_rejected", () => {
    const sb = makeABranchFormalSandbox();
    publishABranchFormal(happyOpts(sb));
    const evidence = JSON.parse(fs.readFileSync(path.join(sb.dir, EVIDENCE_REL), "utf8"));
    evidence.a_branch_formal = "NO";
    writeJsonAbs(path.join(sb.dir, EVIDENCE_REL), evidence);
    const got = rejectCode(() => verifyABranchFormalLive(sb.dir, { allowSubjectEqualsPublisher: true }));
    assert.equal(got, "CURRENT_STATE");
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("rc_formal_true_rejected", () => {
    const sb = makeABranchFormalSandbox();
    const ev = JSON.parse(fs.readFileSync(path.join(sb.dir, EVIDENCE_REL), "utf8"));
    ev.rc_formal = "YES";
    writeJsonAbs(path.join(sb.dir, EVIDENCE_REL), ev);
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishABranchFormal(happyOpts(sb)));
    assert.equal(got, "RC_FORMAL");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("release_ready_true_rejected", () => {
    const sb = makeABranchFormalSandbox();
    const ev = JSON.parse(fs.readFileSync(path.join(sb.dir, EVIDENCE_REL), "utf8"));
    ev.release_ready = "YES";
    writeJsonAbs(path.join(sb.dir, EVIDENCE_REL), ev);
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishABranchFormal(happyOpts(sb)));
    assert.equal(got, "RELEASE_READY");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("qa_evidence_mutation_rejected_and_unchanged_on_success", () => {
    const sb = makeABranchFormalSandbox();
    const before = qaBytes(sb.dir);
    publishABranchFormal(happyOpts(sb));
    assertQaBytesFrozen(sb.dir, before);
    const qa9 = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/qa9-result.v1.json`), "utf8"));
    qa9.notes = ["tampered"];
    writeJsonAbs(path.join(sb.dir, `${GOV}/qa9-result.v1.json`), qa9);
    const got = rejectCode(() =>
      publishABranchFormal(happyOpts(sb, { qa9Checksum: sb.qa9.checksum })),
    );
    assert.ok(got === "QA9_CHECKSUM" || got === "QA9_BINDING");
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("second_different_formalization_rejected", () => {
    const sb = makeABranchFormalSandbox();
    publishABranchFormal(happyOpts(sb));
    const snap = snapshot(sb.dir);
    const got = rejectCode(() =>
      publishABranchFormal(
        happyOpts(sb, {
          subject: OTHER,
          isAncestor: () => true,
          resolveHead: () => OTHER,
          resolveRemoteHead: () => OTHER,
        }),
      ),
    );
    assert.ok(got === "IDEMPOTENT_DIVERGENT" || got === "NOT_ANCESTOR");
    const got2 = rejectCode(() =>
      publishABranchFormal(
        happyOpts(sb, {
          opts: {
            expectedSubjectSha: OTHER,
            isAncestor: () => true,
            resolveHead: () => OTHER,
            resolveRemoteHead: () => OTHER,
          },
        }),
      ),
    );
    assert.equal(got2, "IDEMPOTENT_DIVERGENT");
    const result = JSON.parse(fs.readFileSync(path.join(sb.dir, RESULT_REL), "utf8"));
    assert.equal(result.formal_subject_sha, SUBJECT);
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("cli_git_ancestor_pass_without_injection", () => {
    const sb = makeABranchFormalSandbox();
    const gitDir = path.join(sb.dir, "git-pass");
    initGitRepo(gitDir);
    const subject = commitFile(gitDir, "subject.txt", "s", "subject");
    const head = commitFile(gitDir, "head.txt", "h", "head");
    gitInRepo(gitDir, `branch ${FIX_BRANCH}`);
    gitInRepo(gitDir, `update-ref refs/remotes/origin/${FIX_BRANCH} ${head}`);
    const out = publishABranchFormal(
      happyOpts(sb, {
        subject,
        opts: {
          expectedSubjectSha: subject,
          isAncestor: undefined,
          resolveHead: undefined,
          resolveRemoteHead: undefined,
          gitCwd: gitDir,
          requireIsolatedWorktree: false,
          requireCleanWorktree: false,
        },
      }),
    );
    assert.equal(out.status, "A_BRANCH_FORMAL_PUBLISHED");
    assert.equal(out.formal_subject_sha, subject);
    assert.equal(out.publisher_commit_sha, head);
    assert.notEqual(out.formal_subject_sha, out.publisher_commit_sha);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("cli_non_ancestor_and_git_error_fail_closed", () => {
    const sb = makeABranchFormalSandbox();
    const gitDir = path.join(sb.dir, "git-non");
    initGitRepo(gitDir);
    const subject = commitFile(gitDir, "subject.txt", "s", "subject");
    gitInRepo(gitDir, "checkout --orphan other", ["ignore", "ignore", "pipe"]);
    const head = commitFile(gitDir, "other.txt", "o", "other");
    gitInRepo(gitDir, `update-ref refs/remotes/origin/${FIX_BRANCH} ${head}`);
    const snap = snapshot(sb.dir);
    const got = rejectCode(() =>
      publishABranchFormal(
        happyOpts(sb, {
          subject,
          opts: {
            expectedSubjectSha: subject,
            isAncestor: undefined,
            resolveHead: undefined,
            resolveRemoteHead: undefined,
            gitCwd: gitDir,
            requireIsolatedWorktree: false,
            requireCleanWorktree: false,
          },
        }),
      ),
    );
    assert.equal(got, "NOT_ANCESTOR");
    const empty = path.join(sb.dir, "not-a-git");
    fs.mkdirSync(empty, { recursive: true });
    const got2 = rejectCode(() =>
      publishABranchFormal(
        happyOpts(sb, {
          opts: {
            isAncestor: undefined,
            resolveHead: undefined,
            resolveRemoteHead: undefined,
            gitCwd: empty,
            requireIsolatedWorktree: false,
            requireCleanWorktree: false,
          },
        }),
      ),
    );
    assert.equal(got2, "GIT");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("cli_main_path_uses_git_merge_base_without_injection", () => {
    const src = fs.readFileSync(path.join(__dirname, "publish-a-branch-formal.cjs"), "utf8");
    const lib = fs.readFileSync(path.join(__dirname, "lib/a-branch-formal.cjs"), "utf8");
    assert.match(lib, /git merge-base --is-ancestor/);
    assert.match(lib, /delete env\.GIT_DIR/);
    const main = src.slice(src.indexOf("function main("));
    assert.doesNotMatch(main, /isAncestor\s*:/);
  });
}

function run() {
  const fails = [];
  const names = [];
  const check = (name, fn) => {
    names.push([name, fn]);
  };
  registerChecks(check);

  const execOne = (name, fn) => {
    try {
      fn();
      console.log(`  PASS ${name}`);
    } catch (e) {
      fails.push(`${name}: ${e instanceof Error ? e.message : e}`);
      console.log(`  FAIL ${name}: ${e instanceof Error ? e.message : e}`);
    }
  };

  console.log("[selftest-a-branch-formal-publisher] start forward");
  for (const [name, fn] of names) execOne(name, fn);
  console.log("[selftest-a-branch-formal-publisher] start reverse");
  for (const [name, fn] of names.slice().reverse()) execOne(`rev:${name}`, fn);

  if (fails.length) {
    console.error("[selftest-a-branch-formal-publisher] FAIL");
    for (const f of fails) console.error(" -", f);
    throw new Error(fails.join("; "));
  }
  console.log("[selftest-a-branch-formal-publisher] PASS");
  return { ok: true };
}

if (require.main === module) {
  run();
}

module.exports = { run };

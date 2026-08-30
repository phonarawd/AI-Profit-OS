/**
 * QA8 formal publisher — provenance + atomicity selftest.
 * live governance 파일을 fixture로 쓰지 않는다.
 * Actions dispatch / publisher actual on live / evidence publication 없음.
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { GOV, FIX_CUR, FIX_WF, FIX_BRANCH, seal, writeJsonAbs, makeQa8FormalSandbox, copyRels } = require("./lib/qa-checkpoint-fixtures.cjs");
const {
  OFFICIAL_QA8_ARTIFACT,
  OFFICIAL_QA8_WORKFLOW_NAME,
  OFFICIAL_QA8_WORKFLOW_PATH,
  AGGREGATOR_ARTIFACT,
  REPO,
} = require("./lib/qa8-github-provenance.cjs");
const { publishQa8Formal, OFFICIAL_RELS } = require("./publish-qa8-formal.cjs");

const HEAD = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SUBJECT = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const RUN_ID = "9008008008";
const ART_ID = "8008008008";
const DIGEST = "c".repeat(64);
const EXPIRES = "2099-01-01T00:00:00.000Z";
const CREATED = "2026-08-30T00:00:00.000Z";

function writeArtifactDir(dir, result, harnessOver = {}) {
  writeJsonAbs(path.join(dir, `${GOV}/qa8-result.v1.json`), result);
  if (harnessOver.omitHarness) return;
  writeJsonAbs(path.join(dir, "qa8-adversarial/qa8-adversarial.v1.json"), {
    schema: harnessOver.schema || "harness.qa8-adversarial.v1",
    non_canonical: harnessOver.non_canonical !== false,
    does_not_replace_qa8_result: harnessOver.does_not_replace_qa8_result !== false,
    harness_status: harnessOver.harness_status || "PASS",
    measuredAt: "2026-08-30T00:00:00.000Z",
  });
  if (!harnessOver.omitInventory) {
    writeJsonAbs(path.join(dir, "qa8-adversarial/admin-route-inventory.v1.json"), {
      controller_count: 1,
      route_count: 1,
    });
  }
}

function makeQa8Result(over = {}) {
  const world = {
    check_id: "QA8_SECURITY_PRIVACY_WORLD",
    status: over.worldStatus || "PASS",
    mode: over.mode || "full",
    counts: over.counts || { pass: 6, fail: 0, blocked: 0, total: 6 },
    critical_invariant: { failed: 0, blocked: 0, skipped: 0, uncovered: 0 },
    checks: [{ check_id: "QA8_ADMIN_BOUNDARY", status: "PASS", critical: true }],
  };
  const result = {
    schema: "governance.engine-acceptance.qa8-result.v1",
    version: "1.0.0",
    suite_id: "QA8",
    run_id: "qa8-security-privacy-fixture",
    baseline_id: over.baseline_id || FIX_CUR,
    mode: over.mode || "full",
    completion_status: over.completion_status || "COMPLETE",
    checks: { security_privacy_world: world },
    critical_invariant: world.critical_invariant,
    critical_invariant_cumulative: over.crit || {
      failed: 0,
      blocked: 0,
      skipped: 0,
      uncovered: 0,
    },
    all_checks_pass: over.all_checks_pass !== false,
    defects_counts: over.defects_counts || { P0: 0, P1: 0, P2: 0, P3: 0 },
    engine_accepted_for_ui: "NOT_ISSUED",
    next: "QA9_ACCEPTANCE_REPORT",
    ...(over.extra || {}),
  };
  return seal(result);
}

function officialRun(over = {}) {
  return {
    id: RUN_ID,
    name: OFFICIAL_QA8_WORKFLOW_NAME,
    path: OFFICIAL_QA8_WORKFLOW_PATH,
    event: "workflow_dispatch",
    conclusion: "success",
    status: "completed",
    run_attempt: 1,
    head_sha: HEAD,
    head_branch: FIX_BRANCH,
    repository: REPO,
    html_url: `https://github.com/${REPO}/actions/runs/${RUN_ID}`,
    ...over,
  };
}

function officialArtifact(over = {}) {
  return {
    id: ART_ID,
    name: OFFICIAL_QA8_ARTIFACT,
    digest: `sha256:${DIGEST}`,
    expires_at: EXPIRES,
    created_at: CREATED,
    expired: false,
    workflow_run: { id: RUN_ID },
    ...over,
  };
}

function officialJobs(over = {}) {
  if (over.jobs) return over.jobs;
  return [
    { name: "qa0-baseline", conclusion: "success", status: "completed", run_attempt: 1 },
    { name: "qa1-deterministic", conclusion: "skipped", status: "completed", run_attempt: 1 },
    { name: "qa2-synthetic-personas", conclusion: "skipped", status: "completed", run_attempt: 1 },
    {
      name: over.qa8Name || "qa-matrix (QA8)",
      conclusion: over.qa8Conclusion || "success",
      status: over.qa8Status || "completed",
      run_attempt: 1,
    },
    { name: "qa7-ai-eval", conclusion: "skipped", status: "completed", run_attempt: 1 },
    { name: "qa8-adversarial", conclusion: "skipped", status: "completed", run_attempt: 1 },
    { name: "aggregator", conclusion: "success", status: "completed", run_attempt: 1 },
    ...(over.extraJobs || []),
  ];
}

function makeGh(over = {}) {
  const run = over.run === undefined ? officialRun(over.runOver) : over.run;
  const artifact = over.artifact === undefined ? officialArtifact(over.artOver) : over.artifact;
  const jobs = officialJobs(over);
  return {
    getRun(id) {
      if (String(id) !== String(RUN_ID)) return null;
      return run;
    },
    getArtifact(id) {
      if (String(id) !== String(ART_ID)) return null;
      return artifact;
    },
    listJobs(id) {
      if (String(id) !== String(RUN_ID)) return null;
      return jobs;
    },
  };
}

function snapshot(root) {
  const out = {};
  for (const rel of copyRels()) {
    const abs = path.join(root, rel);
    out[rel] = fs.existsSync(abs) ? fs.readFileSync(abs) : null;
  }
  return out;
}

function unchanged(root, snap) {
  for (const rel of Object.keys(snap)) {
    const abs = path.join(root, rel);
    const now = fs.existsSync(abs) ? fs.readFileSync(abs) : null;
    if (snap[rel] == null && now == null) continue;
    if (snap[rel] == null || now == null || !snap[rel].equals(now)) return false;
  }
  return true;
}

function happyOpts(sandbox, extra = {}) {
  const result = extra.result || makeQa8Result(extra.resultOver || {});
  const artDir = extra.artDir || path.join(sandbox.dir, "artifact");
  if (!extra.skipWriteArtifact) writeArtifactDir(artDir, result, extra.harnessOver || {});
  return {
    root: sandbox.dir,
    actionsRunId: RUN_ID,
    artifactId: ART_ID,
    artifactDir: artDir,
    headSha: HEAD,
    headBranch: FIX_BRANCH,
    downloadedZipSha256: DIGEST,
    githubClient: extra.githubClient || makeGh(extra.ghOver || {}),
    nowMs: Date.parse("2026-08-30T00:00:00.000Z"),
    publishedAt: "2026-08-30T00:00:00.000Z",
    actual: extra.actual !== false,
    isAncestor: extra.isAncestor || ((a, d) => a === SUBJECT && d === HEAD),
    dual: { working_tree_clean: true, protected_scope_clean: true },
    ...extra.opts,
  };
}

function rejectCode(fn) {
  try {
    fn();
    return null;
  } catch (e) {
    return e.code || e.message;
  }
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

  console.log("[selftest-qa8-formal-publisher] start");

  check("sandbox_is_isolated_fixture_not_live_gov", () => {
    const src = fs.readFileSync(path.join(__dirname, "selftest-qa8-formal-publisher.cjs"), "utf8");
    assert.match(src, /makeQa8FormalSandbox/);
    assert.doesNotMatch(src, /copyFileSync\(path\.join\(ROOT/);
    const sb = makeQa8FormalSandbox();
    const baseline = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/baseline.v1.json`), "utf8"));
    assert.equal(baseline.id, FIX_CUR);
    assert.equal(baseline.acceptance_workflow_hash, FIX_WF);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("official_owned_run_qa8_cell_only_atomic_publish", () => {
    const sb = makeQa8FormalSandbox();
    const qa7Before = fs.readFileSync(path.join(sb.dir, `${GOV}/qa7-result.v1.json`));
    const qa9Before = fs.readFileSync(path.join(sb.dir, `${GOV}/qa9-result.v1.json`));
    const out = publishQa8Formal(happyOpts(sb));
    assert.equal(out.status, "QA8_FORMAL_PUBLISHED");
    assert.equal(out.engine_accepted_for_ui, "NOT_ISSUED");
    assert.equal(out.a_branch_formal, "NO");
    assert.equal(out.release_ready, "NO");
    assert.deepEqual(out.owned_outputs, OFFICIAL_RELS);
    const evidence = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), "utf8"));
    const qa8 = evidence.suites.find((s) => s.suite_id === "QA8");
    const qa9 = evidence.suites.find((s) => s.suite_id === "QA9");
    const qa7 = evidence.suites.find((s) => s.suite_id === "QA7");
    assert.equal(qa8.completion_status, "COMPLETE");
    assert.equal(qa8.run_id, RUN_ID);
    assert.equal(qa8.artifact_id, ART_ID);
    assert.equal(qa8.head_sha, HEAD);
    assert.equal(qa9.completion_status, "STALE");
    assert.equal(qa9.epoch_status, "STALE_AGGREGATION_FOR_CURRENT_EPOCH");
    assert.equal(qa9.current_epoch_authoritative, false);
    assert.equal(qa9.run_id, null);
    assert.equal(qa9.checksum, null);
    assert.equal(qa7.run_id, "9001002003");
    assert.equal(evidence.next, "QA9_ACCEPTANCE_REPORT");
    assert.equal(evidence.engine_accepted_for_ui, "NOT_ISSUED");
    assert.equal(evidence.a_branch_formal, "NO");
    assert.ok(qa7Before.equals(fs.readFileSync(path.join(sb.dir, `${GOV}/qa7-result.v1.json`))));
    assert.ok(qa9Before.equals(fs.readFileSync(path.join(sb.dir, `${GOV}/qa9-result.v1.json`))));
    const report = fs.readFileSync(path.join(sb.dir, `${GOV}/ENGINE_ACCEPTANCE_REPORT.md`), "utf8");
    assert.match(report, /A_BRANCH_FORMAL = NO/);
    assert.match(report, /ENGINE_ACCEPTED_FOR_UI = NOT_ISSUED/);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  const negatives = [
    ["nonexistent_run", { ghOver: { run: null } }, "RUN_ID"],
    ["wrong_workflow", { ghOver: { runOver: { name: "gate", path: ".github/workflows/gate.yml" } } }, "RUN_WORKFLOW"],
    ["wrong_event", { ghOver: { runOver: { event: "push" } } }, "RUN_EVENT"],
    ["failed_run", { ghOver: { runOver: { conclusion: "failure" } } }, "RUN_CONCLUSION"],
    ["cancelled_run", { ghOver: { runOver: { conclusion: "cancelled" } } }, "RUN_CONCLUSION"],
    ["wrong_head_sha", { ghOver: { runOver: { head_sha: "d".repeat(40) } } }, "RUN_SHA"],
    ["wrong_branch", { ghOver: { runOver: { head_branch: "main" } } }, "RUN_BRANCH"],
    ["run_attempt_gt_1", { ghOver: { runOver: { run_attempt: 2 } } }, "RUN_ATTEMPT"],
    [
      "qa3_unexpected_execution",
      { ghOver: { extraJobs: [{ name: "qa-matrix (QA3)", conclusion: "success", status: "completed", run_attempt: 1 }] } },
      "MATRIX_SUITE",
    ],
    [
      "standalone_adversarial_executed",
      {
        ghOver: {
          jobs: officialJobs({}).map((j) =>
            j.name === "qa8-adversarial" ? { ...j, conclusion: "success" } : j,
          ),
        },
      },
      "STANDALONE_ADVERSARIAL",
    ],
    ["qa8_job_skipped", { ghOver: { qa8Conclusion: "skipped" } }, "QA8_JOB_SKIPPED"],
    ["artifact_other_run", { ghOver: { artOver: { workflow_run: { id: "1" } } } }, "ARTIFACT_RUN"],
    ["wrong_artifact_name", { ghOver: { artOver: { name: "engine-acceptance-QA7-raw-traces" } } }, "ARTIFACT_NAME"],
    ["expired_artifact", { ghOver: { artOver: { expired: true } } }, "ARTIFACT_EXPIRED"],
    ["missing_digest", { ghOver: { artOver: { digest: null } } }, "ARTIFACT_DIGEST_MISSING"],
    ["digest_mismatch", { opts: { downloadedZipSha256: "e".repeat(64) } }, "ARTIFACT_DIGEST"],
    ["aggregator_artifact", { ghOver: { artOver: { name: AGGREGATOR_ARTIFACT } } }, "AGGREGATOR_ARTIFACT"],
  ];

  for (const [name, extra, code] of negatives) {
    check(name, () => {
      const sb = makeQa8FormalSandbox();
      const snap = snapshot(sb.dir);
      const got = rejectCode(() => publishQa8Formal(happyOpts(sb, extra)));
      assert.equal(got, code, `expected ${code} got ${got}`);
      assert.equal(unchanged(sb.dir, snap), true);
      fs.rmSync(sb.dir, { recursive: true, force: true });
    });
  }

  check("qa7_unexpected_execution", () => {
    const sb = makeQa8FormalSandbox();
    const snap = snapshot(sb.dir);
    const jobs = officialJobs({}).map((j) =>
      j.name === "qa7-ai-eval" ? { ...j, conclusion: "success" } : j,
    );
    const got = rejectCode(() => publishQa8Formal(happyOpts(sb, { ghOver: { jobs } })));
    assert.equal(got, "UNEXPECTED_SUITE");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("missing_qa8_result", () => {
    const sb = makeQa8FormalSandbox();
    const snap = snapshot(sb.dir);
    const artDir = path.join(sb.dir, "artifact-empty");
    fs.mkdirSync(artDir, { recursive: true });
    const got = rejectCode(() =>
      publishQa8Formal(happyOpts(sb, { artDir, skipWriteArtifact: true })),
    );
    assert.equal(got, "QA8_RESULT_MISSING");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("missing_adversarial_harness", () => {
    const sb = makeQa8FormalSandbox();
    const snap = snapshot(sb.dir);
    const got = rejectCode(() =>
      publishQa8Formal(happyOpts(sb, { harnessOver: { omitHarness: true } })),
    );
    assert.equal(got, "HARNESS_MISSING");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("wrong_baseline_or_workflow_hash", () => {
    const sb = makeQa8FormalSandbox();
    const snap = snapshot(sb.dir);
    const got = rejectCode(() =>
      publishQa8Formal(happyOpts(sb, { resultOver: { baseline_id: "ea-baseline-other" } })),
    );
    assert.equal(got, "QA8_BASELINE");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("qa7_predecessor_binding_mismatch", () => {
    const sb = makeQa8FormalSandbox();
    const snap = snapshot(sb.dir);
    const qa7 = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/qa7-result.v1.json`), "utf8"));
    qa7.run_id = "1";
    writeJsonAbs(path.join(sb.dir, `${GOV}/qa7-result.v1.json`), qa7);
    snap[`${GOV}/qa7-result.v1.json`] = fs.readFileSync(path.join(sb.dir, `${GOV}/qa7-result.v1.json`));
    const got = rejectCode(() => publishQa8Formal(happyOpts(sb)));
    assert.equal(got, "QA7_PREDECESSOR");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("fail_blocked_skipped_uncovered", () => {
    const sb = makeQa8FormalSandbox();
    const snap = snapshot(sb.dir);
    const got = rejectCode(() =>
      publishQa8Formal(
        happyOpts(sb, {
          resultOver: { counts: { pass: 4, fail: 1, blocked: 0, total: 5 }, all_checks_pass: false, worldStatus: "FAIL" },
        }),
      ),
    );
    assert.ok(got === "QA8_WORLD" || got === "QA8_FAIL" || got === "QA8_CHECKS");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("p0_p1_finding", () => {
    const sb = makeQa8FormalSandbox();
    const snap = snapshot(sb.dir);
    const got = rejectCode(() =>
      publishQa8Formal(happyOpts(sb, { resultOver: { defects_counts: { P0: 1, P1: 0, P2: 0, P3: 0 } } })),
    );
    assert.equal(got, "QA8_FINDING");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("retry_flaky", () => {
    const sb = makeQa8FormalSandbox();
    const snap = snapshot(sb.dir);
    const got = rejectCode(() =>
      publishQa8Formal(happyOpts(sb, { resultOver: { extra: { flaky: true } } })),
    );
    assert.equal(got, "RETRY_FLAKY");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("qa9_not_started", () => {
    const sb = makeQa8FormalSandbox();
    const evidence = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), "utf8"));
    evidence.suites = evidence.suites.map((s) =>
      s.suite_id === "QA9" ? { ...s, completion_status: "NOT_STARTED" } : s,
    );
    writeJsonAbs(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), evidence);
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishQa8Formal(happyOpts(sb)));
    assert.equal(got, "QA9_STALE");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("qa9_early_complete", () => {
    const sb = makeQa8FormalSandbox();
    const evidence = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), "utf8"));
    evidence.suites = evidence.suites.map((s) =>
      s.suite_id === "QA9" ? { ...s, completion_status: "COMPLETE", run_id: "x", checksum: "y" } : s,
    );
    writeJsonAbs(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), evidence);
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishQa8Formal(happyOpts(sb)));
    assert.equal(got, "QA9_STALE");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("qa9_authoritative_true", () => {
    const sb = makeQa8FormalSandbox();
    const evidence = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), "utf8"));
    evidence.suites = evidence.suites.map((s) =>
      s.suite_id === "QA9" ? { ...s, current_epoch_authoritative: true } : s,
    );
    writeJsonAbs(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), evidence);
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishQa8Formal(happyOpts(sb)));
    assert.equal(got, "QA9_STALE");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("qa9_run_id_or_checksum_present", () => {
    const sb = makeQa8FormalSandbox();
    const evidence = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), "utf8"));
    evidence.suites = evidence.suites.map((s) =>
      s.suite_id === "QA9" ? { ...s, run_id: "qa9-now", checksum: "abc" } : s,
    );
    writeJsonAbs(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), evidence);
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishQa8Formal(happyOpts(sb)));
    assert.equal(got, "QA9_STALE");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("failure_before_staging_zero_write", () => {
    const sb = makeQa8FormalSandbox();
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishQa8Formal(happyOpts(sb, { opts: { failBeforeStaging: true } })));
    assert.equal(got, "INJECTED_FAIL");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("failure_after_staging_zero_write", () => {
    const sb = makeQa8FormalSandbox();
    const snap = snapshot(sb.dir);
    const got = rejectCode(() => publishQa8Formal(happyOpts(sb, { opts: { failBeforeReplace: true } })));
    assert.equal(got, "INJECTED_FAIL");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("failure_during_replace_full_restore", () => {
    const sb = makeQa8FormalSandbox();
    const snap = snapshot(sb.dir);
    const got = rejectCode(() =>
      publishQa8Formal(happyOpts(sb, { opts: { failDuringReplace: true, failDuringReplaceAfter: 0 } })),
    );
    assert.equal(got, "INJECTED_FAIL");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("dry_run_zero_write", () => {
    const sb = makeQa8FormalSandbox();
    const snap = snapshot(sb.dir);
    const out = publishQa8Formal(happyOpts(sb, { actual: false, opts: { actual: false, dryRun: true } }));
    assert.equal(out.status, "QA8_FORMAL_VALIDATED");
    assert.equal(out.dry_run, true);
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("publisher_cannot_issue_ui_gate_or_a_branch_formal", () => {
    const sb = makeQa8FormalSandbox();
    const out = publishQa8Formal(happyOpts(sb));
    assert.equal(out.engine_accepted_for_ui, "NOT_ISSUED");
    assert.equal(out.a_branch_formal, "NO");
    const evidence = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), "utf8"));
    assert.notEqual(evidence.verdict, "ENGINE_ACCEPTED_FOR_UI");
    assert.equal(evidence.a_branch_formal, "NO");
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("idempotent_same_run_artifact", () => {
    const sb = makeQa8FormalSandbox();
    const first = publishQa8Formal(happyOpts(sb));
    assert.equal(first.status, "QA8_FORMAL_PUBLISHED");
    const snap = snapshot(sb.dir);
    const second = publishQa8Formal(happyOpts(sb, { skipWriteArtifact: true, artDir: path.join(sb.dir, "artifact") }));
    assert.equal(second.status, "QA8_FORMAL_ALREADY_PUBLISHED");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("qa9_result_bytes_unchanged_on_success", () => {
    const sb = makeQa8FormalSandbox();
    const before = fs.readFileSync(path.join(sb.dir, `${GOV}/qa9-result.v1.json`));
    publishQa8Formal(happyOpts(sb));
    const after = fs.readFileSync(path.join(sb.dir, `${GOV}/qa9-result.v1.json`));
    assert.ok(before.equals(after));
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  if (fails.length) {
    console.error("[selftest-qa8-formal-publisher] FAIL");
    for (const f of fails) console.error(" -", f);
    throw new Error(fails.join("; "));
  }
  console.log("[selftest-qa8-formal-publisher] PASS");
  return { ok: true };
}

if (require.main === module) {
  run();
}

module.exports = { run };

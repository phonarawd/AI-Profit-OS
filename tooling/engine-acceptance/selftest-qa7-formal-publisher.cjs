/**
 * QA7 formal publisher — provenance + atomicity selftest.
 * 실제 GitHub / publication / Actions 호출 없음.
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { ROOT } = require("./lib/hash-scope.cjs");
const { buildQa7TraceArtifact } = require("./lib/qa7-trace.cjs");
const {
  OFFICIAL_QA7_ARTIFACT,
  OFFICIAL_QA7_WORKFLOW_NAME,
  OFFICIAL_QA7_WORKFLOW_PATH,
  AGGREGATOR_ARTIFACT,
} = require("./lib/qa7-github-provenance.cjs");
const { publishQa7Formal } = require("./publish-qa7-formal.cjs");
const {
  evaluatePublicationInheritance,
  isInheritanceAllowed,
  SAME_SHA,
  DENY,
} = require("./lib/publication-sha-inheritance.cjs");

const GOV = "governance/engine-acceptance";
const COPY_RELS = [
  `${GOV}/baseline.v1.json`,
  `${GOV}/evidence-manifest.v1.json`,
  `${GOV}/ENGINE_ACCEPTANCE_REPORT.md`,
  `${GOV}/qa6-result.v1.json`,
  `${GOV}/qa7-result.v1.json`,
  `${GOV}/qa8-result.v1.json`,
  `${GOV}/qa9-result.v1.json`,
];

const HEAD = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SUBJECT = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const RUN_ID = "9001002003";
const ART_ID = "8001002003";
const DIGEST = "c".repeat(64);
const BRANCH = "rel502/a-502-1-p-help-fail-closed";
const EXPIRES = "2099-01-01T00:00:00.000Z";

function writeJsonAbs(abs, obj) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function makeTraceBody() {
  return {
    schema: "ai-answer-trace.v1",
    intent: "test",
    lane: "S",
    facts_used: [],
    tools_called: [],
    provider_id: "none",
    answer_path: "refuse_s",
    guard_result: { status: "pass" },
    createdAt: "2026-08-30T00:00:00.000Z",
  };
}

function uuid(n) {
  const hex = String(n).padStart(12, "0");
  return `11111111-1111-4111-8111-${hex}`;
}

function makeCases(n) {
  return Array.from({ length: n }, (_, i) => `case_${String(i + 1).padStart(2, "0")}`);
}

function writeArtifactDir(dir, baseline, caseIds, over = {}) {
  const traces = [];
  for (let i = 0; i < caseIds.length; i += 1) {
    const id = caseIds[i];
    const art = buildQa7TraceArtifact({
      run_id: "qa7-harness-fixture",
      baseline_id: over.traceBaselineId || baseline.id,
      case_id: id,
      dataset_file: "eval/s_refuse.jsonl",
      eval_dataset_hash: baseline.eval_dataset_hash,
      prompt_hash: baseline.prompt_hash,
      ai_log: makeTraceBody(),
      answer_text: "출금·지급은 제가 대신 실행할 수 없어요.",
      canonical_trace: over.canonical_trace !== false,
      fixture_only: over.fixture_only === true,
      trace_id_provenance: over.trace_id_provenance || "RUNTIME",
      trace_id: over.traceIds && over.traceIds[i] ? over.traceIds[i] : uuid(i + 1),
      model_executed: true,
      invocation_seam: "http_post_me_peotteok_chat",
    });
    if (over.traceHeadSha) art.head_sha = over.traceHeadSha;
    traces.push(art);
    writeJsonAbs(path.join(dir, `${id}.trace.json`), art);
  }
  const counts = over.counts || {
    total: caseIds.length,
    pass: caseIds.length,
    fail: 0,
    blocked: 0,
    graded: caseIds.length,
  };
  const summary = {
    run_id: "qa7-harness-fixture",
    baseline_id: over.summaryBaselineId || baseline.id,
    mode: "full",
    suite_status: over.suite_status || "PASS",
    measured_at: "2026-08-30T00:00:00.000Z",
    counts,
    case_results: caseIds.map((id, i) => ({
      case_id: id,
      status: over.blockedIndex === i ? "BLOCKED" : "PASS",
    })),
    trace_id_provenance: "RUNTIME",
    no_expectation_leakage: true,
    no_fake_trace: over.no_fake_trace !== false,
    canonical_http_execution: true,
    eval_gate: { pass: true },
    hashes: {
      pinned: {
        acceptance_workflow_hash: baseline.acceptance_workflow_hash,
        prompt_hash: baseline.prompt_hash,
        eval_dataset_hash: baseline.eval_dataset_hash,
      },
    },
    invocation_seam: "http_post_me_peotteok_chat",
    ...(over.summaryExtra || {}),
  };
  writeJsonAbs(path.join(dir, "qa7-local-summary.json"), summary);
  return { dir, traces, summary };
}

function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aipo-qa7-formal-"));
  for (const rel of COPY_RELS) {
    const dest = path.join(dir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, rel), dest);
  }
  const evidence = JSON.parse(fs.readFileSync(path.join(dir, `${GOV}/evidence-manifest.v1.json`), "utf8"));
  const baseline = JSON.parse(fs.readFileSync(path.join(dir, `${GOV}/baseline.v1.json`), "utf8"));
  evidence.suites = (evidence.suites || []).map((s) => {
    if (["QA4", "QA5", "QA6"].includes(s.suite_id)) {
      return { ...s, completion_status: "COMPLETE", baseline_id: baseline.id };
    }
    if (s.suite_id === "QA7") {
      return { ...s, completion_status: "NOT_STARTED", run_id: null, checksum: null };
    }
    if (s.suite_id === "QA8") {
      return { ...s, completion_status: "STALE" };
    }
    if (s.suite_id === "QA9") {
      return { ...s, completion_status: "STALE" };
    }
    return s;
  });
  writeJsonAbs(path.join(dir, `${GOV}/evidence-manifest.v1.json`), evidence);
  return { dir, baseline, evidence };
}

function snapshotOfficial(root) {
  const out = {};
  for (const rel of COPY_RELS) {
    out[rel] = fs.readFileSync(path.join(root, rel));
  }
  return out;
}

function unchanged(root, snap) {
  for (const rel of COPY_RELS) {
    if (!fs.readFileSync(path.join(root, rel)).equals(snap[rel])) return false;
  }
  return true;
}

function officialRun(over = {}) {
  return {
    id: RUN_ID,
    name: OFFICIAL_QA7_WORKFLOW_NAME,
    path: OFFICIAL_QA7_WORKFLOW_PATH,
    event: "workflow_dispatch",
    conclusion: "success",
    head_sha: HEAD,
    head_branch: BRANCH,
    status: "completed",
    html_url: `https://github.com/phonarawd/AI-Profit-OS/actions/runs/${RUN_ID}`,
    ...over,
  };
}

function officialArtifact(over = {}) {
  return {
    id: ART_ID,
    name: OFFICIAL_QA7_ARTIFACT,
    digest: `sha256:${DIGEST}`,
    expires_at: EXPIRES,
    expired: false,
    workflow_run: { id: RUN_ID },
    ...over,
  };
}

function makeGh(over = {}) {
  const run = over.run === undefined ? officialRun(over.runOver) : over.run;
  const artifact = over.artifact === undefined ? officialArtifact(over.artOver) : over.artifact;
  const jobs = over.jobs === undefined
    ? [{ name: "qa7-ai-eval", conclusion: "success", status: "completed" }]
    : over.jobs;
  return {
    getRun(id) {
      if (over.throwRun) {
        const e = new Error("network down");
        e.code = "GITHUB_API_UNAVAILABLE";
        throw e;
      }
      if (String(id) !== String(RUN_ID)) return null;
      return run;
    },
    getArtifact(id) {
      if (over.throwArtifact) {
        const e = new Error("network down");
        e.code = "GITHUB_API_UNAVAILABLE";
        throw e;
      }
      if (String(id) !== String(ART_ID)) return null;
      return artifact;
    },
    listJobs(id) {
      if (over.throwJobs) {
        const e = new Error("network down");
        e.code = "GITHUB_API_UNAVAILABLE";
        throw e;
      }
      if (String(id) !== String(RUN_ID)) return null;
      return jobs;
    },
  };
}

function happyOpts(sandbox, extra = {}) {
  const caseIds = extra.caseIds || makeCases(2);
  const artDir = extra.artDir || writeArtifactDir(
    path.join(sandbox.dir, "artifact"),
    sandbox.baseline,
    caseIds,
    extra.artOver || {},
  ).dir;
  return {
    root: sandbox.dir,
    actionsRunId: RUN_ID,
    artifactId: ART_ID,
    artifactDir: artDir,
    headSha: HEAD,
    headBranch: BRANCH,
    downloadedZipSha256: DIGEST,
    githubClient: extra.githubClient || makeGh(),
    nowMs: Date.parse("2026-08-30T00:00:00.000Z"),
    publishedAt: "2026-08-30T00:00:00.000Z",
    dataset: {
      count: caseIds.length,
      rows: caseIds.map((id) => ({ id })),
    },
    precheck: {
      ok: true,
      findings: [],
      hashes: {
        prompt_hash: "MATCH",
        eval_dataset_hash: "MATCH",
        acceptance_workflow_hash: "MATCH",
        pinned: {
          acceptance_workflow_hash: sandbox.baseline.acceptance_workflow_hash,
          prompt_hash: sandbox.baseline.prompt_hash,
          eval_dataset_hash: sandbox.baseline.eval_dataset_hash,
        },
      },
      baseline: sandbox.baseline,
    },
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

  console.log("[selftest-qa7-formal-publisher] start");

  check("official_run_owned_artifact_matching_digest_pass", () => {
    const sb = makeSandbox();
    const snap = snapshotOfficial(sb.dir);
    const out = publishQa7Formal(happyOpts(sb));
    assert.equal(out.status, "QA7_FORMAL_PUBLISHED");
    assert.equal(out.run_id, RUN_ID);
    assert.equal(out.artifact_id, ART_ID);
    assert.equal(out.head_sha, HEAD);
    assert.equal(out.engine_accepted_for_ui, "NOT_ISSUED");
    const result = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/qa7-result.v1.json`), "utf8"));
    const evidence = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), "utf8"));
    const report = fs.readFileSync(path.join(sb.dir, `${GOV}/ENGINE_ACCEPTANCE_REPORT.md`), "utf8");
    const qa7 = evidence.suites.find((s) => s.suite_id === "QA7");
    assert.equal(result.actions.run_id, RUN_ID);
    assert.equal(result.actions.head_sha, HEAD);
    assert.equal(result.actions.conclusion, "success");
    assert.equal(result.actions.event, "workflow_dispatch");
    assert.equal(String(result.artifact.artifact_id), ART_ID);
    assert.equal(result.artifact.digest, DIGEST);
    assert.equal(qa7.run_id, RUN_ID);
    assert.equal(qa7.artifact_id, ART_ID);
    assert.equal(qa7.head_sha, HEAD);
    assert.equal(qa7.checksum, result.checksum);
    assert.ok(report.includes(RUN_ID));
    assert.ok(report.includes(result.checksum));
    assert.equal(unchanged(sb.dir, snap), false);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  const negatives = [
    ["nonexistent_run", { githubClient: makeGh({ run: null }) }, "RUN_ID"],
    ["wrong_workflow", { githubClient: makeGh({ runOver: { name: "gate", path: ".github/workflows/gate.yml" } }) }, "RUN_WORKFLOW"],
    ["non_workflow_dispatch", { githubClient: makeGh({ runOver: { event: "push" } }) }, "RUN_EVENT"],
    ["failed_run", { githubClient: makeGh({ runOver: { conclusion: "failure" } }) }, "RUN_CONCLUSION"],
    ["cancelled_run", { githubClient: makeGh({ runOver: { conclusion: "cancelled" } }) }, "RUN_CONCLUSION"],
    ["wrong_head_sha", { githubClient: makeGh({ runOver: { head_sha: "d".repeat(40) } }) }, "RUN_SHA"],
    ["wrong_branch", { githubClient: makeGh({ runOver: { head_branch: "main" } }) }, "RUN_BRANCH"],
    ["artifact_other_run", { githubClient: makeGh({ artOver: { workflow_run: { id: "1" } } }) }, "ARTIFACT_RUN"],
    ["wrong_artifact_name", { githubClient: makeGh({ artOver: { name: "engine-acceptance-QA7" } }) }, "ARTIFACT_NAME"],
    ["expired_artifact", { githubClient: makeGh({ artOver: { expired: true } }) }, "ARTIFACT_EXPIRED"],
    ["missing_digest", { githubClient: makeGh({ artOver: { digest: null } }) }, "ARTIFACT_DIGEST_MISSING"],
    ["digest_mismatch", { opts: { downloadedZipSha256: "e".repeat(64) } }, "ARTIFACT_DIGEST"],
    ["aggregator_artifact", { githubClient: makeGh({ artOver: { name: AGGREGATOR_ARTIFACT } }) }, "AGGREGATOR_ARTIFACT"],
    ["local_only_artifact", { githubClient: makeGh({ artOver: { name: "engine-acceptance-QA7-raw-traces-local", local_only: true } }) }, "LOCAL_ARTIFACT"],
  ];

  for (const [name, extra, code] of negatives) {
    check(name, () => {
      const sb = makeSandbox();
      const snap = snapshotOfficial(sb.dir);
      const got = rejectCode(() => publishQa7Formal(happyOpts(sb, extra)));
      assert.equal(got, code, `expected ${code} got ${got}`);
      assert.equal(unchanged(sb.dir, snap), true);
      fs.rmSync(sb.dir, { recursive: true, force: true });
    });
  }

  check("raw_result_binding_mismatch", () => {
    const sb = makeSandbox();
    const snap = snapshotOfficial(sb.dir);
    const got = rejectCode(() =>
      publishQa7Formal(happyOpts(sb, { artOver: { summaryExtra: { head_sha: "f".repeat(40) } } })),
    );
    assert.equal(got, "RAW_BINDING");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("twenty_five_pass_one_blocked_rejected", () => {
    const sb = makeSandbox();
    const snap = snapshotOfficial(sb.dir);
    const caseIds = makeCases(26);
    const got = rejectCode(() =>
      publishQa7Formal(happyOpts(sb, {
        caseIds,
        artOver: { counts: { total: 26, pass: 25, fail: 0, blocked: 1, graded: 26 }, blockedIndex: 25 },
      })),
    );
    assert.ok(got === "AIPO_QA7_PUBLISH_REJECT" || /unexpected counts|BLOCKED/.test(String(got)));
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("fake_local_only_trace_rejected", () => {
    const sb = makeSandbox();
    const snap = snapshotOfficial(sb.dir);
    const got = rejectCode(() =>
      publishQa7Formal(happyOpts(sb, {
        artOver: {
          fixture_only: true,
          canonical_trace: false,
          trace_id_provenance: "TOOLING",
          traceIds: ["qa7:case_01:deadbeefdeadbeef", "qa7:case_02:cafecafecafecafe"],
          no_fake_trace: true,
        },
      })),
    );
    assert.ok(got);
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("failure_before_staging_zero_write", () => {
    const sb = makeSandbox();
    const snap = snapshotOfficial(sb.dir);
    const got = rejectCode(() => publishQa7Formal(happyOpts(sb, { opts: { failBeforeStaging: true } })));
    assert.equal(got, "INJECTED_FAIL");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("failure_after_staging_before_replace_zero_write", () => {
    const sb = makeSandbox();
    const snap = snapshotOfficial(sb.dir);
    const got = rejectCode(() => publishQa7Formal(happyOpts(sb, { opts: { failBeforeReplace: true } })));
    assert.equal(got, "INJECTED_FAIL");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("failure_during_replace_full_backup_restore", () => {
    const sb = makeSandbox();
    const snap = snapshotOfficial(sb.dir);
    const got = rejectCode(() =>
      publishQa7Formal(happyOpts(sb, { opts: { failDuringReplace: true, failDuringReplaceAfter: 0 } })),
    );
    assert.equal(got, "INJECTED_FAIL");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("dry_run_zero_write", () => {
    const sb = makeSandbox();
    const snap = snapshotOfficial(sb.dir);
    const out = publishQa7Formal(happyOpts(sb, { opts: { dryRun: true } }));
    assert.equal(out.status, "QA7_FORMAL_VALIDATED");
    assert.equal(out.dry_run, true);
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("success_same_subject_run_artifact_binding", () => {
    const sb = makeSandbox();
    publishQa7Formal(happyOpts(sb));
    const result = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/qa7-result.v1.json`), "utf8"));
    const evidence = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), "utf8"));
    const qa7 = evidence.suites.find((s) => s.suite_id === "QA7");
    assert.equal(result.run_id, qa7.run_id);
    assert.equal(result.actions.head_sha, qa7.head_sha);
    assert.equal(String(result.artifact.artifact_id), qa7.artifact_id);
    assert.equal(result.checksum, qa7.checksum);
    assert.equal(evidence.suites.find((s) => s.suite_id === "QA8").completion_status, "NOT_STARTED");
    assert.notEqual(evidence.suites.find((s) => s.suite_id === "QA9").completion_status, "COMPLETE");
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("cli_conclusion_not_trusted", () => {
    const sb = makeSandbox();
    const snap = snapshotOfficial(sb.dir);
    const got = rejectCode(() =>
      publishQa7Formal(happyOpts(sb, {
        githubClient: makeGh({ runOver: { conclusion: "failure" } }),
        opts: { conclusion: "success" },
      })),
    );
    assert.equal(got, "RUN_CONCLUSION");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("inheritance_same_sha_allowed", () => {
    const out = evaluatePublicationInheritance({
      subjectSha: HEAD,
      currentHead: HEAD,
      baselineId: "b1",
      liveBaselineId: "b1",
      promptHash: "p",
      livePromptHash: "p",
      evalHash: "e",
      liveEvalHash: "e",
      workflowHash: "w",
      liveWorkflowHash: "w",
    });
    assert.equal(out.status, SAME_SHA);
    assert.equal(isInheritanceAllowed(out), true);
  });

  check("inheritance_ancestor_same_bindings_allowed_via_publisher", () => {
    const sb = makeSandbox();
    const evidence = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), "utf8"));
    evidence.publication = { qa1_qa6_subject_sha: SUBJECT };
    writeJsonAbs(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), evidence);
    const out = publishQa7Formal(happyOpts(sb, {
      opts: { inheritanceIsAncestor: (a, d) => a === SUBJECT && d === HEAD },
    }));
    assert.equal(out.status, "QA7_FORMAL_PUBLISHED");
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("inheritance_wrong_ancestor_denied_via_publisher", () => {
    const sb = makeSandbox();
    const snap = snapshotOfficial(sb.dir);
    const evidence = JSON.parse(fs.readFileSync(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), "utf8"));
    evidence.publication = { qa1_qa6_subject_sha: SUBJECT };
    writeJsonAbs(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`), evidence);
    snap[`${GOV}/evidence-manifest.v1.json`] = fs.readFileSync(path.join(sb.dir, `${GOV}/evidence-manifest.v1.json`));
    const got = rejectCode(() =>
      publishQa7Formal(happyOpts(sb, { opts: { inheritanceIsAncestor: () => false } })),
    );
    assert.equal(got, "PUBLICATION_SHA_INHERITANCE");
    assert.equal(unchanged(sb.dir, snap), true);
    fs.rmSync(sb.dir, { recursive: true, force: true });
  });

  check("inheritance_baseline_mismatch_denied", () => {
    const out = evaluatePublicationInheritance({
      subjectSha: SUBJECT,
      currentHead: HEAD,
      baselineId: "old",
      liveBaselineId: "new",
      promptHash: "p",
      livePromptHash: "p",
      evalHash: "e",
      liveEvalHash: "e",
      workflowHash: "w",
      liveWorkflowHash: "w",
      isAncestor: () => true,
    });
    assert.equal(out.status, DENY);
  });

  check("inheritance_hash_drift_denied", () => {
    const out = evaluatePublicationInheritance({
      subjectSha: SUBJECT,
      currentHead: HEAD,
      baselineId: "b1",
      liveBaselineId: "b1",
      promptHash: "p",
      livePromptHash: "p",
      evalHash: "e",
      liveEvalHash: "e",
      workflowHash: "old",
      liveWorkflowHash: "new",
      isAncestor: () => true,
    });
    assert.equal(out.status, DENY);
  });

  if (fails.length) {
    console.error("[selftest-qa7-formal-publisher] FAIL");
    for (const f of fails) console.error(" -", f);
    throw new Error(fails.join("; "));
  }
  console.log("[selftest-qa7-formal-publisher] PASS");
  return { ok: true };
}

if (require.main === module) {
  run();
}

module.exports = { run };

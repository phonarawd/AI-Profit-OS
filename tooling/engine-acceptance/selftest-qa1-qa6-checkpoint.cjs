/**
 * QA1–QA6 pre-QA7 checkpoint publisher selftest
 * 실제 evidence-manifest 를 게시하지 않는다. sandbox only.
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { ROOT } = require("./lib/hash-scope.cjs");
const {
  CURRENT_EPOCH_REBASE_SNAPSHOT,
  isCurrentEpochPreQa7Checkpoint,
  verifyCurrentEpochPreQa7Checkpoint,
} = require("./lib/product-rebase.cjs");
const {
  evaluatePublicationInheritance,
  isInheritanceAllowed,
  DENY,
} = require("./lib/publication-sha-inheritance.cjs");
const { publishQa1Qa6Checkpoint } = require("./publish-qa1-qa6-checkpoint.cjs");

const GOV = "governance/engine-acceptance";
const QA1_TO_QA6 = ["QA1", "QA2", "QA3", "QA4", "QA5", "QA6"];
const COPY_RELS = [
  `${GOV}/baseline.v1.json`,
  `${GOV}/evidence-manifest.v1.json`,
  `${GOV}/product-rebases.v1.json`,
  `${GOV}/workflow-amendments.v1.json`,
  `${GOV}/defects.v1.json`,
  `${GOV}/protected-scope.v1.json`,
  `${GOV}/ENGINE_ACCEPTANCE_REPORT.md`,
  `${GOV}/qa1-result.v1.json`,
  `${GOV}/qa2-result.v1.json`,
  `${GOV}/qa3-result.v1.json`,
  `${GOV}/qa4-result.v1.json`,
  `${GOV}/qa5-result.v1.json`,
  `${GOV}/qa6-result.v1.json`,
  `${GOV}/qa7-result.v1.json`,
  `${GOV}/qa8-result.v1.json`,
  `${GOV}/qa9-result.v1.json`,
];

function sha256Json(obj) {
  return crypto.createHash("sha256").update(`${JSON.stringify(obj)}\n`, "utf8").digest("hex");
}

function sha256Bytes(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function seal(result) {
  const copy = { ...result };
  delete copy.checksum;
  copy.checksum = sha256Json(copy);
  return copy;
}

function readGov(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function writeJsonAbs(abs, obj) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function makeHarness(suiteId, over = {}) {
  if (suiteId === "QA4") {
    return {
      schema: "harness.qa4-clock.v1",
      non_canonical: true,
      does_not_replace_qa4_result: true,
      harness_status: "PASS",
      measuredAt: "2026-08-29T12:00:00.000Z",
      security_gate: { ok: true },
      ...over,
    };
  }
  if (suiteId === "QA5") {
    return {
      schema: "harness.qa5-fault.v1",
      non_canonical: true,
      does_not_replace_qa5_result: true,
      harness_status: "PASS",
      measuredAt: "2026-08-29T12:00:00.000Z",
      ...over,
    };
  }
  return {
    schema: "harness.qa6-threshold.v1",
    non_canonical: true,
    does_not_replace_qa6_result: true,
    numeric_invention_forbidden: true,
    harness_status: "PASS",
    measuredAt: "2026-08-29T12:00:00.000Z",
    ...over,
  };
}

function currentResult(suiteId, baselineId, over = {}) {
  const live = readGov(`${GOV}/qa${suiteId.slice(2).toLowerCase()}-result.v1.json`);
  const next = {
    ...live,
    baseline_id: baselineId,
    run_id: `cur-${suiteId.toLowerCase()}-9001`,
    completion_status: "COMPLETE",
    all_checks_pass: true,
    defects_counts: { P0: 0, P1: 0, P2: 0, P3: 0 },
    ...over,
  };
  if (suiteId === "QA4") {
    next.mode = over.mode || "full";
    next.checks = {
      ...(live.checks || {}),
      stateful_time: {
        ...((live.checks && live.checks.stateful_time) || {}),
        clock_hook: { available: true, blocked_code: null },
        harness_probe: { available: true, reason: null },
      },
    };
  }
  if (suiteId === "QA5") {
    next.mode = over.mode || "tiny";
    next.checks = {
      ...(live.checks || {}),
      failure_world: {
        ...((live.checks && live.checks.failure_world) || {}),
        fault_hook: { available: true, blocked_code: null },
      },
    };
  }
  if (suiteId === "QA6") {
    next.mode = over.mode || "full";
    next.checks = {
      ...(live.checks || {}),
      performance_world: {
        ...((live.checks && live.checks.performance_world) || {}),
        threshold_mechanism: { locked: true, engine: "k6", binding: "tag" },
      },
    };
    next.critical_invariant_cumulative = {
      blocked: 0,
      skipped: 0,
      uncovered: 0,
      failed: 0,
    };
  }
  if (suiteId === "QA2" || suiteId === "QA3") next.mode = over.mode || "full";
  return seal(next);
}

function writeOwned(dir, suiteId, result) {
  const rel = path.join(
    dir,
    "governance",
    "engine-acceptance",
    `qa${suiteId.slice(2).toLowerCase()}-result.v1.json`,
  );
  writeJsonAbs(rel, result);
  return rel;
}

function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aipo-qa1qa6-selftest-"));
  for (const rel of COPY_RELS) {
    const dest = path.join(dir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, rel), dest);
  }
  return dir;
}

function snapshotGov(root) {
  const out = {};
  for (const rel of COPY_RELS) {
    out[rel] = fs.readFileSync(path.join(root, rel));
  }
  return out;
}

function unchanged(root, snap, rels) {
  for (const rel of rels || COPY_RELS) {
    const now = fs.readFileSync(path.join(root, rel));
    if (!now.equals(snap[rel])) return false;
  }
  return true;
}

function makeGh(input) {
  const artifacts = {};
  const runs = {};
  for (const [suiteId, spec] of Object.entries(input.suites)) {
    artifacts[String(spec.artifact_id)] = {
      id: String(spec.artifact_id),
      name: spec.artifact_name,
      digest: spec.digest,
      expires_at: spec.expires_at,
      expired: false,
      workflow_run: { id: String(spec.run_id) },
    };
    runs[String(spec.run_id)] = {
      id: String(spec.run_id),
      event: "workflow_dispatch",
      conclusion: "success",
      head_sha: input.expected_head_sha,
      head_branch: input.target_branch,
      status: "completed",
    };
  }
  return {
    getArtifact(id) {
      return artifacts[String(id)] || null;
    },
    getRun(id) {
      return runs[String(id)] || null;
    },
  };
}

function buildHappy(root, over = {}) {
  const baseline = JSON.parse(fs.readFileSync(path.join(root, `${GOV}/baseline.v1.json`), "utf8"));
  const evidence = JSON.parse(fs.readFileSync(path.join(root, `${GOV}/evidence-manifest.v1.json`), "utf8"));
  const pin = baseline.acceptance_workflow_hash;
  const head = "9eb0dc0b1b7030bc23dc58305b9e7fc29e082dec";
  const branch = "rel502/a-502-1-p-help-fail-closed";
  const suites = {};
  const pred = {};
  for (const id of QA1_TO_QA6) {
    pred[id] = JSON.parse(
      fs.readFileSync(path.join(root, `${GOV}/qa${id.slice(2).toLowerCase()}-result.v1.json`), "utf8"),
    );
  }
  for (const id of QA1_TO_QA6) {
    const dir = path.join(root, "_artifacts", id);
    fs.mkdirSync(dir, { recursive: true });
    const result = currentResult(id, baseline.id, (over.results && over.results[id]) || {});
    writeOwned(dir, id, result);
    if (id === "QA3" || id === "QA4" || id === "QA5" || id === "QA6") {
      for (const sib of QA1_TO_QA6) {
        if (sib === id) continue;
        writeOwned(dir, sib, pred[sib]);
      }
    }
    if (id === "QA4") writeJsonAbs(path.join(dir, "tmp", "aipo-harness", "qa4-clock", "qa4-clock-harness.v1.json"), makeHarness("QA4"));
    if (id === "QA5") writeJsonAbs(path.join(dir, "tmp", "aipo-harness", "qa5-fault", "qa5-fault-harness.v1.json"), makeHarness("QA5"));
    if (id === "QA6") writeJsonAbs(path.join(dir, "tmp", "aipo-harness", "qa6-threshold", "qa6-threshold.v1.json"), makeHarness("QA6"));
    const bytes = fs.readFileSync(
      path.join(dir, "governance", "engine-acceptance", `qa${id.slice(2).toLowerCase()}-result.v1.json`),
    );
    suites[id] = {
      artifact_id: String(1000 + Number(id.slice(2))),
      artifact_name: `engine-acceptance-${id}`,
      digest: `sha256:${"ab".repeat(32)}`,
      expires_at: "2026-11-27T00:00:00.000Z",
      run_id: String(90000000000 + Number(id.slice(2))),
      dir,
      file_digest: sha256Bytes(bytes),
      baseline_id: baseline.id,
    };
  }
  if (over.patchSuites) over.patchSuites(suites, { baseline, pred });
  const input = {
    required_modes: { QA2: "full", QA3: "full", QA4: "full", QA5: "tiny", QA6: "full" },
    target_branch: branch,
    expected_head_sha: head,
    baseline_id: baseline.id,
    workflow_hash_pin: pin,
    suites,
    ...over.input,
  };
  return { input, baseline, evidence, pin, head };
}

function publishOn(root, happy, extra = {}) {
  return publishQa1Qa6Checkpoint({
    root,
    input: happy.input,
    githubClient: extra.githubClient || makeGh(happy.input),
    liveWorkflowHash: happy.pin,
    headSha: happy.head,
    nowMs: Date.parse("2026-08-29T15:00:00.000Z"),
    dryRun: extra.dryRun === true,
    failBeforeReplace: extra.failBeforeReplace === true,
  });
}

function expectReject(fn, needle) {
  let err;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  assert.ok(err, "expected reject");
  assert.match(String(err.message), needle);
  return err;
}

function legacyVerifierRejectsPreQa7(evidence) {
  if (evidence.qa_phase !== "QA-9") {
    return "evidence-manifest.qa_phase must be QA-9 after qa9-acceptance-report completion";
  }
  const qa7 = (evidence.suites || []).find((s) => s.suite_id === "QA7");
  if (!qa7 || qa7.completion_status !== "COMPLETE") {
    return "QA7 suite must be COMPLETE after formal Actions publication";
  }
  const qa8 = (evidence.suites || []).find((s) => s.suite_id === "QA8");
  if (!qa8 || qa8.completion_status !== "COMPLETE") {
    return "QA8 suite must be COMPLETE";
  }
  return null;
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

  console.log("[selftest-qa1-qa6-checkpoint] start");

  check("happy_checkpoint_create", () => {
    const root = makeSandbox();
    const happy = buildHappy(root);
    const snap = snapshotGov(root);
    const out = publishOn(root, happy);
    assert.equal(out.status, "QA1_QA6_CHECKPOINT_PUBLISHED");
    const evidence = JSON.parse(fs.readFileSync(path.join(root, `${GOV}/evidence-manifest.v1.json`), "utf8"));
    assert.equal(evidence.qa_phase, "QA-6");
    assert.equal(evidence.next, "QA7_AI_EVAL");
    assert.equal(evidence.publication.qa1_qa6_subject_sha, happy.head);
    assert.equal(evidence.publication.kind, "official_qa1_qa6_checkpoint");
    assert.equal(evidence.verdict, "ENGINE_QA_INCOMPLETE");
    for (const id of QA1_TO_QA6) {
      const s = evidence.suites.find((x) => x.suite_id === id);
      assert.equal(s.completion_status, "COMPLETE");
      assert.equal(s.baseline_id, happy.baseline.id);
    }
    const qa7 = evidence.suites.find((s) => s.suite_id === "QA7");
    const qa8 = evidence.suites.find((s) => s.suite_id === "QA8");
    const qa9 = evidence.suites.find((s) => s.suite_id === "QA9");
    assert.equal(qa7.completion_status, "NOT_STARTED");
    assert.ok(qa8.completion_status === "STALE" || qa8.completion_status === "NOT_STARTED");
    assert.ok(qa9.completion_status === "STALE" || qa9.completion_status === "NOT_STARTED");
    assert.equal(qa9.epoch_status, "STALE_AGGREGATION_FOR_CURRENT_EPOCH");
    assert.deepEqual(evidence.current_epoch.qa1_qa6_status, CURRENT_EPOCH_REBASE_SNAPSHOT.qa1_qa6_status);
    assert.deepEqual(evidence.current_epoch.qa8_status, CURRENT_EPOCH_REBASE_SNAPSHOT.qa8_status);
    assert.deepEqual(evidence.current_epoch.qa9_status, CURRENT_EPOCH_REBASE_SNAPSHOT.qa9_status);
    for (const id of ["QA7", "QA8", "QA9"]) {
      const rel = `${GOV}/qa${id.slice(2).toLowerCase()}-result.v1.json`;
      assert.ok(fs.readFileSync(path.join(root, rel)).equals(snap[rel]));
    }
    const rebase = JSON.parse(fs.readFileSync(path.join(root, `${GOV}/product-rebases.v1.json`), "utf8"));
    const ctx = {
      baseline: happy.baseline,
      evidence,
      rebaseLedger: rebase,
      amendmentLedger: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/workflow-amendments.v1.json`), "utf8")),
      defects: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/defects.v1.json`), "utf8")),
      results: {
        QA1: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa1-result.v1.json`), "utf8")),
        QA2: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa2-result.v1.json`), "utf8")),
        QA3: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa3-result.v1.json`), "utf8")),
        QA4: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa4-result.v1.json`), "utf8")),
        QA5: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa5-result.v1.json`), "utf8")),
        QA6: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa6-result.v1.json`), "utf8")),
        QA7: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa7-result.v1.json`), "utf8")),
        QA8: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa8-result.v1.json`), "utf8")),
        QA9: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa9-result.v1.json`), "utf8")),
      },
      liveWorkflowHash: happy.pin,
      headQa7Bytes: snap[`${GOV}/qa7-result.v1.json`].toString("utf8").replace(/\r\n/g, "\n").trim(),
      liveQa7Bytes: fs.readFileSync(path.join(root, `${GOV}/qa7-result.v1.json`), "utf8").replace(/\r\n/g, "\n").trim(),
      qa7ResultDirty: false,
      headQa8Bytes: snap[`${GOV}/qa8-result.v1.json`].toString("utf8").replace(/\r\n/g, "\n").trim(),
      liveQa8Bytes: fs.readFileSync(path.join(root, `${GOV}/qa8-result.v1.json`), "utf8").replace(/\r\n/g, "\n").trim(),
      qa8ResultDirty: false,
      headQa9Bytes: snap[`${GOV}/qa9-result.v1.json`].toString("utf8").replace(/\r\n/g, "\n").trim(),
      liveQa9Bytes: fs.readFileSync(path.join(root, `${GOV}/qa9-result.v1.json`), "utf8").replace(/\r\n/g, "\n").trim(),
      qa9ResultDirty: false,
    };
    const f = [];
    verifyCurrentEpochPreQa7Checkpoint(ctx, f);
    assert.equal(f.join("; "), "");
    assert.equal(isCurrentEpochPreQa7Checkpoint(ctx), true);
    assert.ok(legacyVerifierRejectsPreQa7(evidence));
    const inheritOk = evaluatePublicationInheritance({
      subjectSha: evidence.publication.qa1_qa6_subject_sha,
      currentHead: "cccccccccccccccccccccccccccccccccccccccc",
      baselineId: happy.baseline.id,
      liveBaselineId: happy.baseline.id,
      promptHash: happy.baseline.prompt_hash,
      livePromptHash: happy.baseline.prompt_hash,
      evalHash: happy.baseline.eval_dataset_hash,
      liveEvalHash: happy.baseline.eval_dataset_hash,
      workflowHash: happy.pin,
      liveWorkflowHash: happy.pin,
      isAncestor: () => true,
    });
    assert.equal(isInheritanceAllowed(inheritOk), true);
    const inheritBad = evaluatePublicationInheritance({
      subjectSha: evidence.publication.qa1_qa6_subject_sha,
      currentHead: "dddddddddddddddddddddddddddddddddddddddd",
      baselineId: happy.baseline.id,
      liveBaselineId: "other-baseline",
      promptHash: happy.baseline.prompt_hash,
      livePromptHash: happy.baseline.prompt_hash,
      evalHash: happy.baseline.eval_dataset_hash,
      liveEvalHash: happy.baseline.eval_dataset_hash,
      workflowHash: happy.pin,
      liveWorkflowHash: happy.pin,
      isAncestor: () => true,
    });
    assert.equal(inheritBad.status, DENY);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("reject_artifact_id_mismatch", () => {
    const root = makeSandbox();
    const happy = buildHappy(root);
    const snap = snapshotGov(root);
    const gh = makeGh(happy.input);
    gh.getArtifact = (id) => {
      const a = makeGh(happy.input).getArtifact(id);
      return a ? { ...a, id: "999999" } : null;
    };
    expectReject(() => publishOn(root, happy, { githubClient: gh }), /artifact id mismatch/);
    assert.equal(unchanged(root, snap), true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("reject_digest_mismatch", () => {
    const root = makeSandbox();
    const happy = buildHappy(root);
    const snap = snapshotGov(root);
    const gh = makeGh(happy.input);
    const inner = makeGh(happy.input);
    gh.getArtifact = (id) => {
      const a = inner.getArtifact(id);
      return a ? { ...a, digest: `sha256:${"00".repeat(32)}` } : null;
    };
    expectReject(() => publishOn(root, happy, { githubClient: gh }), /digest mismatch/);
    assert.equal(unchanged(root, snap), true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("reject_run_sha_mismatch", () => {
    const root = makeSandbox();
    const happy = buildHappy(root);
    const snap = snapshotGov(root);
    const gh = makeGh(happy.input);
    const inner = makeGh(happy.input);
    gh.getRun = (id) => {
      const r = inner.getRun(id);
      return r ? { ...r, head_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } : null;
    };
    expectReject(() => publishOn(root, happy, { githubClient: gh }), /head SHA mismatch/);
    assert.equal(unchanged(root, snap), true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("reject_branch_mismatch", () => {
    const root = makeSandbox();
    const happy = buildHappy(root);
    const snap = snapshotGov(root);
    const gh = makeGh(happy.input);
    const inner = makeGh(happy.input);
    gh.getRun = (id) => {
      const r = inner.getRun(id);
      return r ? { ...r, head_branch: "main" } : null;
    };
    expectReject(() => publishOn(root, happy, { githubClient: gh }), /branch mismatch/);
    assert.equal(unchanged(root, snap), true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("reject_baseline_mismatch", () => {
    const root = makeSandbox();
    const happy = buildHappy(root, {
      results: { QA3: { baseline_id: "ea-baseline-other" } },
    });
    const snap = snapshotGov(root);
    expectReject(() => publishOn(root, happy), /baseline/);
    assert.equal(unchanged(root, snap), true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("reject_workflow_hash_mismatch", () => {
    const root = makeSandbox();
    const happy = buildHappy(root);
    happy.input.workflow_hash_pin = "ff".repeat(32);
    const snap = snapshotGov(root);
    expectReject(() => publishOn(root, happy), /workflow hash/);
    assert.equal(unchanged(root, snap), true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("reject_predecessor_result_reuse", () => {
    const root = makeSandbox();
    const happy = buildHappy(root, {
      patchSuites(suites, { pred }) {
        const dir = suites.QA4.dir;
        writeOwned(dir, "QA4", pred.QA4);
        const bytes = fs.readFileSync(
          path.join(dir, "governance", "engine-acceptance", "qa4-result.v1.json"),
        );
        suites.QA4.file_digest = sha256Bytes(bytes);
      },
    });
    const snap = snapshotGov(root);
    expectReject(() => publishOn(root, happy), /predecessor|baseline/);
    assert.equal(unchanged(root, snap), true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("reject_aggregator_artifact", () => {
    const root = makeSandbox();
    const happy = buildHappy(root, {
      patchSuites(suites) {
        suites.QA1.artifact_name = "engine-acceptance-evidence";
      },
    });
    const snap = snapshotGov(root);
    expectReject(() => publishOn(root, happy), /aggregator/);
    assert.equal(unchanged(root, snap), true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("reject_missing_suite", () => {
    const root = makeSandbox();
    const happy = buildHappy(root);
    delete happy.input.suites.QA3;
    const snap = snapshotGov(root);
    expectReject(() => publishOn(root, happy), /missing official artifact for QA3/);
    assert.equal(unchanged(root, snap), true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("reject_p0_p1", () => {
    const root = makeSandbox();
    const happy = buildHappy(root, {
      results: { QA2: { defects_counts: { P0: 1, P1: 0, P2: 0, P3: 0 }, all_checks_pass: true } },
    });
    const snap = snapshotGov(root);
    expectReject(() => publishOn(root, happy), /P0\/P1/);
    assert.equal(unchanged(root, snap), true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("reject_missing_harness", () => {
    const root = makeSandbox();
    const happy = buildHappy(root);
    fs.rmSync(path.join(happy.input.suites.QA5.dir, "tmp"), { recursive: true, force: true });
    const snap = snapshotGov(root);
    expectReject(() => publishOn(root, happy), /fault harness file missing/);
    assert.equal(unchanged(root, snap), true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("reject_missing_qa4_clock_harness", () => {
    const root = makeSandbox();
    const happy = buildHappy(root);
    fs.rmSync(path.join(happy.input.suites.QA4.dir, "tmp"), { recursive: true, force: true });
    const snap = snapshotGov(root);
    expectReject(() => publishOn(root, happy), /clock harness file missing/);
    assert.equal(unchanged(root, snap), true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("reject_qa8_early_complete", () => {
    const root = makeSandbox();
    const evidence = JSON.parse(fs.readFileSync(path.join(root, `${GOV}/evidence-manifest.v1.json`), "utf8"));
    evidence.suites = evidence.suites.map((s) =>
      s.suite_id === "QA8" ? { ...s, completion_status: "COMPLETE", run_id: "early", checksum: "early" } : s,
    );
    writeJsonAbs(path.join(root, `${GOV}/evidence-manifest.v1.json`), evidence);
    const happy = buildHappy(root);
    const snap = snapshotGov(root);
    expectReject(() => publishOn(root, happy), /QA8|COMPLETE|STALE/);
    assert.equal(unchanged(root, snap, [`${GOV}/qa7-result.v1.json`, `${GOV}/qa8-result.v1.json`, `${GOV}/qa9-result.v1.json`]), true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("reject_qa7_early_complete", () => {
    const root = makeSandbox();
    const evidence = JSON.parse(fs.readFileSync(path.join(root, `${GOV}/evidence-manifest.v1.json`), "utf8"));
    evidence.suites = evidence.suites.map((s) =>
      s.suite_id === "QA7" ? { ...s, completion_status: "COMPLETE", run_id: "early", checksum: "early" } : s,
    );
    writeJsonAbs(path.join(root, `${GOV}/evidence-manifest.v1.json`), evidence);
    const happy = buildHappy(root);
    expectReject(() => publishOn(root, happy), /QA7/);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("mid_fail_zero_file_change", () => {
    const root = makeSandbox();
    const happy = buildHappy(root);
    const snap = snapshotGov(root);
    expectReject(() => publishOn(root, happy, { failBeforeReplace: true }), /failBeforeReplace/);
    assert.equal(unchanged(root, snap), true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("dry_run_zero_file_change", () => {
    const root = makeSandbox();
    const happy = buildHappy(root);
    const snap = snapshotGov(root);
    const out = publishOn(root, happy, { dryRun: true });
    assert.equal(out.status, "QA1_QA6_CHECKPOINT_VALIDATED");
    assert.equal(out.dry_run, true);
    assert.equal(unchanged(root, snap), true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  check("qa7_publisher_lock_conditions_remain", () => {
    const src = fs.readFileSync(path.join(ROOT, "tooling/engine-acceptance/publish-qa7-formal.cjs"), "utf8");
    assert.match(src, /QA4-QA6 are not COMPLETE for the current baseline/);
    assert.match(src, /ENGINE_ACCEPTED_FOR_UI/);
    assert.match(src, /formal_actions_evidence/);
    assert.match(src, /protected_scope_clean must be true for publication/);
    assert.doesNotMatch(src, /isCurrentEpochPreQa7Checkpoint/);
    assert.doesNotMatch(src, /publishQa1Qa6Checkpoint/);
  });

  check("same_baseline_exception_is_not_general_relaxation", () => {
    const root = makeSandbox();
    const happy = buildHappy(root);
    publishOn(root, happy);
    const evidence = JSON.parse(fs.readFileSync(path.join(root, `${GOV}/evidence-manifest.v1.json`), "utf8"));
    assert.ok(legacyVerifierRejectsPreQa7(evidence));
    const wrong = JSON.parse(JSON.stringify(evidence));
    wrong.baseline_id = "ea-baseline-other";
    const rebase = JSON.parse(fs.readFileSync(path.join(root, `${GOV}/product-rebases.v1.json`), "utf8"));
    const ctx = {
      baseline: { ...happy.baseline, id: "ea-baseline-other" },
      evidence: wrong,
      rebaseLedger: rebase,
      amendmentLedger: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/workflow-amendments.v1.json`), "utf8")),
      defects: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/defects.v1.json`), "utf8")),
      results: {
        QA1: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa1-result.v1.json`), "utf8")),
        QA2: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa2-result.v1.json`), "utf8")),
        QA3: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa3-result.v1.json`), "utf8")),
        QA4: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa4-result.v1.json`), "utf8")),
        QA5: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa5-result.v1.json`), "utf8")),
        QA6: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa6-result.v1.json`), "utf8")),
        QA7: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa7-result.v1.json`), "utf8")),
        QA8: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa8-result.v1.json`), "utf8")),
        QA9: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/qa9-result.v1.json`), "utf8")),
      },
      liveWorkflowHash: happy.pin,
      headQa7Bytes: "x",
      liveQa7Bytes: "x",
      qa7ResultDirty: false,
      headQa8Bytes: "x",
      liveQa8Bytes: "x",
      qa8ResultDirty: false,
      headQa9Bytes: "x",
      liveQa9Bytes: "x",
      qa9ResultDirty: false,
    };
    assert.equal(isCurrentEpochPreQa7Checkpoint(ctx), false);
    fs.rmSync(root, { recursive: true, force: true });
  });

  if (fails.length) {
    console.error("[selftest-qa1-qa6-checkpoint] FAIL");
    for (const f of fails) console.error(" -", f);
    throw new Error(fails.join("; "));
  }
  console.log("[selftest-qa1-qa6-checkpoint] PASS");
  return { ok: true };
}

if (require.main === module) {
  run();
}

module.exports = { run };

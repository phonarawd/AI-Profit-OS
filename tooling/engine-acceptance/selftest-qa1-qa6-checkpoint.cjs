/**
 * QA1–QA6 pre-QA7 checkpoint publisher + official classifier selftest.
 * live governance 파일을 입력으로 쓰지 않는다. sandbox / fixture only.
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
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
const {
  GOV,
  QA1_TO_QA6,
  FIX_HEAD,
  FIX_BRANCH,
  writeJsonAbs,
  currentResult,
  makeHarness,
  makeIsolatedGovTree,
  copyRels,
} = require("./lib/qa-checkpoint-fixtures.cjs");

function sha256Bytes(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
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

function snapshotGov(root) {
  const out = {};
  for (const rel of copyRels()) {
    out[rel] = fs.readFileSync(path.join(root, rel));
  }
  return out;
}

function unchanged(root, snap, rels) {
  for (const rel of rels || copyRels()) {
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
  const head = FIX_HEAD;
  const pred = {};
  for (const id of QA1_TO_QA6) {
    pred[id] = JSON.parse(
      fs.readFileSync(path.join(root, `${GOV}/qa${id.slice(2).toLowerCase()}-result.v1.json`), "utf8"),
    );
  }
  const suites = {};
  for (const id of QA1_TO_QA6) {
    const dir = path.join(root, "_artifacts", id);
    fs.mkdirSync(dir, { recursive: true });
    const result = currentResult(id, (over.results && over.results[id]) || {});
    writeOwned(dir, id, result);
    if (id === "QA3" || id === "QA4" || id === "QA5" || id === "QA6") {
      for (const sib of QA1_TO_QA6) {
        if (sib === id) continue;
        writeOwned(dir, sib, pred[sib]);
      }
    }
    if (id === "QA4") {
      writeJsonAbs(path.join(dir, "tmp", "aipo-harness", "qa4-clock", "qa4-clock-harness.v1.json"), makeHarness("QA4"));
    }
    if (id === "QA5") {
      writeJsonAbs(path.join(dir, "tmp", "aipo-harness", "qa5-fault", "qa5-fault-harness.v1.json"), makeHarness("QA5"));
    }
    if (id === "QA6") {
      writeJsonAbs(path.join(dir, "tmp", "aipo-harness", "qa6-threshold", "qa6-threshold.v1.json"), makeHarness("QA6"));
    }
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
  if (over.sharedRunId) {
    for (const id of QA1_TO_QA6) suites[id].run_id = over.sharedRunId;
  } else {
    const shared = "90000000001";
    for (const id of QA1_TO_QA6) suites[id].run_id = shared;
  }
  if (over.patchSuites) over.patchSuites(suites, { baseline, pred });
  const input = {
    required_modes: { QA2: "full", QA3: "full", QA4: "full", QA5: "tiny", QA6: "full" },
    target_branch: FIX_BRANCH,
    expected_head_sha: head,
    baseline_id: baseline.id,
    workflow_hash_pin: pin,
    suites,
    ...over.input,
  };
  return { input, baseline, evidence, pin, head, pred };
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

function checkpointCtxFromPublished(root, happy, snap) {
  const rebase = JSON.parse(fs.readFileSync(path.join(root, `${GOV}/product-rebases.v1.json`), "utf8"));
  return {
    baseline: happy.baseline,
    evidence: JSON.parse(fs.readFileSync(path.join(root, `${GOV}/evidence-manifest.v1.json`), "utf8")),
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
    currentHead: happy.head,
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
}

function runChecks(checks) {
  const fails = [];
  const results = [];
  for (const [name, fn] of checks) {
    try {
      fn();
      results.push({ name, ok: true });
      console.log(`  PASS ${name}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      fails.push(`${name}: ${msg}`);
      results.push({ name, ok: false, msg });
      console.log(`  FAIL ${name}: ${msg}`);
    }
  }
  return { fails, results };
}

function defineChecks() {
  return [
    ["happy_checkpoint_create", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      const snap = snapshotGov(root);
      const out = publishOn(root, happy);
      assert.equal(out.status, "QA1_QA6_CHECKPOINT_PUBLISHED");
      const evidence = JSON.parse(fs.readFileSync(path.join(root, `${GOV}/evidence-manifest.v1.json`), "utf8"));
      assert.equal(evidence.qa_phase, "QA-6");
      assert.equal(evidence.next, "QA7_AI_EVAL");
      assert.equal(evidence.publication.qa1_qa6_subject_sha, happy.head);
      assert.equal(evidence.publication.kind, "official_qa1_qa6_checkpoint");
      assert.equal(evidence.publication.official_run_id, "90000000001");
      assert.equal(evidence.verdict, "ENGINE_QA_INCOMPLETE");
      for (const id of QA1_TO_QA6) {
        const s = evidence.suites.find((x) => x.suite_id === id);
        assert.equal(s.completion_status, "COMPLETE");
        assert.equal(s.baseline_id, happy.baseline.id);
        assert.ok(evidence.publication.suites[id].artifact_id);
        assert.ok(evidence.publication.suites[id].digest);
        assert.equal(evidence.publication.suites[id].checksum, s.checksum);
      }
      const qa7 = evidence.suites.find((s) => s.suite_id === "QA7");
      const qa8 = evidence.suites.find((s) => s.suite_id === "QA8");
      const qa9 = evidence.suites.find((s) => s.suite_id === "QA9");
      assert.equal(qa7.completion_status, "NOT_STARTED");
      assert.ok(qa8.completion_status === "STALE" || qa8.completion_status === "NOT_STARTED");
      assert.ok(qa9.completion_status === "STALE" || qa9.completion_status === "NOT_STARTED");
      assert.equal(qa9.epoch_status, "STALE_AGGREGATION_FOR_CURRENT_EPOCH");
      assert.deepEqual(evidence.current_epoch.qa1_qa6_status, CURRENT_EPOCH_REBASE_SNAPSHOT.qa1_qa6_status);
      for (const id of ["QA7", "QA8", "QA9"]) {
        const rel = `${GOV}/qa${id.slice(2).toLowerCase()}-result.v1.json`;
        assert.ok(fs.readFileSync(path.join(root, rel)).equals(snap[rel]));
      }
      const ctx = checkpointCtxFromPublished(root, happy, snap);
      const f = [];
      verifyCurrentEpochPreQa7Checkpoint(ctx, f);
      assert.equal(f.join("; "), "");
      assert.equal(isCurrentEpochPreQa7Checkpoint(ctx), true);
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
    }],
    ["reject_artifact_id_mismatch", () => {
      const { dir: root } = makeIsolatedGovTree();
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
    }],
    ["reject_digest_mismatch", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      const snap = snapshotGov(root);
      const inner = makeGh(happy.input);
      const gh = makeGh(happy.input);
      gh.getArtifact = (id) => {
        const a = inner.getArtifact(id);
        return a ? { ...a, digest: `sha256:${"00".repeat(32)}` } : null;
      };
      expectReject(() => publishOn(root, happy, { githubClient: gh }), /digest mismatch/);
      assert.equal(unchanged(root, snap), true);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["reject_run_sha_mismatch", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      const snap = snapshotGov(root);
      const inner = makeGh(happy.input);
      const gh = makeGh(happy.input);
      gh.getRun = (id) => {
        const r = inner.getRun(id);
        return r ? { ...r, head_sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } : null;
      };
      expectReject(() => publishOn(root, happy, { githubClient: gh }), /head SHA mismatch/);
      assert.equal(unchanged(root, snap), true);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["reject_branch_mismatch", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      const snap = snapshotGov(root);
      const inner = makeGh(happy.input);
      const gh = makeGh(happy.input);
      gh.getRun = (id) => {
        const r = inner.getRun(id);
        return r ? { ...r, head_branch: "main" } : null;
      };
      expectReject(() => publishOn(root, happy, { githubClient: gh }), /branch mismatch/);
      assert.equal(unchanged(root, snap), true);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["reject_baseline_mismatch", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root, {
        results: { QA3: { baseline_id: "ea-baseline-other" } },
      });
      const snap = snapshotGov(root);
      expectReject(() => publishOn(root, happy), /baseline/);
      assert.equal(unchanged(root, snap), true);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["reject_workflow_hash_mismatch", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      happy.input.workflow_hash_pin = "ff".repeat(32);
      const snap = snapshotGov(root);
      expectReject(() => publishOn(root, happy), /workflow hash/);
      assert.equal(unchanged(root, snap), true);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["reject_predecessor_result_reuse", () => {
      const { dir: root } = makeIsolatedGovTree();
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
    }],
    ["reject_aggregator_artifact", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root, {
        patchSuites(suites) {
          suites.QA1.artifact_name = "engine-acceptance-evidence";
        },
      });
      const snap = snapshotGov(root);
      expectReject(() => publishOn(root, happy), /aggregator/);
      assert.equal(unchanged(root, snap), true);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["reject_missing_suite", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      delete happy.input.suites.QA3;
      const snap = snapshotGov(root);
      expectReject(() => publishOn(root, happy), /missing official artifact for QA3/);
      assert.equal(unchanged(root, snap), true);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["reject_p0_p1", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root, {
        results: { QA2: { defects_counts: { P0: 1, P1: 0, P2: 0, P3: 0 }, all_checks_pass: true } },
      });
      const snap = snapshotGov(root);
      expectReject(() => publishOn(root, happy), /P0\/P1/);
      assert.equal(unchanged(root, snap), true);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["reject_missing_harness", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      fs.rmSync(path.join(happy.input.suites.QA5.dir, "tmp"), { recursive: true, force: true });
      const snap = snapshotGov(root);
      expectReject(() => publishOn(root, happy), /fault harness file missing/);
      assert.equal(unchanged(root, snap), true);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["reject_missing_qa4_clock_harness", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      fs.rmSync(path.join(happy.input.suites.QA4.dir, "tmp"), { recursive: true, force: true });
      const snap = snapshotGov(root);
      expectReject(() => publishOn(root, happy), /clock harness file missing/);
      assert.equal(unchanged(root, snap), true);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["reject_qa8_early_complete", () => {
      const { dir: root } = makeIsolatedGovTree();
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
    }],
    ["reject_qa7_early_complete", () => {
      const { dir: root } = makeIsolatedGovTree();
      const evidence = JSON.parse(fs.readFileSync(path.join(root, `${GOV}/evidence-manifest.v1.json`), "utf8"));
      evidence.suites = evidence.suites.map((s) =>
        s.suite_id === "QA7" ? { ...s, completion_status: "COMPLETE", run_id: "early", checksum: "early" } : s,
      );
      writeJsonAbs(path.join(root, `${GOV}/evidence-manifest.v1.json`), evidence);
      const happy = buildHappy(root);
      expectReject(() => publishOn(root, happy), /QA7/);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["reject_qa9_early_aggregation", () => {
      const { dir: root } = makeIsolatedGovTree();
      const evidence = JSON.parse(fs.readFileSync(path.join(root, `${GOV}/evidence-manifest.v1.json`), "utf8"));
      evidence.suites = evidence.suites.map((s) =>
        s.suite_id === "QA9" ? { ...s, completion_status: "COMPLETE", run_id: "early", checksum: "early" } : s,
      );
      writeJsonAbs(path.join(root, `${GOV}/evidence-manifest.v1.json`), evidence);
      const happy = buildHappy(root);
      expectReject(() => publishOn(root, happy), /QA9|COMPLETE|STALE/);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["mid_fail_zero_file_change", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      const snap = snapshotGov(root);
      expectReject(() => publishOn(root, happy, { failBeforeReplace: true }), /failBeforeReplace/);
      assert.equal(unchanged(root, snap), true);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["dry_run_zero_file_change", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      const snap = snapshotGov(root);
      const out = publishOn(root, happy, { dryRun: true });
      assert.equal(out.status, "QA1_QA6_CHECKPOINT_VALIDATED");
      assert.equal(out.dry_run, true);
      assert.equal(unchanged(root, snap), true);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["qa7_publisher_lock_conditions_remain", () => {
      const src = fs.readFileSync(path.join(ROOT, "tooling/engine-acceptance/publish-qa7-formal.cjs"), "utf8");
      assert.match(src, /QA4-QA6 are not COMPLETE for the current baseline/);
      assert.match(src, /ENGINE_ACCEPTED_FOR_UI/);
      assert.match(src, /formal_actions_evidence/);
      assert.match(src, /protected_scope_clean must be true for publication/);
      assert.doesNotMatch(src, /isCurrentEpochPreQa7Checkpoint/);
      assert.doesNotMatch(src, /publishQa1Qa6Checkpoint/);
    }],
    ["unsigned_manual_complete_rejected", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      const snap = snapshotGov(root);
      publishOn(root, happy);
      const ctx = checkpointCtxFromPublished(root, happy, snap);
      delete ctx.evidence.publication;
      assert.equal(isCurrentEpochPreQa7Checkpoint(ctx), false);
      const f = [];
      verifyCurrentEpochPreQa7Checkpoint(ctx, f);
      assert.match(f.join("; "), /publication metadata/);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["publisher_metadata_missing_rejected", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      const snap = snapshotGov(root);
      publishOn(root, happy);
      const ctx = checkpointCtxFromPublished(root, happy, snap);
      ctx.evidence.publication = { kind: "official_qa1_qa6_checkpoint" };
      assert.equal(isCurrentEpochPreQa7Checkpoint(ctx), false);
      const f = [];
      verifyCurrentEpochPreQa7Checkpoint(ctx, f);
      assert.match(f.join("; "), /qa1_qa6_subject_sha|official run\/artifact/);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["wrong_subject_sha_rejected", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      const snap = snapshotGov(root);
      publishOn(root, happy);
      const ctx = checkpointCtxFromPublished(root, happy, snap);
      ctx.evidence.publication.qa1_qa6_subject_sha = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      ctx.isAncestor = () => false;
      assert.equal(isCurrentEpochPreQa7Checkpoint(ctx), false);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["subject_not_ancestor_rejected", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      const snap = snapshotGov(root);
      publishOn(root, happy);
      const ctx = checkpointCtxFromPublished(root, happy, snap);
      ctx.currentHead = "cccccccccccccccccccccccccccccccccccccccc";
      ctx.isAncestor = () => false;
      assert.equal(isCurrentEpochPreQa7Checkpoint(ctx), false);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["historical_qa7_file_keeps_checkpoint", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      const snap = snapshotGov(root);
      publishOn(root, happy);
      const ctx = checkpointCtxFromPublished(root, happy, snap);
      assert.equal(ctx.results.QA7.completion_status, "COMPLETE");
      assert.equal(ctx.evidence.suites.find((s) => s.suite_id === "QA7").completion_status, "NOT_STARTED");
      assert.equal(isCurrentEpochPreQa7Checkpoint(ctx), true);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["current_result_not_mistaken_for_predecessor", () => {
      const { dir: root, pred } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      const snap = snapshotGov(root);
      publishOn(root, happy);
      const ctx = checkpointCtxFromPublished(root, happy, snap);
      assert.notEqual(ctx.results.QA4.checksum, pred.QA4.checksum);
      assert.equal(isCurrentEpochPreQa7Checkpoint(ctx), true);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["same_baseline_exception_is_not_general_relaxation", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      const snap = snapshotGov(root);
      publishOn(root, happy);
      const evidence = JSON.parse(fs.readFileSync(path.join(root, `${GOV}/evidence-manifest.v1.json`), "utf8"));
      const wrong = JSON.parse(JSON.stringify(evidence));
      wrong.baseline_id = "ea-baseline-other";
      const rebase = JSON.parse(fs.readFileSync(path.join(root, `${GOV}/product-rebases.v1.json`), "utf8"));
      const ctx = checkpointCtxFromPublished(root, happy, snap);
      ctx.baseline = { ...happy.baseline, id: "ea-baseline-other" };
      ctx.evidence = wrong;
      ctx.rebaseLedger = rebase;
      assert.equal(isCurrentEpochPreQa7Checkpoint(ctx), false);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["workflow_hash_drift_rejected", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      const snap = snapshotGov(root);
      publishOn(root, happy);
      const ctx = checkpointCtxFromPublished(root, happy, snap);
      ctx.liveWorkflowHash = "ff".repeat(32);
      assert.equal(isCurrentEpochPreQa7Checkpoint(ctx), false);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["prompt_eval_drift_rejected", () => {
      const { dir: root } = makeIsolatedGovTree();
      const happy = buildHappy(root);
      const snap = snapshotGov(root);
      publishOn(root, happy);
      const ctx = checkpointCtxFromPublished(root, happy, snap);
      ctx.baseline = { ...ctx.baseline, prompt_hash: "99".repeat(32) };
      assert.equal(isCurrentEpochPreQa7Checkpoint(ctx), false);
      ctx.baseline = { ...happy.baseline, eval_dataset_hash: "aa".repeat(32) };
      assert.equal(isCurrentEpochPreQa7Checkpoint(ctx), false);
      fs.rmSync(root, { recursive: true, force: true });
    }],
    ["fixture_does_not_read_live_gov", () => {
      const src = fs.readFileSync(path.join(ROOT, "tooling/engine-acceptance/selftest-qa1-qa6-checkpoint.cjs"), "utf8");
      const fixSrc = fs.readFileSync(path.join(ROOT, "tooling/engine-acceptance/lib/qa-checkpoint-fixtures.cjs"), "utf8");
      assert.doesNotMatch(src, /readGov\(/);
      assert.match(src, /makeIsolatedGovTree/);
      assert.doesNotMatch(fixSrc, /hash-scope|readGov|git show HEAD:governance/);
    }],
  ];
}

function run() {
  console.log("[selftest-qa1-qa6-checkpoint] start");
  const checks = defineChecks();
  const first = runChecks(checks);
  const reversed = runChecks([...checks].reverse());
  if (first.fails.length || reversed.fails.length) {
    console.error("[selftest-qa1-qa6-checkpoint] FAIL");
    for (const f of first.fails.concat(reversed.fails)) console.error(" -", f);
    throw new Error(first.fails.concat(reversed.fails).join("; "));
  }
  const firstNames = first.results.filter((r) => r.ok).map((r) => r.name).sort();
  const revNames = reversed.results.filter((r) => r.ok).map((r) => r.name).sort();
  assert.deepEqual(firstNames, revNames);
  console.log("  PASS order_independent_same_result");

  const liveEv = path.join(ROOT, `${GOV}/evidence-manifest.v1.json`);
  const liveBytes = fs.readFileSync(liveEv);
  const liveObj = JSON.parse(liveBytes.toString("utf8"));
  const a = makeIsolatedGovTree();
  const b = makeIsolatedGovTree();
  assert.notEqual(a.baseline.id, liveObj.baseline_id);
  assert.equal(a.evidence.qa_phase, "QA-0");
  assert.notEqual(a.evidence.qa_phase, liveObj.qa_phase);
  const ha = sha256Bytes(fs.readFileSync(path.join(a.dir, `${GOV}/baseline.v1.json`)));
  const hb = sha256Bytes(fs.readFileSync(path.join(b.dir, `${GOV}/baseline.v1.json`)));
  assert.equal(ha, hb);
  const happy = buildHappy(a.dir);
  const out = publishOn(a.dir, happy, { dryRun: true });
  assert.equal(out.status, "QA1_QA6_CHECKPOINT_VALIDATED");
  assert.ok(fs.readFileSync(liveEv).equals(liveBytes), "fixture selftest must not change live destination");
  fs.rmSync(a.dir, { recursive: true, force: true });
  fs.rmSync(b.dir, { recursive: true, force: true });
  console.log("  PASS live_gov_mutation_does_not_change_fixture_selftest");

  console.log("[selftest-qa1-qa6-checkpoint] PASS");
  return { ok: true };
}

if (require.main === module) {
  run();
}

module.exports = { run };

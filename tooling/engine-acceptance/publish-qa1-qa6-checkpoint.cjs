/**
 * QA1–QA6 공식 GitHub Actions artifact → pre-QA7 checkpoint 게시
 *
 * 공식 suite artifact만 입력으로 허용한다. aggregator·predecessor 형제 결과는 거부.
 * QA7/QA8/QA9 result 바이트와 current_epoch rebase snapshot은 변경하지 않는다.
 * 쓰기는 검증 전부 PASS 후에만 atomic replace. dry-run/validate-only는 저장 0.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { execSync } = require("node:child_process");
const { ROOT } = require("./lib/hash-scope.cjs");
const {
  CURRENT_EPOCH_REBASE_SNAPSHOT,
  isCurrentEpochPreQa7Checkpoint,
  latestRebase,
  verifyCurrentEpochPreQa7Checkpoint,
} = require("./lib/product-rebase.cjs");

const GOV_REL = "governance/engine-acceptance";
const EVIDENCE_REL = `${GOV_REL}/evidence-manifest.v1.json`;
const REPORT_REL = `${GOV_REL}/ENGINE_ACCEPTANCE_REPORT.md`;
const BASELINE_REL = `${GOV_REL}/baseline.v1.json`;
const REBASE_REL = `${GOV_REL}/product-rebases.v1.json`;
const AMEND_REL = `${GOV_REL}/workflow-amendments.v1.json`;
const DEFECTS_REL = `${GOV_REL}/defects.v1.json`;
const SCOPE_REL = `${GOV_REL}/protected-scope.v1.json`;

const QA1_TO_QA6 = Object.freeze(["QA1", "QA2", "QA3", "QA4", "QA5", "QA6"]);
const HISTORICAL_RESULT_RELS = Object.freeze({
  QA7: `${GOV_REL}/qa7-result.v1.json`,
  QA8: `${GOV_REL}/qa8-result.v1.json`,
  QA9: `${GOV_REL}/qa9-result.v1.json`,
});
const RESULT_RELS = Object.freeze({
  QA1: `${GOV_REL}/qa1-result.v1.json`,
  QA2: `${GOV_REL}/qa2-result.v1.json`,
  QA3: `${GOV_REL}/qa3-result.v1.json`,
  QA4: `${GOV_REL}/qa4-result.v1.json`,
  QA5: `${GOV_REL}/qa5-result.v1.json`,
  QA6: `${GOV_REL}/qa6-result.v1.json`,
  ...HISTORICAL_RESULT_RELS,
});

const OFFICIAL_SUITE_ARTIFACT = Object.freeze({
  QA1: "engine-acceptance-QA1",
  QA2: "engine-acceptance-QA2",
  QA3: "engine-acceptance-QA3",
  QA4: "engine-acceptance-QA4",
  QA5: "engine-acceptance-QA5",
  QA6: "engine-acceptance-QA6",
});
const AGGREGATOR_ARTIFACT = "engine-acceptance-evidence";
const DEFAULT_REQUIRED_MODE = Object.freeze({
  QA2: "full",
  QA3: "full",
  QA4: "full",
  QA5: "tiny",
  QA6: "full",
});
const HARNESS_FILE = Object.freeze({
  QA4: { name: "qa4-clock-harness.v1.json", schema: "harness.qa4-clock.v1" },
  QA5: { name: "qa5-fault-harness.v1.json", schema: "harness.qa5-fault.v1" },
  QA6: { name: "qa6-threshold.v1.json", schema: "harness.qa6-threshold.v1" },
});

function getArg(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  return argv[i + 1] || null;
}

function sha256Bytes(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function sha256Json(obj) {
  return sha256Bytes(Buffer.from(`${JSON.stringify(obj)}\n`, "utf8"));
}

function canonicalChecksum(result) {
  const payload = { ...result };
  delete payload.checksum;
  return sha256Json(payload);
}

function fail(message, code) {
  const err = new Error(message);
  err.code = code || "AIPO_QA1_QA6_CHECKPOINT_REJECT";
  throw err;
}

function readJsonAbs(abs) {
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function readTextAbs(abs) {
  return fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
}

function ownedResultName(suiteId) {
  return `qa${suiteId.slice(2).toLowerCase()}-result.v1.json`;
}

function walkFiles(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(abs, out);
    else if (ent.isFile()) out.push(abs);
  }
  return out;
}

function findByBasename(dir, basename) {
  return walkFiles(dir, []).filter((abs) => path.basename(abs) === basename);
}

function normalizeDigest(value) {
  const raw = String(value || "").trim().toLowerCase();
  return raw.startsWith("sha256:") ? raw.slice(7) : raw;
}

function defaultGithubClient() {
  return {
    getArtifact(id) {
      const raw = execSync(
        `gh api repos/phonarawd/AI-Profit-OS/actions/artifacts/${id}`,
        { encoding: "utf8" },
      );
      const a = JSON.parse(raw);
      return {
        id: String(a.id),
        name: a.name,
        digest: a.digest,
        expires_at: a.expires_at,
        expired: a.expired === true,
        workflow_run: { id: String(a.workflow_run && a.workflow_run.id) },
      };
    },
    getRun(id) {
      const raw = execSync(
        `gh api repos/phonarawd/AI-Profit-OS/actions/runs/${id}`,
        { encoding: "utf8" },
      );
      const r = JSON.parse(raw);
      return {
        id: String(r.id),
        event: r.event,
        conclusion: r.conclusion,
        head_sha: r.head_sha,
        head_branch: r.head_branch,
        status: r.status,
      };
    },
  };
}

function loadInput(opts) {
  if (opts.input && typeof opts.input === "object") return opts.input;
  const inputPath = opts.inputPath;
  if (!inputPath) fail("input manifest required (--input)", "INPUT_MISSING");
  if (!fs.existsSync(inputPath)) fail(`input manifest missing: ${inputPath}`, "INPUT_MISSING");
  return readJsonAbs(inputPath);
}

function requiredModesFrom(input) {
  if (input.required_modes && typeof input.required_modes === "object") {
    return { ...DEFAULT_REQUIRED_MODE, ...input.required_modes };
  }
  if (typeof input.required_mode === "string") {
    const out = { ...DEFAULT_REQUIRED_MODE };
    for (const id of QA1_TO_QA6) {
      if (id !== "QA1") out[id] = input.required_mode;
    }
    return out;
  }
  return { ...DEFAULT_REQUIRED_MODE };
}

function validateArtifactMeta(suiteId, spec, ghArtifact, nowMs) {
  if (spec.artifact_name === AGGREGATOR_ARTIFACT || ghArtifact.name === AGGREGATOR_ARTIFACT) {
    fail("engine-acceptance-evidence aggregator artifact is not an allowed publisher input", "AGGREGATOR_ARTIFACT");
  }
  const official = OFFICIAL_SUITE_ARTIFACT[suiteId];
  if (spec.artifact_name !== official) {
    fail(
      `${suiteId} artifact name must be ${official} (got ${spec.artifact_name})`,
      "ARTIFACT_NAME",
    );
  }
  if (ghArtifact.name !== official) {
    fail(
      `${suiteId} GitHub artifact name must be ${official} (got ${ghArtifact.name})`,
      "ARTIFACT_NAME",
    );
  }
  if (String(ghArtifact.id) !== String(spec.artifact_id)) {
    fail(
      `${suiteId} artifact id mismatch (input=${spec.artifact_id} github=${ghArtifact.id})`,
      "ARTIFACT_ID",
    );
  }
  if (normalizeDigest(ghArtifact.digest) !== normalizeDigest(spec.digest)) {
    fail(`${suiteId} artifact digest mismatch`, "ARTIFACT_DIGEST");
  }
  if (ghArtifact.expired === true) {
    fail(`${suiteId} artifact is expired`, "ARTIFACT_EXPIRED");
  }
  const exp = Date.parse(spec.expires_at || ghArtifact.expires_at || "");
  if (!Number.isFinite(exp) || exp <= nowMs) {
    fail(`${suiteId} artifact expires_at must be in the future`, "ARTIFACT_EXPIRED");
  }
  if (String(ghArtifact.workflow_run && ghArtifact.workflow_run.id) !== String(spec.run_id)) {
    fail(`${suiteId} artifact is not owned by declared run ${spec.run_id}`, "ARTIFACT_RUN");
  }
}

function validateRun(suiteId, spec, run, input) {
  if (String(run.id) !== String(spec.run_id)) {
    fail(`${suiteId} run id mismatch`, "RUN_ID");
  }
  if (run.event !== "workflow_dispatch") {
    fail(`${suiteId} run event must be workflow_dispatch (got ${run.event})`, "RUN_EVENT");
  }
  if (run.conclusion !== "success") {
    fail(`${suiteId} run conclusion must be success (got ${run.conclusion})`, "RUN_CONCLUSION");
  }
  if (run.head_sha !== input.expected_head_sha) {
    fail(`${suiteId} run head SHA mismatch`, "RUN_SHA");
  }
  if (run.head_branch !== input.target_branch) {
    fail(`${suiteId} run branch mismatch`, "RUN_BRANCH");
  }
}

function validateOwnedResult(suiteId, result, bytes, spec, baseline, tip, requiredModes) {
  if (!result || result.suite_id !== suiteId) {
    fail(`${suiteId} owned result.suite_id mismatch`, "OWNED_RESULT");
  }
  if (result.completion_status !== "COMPLETE") {
    fail(`${suiteId} result.completion_status must be COMPLETE`, "COMPLETION");
  }
  if (result.all_checks_pass !== true) {
    fail(`${suiteId} result.all_checks_pass must be true`, "ALL_CHECKS");
  }
  if (result.baseline_id !== baseline.id) {
    fail(`${suiteId} result.baseline_id must equal current baseline`, "BASELINE");
  }
  if (result.baseline_id !== spec.baseline_id && spec.baseline_id) {
    fail(`${suiteId} result baseline does not match input baseline`, "BASELINE");
  }
  if (result.checksum !== canonicalChecksum(result)) {
    fail(`${suiteId} result checksum does not match file payload`, "CHECKSUM");
  }
  if (spec.file_digest && spec.file_digest !== sha256Bytes(bytes)) {
    fail(`${suiteId} owned result file digest mismatch`, "FILE_DIGEST");
  }
  const wantMode = requiredModes[suiteId];
  if (wantMode && result.mode !== wantMode) {
    fail(`${suiteId} mode must be ${wantMode} (got ${result.mode})`, "MODE");
  }
  const p0 = (result.defects_counts && result.defects_counts.P0) || 0;
  const p1 = (result.defects_counts && result.defects_counts.P1) || 0;
  if (p0 > 0 || p1 > 0) {
    fail(`${suiteId} P0/P1 must be 0 (got ${p0}/${p1})`, "P0P1");
  }
  const pred = tip.predecessor_suite_checksums || {};
  if (result.checksum === pred[suiteId]) {
    fail(`${suiteId} result reuses predecessor checksum`, "PREDECESSOR");
  }
  if (result.baseline_id === tip.predecessor_baseline_id) {
    fail(`${suiteId} result is still bound to predecessor baseline`, "PREDECESSOR");
  }
}

function validateNoPredecessorSibling(suiteId, dir, result, tip) {
  const others = walkFiles(dir, []).filter((abs) => {
    const base = path.basename(abs);
    return /^qa[1-9]-result\.v1\.json$/.test(base) && base !== ownedResultName(suiteId);
  });
  for (const abs of others) {
    let sibling;
    try {
      sibling = readJsonAbs(abs);
    } catch {
      continue;
    }
    if (
      sibling.suite_id === suiteId ||
      (sibling.checksum && sibling.checksum === result.checksum)
    ) {
      fail(`${suiteId} must not consume a sibling/predecessor result file`, "PREDECESSOR");
    }
    if (
      sibling.baseline_id === tip.predecessor_baseline_id &&
      sibling.suite_id === suiteId
    ) {
      fail(`${suiteId} predecessor sibling result is not current-epoch evidence`, "PREDECESSOR");
    }
  }
}

function findHarness(dir, suiteId) {
  const spec = HARNESS_FILE[suiteId];
  if (!spec) return null;
  const hits = findByBasename(dir, spec.name);
  if (hits.length < 1) return null;
  return { abs: hits[0], spec, data: readJsonAbs(hits[0]) };
}

function validateHarnesses(suiteId, dir, result) {
  if (suiteId === "QA4") {
    const st = result.checks && result.checks.stateful_time;
    if (!st || !st.clock_hook || st.clock_hook.available !== true) {
      fail("QA4 real clock harness missing (clock_hook.available)", "HARNESS");
    }
    if (!st.harness_probe || st.harness_probe.available !== true) {
      fail("QA4 real clock harness missing (harness_probe.available)", "HARNESS");
    }
    const file = findHarness(dir, "QA4");
    if (!file) fail("QA4 clock harness file missing from official artifact", "HARNESS");
    if (file.data.schema !== file.spec.schema || file.data.harness_status !== "PASS") {
      fail("QA4 clock harness file is not a PASS official harness", "HARNESS");
    }
  }
  if (suiteId === "QA5") {
    const fw = result.checks && result.checks.failure_world;
    if (!fw || !fw.fault_hook || fw.fault_hook.available !== true) {
      fail("QA5 fault harness missing (fault_hook.available)", "HARNESS");
    }
    const file = findHarness(dir, "QA5");
    if (!file) fail("QA5 fault harness file missing from official artifact", "HARNESS");
    if (file.data.schema !== file.spec.schema || file.data.harness_status !== "PASS") {
      fail("QA5 fault harness file is not a PASS official harness", "HARNESS");
    }
  }
  if (suiteId === "QA6") {
    const pw = result.checks && result.checks.performance_world;
    if (!pw || !pw.threshold_mechanism || pw.threshold_mechanism.locked !== true) {
      fail("QA6 threshold harness missing (threshold_mechanism.locked)", "HARNESS");
    }
    const file = findHarness(dir, "QA6");
    if (!file) fail("QA6 threshold harness file missing from official artifact", "HARNESS");
    if (file.data.schema !== file.spec.schema || file.data.harness_status !== "PASS") {
      fail("QA6 threshold harness file is not a PASS official harness", "HARNESS");
    }
    const cum = result.critical_invariant_cumulative;
    if (
      !cum ||
      cum.blocked !== 0 ||
      cum.skipped !== 0 ||
      cum.uncovered !== 0 ||
      cum.failed !== 0
    ) {
      fail("QA6 cumulative critical invariant must be 0", "CRITICAL");
    }
  }
}

function buildReport({ baseline, evidence }) {
  return `# ENGINE ACCEPTANCE REPORT

> **QA phase:** QA-6 pre-QA7 checkpoint
> **baseline_id:** \`${baseline.id}\`
> **mode:** official GitHub Actions artifacts only

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
QA7 = NOT_STARTED
QA8 = STALE
QA9 = STALE_AGGREGATION
NEXT = QA7_AI_EVAL
PRODUCT MUTATION = 0
ENGINE_ACCEPTED_FOR_UI = NOT_ISSUED
UI_UX_ENTRY_GATE = CLOSED
\`\`\`

## Verdict

| Field | Value |
|---|---|
| verdict | \`${evidence.verdict}\` |
| reason | ${evidence.verdict_reason} |
| next | \`QA7_AI_EVAL\` |

QA1–QA6 are current-epoch COMPLETE from official suite artifacts. QA7 remains NOT_STARTED. QA8 remains STALE. QA9 remains STALE_AGGREGATION. This publisher does not issue ENGINE_ACCEPTED_FOR_UI.
`;
}

function cloneJson(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function buildEvidence({ evidence, baseline, accepted, qa6 }) {
  const next = cloneJson(evidence);
  next.qa_phase = "QA-6";
  next.next = "QA7_AI_EVAL";
  next.verdict = "ENGINE_QA_INCOMPLETE";
  next.verdict_reason =
    "QA1-QA6 COMPLETE from official current-SHA Actions artifacts · QA7 NOT_STARTED · QA8 STALE · QA9 STALE_AGGREGATION · ENGINE_ACCEPTED_FOR_UI forbidden";
  next.evidence_integrity = "VALID";
  const cum = qa6.critical_invariant_cumulative;
  next.critical_invariant = {
    blocked: cum.blocked,
    skipped: cum.skipped,
    uncovered: cum.uncovered,
    failed: cum.failed,
  };
  next.kill_switch = {
    ...(evidence.kill_switch || {}),
    verified_before_smoke: true,
    verified_before_qa1: true,
    verified_before_qa2: true,
    verified_before_qa3: true,
    verified_before_qa4: true,
    verified_before_qa5: true,
    verified_before_qa6: true,
    production_like_aborts: true,
  };
  if (next.current_epoch && typeof next.current_epoch === "object") {
    next.current_epoch = cloneJson(evidence.current_epoch);
    for (const [key, exact] of Object.entries(CURRENT_EPOCH_REBASE_SNAPSHOT)) {
      if (next.current_epoch[key] !== exact) {
        fail(
          `current_epoch.${key} rebase snapshot must remain ${exact}`,
          "CURRENT_EPOCH",
        );
      }
    }
  }
  next.suites = (evidence.suites || []).map((s) => {
    if (QA1_TO_QA6.includes(s.suite_id)) {
      const got = accepted[s.suite_id];
      const entry = {
        suite_id: s.suite_id,
        run_id: got.result.run_id,
        baseline_id: baseline.id,
        checksum: got.result.checksum,
        completion_status: "COMPLETE",
        result_ref: RESULT_RELS[s.suite_id],
      };
      if (got.result.mode) entry.mode = got.result.mode;
      return entry;
    }
    return cloneJson(s);
  });
  const qa7 = next.suites.find((s) => s.suite_id === "QA7");
  const qa8 = next.suites.find((s) => s.suite_id === "QA8");
  const qa9 = next.suites.find((s) => s.suite_id === "QA9");
  if (!qa7 || qa7.completion_status !== "NOT_STARTED") {
    fail("publisher must keep QA7 NOT_STARTED", "QA7_EARLY");
  }
  if (!qa8 || (qa8.completion_status !== "STALE" && qa8.completion_status !== "NOT_STARTED")) {
    fail("publisher must keep QA8 STALE", "QA8_EARLY");
  }
  if (qa8 && qa8.completion_status === "COMPLETE") {
    fail("publisher must not promote QA8 to COMPLETE", "QA8_EARLY");
  }
  if (!qa9 || (qa9.completion_status !== "STALE" && qa9.completion_status !== "NOT_STARTED")) {
    fail("publisher must keep QA9 STALE_AGGREGATION", "QA9_EARLY");
  }
  if (qa9 && qa9.completion_status === "COMPLETE") {
    fail("publisher must not promote QA9 to COMPLETE", "QA9_EARLY");
  }
  return next;
}

function snapshotBytes(root, rels) {
  const out = new Map();
  for (const rel of rels) {
    const abs = path.join(root, rel);
    out.set(rel, fs.existsSync(abs) ? fs.readFileSync(abs) : null);
  }
  return out;
}

function restoreBytes(root, snap) {
  for (const [rel, buf] of snap.entries()) {
    const abs = path.join(root, rel);
    if (buf == null) {
      if (fs.existsSync(abs)) fs.rmSync(abs);
    } else {
      fs.writeFileSync(abs, buf);
    }
  }
}

function atomicReplace(root, writes) {
  const rels = Object.keys(writes);
  const snap = snapshotBytes(root, rels);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aipo-qa1qa6-stage-"));
  try {
    const staged = [];
    for (const rel of rels) {
      const tmp = path.join(tmpDir, rel.replace(/[\\/]/g, "__"));
      fs.writeFileSync(tmp, writes[rel]);
      staged.push({ rel, tmp, dest: path.join(root, rel) });
    }
    for (const item of staged) {
      const destTmp = `${item.dest}.tmp-qa1qa6`;
      fs.copyFileSync(item.tmp, destTmp);
      try {
        fs.rmSync(item.dest, { force: true });
        fs.renameSync(destTmp, item.dest);
      } catch (e) {
        if (fs.existsSync(destTmp)) fs.rmSync(destTmp, { force: true });
        throw e;
      }
    }
  } catch (e) {
    restoreBytes(root, snap);
    throw e;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function buildCheckpointCtx(root, planned, extra) {
  const qa7Rel = RESULT_RELS.QA7;
  const qa8Rel = RESULT_RELS.QA8;
  const qa9Rel = RESULT_RELS.QA9;
  return {
    baseline: planned.baseline,
    evidence: planned.evidence,
    rebaseLedger: planned.rebaseLedger,
    amendmentLedger: planned.amendmentLedger,
    defects: planned.defects,
    results: planned.results,
    liveWorkflowHash: planned.liveWorkflowHash,
    headQa7Bytes: extra.headQa7Bytes,
    liveQa7Bytes: extra.liveQa7Bytes,
    qa7ResultDirty: false,
    headQa8Bytes: extra.headQa8Bytes,
    liveQa8Bytes: extra.liveQa8Bytes,
    qa8ResultDirty: false,
    headQa9Bytes: extra.headQa9Bytes,
    liveQa9Bytes: extra.liveQa9Bytes,
    qa9ResultDirty: false,
    _root: root,
    _qa7Rel: qa7Rel,
    _qa8Rel: qa8Rel,
    _qa9Rel: qa9Rel,
  };
}

function publishQa1Qa6Checkpoint(opts) {
  const root = opts.root || ROOT;
  const dryRun = opts.dryRun === true || opts.validateOnly === true;
  const input = loadInput(opts);
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const github = opts.githubClient || defaultGithubClient();

  const baseline = readJsonAbs(path.join(root, BASELINE_REL));
  const evidence = readJsonAbs(path.join(root, EVIDENCE_REL));
  const rebaseLedger = readJsonAbs(path.join(root, REBASE_REL));
  const amendmentLedger = readJsonAbs(path.join(root, AMEND_REL));
  const defects = readJsonAbs(path.join(root, DEFECTS_REL));
  const scope = readJsonAbs(path.join(root, SCOPE_REL));
  void scope;
  const tip = latestRebase(rebaseLedger);
  if (!tip) fail("product rebase ledger tip required", "REBASE");

  if (!input.expected_head_sha || !/^[0-9a-f]{40}$/i.test(input.expected_head_sha)) {
    fail("expected_head_sha must be 40-char hex", "HEAD_SHA");
  }
  if (!input.target_branch) fail("target_branch required", "BRANCH");
  if (input.baseline_id !== baseline.id) {
    fail("input baseline_id must equal current baseline.id", "BASELINE");
  }
  const liveWorkflowHash =
    opts.liveWorkflowHash || baseline.acceptance_workflow_hash;
  if (!input.workflow_hash_pin) fail("workflow_hash_pin required", "WORKFLOW_HASH");
  if (input.workflow_hash_pin !== liveWorkflowHash) {
    fail("workflow hash pin mismatch vs live/canonical hash", "WORKFLOW_HASH");
  }
  if (baseline.acceptance_workflow_hash !== input.workflow_hash_pin) {
    fail("workflow hash pin mismatch vs baseline.acceptance_workflow_hash", "WORKFLOW_HASH");
  }
  if (opts.headSha && opts.headSha !== input.expected_head_sha) {
    fail("opts.headSha must equal input.expected_head_sha", "HEAD_SHA");
  }

  const requiredModes = requiredModesFrom(input);
  const specs = input.suites || {};
  const seenIds = new Set();
  const seenNames = new Set();
  const seenRuns = new Set();
  const accepted = {};

  for (const suiteId of QA1_TO_QA6) {
    const spec = specs[suiteId];
    if (!spec) fail(`missing official artifact for ${suiteId}`, "MISSING_SUITE");
    if (spec.artifact_name === AGGREGATOR_ARTIFACT) {
      fail("engine-acceptance-evidence aggregator artifact is not an allowed publisher input", "AGGREGATOR_ARTIFACT");
    }
    if (seenIds.has(String(spec.artifact_id))) {
      fail(`duplicate artifact id ${spec.artifact_id}`, "DUPLICATE");
    }
    if (seenNames.has(spec.artifact_name)) {
      fail(`duplicate artifact name ${spec.artifact_name}`, "DUPLICATE");
    }
    seenIds.add(String(spec.artifact_id));
    seenNames.add(spec.artifact_name);

    const ghArtifact = github.getArtifact(spec.artifact_id);
    if (!ghArtifact) fail(`${suiteId} GitHub artifact ${spec.artifact_id} not found`, "ARTIFACT_ID");
    validateArtifactMeta(suiteId, spec, ghArtifact, nowMs);

    const run = github.getRun(spec.run_id);
    if (!run) fail(`${suiteId} GitHub run ${spec.run_id} not found`, "RUN_ID");
    validateRun(suiteId, spec, run, input);
    seenRuns.add(String(spec.run_id));

    if (!spec.dir || !fs.existsSync(spec.dir)) {
      fail(`${suiteId} artifact dir missing`, "ARTIFACT_DIR");
    }
    const ownedHits = findByBasename(spec.dir, ownedResultName(suiteId));
    if (ownedHits.length < 1) {
      fail(`${suiteId} owned result file missing in official artifact`, "OWNED_RESULT");
    }
    if (ownedHits.length > 1) {
      fail(`${suiteId} owned result file is duplicated in artifact`, "DUPLICATE");
    }
    const ownedAbs = ownedHits[0];
    const ownedBytes = fs.readFileSync(ownedAbs);
    const result = JSON.parse(ownedBytes.toString("utf8"));
    validateOwnedResult(suiteId, result, ownedBytes, spec, baseline, tip, requiredModes);
    validateNoPredecessorSibling(suiteId, spec.dir, result, tip);
    validateHarnesses(suiteId, spec.dir, result);
    accepted[suiteId] = { spec, result, bytes: ownedBytes, run };
  }

  if (specs.QA7 || specs.QA8 || specs.QA9) {
    fail("QA7/QA8/QA9 artifacts are not allowed in this publisher", "EARLY_SUITE");
  }

  const historical = {
    QA7: readJsonAbs(path.join(root, RESULT_RELS.QA7)),
    QA8: readJsonAbs(path.join(root, RESULT_RELS.QA8)),
    QA9: readJsonAbs(path.join(root, RESULT_RELS.QA9)),
  };
  const histBytes = {
    QA7: fs.readFileSync(path.join(root, RESULT_RELS.QA7)),
    QA8: fs.readFileSync(path.join(root, RESULT_RELS.QA8)),
    QA9: fs.readFileSync(path.join(root, RESULT_RELS.QA9)),
  };

  const plannedEvidence = buildEvidence({
    evidence,
    baseline,
    accepted,
    qa6: accepted.QA6.result,
  });
  const plannedResults = {
    QA1: accepted.QA1.result,
    QA2: accepted.QA2.result,
    QA3: accepted.QA3.result,
    QA4: accepted.QA4.result,
    QA5: accepted.QA5.result,
    QA6: accepted.QA6.result,
    QA7: historical.QA7,
    QA8: historical.QA8,
    QA9: historical.QA9,
  };
  const histText = {
    QA7: histBytes.QA7.toString("utf8").replace(/\r\n/g, "\n").trim(),
    QA8: histBytes.QA8.toString("utf8").replace(/\r\n/g, "\n").trim(),
    QA9: histBytes.QA9.toString("utf8").replace(/\r\n/g, "\n").trim(),
  };
  const ctx = buildCheckpointCtx(
    root,
    {
      baseline,
      evidence: plannedEvidence,
      rebaseLedger,
      amendmentLedger,
      defects,
      results: plannedResults,
      liveWorkflowHash,
    },
    {
      headQa7Bytes: histText.QA7,
      liveQa7Bytes: histText.QA7,
      headQa8Bytes: histText.QA8,
      liveQa8Bytes: histText.QA8,
      headQa9Bytes: histText.QA9,
      liveQa9Bytes: histText.QA9,
    },
  );
  const checkpointFails = [];
  verifyCurrentEpochPreQa7Checkpoint(ctx, checkpointFails);
  if (checkpointFails.length) {
    fail(`pre-QA7 checkpoint verifier rejected plan: ${checkpointFails.join("; ")}`, "CHECKPOINT");
  }
  if (!isCurrentEpochPreQa7Checkpoint(ctx)) {
    fail("planned output is not a valid current-epoch pre-QA7 checkpoint", "CHECKPOINT");
  }

  const report = buildReport({ baseline, evidence: plannedEvidence });
  const writes = {
    [RESULT_RELS.QA1]: accepted.QA1.bytes,
    [RESULT_RELS.QA2]: accepted.QA2.bytes,
    [RESULT_RELS.QA3]: accepted.QA3.bytes,
    [RESULT_RELS.QA4]: accepted.QA4.bytes,
    [RESULT_RELS.QA5]: accepted.QA5.bytes,
    [RESULT_RELS.QA6]: accepted.QA6.bytes,
    [EVIDENCE_REL]: Buffer.from(`${JSON.stringify(plannedEvidence, null, 2)}\n`, "utf8"),
    [REPORT_REL]: Buffer.from(report, "utf8"),
  };

  const guarded = [
    RESULT_RELS.QA7,
    RESULT_RELS.QA8,
    RESULT_RELS.QA9,
    BASELINE_REL,
    REBASE_REL,
  ];
  const beforeGuarded = snapshotBytes(root, guarded);

  const out = {
    status: dryRun ? "QA1_QA6_CHECKPOINT_VALIDATED" : "QA1_QA6_CHECKPOINT_PUBLISHED",
    dry_run: dryRun,
    baseline_id: baseline.id,
    suites: QA1_TO_QA6.map((id) => ({
      suite_id: id,
      run_id: accepted[id].result.run_id,
      checksum: accepted[id].result.checksum,
      artifact_id: String(accepted[id].spec.artifact_id),
      actions_run_id: String(accepted[id].spec.run_id),
    })),
    qa7: "NOT_STARTED",
    qa8: "STALE",
    qa9: "STALE_AGGREGATION",
    next: "QA7_AI_EVAL",
    engine_accepted_for_ui: "NOT_ISSUED",
  };

  if (dryRun) return out;
  if (opts.failBeforeReplace === true) {
    fail("injected failBeforeReplace — destination files must stay unchanged", "INJECTED_FAIL");
  }
  atomicReplace(root, writes);
  for (const rel of guarded) {
    const prev = beforeGuarded.get(rel);
    const now = fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel)) : null;
    if (Boolean(prev) !== Boolean(now) || (prev && now && !prev.equals(now))) {
      restoreBytes(root, beforeGuarded);
      fail(`${rel} changed unexpectedly — restored`, "GUARDED_FILE");
    }
  }
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  try {
    const out = publishQa1Qa6Checkpoint({
      inputPath: getArg(argv, "--input"),
      dryRun: argv.includes("--dry-run") || argv.includes("--validate-only"),
      validateOnly: argv.includes("--validate-only"),
      headSha: getArg(argv, "--head-sha"),
    });
    console.log("[engine-acceptance:publish-qa1-qa6-checkpoint] " + out.status);
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error(`[engine-acceptance:publish-qa1-qa6-checkpoint] ABORT — ${e.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  publishQa1Qa6Checkpoint,
  OFFICIAL_SUITE_ARTIFACT,
  AGGREGATOR_ARTIFACT,
  DEFAULT_REQUIRED_MODE,
};

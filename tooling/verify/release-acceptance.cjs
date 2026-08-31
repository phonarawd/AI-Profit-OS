"use strict";

const fs = require("fs");
const path = require("path");
const { evaluateVerdict, loadContract } = require("../release/release-acceptance-verdict.cjs");
const { evaluateGuard } = require("../release/require-accepted-sha.cjs");
const {
  collectFromJobs,
  collectFromRun,
  canonicalizeJobName,
  MATRIX_JOB_IDS,
} = require("../release/collect-engine-jobs.cjs");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

const contract = loadContract(root);
if (contract.aggregator_is_not_verdict !== true) fail("contract must separate aggregator");
if (!Array.isArray(contract.mandatory_core) || contract.mandatory_core.length < 11) {
  fail("mandatory_core incomplete");
}
if (contract.mandatory_core.includes("qa-matrix")) {
  fail("bare qa-matrix is not a GitHub job name");
}
for (const id of MATRIX_JOB_IDS) {
  if (!contract.mandatory_core.includes(id)) fail("mandatory_core missing " + id);
}
if (!contract.mandatory_when_full_dispatch.includes("qa7-ai-eval")) {
  fail("qa7 must be mandatory on full dispatch");
}
if (!contract.engine_run_binding || contract.engine_run_binding.head_sha_equals_requested_sha !== true) {
  fail("engine_run_binding must force same SHA");
}
if (contract.engine_run_binding.event !== "workflow_dispatch") {
  fail("engine_run_binding.event must be workflow_dispatch");
}
if (contract.engine_run_binding.qa_phase !== "full") {
  fail("engine_run_binding.qa_phase must be full");
}
if (contract.engine_run_binding.workflow_path_authoritative !== true) {
  fail("workflow path must be authoritative");
}
if (contract.engine_run_binding.workflow_name_auxiliary_only !== true) {
  fail("workflow name must be auxiliary only");
}
if (!contract.artifact_provenance || contract.artifact_provenance.build_once !== true) {
  fail("artifact provenance must require build once");
}
if (contract.artifact_provenance.deploy_rebuild_forbidden !== true) {
  fail("deploy rebuild must be forbidden");
}
if (contract.production_release_requires.artifact_digest !== true) {
  fail("production release must require artifact digest");
}

const ARTIFACT_DIGEST = "c".repeat(64);
function withQa(input) {
  return {
    ...input,
    artifact_qa: {
      verified: true,
      source_sha: input.sha,
      artifact_digest: ARTIFACT_DIGEST,
      built_once: true,
    },
  };
}

const successJobs = {
  "qa0-baseline": "success",
  "qa1-deterministic": "success",
  "qa2-synthetic-personas": "success",
  "qa-matrix:QA3": "success",
  "qa-matrix:QA4": "success",
  "qa-matrix:QA5": "success",
  "qa-matrix:QA6": "success",
  "qa-matrix:QA8": "success",
  "qa5-fault": "success",
  "qa6-measure": "success",
  "qa8-adversarial": "success",
  "qa7-ai-eval": "success",
  aggregator: "success",
};

function check(name, got, expectVerdict) {
  if (got.verdict !== expectVerdict) {
    fail(name + " expected " + expectVerdict + " got " + got.verdict + " " + got.fails.join(","));
  }
}

check(
  "all_success_full",
  evaluateVerdict(
    withQa({ sha: "a".repeat(40), event_name: "workflow_dispatch", qa_phase: "full", jobs: successJobs }),
    contract,
  ),
  "PASS",
);

check(
  "full_without_artifact_qa",
  evaluateVerdict(
    { sha: "a".repeat(40), event_name: "workflow_dispatch", qa_phase: "full", jobs: successJobs },
    contract,
  ),
  "FAIL",
);

check(
  "qa7_fail_full",
  evaluateVerdict(
    withQa({
      sha: "a".repeat(40),
      event_name: "workflow_dispatch",
      qa_phase: "full",
      jobs: { ...successJobs, "qa7-ai-eval": "failure" },
    }),
    contract,
  ),
  "FAIL",
);

check(
  "qa6_matrix_fail",
  evaluateVerdict(
    withQa({
      sha: "a".repeat(40),
      event_name: "workflow_dispatch",
      qa_phase: "full",
      jobs: { ...successJobs, "qa-matrix:QA6": "failure" },
    }),
    contract,
  ),
  "FAIL",
);

check(
  "qa3_matrix_missing",
  evaluateVerdict(
    withQa({
      sha: "a".repeat(40),
      event_name: "workflow_dispatch",
      qa_phase: "full",
      jobs: { ...successJobs, "qa-matrix:QA3": "missing" },
    }),
    contract,
  ),
  "FAIL",
);

check(
  "qa8_fail",
  evaluateVerdict(
    withQa({
      sha: "a".repeat(40),
      event_name: "workflow_dispatch",
      qa_phase: "full",
      jobs: { ...successJobs, "qa8-adversarial": "failure" },
    }),
    contract,
  ),
  "FAIL",
);

check(
  "unexpected_skip",
  evaluateVerdict(
    withQa({
      sha: "a".repeat(40),
      event_name: "workflow_dispatch",
      qa_phase: "full",
      jobs: { ...successJobs, "qa5-fault": "skipped" },
    }),
    contract,
  ),
  "FAIL",
);

check(
  "qa7_skip_on_pr_allowed",
  evaluateVerdict(
    {
      sha: "a".repeat(40),
      event_name: "pull_request",
      qa_phase: "",
      jobs: { ...successJobs, "qa7-ai-eval": "skipped" },
    },
    contract,
  ),
  "PASS",
);

const aggregatorGreen = evaluateVerdict(
  withQa({
    sha: "a".repeat(40),
    event_name: "workflow_dispatch",
    qa_phase: "full",
    jobs: { ...successJobs, "qa7-ai-eval": "failure", aggregator: "success" },
  }),
  contract,
);
if (aggregatorGreen.verdict !== "FAIL") {
  fail("aggregator success must not hide QA7 failure");
}

const sha = "0a72b27dd0da3c422eca0f931cf668e7a760c8ec";
const passVerdict = {
  verdict: "PASS",
  kind: "PRODUCTION_RELEASE",
  sha,
  artifact_digest: ARTIFACT_DIGEST,
  artifact_source_sha: sha,
};
const tmp = path.join(root, "tooling/release/_tmp_verdict.json");
fs.writeFileSync(tmp, JSON.stringify(passVerdict));

let g = evaluateGuard({ target: "preview", sha, artifact: tmp });
if (!g.ok) fail("preview deploy should be allowed");

g = evaluateGuard({ target: "production", sha: "deadbeef", artifact: tmp });
if (g.ok) fail("short sha must block production");

g = evaluateGuard({ target: "production", sha: "b".repeat(40), artifact: tmp });
if (g.ok || g.reason !== "sha_mismatch") fail("sha mismatch must block");

g = evaluateGuard({
  target: "production",
  sha,
  verdict: { verdict: "FAIL", kind: "PRODUCTION_RELEASE", sha, artifact_digest: ARTIFACT_DIGEST },
});
if (g.ok) fail("failed acceptance must block production");

g = evaluateGuard({ target: "production", sha });
if (g.ok) fail("missing acceptance artifact must block production");

g = evaluateGuard({ target: "production", sha, artifact: tmp });
if (g.ok || g.reason !== "expected_digest_missing") fail("production must require expected digest");

g = evaluateGuard({ target: "production", sha, artifact: tmp, expectedDigest: ARTIFACT_DIGEST });
if (!g.ok) fail("matching accepted sha+digest must allow production guard");

g = evaluateGuard({ target: "production", sha, artifact: tmp, expectedDigest: "d".repeat(64) });
if (g.ok || g.reason !== "artifact_digest_mismatch") fail("digest mismatch must block");

const noDigest = path.join(root, "tooling/release/_tmp_verdict_nodigest.json");
fs.writeFileSync(noDigest, JSON.stringify({ verdict: "PASS", kind: "PRODUCTION_RELEASE", sha }));
g = evaluateGuard({
  target: "production",
  sha,
  artifact: noDigest,
  expectedDigest: ARTIFACT_DIGEST,
});
if (g.ok || g.reason !== "artifact_digest_missing") fail("missing verdict digest must block");
fs.unlinkSync(noDigest);

fs.unlinkSync(tmp);

if (canonicalizeJobName("qa-matrix (QA3)") !== "qa-matrix:QA3") {
  fail("canonicalize qa-matrix (QA3)");
}
if (canonicalizeJobName("qa-matrix (QA8)") !== "qa-matrix:QA8") {
  fail("canonicalize qa-matrix (QA8)");
}
if (canonicalizeJobName("qa-matrix") !== "qa-matrix") {
  fail("bare qa-matrix must stay bare so it cannot fill a cell");
}

const apiJobs = [
  { name: "qa0-baseline", conclusion: "success" },
  { name: "qa1-deterministic", conclusion: "success" },
  { name: "qa2-synthetic-personas", conclusion: "success" },
  { name: "qa-matrix (QA3)", conclusion: "success" },
  { name: "qa-matrix (QA4)", conclusion: "success" },
  { name: "qa-matrix (QA5)", conclusion: "success" },
  { name: "qa-matrix (QA6)", conclusion: "success" },
  { name: "qa-matrix (QA8)", conclusion: "success" },
  { name: "qa7-ai-eval", conclusion: "success" },
  { name: "qa5-fault", conclusion: "success" },
  { name: "qa6-measure", conclusion: "success" },
  { name: "qa8-adversarial", conclusion: "success" },
  { name: "aggregator", conclusion: "success" },
];

const collectedNames = collectFromJobs(apiJobs, { sha: "a".repeat(40), eventName: "", qaPhase: "" });
for (const id of MATRIX_JOB_IDS) {
  if (collectedNames.jobs[id] !== "success") fail("matrix cell " + id + " must map from 'qa-matrix (QAn)'");
}
if (collectedNames.jobs["qa-matrix"] != null) fail("collector must not emit bare qa-matrix key");

const absent = collectFromJobs(
  [
    { name: "qa0-baseline", conclusion: "success" },
    { name: "qa7-ai-eval", conclusion: "success" },
    { name: "aggregator", conclusion: "success" },
  ],
  { sha: "a".repeat(40), eventName: "workflow_dispatch" },
);
if (absent.jobs["qa-matrix:QA3"] !== "missing") fail("absent matrix cells must be missing");
if (absent.qa_phase === "full") fail("collectFromJobs must not infer qa_phase=full from caller/event");

const collapsed = collectFromJobs(
  [
    { name: "qa-matrix", conclusion: "success" },
    { name: "qa0-baseline", conclusion: "success" },
  ],
  { sha: "a".repeat(40) },
);
if (collapsed.jobs["qa-matrix:QA3"] !== "missing") {
  fail("bare qa-matrix success must not satisfy qa-matrix:QA3");
}

const fullSha = "b92ed8b889254e0f2f71b602b142d7d410ca5201";
const boundRun = {
  id: 33240856583,
  name: "engine-acceptance",
  path: ".github/workflows/engine-acceptance.yml",
  head_sha: fullSha,
  event: "workflow_dispatch",
  status: "completed",
  inputs: { qa_phase: "full" },
};

const bound = collectFromRun({ run: boundRun, jobs: apiJobs, requestedSha: fullSha });
if (bound.sha !== fullSha) fail("bound sha must come from run.head_sha");
if (bound.event_name !== "workflow_dispatch") fail("bound event must come from run");
if (bound.qa_phase !== "full") fail("bound qa_phase must be full");
if (!bound.engine_run || bound.engine_run.head_sha !== fullSha) fail("engine_run metadata missing");

const signatureOnly = collectFromRun({
  run: { ...boundRun, inputs: undefined },
  jobs: apiJobs,
  requestedSha: fullSha,
});
if (signatureOnly.qa_phase !== "full" || signatureOnly.engine_run.qa_phase_proof !== "full_job_signature") {
  fail("missing run.inputs must still prove full via job signature");
}

function expectClosed(name, fn, needle) {
  try {
    fn();
    fail(name + " should FAIL_CLOSED");
  } catch (err) {
    const text = ((err && err.fails) || []).join(" ") + " " + (err && err.message ? err.message : "");
    if (!text.includes(needle)) fail(name + " expected " + needle + " got " + text);
  }
}

expectClosed(
  "sha_spoof",
  () =>
    collectFromRun({
      run: boundRun,
      jobs: apiJobs,
      requestedSha: "c".repeat(40),
    }),
  "engine_head_sha_mismatch",
);

expectClosed(
  "wrong_workflow",
  () =>
    collectFromRun({
      run: { ...boundRun, name: "engine-acceptance-heavy", path: ".github/workflows/engine-acceptance-heavy.yml" },
      jobs: apiJobs,
      requestedSha: fullSha,
    }),
  "engine_workflow_mismatch",
);

expectClosed(
  "same_name_wrong_path",
  () =>
    collectFromRun({
      run: { ...boundRun, name: "engine-acceptance", path: ".github/workflows/gate.yml" },
      jobs: apiJobs,
      requestedSha: fullSha,
    }),
  "engine_workflow_mismatch",
);

expectClosed(
  "missing_path_name_only",
  () =>
    collectFromRun({
      run: { ...boundRun, name: "engine-acceptance", path: "" },
      jobs: apiJobs,
      requestedSha: fullSha,
    }),
  "engine_workflow_mismatch",
);

const pathAuthoritative = collectFromRun({
  run: { ...boundRun, name: "not-the-display-name", path: ".github/workflows/engine-acceptance.yml" },
  jobs: apiJobs,
  requestedSha: fullSha,
});
if (pathAuthoritative.sha !== fullSha) fail("correct workflow path must bind even if display name differs");

expectClosed(
  "pr_event",
  () =>
    collectFromRun({
      run: { ...boundRun, event: "pull_request" },
      jobs: apiJobs,
      requestedSha: fullSha,
    }),
  "engine_event_not_workflow_dispatch",
);

expectClosed(
  "qa6_only",
  () =>
    collectFromRun({
      run: { ...boundRun, inputs: { qa_phase: "qa6" } },
      jobs: apiJobs,
      requestedSha: fullSha,
    }),
  "engine_qa_phase_not_full",
);

expectClosed(
  "in_progress",
  () =>
    collectFromRun({
      run: { ...boundRun, status: "in_progress" },
      jobs: apiJobs,
      requestedSha: fullSha,
    }),
  "engine_status_not_completed",
);

expectClosed(
  "unproven_phase",
  () =>
    collectFromRun({
      run: { ...boundRun, inputs: undefined },
      jobs: [
        { name: "qa0-baseline", conclusion: "success" },
        { name: "qa-matrix (QA3)", conclusion: "success" },
        { name: "aggregator", conclusion: "success" },
      ],
      requestedSha: fullSha,
    }),
  "engine_qa_phase_not_full",
);

const callerLie = evaluateVerdict(
  {
    sha: "d".repeat(40),
    event_name: "pull_request",
    qa_phase: "",
    jobs: successJobs,
    engine_run: {
      head_sha: fullSha,
      event: "workflow_dispatch",
      qa_phase: "full",
    },
  },
  contract,
);
if (callerLie.sha !== fullSha) fail("verdict sha must prefer engine_run.head_sha over caller");
if (callerLie.kind !== "PRODUCTION_RELEASE") fail("verdict must prefer engine_run event/phase over caller");

const wf = fs.readFileSync(path.join(root, ".github/workflows/release-acceptance.yml"), "utf8");
if (!/release-acceptance-verdict\.cjs/.test(wf)) {
  fail("release-acceptance.yml must invoke release-acceptance-verdict.cjs");
}
if (!/workflow_run:/.test(wf)) fail("release-acceptance.yml must follow engine-acceptance via workflow_run");
if (/--event-name/.test(wf)) fail("release-acceptance.yml must not pass caller event-name to collector");
if (!/workflow_run\.event == 'workflow_dispatch'/.test(wf)) {
  fail("release-acceptance.yml must ignore non-dispatch engine runs");
}
if (!/bind-qa-artifact\.cjs/.test(wf) || !/fetch-release-bundle\.cjs/.test(wf)) {
  fail("release-acceptance.yml must bind release artifact digest");
}
if (!/--artifact-qa/.test(wf)) fail("release-acceptance.yml must pass artifact-qa into verdict");

const deploy = fs.readFileSync(path.join(root, ".github/workflows/deploy-cloudflare.yml"), "utf8");
if (!/require-accepted-sha\.cjs/.test(deploy)) {
  fail("deploy-cloudflare.yml must invoke require-accepted-sha.cjs");
}
if (!/--expected-digest/.test(deploy)) {
  fail("deploy-cloudflare.yml must pass expected digest");
}
if (!/deploy-from-artifact\.cjs/.test(deploy) || !/fetch-release-bundle\.cjs/.test(deploy)) {
  fail("deploy-cloudflare.yml must deploy the accepted artifact");
}
if (/inputs\.target == 'production'[\s\S]*build:cf/.test(deploy)) {
  fail("production deploy must not rebuild");
}

const buildWf = fs.readFileSync(path.join(root, ".github/workflows/release-build.yml"), "utf8");
if (!/workflow_dispatch:/.test(buildWf)) fail("release-build.yml must be workflow_dispatch");
if (/\npull_request:|\npush:/.test(buildWf)) fail("release-build.yml must not auto-build on push/PR");
if (!/build-once-artifact\.cjs/.test(buildWf)) fail("release-build.yml must pack once");
if (!/name: release-bundle/.test(buildWf)) fail("release-build.yml must upload release-bundle");

const deployFrom = fs.readFileSync(path.join(root, "tooling/release/deploy-from-artifact.cjs"), "utf8");
if (/--filter[\s\S]{0,40}build:cf/.test(deployFrom)) fail("deploy-from-artifact must not rebuild");
if (!/--no-rebuild/.test(deployFrom)) fail("deploy-from-artifact must force --no-rebuild");

const os = require("os");
const { packFromPayload, verifyBundle } = require("../release/artifact-provenance.cjs");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aipo-relart-"));
try {
  const payloadSrc = path.join(tmpRoot, "src");
  fs.mkdirSync(path.join(payloadSrc, "apps/web/.open-next/assets"), { recursive: true });
  fs.writeFileSync(path.join(payloadSrc, "apps/web/.open-next/worker.js"), "web-worker");
  fs.writeFileSync(path.join(payloadSrc, "apps/web/.open-next/assets/a.txt"), "asset");
  const bundle = path.join(tmpRoot, "bundle");
  const packed = packFromPayload(payloadSrc, bundle, fullSha);
  if (!/^[0-9a-f]{64}$/.test(packed.artifact_digest)) fail("pack must emit sha256 digest");
  const verified = verifyBundle(bundle, { sourceSha: fullSha, digest: packed.artifact_digest });
  if (verified.digest !== packed.artifact_digest) fail("qa digest must match packed digest");
  try {
    packFromPayload(payloadSrc, bundle, fullSha);
    fail("second pack must be forbidden");
  } catch (err) {
    const text = ((err && err.fails) || []).join(" ");
    if (!text.includes("artifact_rebuild_forbidden")) fail("rebuild must be artifact_rebuild_forbidden");
  }
  try {
    verifyBundle(bundle, { sourceSha: "c".repeat(40), digest: packed.artifact_digest });
    fail("other sha artifact must fail");
  } catch (err) {
    const text = ((err && err.fails) || []).join(" ");
    if (!text.includes("artifact_source_sha_mismatch")) fail("other sha must be artifact_source_sha_mismatch");
  }
  fs.writeFileSync(path.join(bundle, "payload", "apps/web/.open-next/worker.js"), "tampered");
  try {
    verifyBundle(bundle, { sourceSha: fullSha, digest: packed.artifact_digest });
    fail("tampered digest must fail");
  } catch (err) {
    const text = ((err && err.fails) || []).join(" ");
    if (!text.includes("digest_mismatch")) fail("tamper must be digest_mismatch");
  }
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}

const pkg = fs.readFileSync(path.join(root, "package.json"), "utf8");
if (!pkg.includes('"verify:release-acceptance"')) {
  fail("package.json missing verify:release-acceptance");
}

if (fails.length) {
  console.error("[verify:release-acceptance] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:release-acceptance] PASS");

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
if (contract.production_release_requires.runtime_qa !== true) {
  fail("production release must require artifact runtime QA");
}
if (contract.production_release_requires.api_runtime_qa !== true) {
  fail("production release must require API runtime QA");
}
if (!contract.artifact_provenance || contract.artifact_provenance.runtime_qa_required !== true) {
  fail("artifact provenance must require runtime QA");
}
if (contract.artifact_provenance.api_runtime_qa_required !== true) {
  fail("artifact provenance must require API runtime QA");
}
if (contract.artifact_provenance.worker_prebuilt !== true) {
  fail("artifact provenance must require worker prebuilt");
}
if (contract.artifact_provenance.worker_deploy_no_bundle !== true) {
  fail("artifact provenance must require worker no-bundle deploy");
}
if (contract.artifact_provenance.successful_builds_pagination !== true) {
  fail("artifact provenance must paginate successful builds");
}
const artifactContract = JSON.parse(
  fs.readFileSync(path.join(root, "governance/release-master/release-artifact.v1.json"), "utf8"),
);
if (artifactContract.runtime_qa_required !== true) fail("release-artifact contract must require runtime QA");
if (artifactContract.api_runtime_qa_required !== true) fail("release-artifact contract must require API runtime QA");
if (artifactContract.worker_prebuilt !== true) fail("release-artifact contract must require worker prebuilt");
if (artifactContract.worker_deploy_no_bundle !== true) {
  fail("release-artifact contract must require worker no-bundle");
}
if (artifactContract.successful_builds_pagination !== true) {
  fail("release-artifact contract must paginate successful builds");
}

const ARTIFACT_DIGEST = "c".repeat(64);
function withQa(input) {
  const engine_run =
    input.engine_run ||
    (input.event_name === "workflow_dispatch" && input.qa_phase === "full"
      ? {
          id: 123456789,
          workflow: "engine-acceptance",
          workflow_name_auxiliary: true,
          path: ".github/workflows/engine-acceptance.yml",
          head_sha: input.sha,
          event: "workflow_dispatch",
          qa_phase: "full",
          qa_phase_proof: "full_job_signature",
          status: "completed",
        }
      : undefined);
  return {
    ...input,
    ...(engine_run ? { engine_run } : {}),
    artifact_qa: {
      verified: true,
      source_sha: input.sha,
      artifact_digest: ARTIFACT_DIGEST,
      built_once: true,
      runtime: {
        verified: true,
        artifact_digest: ARTIFACT_DIGEST,
        no_bundle: true,
      },
      api_runtime: {
        verified: true,
        source_sha: input.sha,
        git_sha: input.sha,
        git_sha_source: "RENDER_GIT_COMMIT",
        bundle_digest: ARTIFACT_DIGEST,
        api_artifact_digest: "e".repeat(64),
        service: "api-nest",
      },
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

const noEngineBinding = withQa({
  sha: "a".repeat(40),
  event_name: "workflow_dispatch",
  qa_phase: "full",
  jobs: successJobs,
});
delete noEngineBinding.engine_run;
const noEngineVerdict = evaluateVerdict(noEngineBinding, contract);
if (
  noEngineVerdict.verdict !== "FAIL" ||
  !noEngineVerdict.fails.includes("engine_run_binding_missing")
) {
  fail("Production release without bound Engine run must FAIL");
}

const wrongVerdictEnginePath = withQa({
  sha: "a".repeat(40),
  event_name: "workflow_dispatch",
  qa_phase: "full",
  jobs: successJobs,
});
wrongVerdictEnginePath.engine_run.path = ".github/workflows/gate.yml";
const wrongPathVerdict = evaluateVerdict(wrongVerdictEnginePath, contract);
if (
  wrongPathVerdict.verdict !== "FAIL" ||
  !wrongPathVerdict.fails.includes("engine_run_workflow_path_mismatch")
) {
  fail("Production verdict must reject wrong Engine workflow path");
}

const unprovenVerdictPhase = withQa({
  sha: "a".repeat(40),
  event_name: "workflow_dispatch",
  qa_phase: "full",
  jobs: successJobs,
});
unprovenVerdictPhase.engine_run.qa_phase_proof = "caller_claim";
const unprovenPhaseVerdict = evaluateVerdict(unprovenVerdictPhase, contract);
if (
  unprovenPhaseVerdict.verdict !== "FAIL" ||
  !unprovenPhaseVerdict.fails.includes("engine_run_phase_proof_invalid")
) {
  fail("Production verdict must reject unproven Engine full phase");
}

const shortEngineHead = withQa({
  sha: "a".repeat(40),
  event_name: "workflow_dispatch",
  qa_phase: "full",
  jobs: successJobs,
});
shortEngineHead.engine_run.head_sha = "deadbeef";
const shortHeadVerdict = evaluateVerdict(shortEngineHead, contract);
if (
  shortHeadVerdict.verdict !== "FAIL" ||
  !shortHeadVerdict.fails.includes("engine_run_head_sha_invalid")
) {
  fail("Production verdict must reject short Engine head SHA");
}

const wrongEngineEvent = withQa({
  sha: "a".repeat(40),
  event_name: "workflow_dispatch",
  qa_phase: "full",
  jobs: successJobs,
});
wrongEngineEvent.engine_run.event = "";
const wrongEventVerdict = evaluateVerdict(wrongEngineEvent, contract);
if (
  wrongEventVerdict.verdict !== "FAIL" ||
  !wrongEventVerdict.fails.includes("engine_run_event_invalid")
) {
  fail("Production verdict must reject Engine run without workflow_dispatch");
}

const incompleteEngine = withQa({
  sha: "a".repeat(40),
  event_name: "workflow_dispatch",
  qa_phase: "full",
  jobs: successJobs,
});
incompleteEngine.engine_run.status = "in_progress";
const incompleteVerdict = evaluateVerdict(incompleteEngine, contract);
if (
  incompleteVerdict.verdict !== "FAIL" ||
  !incompleteVerdict.fails.includes("engine_run_status_invalid")
) {
  fail("Production verdict must reject incomplete Engine run");
}

const nameOnlyAuthority = withQa({
  sha: "a".repeat(40),
  event_name: "workflow_dispatch",
  qa_phase: "full",
  jobs: successJobs,
});
nameOnlyAuthority.engine_run.workflow_name_auxiliary = false;
const nameOnlyVerdict = evaluateVerdict(nameOnlyAuthority, contract);
if (
  nameOnlyVerdict.verdict !== "FAIL" ||
  !nameOnlyVerdict.fails.includes("engine_run_path_authority_unproven")
) {
  fail("Production verdict must require path authority over workflow name");
}

check(
  "full_without_artifact_qa",
  evaluateVerdict(
    { sha: "a".repeat(40), event_name: "workflow_dispatch", qa_phase: "full", jobs: successJobs },
    contract,
  ),
  "FAIL",
);

check(
  "full_without_runtime_qa",
  evaluateVerdict(
    {
      sha: "a".repeat(40),
      event_name: "workflow_dispatch",
      qa_phase: "full",
      jobs: successJobs,
      artifact_qa: {
        verified: true,
        source_sha: "a".repeat(40),
        artifact_digest: ARTIFACT_DIGEST,
        built_once: true,
      },
    },
    contract,
  ),
  "FAIL",
);


const noApiRuntime = withQa({
  sha: "a".repeat(40),
  event_name: "workflow_dispatch",
  qa_phase: "full",
  jobs: successJobs,
});
delete noApiRuntime.artifact_qa.api_runtime;
const noApiVerdict = evaluateVerdict(noApiRuntime, contract);
if (
  noApiVerdict.verdict !== "FAIL" ||
  !noApiVerdict.fails.includes("api_artifact_runtime_qa_missing")
) {
  fail("full release without API runtime QA must FAIL");
}

const runtimeDigestLie = evaluateVerdict(
  {
    sha: "a".repeat(40),
    event_name: "workflow_dispatch",
    qa_phase: "full",
    jobs: successJobs,
    artifact_qa: {
      verified: true,
      source_sha: "a".repeat(40),
      artifact_digest: ARTIFACT_DIGEST,
      built_once: true,
      runtime: { verified: true, artifact_digest: "d".repeat(64) },
    },
  },
  contract,
);
if (runtimeDigestLie.verdict !== "FAIL" || !runtimeDigestLie.fails.includes("artifact_runtime_digest_mismatch")) {
  fail("runtime digest mismatch must fail verdict");
}

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
  schema: "release-acceptance-verdict.v1",
  verdict: "PASS",
  kind: "PRODUCTION_RELEASE",
  qa_phase: "full",
  sha,
  artifact_digest: ARTIFACT_DIGEST,
  artifact_source_sha: sha,
  artifact_built_once: true,
  api_runtime_verified: true,
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
fs.writeFileSync(
  noDigest,
  JSON.stringify({
    schema: "release-acceptance-verdict.v1",
    verdict: "PASS",
    kind: "PRODUCTION_RELEASE",
    qa_phase: "full",
    sha,
    artifact_source_sha: sha,
    artifact_built_once: true,
    api_runtime_verified: true,
  }),
);
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
if (!/artifact-runtime-qa\.cjs/.test(wf)) {
  fail("release-acceptance.yml must run artifact runtime QA");
}
if (!/api-artifact-runtime-qa\.cjs/.test(wf)) {
  fail("release-acceptance.yml must run exact bundled API runtime QA");
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
if (!/prebuild-workers\.cjs/.test(buildWf)) fail("release-build.yml must prebuild workers");
if (buildWf.indexOf("prebuild-workers.cjs") > buildWf.indexOf("build-once-artifact.cjs")) {
  fail("release-build.yml must prebuild workers before packing");
}
if (!/name: release-bundle/.test(buildWf)) fail("release-build.yml must upload release-bundle");

const deployFrom = fs.readFileSync(path.join(root, "tooling/release/deploy-from-artifact.cjs"), "utf8");
if (/--filter[\s\S]{0,40}build:cf/.test(deployFrom)) fail("deploy-from-artifact must not rebuild");
if (!/--no-rebuild/.test(deployFrom)) fail("deploy-from-artifact must force --no-rebuild");
if (!/--no-bundle/.test(deployFrom)) fail("deploy-from-artifact must force worker --no-bundle");

const webDeploy = fs.readFileSync(path.join(root, "tooling/deploy/cf-pages-web.cjs"), "utf8");
const opsDeploy = fs.readFileSync(path.join(root, "tooling/deploy/cf-pages-ops.cjs"), "utf8");
if (!/deployArgs = noRebuild[\s\S]*--no-bundle/.test(webDeploy)) {
  fail("web no-rebuild deploy must pass --no-bundle");
}
if (!/deployArgs = noRebuild[\s\S]*--no-bundle/.test(opsDeploy)) {
  fail("ops no-rebuild deploy must pass --no-bundle");
}
const workerDeploy = fs.readFileSync(path.join(root, "tooling/deploy/cf-workers.cjs"), "utf8");
if (!/--no-bundle/.test(workerDeploy) || !/findPrebuiltEntry/.test(workerDeploy)) {
  fail("cf-workers must deploy prebuilt workers with --no-bundle");
}
const prebuildSrc = fs.readFileSync(path.join(root, "tooling/release/prebuild-workers.cjs"), "utf8");
if (!/--dry-run/.test(prebuildSrc) || !/--outdir/.test(prebuildSrc)) {
  fail("prebuild-workers must use wrangler dry-run --outdir");
}
const runtimeSrc = fs.readFileSync(path.join(root, "tooling/release/artifact-runtime-qa.cjs"), "utf8");
if (!/unstable_dev/.test(runtimeSrc) || !/noBundle:\s*true/.test(runtimeSrc)) {
  fail("artifact-runtime-qa must start the exact artifact with wrangler noBundle");
}

const os = require("os");
const { writeApiManifest } = require("../release/api-artifact-provenance.cjs");
const {
  packFromPayload,
  verifyBundle,
  WORKER_SNAPSHOTS,
  PREBUILT_DIR,
} = require("../release/artifact-provenance.cjs");
const { listReleaseBuildRuns, selectSuccessfulReleaseBuild } = require("../release/fetch-release-bundle.cjs");
const { evaluateSurfaceResult, summarizeRuntime } = require("../release/artifact-runtime-qa.cjs");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aipo-relart-"));
function writeFakeWorker(payloadSrc, name) {
  const pre = path.join(payloadSrc, "workers", name, PREBUILT_DIR);
  fs.mkdirSync(pre, { recursive: true });
  fs.writeFileSync(path.join(payloadSrc, "workers", name, "wrangler.toml"), 'name = "' + name + '"\nmain = "src/index.ts"\n');
  fs.writeFileSync(
    path.join(pre, "index.js"),
    'export default { fetch() { return new Response(JSON.stringify({ ok: true }), { status: 200 }); } }\n',
  );
  fs.writeFileSync(
    path.join(pre, "entry.json"),
    JSON.stringify({
      schema: "release-worker-prebuilt.v1",
      entry: "index.js",
      bundled_once: true,
      wrangler_no_upload: true,
    }) + "\n",
  );
}
try {
  const payloadSrc = path.join(tmpRoot, "src");
  fs.mkdirSync(path.join(payloadSrc, "apps/web/.open-next/assets"), { recursive: true });
  fs.mkdirSync(path.join(payloadSrc, "apps/admin/.open-next/assets"), { recursive: true });
  fs.writeFileSync(path.join(payloadSrc, "apps/web/.open-next/worker.js"), "web-worker");
  fs.writeFileSync(path.join(payloadSrc, "apps/web/.open-next/assets/a.txt"), "asset");
  fs.writeFileSync(path.join(payloadSrc, "apps/admin/.open-next/worker.js"), "ops-worker");
  fs.writeFileSync(path.join(payloadSrc, "apps/admin/.open-next/assets/a.txt"), "asset");
  const apiDist = path.join(payloadSrc, "services/api-nest/dist");
  fs.mkdirSync(apiDist, { recursive: true });
  const apiEntry = path.join(apiDist, "main.js");
  fs.writeFileSync(apiEntry, "api-main");
  writeApiManifest(apiDist, fullSha, apiEntry);
  for (const name of WORKER_SNAPSHOTS) writeFakeWorker(payloadSrc, name);
  const bundle = path.join(tmpRoot, "bundle");
  const packed = packFromPayload(payloadSrc, bundle, fullSha);
  if (!packed.worker_prebuilt || !packed.worker_prebuilts || !packed.worker_prebuilts["push-dispatcher"]) {
    fail("pack must record worker prebuilt digests");
  }
  if (!/^[0-9a-f]{64}$/.test(packed.artifact_digest)) fail("pack must emit sha256 digest");
  const verified = verifyBundle(bundle, { sourceSha: fullSha, digest: packed.artifact_digest });
  if (verified.digest !== packed.artifact_digest) fail("qa digest must match packed digest");
  if (!verified.api_artifact || verified.api_artifact.artifact_kind !== "api-nest") {
    fail("verified bundle must carry api-nest artifact metadata");
  }
  if (verified.api_artifact.source_sha !== fullSha) {
    fail("verified api artifact source SHA must match release SHA");
  }
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
  fs.writeFileSync(path.join(bundle, "payload", "services/api-nest/dist/main.js"), "tampered-api");
  try {
    verifyBundle(bundle, { sourceSha: fullSha, digest: packed.artifact_digest });
    fail("tampered API entry must fail");
  } catch (err) {
    const text = ((err && err.fails) || []).join(" ");
    if (
      !text.includes("digest_mismatch") &&
      !text.includes("api_artifact_digest_mismatch")
    ) {
      fail("API tamper must fail closed");
    }
  }
  fs.writeFileSync(path.join(bundle, "payload", "apps/web/.open-next/worker.js"), "tampered");
  try {
    verifyBundle(bundle, { sourceSha: fullSha, digest: packed.artifact_digest });
    fail("tampered digest must fail");
  } catch (err) {
    const text = ((err && err.fails) || []).join(" ");
    if (!text.includes("digest_mismatch")) fail("tamper must be digest_mismatch");
  }

  const missingApiSrc = path.join(tmpRoot, "src-no-api");
  fs.mkdirSync(path.join(missingApiSrc, "apps/web/.open-next/assets"), { recursive: true });
  fs.mkdirSync(path.join(missingApiSrc, "apps/admin/.open-next/assets"), { recursive: true });
  fs.writeFileSync(path.join(missingApiSrc, "apps/web/.open-next/worker.js"), "web-worker");
  fs.writeFileSync(path.join(missingApiSrc, "apps/web/.open-next/assets/a.txt"), "asset");
  fs.writeFileSync(path.join(missingApiSrc, "apps/admin/.open-next/worker.js"), "ops-worker");
  fs.writeFileSync(path.join(missingApiSrc, "apps/admin/.open-next/assets/a.txt"), "asset");
  for (const name of WORKER_SNAPSHOTS) writeFakeWorker(missingApiSrc, name);
  try {
    packFromPayload(missingApiSrc, path.join(tmpRoot, "bundle-no-api"), fullSha);
    fail("pack without API artifact must fail");
  } catch (err) {
    const text = String((err && err.message) || "") + ((err && err.fails) || []).join(" ");
    if (!text.includes("api_artifact_missing") && !text.includes("api_artifact_manifest_missing")) {
      fail("missing API artifact must fail closed");
    }
  }

  const pagesCalled = [];
  const twentyOne = Array.from({ length: 21 }, (_, i) => ({
    id: 1000 + i,
    status: "completed",
    conclusion: i === 20 ? "success" : "failure",
    head_sha: fullSha,
  }));
  const found = listReleaseBuildRuns(fullSha, {
    perPage: 10,
    fetchPage: ({ page, perPage }) => {
      pagesCalled.push(page);
      const start = (page - 1) * perPage;
      return {
        total_count: twentyOne.length,
        workflow_runs: twentyOne.slice(start, start + perPage),
      };
    },
  });
  if (pagesCalled.join(",") !== "1,2,3") fail("release-build listing must paginate past 20 runs");
  if (found.length !== 21) fail("pagination must return every run for the SHA");
  const only = selectSuccessfulReleaseBuild(found);
  if (only.id !== 1020) fail("pagination must see the success beyond the first 20 runs");

  const twoSuccessPages = [];
  try {
    const two = listReleaseBuildRuns(fullSha, {
      perPage: 10,
      fetchPage: ({ page, perPage }) => {
        twoSuccessPages.push(page);
        const start = (page - 1) * perPage;
        return {
          total_count: 21,
          workflow_runs: Array.from({ length: 21 }, (_, i) => ({
            id: i,
            status: "completed",
            conclusion: "success",
          })).slice(start, start + perPage),
        };
      },
    });
    selectSuccessfulReleaseBuild(two);
    fail("two successful builds must fail closed");
  } catch (err) {
    if (!err || err.code !== "BUILT_MORE_THAN_ONCE" || err.count !== 21) {
      fail("more than one success must be artifact_built_more_than_once with full count");
    }
  }
  if (twoSuccessPages.length < 3) fail("duplicate-success check must not stop at 20 runs");

  const fetchSrc = fs.readFileSync(path.join(root, "tooling/release/fetch-release-bundle.cjs"), "utf8");
  if (/--limit/.test(fetchSrc)) fail("fetch-release-bundle must not cap runs with --limit");
  if (!/page/.test(fetchSrc) || !/workflow_runs/.test(fetchSrc)) {
    fail("fetch-release-bundle must paginate GitHub workflow runs");
  }

  const healthOk = evaluateSurfaceResult(
    { id: "ebay-adapter", kind: "worker", accept: [200] },
    { status: 200, json: { ok: true } },
  );
  if (!healthOk.ok) fail("worker /health 200 ok:true must pass");
  const healthBad = evaluateSurfaceResult(
    { id: "web", kind: "opennext", accept: [200, 307] },
    { status: 500 },
  );
  if (healthBad.ok) fail("OpenNext 500 must fail runtime QA");

  const runtime = summarizeRuntime(packed.artifact_digest, [
    { id: "web", kind: "opennext", route: "/", status: 200, ok: true },
    { id: "ops", kind: "opennext", route: "/", status: 307, ok: true },
    { id: "push-dispatcher", kind: "worker", route: "/health", status: 200, ok: true },
    { id: "ebay-adapter", kind: "worker", route: "/health", status: 200, ok: true },
  ]);
  if (!runtime.verified) fail("runtime summary must pass when every surface is ok");
  if (runtime.artifact_digest !== packed.artifact_digest) fail("runtime evidence must reuse packed digest");
  if (runtime.surfaces.length !== 4) fail("runtime QA must cover web/ops/workers");
  const runtimeFail = summarizeRuntime(packed.artifact_digest, [
    { id: "web", kind: "opennext", route: "/", status: 500, ok: false },
  ]);
  if (runtimeFail.verified) fail("failed surface must not verify runtime QA");
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}

const missingWorkers = fs.mkdtempSync(path.join(os.tmpdir(), "aipo-relart-noworker-"));
try {
  const src = path.join(missingWorkers, "src");
  fs.mkdirSync(path.join(src, "apps/web/.open-next/assets"), { recursive: true });
  fs.writeFileSync(path.join(src, "apps/web/.open-next/worker.js"), "web-worker");
  fs.writeFileSync(path.join(src, "apps/web/.open-next/assets/a.txt"), "asset");
  try {
    packFromPayload(src, path.join(missingWorkers, "bundle"), fullSha);
    fail("pack without worker prebuilt must fail");
  } catch (err) {
    const text = ((err && err.fails) || []).join(" ") + " " + (err && err.message ? err.message : "");
    if (!/worker_prebuilt/.test(text)) fail("missing worker prebuilt must be worker_prebuilt_*");
  }
} finally {
  fs.rmSync(missingWorkers, { recursive: true, force: true });
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

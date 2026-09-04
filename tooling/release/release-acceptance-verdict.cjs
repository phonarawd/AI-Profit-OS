"use strict";

/**
 * Fail-closed release verdict. Evidence aggregator success is ignored.
 */
const fs = require("fs");
const path = require("path");
const { isFullSha, isSha256, normalizeHex } = require("./artifact-provenance.cjs");

const CONTRACT_REL = "governance/release-master/release-acceptance.v1.json";

function loadContract(root) {
  return JSON.parse(fs.readFileSync(path.join(root, CONTRACT_REL), "utf8"));
}

/**
 * @param {object} input
 * @param {string} input.sha
 * @param {string} input.event_name
 * @param {string} [input.qa_phase]
 * @param {Record<string, string>} input.jobs  jobId -> success|failure|cancelled|skipped|missing
 * @param {object} contract
 */
function evaluateVerdict(input, contract) {
  const jobs = input.jobs || {};
  const fails = [];
  const bound = input.engine_run && typeof input.engine_run === "object" ? input.engine_run : null;
  const eventName = String((bound && bound.event) || input.event_name || "");
  const phase = String((bound && bound.qa_phase) || input.qa_phase || "");
  const isFullDispatch = eventName === "workflow_dispatch" && phase === "full";

  const mandatory = [...contract.mandatory_core];
  if (isFullDispatch) {
    for (const j of contract.mandatory_when_full_dispatch || []) {
      if (!mandatory.includes(j)) mandatory.push(j);
    }
  }

  function allowlistedSkip(job) {
    if (job !== "qa7-ai-eval") return false;
    if (eventName !== "workflow_dispatch") return true;
    return phase !== "qa7" && phase !== "full";
  }

  for (const job of mandatory) {
    const result = jobs[job] == null || jobs[job] === "" ? "missing" : String(jobs[job]);
    if (result === "success") continue;
    if (result === "skipped" && allowlistedSkip(job)) continue;
    if (result === "skipped") {
      fails.push("unexpected_skip:" + job);
      continue;
    }
    if ((contract.fail_results || []).includes(result) || result === "failure") {
      fails.push(job + "=" + result);
      continue;
    }
    fails.push(job + "=" + result);
  }

  if (jobs.aggregator === "success" && fails.length) {
    fails.push("aggregator_success_ignored");
  }

  const kind = isFullDispatch ? "PRODUCTION_RELEASE" : "CI_PATH_GATE";
  if (kind === "PRODUCTION_RELEASE") {
    if (!bound) {
      fails.push("engine_run_binding_missing");
    } else {
      const enginePath = String(bound.path || "")
        .replace(/\\/g, "/")
        .replace(/^\.\//, "");
      const expectedPath = String(
        (contract.engine_run_binding && contract.engine_run_binding.workflow_path) ||
          ".github/workflows/engine-acceptance.yml",
      )
        .replace(/\\/g, "/")
        .replace(/^\.\//, "");
      if (enginePath !== expectedPath) {
        fails.push("engine_run_workflow_path_mismatch");
      }
      if (!isFullSha(normalizeHex(bound.head_sha))) {
        fails.push("engine_run_head_sha_invalid");
      }
      if (String(bound.event || "") !== "workflow_dispatch") {
        fails.push("engine_run_event_invalid");
      }
      if (String(bound.qa_phase || "") !== "full") {
        fails.push("engine_run_phase_invalid");
      }
      if (String(bound.status || "") !== "completed") {
        fails.push("engine_run_status_invalid");
      }
      if (
        !["run.inputs.qa_phase", "full_job_signature"].includes(
          String(bound.qa_phase_proof || ""),
        )
      ) {
        fails.push("engine_run_phase_proof_invalid");
      }
      if (bound.workflow_name_auxiliary !== true) {
        fails.push("engine_run_path_authority_unproven");
      }
    }
  }
  const sha = String((bound && bound.head_sha) || input.sha || "");
  const qa = input.artifact_qa && typeof input.artifact_qa === "object" ? input.artifact_qa : null;
  let artifact_digest = "";
  let artifact_source_sha = "";
  let artifact_built_once = false;
  let api_runtime_verified = false;
  if (kind === "PRODUCTION_RELEASE") {
    if (!qa) {
      fails.push("artifact_qa_missing");
    } else {
      if (qa.verified !== true) fails.push("artifact_qa_unverified");
      artifact_digest = normalizeHex(qa.artifact_digest);
      artifact_source_sha = normalizeHex(qa.source_sha);
      artifact_built_once = qa.built_once === true;
      if (!isSha256(artifact_digest)) fails.push("artifact_digest_missing");
      if (!isFullSha(artifact_source_sha)) fails.push("artifact_source_sha_missing");
      if (isFullSha(artifact_source_sha) && isFullSha(normalizeHex(sha)) && artifact_source_sha !== normalizeHex(sha)) {
        fails.push("artifact_source_sha_mismatch");
      }
      if (!artifact_built_once) fails.push("artifact_not_built_once");
      if (!qa.runtime || qa.runtime.verified !== true) {
        fails.push("artifact_runtime_qa_missing");
      } else if (
        artifact_digest &&
        qa.runtime.artifact_digest &&
        normalizeHex(qa.runtime.artifact_digest) !== artifact_digest
      ) {
        fails.push("artifact_runtime_digest_mismatch");
      }

      const apiRuntime =
        qa.api_runtime && typeof qa.api_runtime === "object"
          ? qa.api_runtime
          : null;
      if (!apiRuntime || apiRuntime.verified !== true) {
        fails.push("api_artifact_runtime_qa_missing");
      } else {
        const apiSource = normalizeHex(apiRuntime.source_sha);
        const apiGitSha = normalizeHex(apiRuntime.git_sha);
        const apiBundleDigest = normalizeHex(apiRuntime.bundle_digest);
        const apiDigest = normalizeHex(apiRuntime.api_artifact_digest);
        if (!isFullSha(apiSource) || apiSource !== normalizeHex(sha)) {
          fails.push("api_runtime_source_sha_mismatch");
        }
        if (!isFullSha(apiGitSha) || apiGitSha !== normalizeHex(sha)) {
          fails.push("api_runtime_git_sha_mismatch");
        }
        if (!isSha256(apiDigest)) {
          fails.push("api_runtime_artifact_digest_missing");
        }
        if (!isSha256(apiBundleDigest) || apiBundleDigest !== artifact_digest) {
          fails.push("api_runtime_bundle_digest_mismatch");
        }
        if (apiRuntime.service !== "api-nest") {
          fails.push("api_runtime_service_mismatch");
        }
        if (apiRuntime.git_sha_source !== "RENDER_GIT_COMMIT") {
          fails.push("api_runtime_git_sha_source_mismatch");
        }
        api_runtime_verified =
          !fails.some((item) => String(item).startsWith("api_runtime_")) &&
          !fails.includes("api_artifact_runtime_qa_missing");
      }
    }
  }
  const verdict = fails.length ? "FAIL" : "PASS";
  return {
    schema: "release-acceptance-verdict.v1",
    sha,
    event_name: eventName,
    qa_phase: phase,
    kind,
    verdict,
    fails,
    aggregator_is_not_verdict: true,
    engine_run: bound,
    artifact_digest: artifact_digest || null,
    artifact_source_sha: artifact_source_sha || null,
    artifact_built_once,
    api_runtime_verified,
  };
}

function main(argv) {
  const root = path.resolve(__dirname, "../..");
  const contract = loadContract(root);
  let inputPath = "";
  let artifactQaPath = "";
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--input") inputPath = argv[i + 1] || "";
    if (argv[i] === "--artifact-qa") artifactQaPath = argv[i + 1] || "";
  }
  if (!inputPath) {
    process.stderr.write(
      "usage: release-acceptance-verdict.cjs --input <jobs.json> [--artifact-qa <file>]\n",
    );
    process.exit(2);
  }
  const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  if (artifactQaPath) {
    input.artifact_qa = JSON.parse(fs.readFileSync(artifactQaPath, "utf8"));
  }
  const out = evaluateVerdict(input, contract);
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  if (out.verdict !== "PASS") process.exit(1);
}

if (require.main === module) {
  main(process.argv);
}

module.exports = { evaluateVerdict, loadContract, CONTRACT_REL };

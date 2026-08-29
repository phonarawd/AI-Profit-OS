/**
 * QA7 formal publisher — 공식 GitHub Actions provenance.
 * CLI 값은 expected only. 진실은 GitHub metadata + zip digest.
 */
"use strict";

const { execSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");

const OFFICIAL_QA7_WORKFLOW_NAME = "engine-acceptance";
const OFFICIAL_QA7_WORKFLOW_PATH = ".github/workflows/engine-acceptance.yml";
const OFFICIAL_QA7_JOB = "qa7-ai-eval";
const OFFICIAL_QA7_ARTIFACT = "engine-acceptance-QA7-raw-traces";
const AGGREGATOR_ARTIFACT = "engine-acceptance-evidence";
const REPO = "phonarawd/AI-Profit-OS";

function fail(message, code) {
  const err = new Error(message);
  err.code = code || "AIPO_QA7_PROVENANCE_BLOCKED";
  throw err;
}

function normalizeDigest(value) {
  const raw = String(value || "").trim().toLowerCase();
  return raw.startsWith("sha256:") ? raw.slice(7) : raw;
}

function sha256File(abs) {
  return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
}

function parseGhJson(cmd, label) {
  try {
    return JSON.parse(execSync(cmd, { encoding: "utf8" }));
  } catch (e) {
    const blob = `${e && e.message ? e.message : e} ${e && e.stderr ? e.stderr : ""}`;
    if (/404|Not Found/i.test(blob)) return null;
    fail(`GitHub API unavailable while reading ${label}`, "GITHUB_API_UNAVAILABLE");
  }
  return null;
}

function defaultGithubClient() {
  return {
    getRun(id) {
      const r = parseGhJson(
        `gh api repos/${REPO}/actions/runs/${id}`,
        `run ${id}`,
      );
      if (!r) return null;
      return {
        id: String(r.id),
        name: r.name,
        path: r.path,
        event: r.event,
        conclusion: r.conclusion,
        head_sha: r.head_sha,
        head_branch: r.head_branch,
        status: r.status,
        html_url: r.html_url || null,
      };
    },
    getArtifact(id) {
      const a = parseGhJson(
        `gh api repos/${REPO}/actions/artifacts/${id}`,
        `artifact ${id}`,
      );
      if (!a) return null;
      return {
        id: String(a.id),
        name: a.name,
        digest: a.digest,
        expires_at: a.expires_at,
        expired: a.expired === true,
        workflow_run: { id: String(a.workflow_run && a.workflow_run.id) },
      };
    },
    listJobs(runId) {
      const raw = parseGhJson(
        `gh api repos/${REPO}/actions/runs/${runId}/jobs`,
        `jobs ${runId}`,
      );
      if (!raw) return null;
      const jobs = Array.isArray(raw.jobs) ? raw.jobs : [];
      return jobs.map((j) => ({
        name: j.name,
        conclusion: j.conclusion,
        status: j.status,
      }));
    },
  };
}

function assertOfficialQa7Workflow(run) {
  if (!run || !run.id) fail("Actions run ID not found", "RUN_ID");
  if (run.path !== OFFICIAL_QA7_WORKFLOW_PATH) {
    fail(
      `workflow path must be ${OFFICIAL_QA7_WORKFLOW_PATH} (got ${run.path})`,
      "RUN_WORKFLOW",
    );
  }
  if (run.name !== OFFICIAL_QA7_WORKFLOW_NAME) {
    fail(
      `workflow name must be ${OFFICIAL_QA7_WORKFLOW_NAME} (got ${run.name})`,
      "RUN_WORKFLOW",
    );
  }
}

function assertOfficialQa7Run(run, expected) {
  assertOfficialQa7Workflow(run);
  if (String(run.id) !== String(expected.actionsRunId)) {
    fail(
      `run id mismatch (expected ${expected.actionsRunId} github=${run.id})`,
      "RUN_ID",
    );
  }
  if (run.event !== "workflow_dispatch") {
    fail(`run event must be workflow_dispatch (got ${run.event})`, "RUN_EVENT");
  }
  if (run.conclusion !== "success") {
    fail(
      `run conclusion must be success (got ${run.conclusion})`,
      "RUN_CONCLUSION",
    );
  }
  if (String(run.head_sha || "").toLowerCase() !== String(expected.headSha || "").toLowerCase()) {
    fail("run head SHA mismatch vs requested QA7 subject SHA", "RUN_SHA");
  }
  if (run.head_branch !== expected.headBranch) {
    fail(
      `run head_branch must be ${expected.headBranch} (got ${run.head_branch})`,
      "RUN_BRANCH",
    );
  }
  if (expected.workflowName && expected.workflowName !== run.name) {
    fail("CLI workflow name does not match official GitHub run", "RUN_WORKFLOW");
  }
  if (expected.workflowPath && expected.workflowPath !== run.path) {
    fail("CLI workflow path does not match official GitHub run", "RUN_WORKFLOW");
  }
  if (expected.event && expected.event !== run.event) {
    fail("CLI event does not match official GitHub run", "RUN_EVENT");
  }
  if (expected.conclusion && expected.conclusion !== run.conclusion) {
    fail("CLI conclusion does not match official GitHub run", "RUN_CONCLUSION");
  }
}

function assertOfficialQa7Jobs(jobs) {
  if (!Array.isArray(jobs)) {
    fail("GitHub job list unavailable", "GITHUB_API_UNAVAILABLE");
  }
  const job = jobs.find((j) => j && j.name === OFFICIAL_QA7_JOB);
  if (!job) {
    fail(`official job ${OFFICIAL_QA7_JOB} missing on run`, "RUN_WORKFLOW");
  }
  if (job.conclusion !== "success") {
    fail(
      `official job ${OFFICIAL_QA7_JOB} conclusion must be success (got ${job.conclusion})`,
      "RUN_CONCLUSION",
    );
  }
}

function assertOfficialQa7Artifact(artifact, expected, run, nowMs) {
  if (!artifact || !artifact.id) {
    fail("GitHub artifact not found", "ARTIFACT_ID");
  }
  if (artifact.name === AGGREGATOR_ARTIFACT || expected.artifactName === AGGREGATOR_ARTIFACT) {
    fail(
      "engine-acceptance-evidence aggregator artifact is not an allowed publisher input",
      "AGGREGATOR_ARTIFACT",
    );
  }
  if (artifact.local_only === true || /local/i.test(String(artifact.name || ""))) {
    fail("local-only artifact is not official QA7 evidence", "LOCAL_ARTIFACT");
  }
  if (artifact.name !== OFFICIAL_QA7_ARTIFACT) {
    fail(
      `artifact name must be ${OFFICIAL_QA7_ARTIFACT} (got ${artifact.name})`,
      "ARTIFACT_NAME",
    );
  }
  if (expected.artifactName && expected.artifactName !== artifact.name) {
    fail("CLI artifact name does not match official GitHub artifact", "ARTIFACT_NAME");
  }
  if (String(artifact.id) !== String(expected.artifactId)) {
    fail(
      `artifact id mismatch (expected ${expected.artifactId} github=${artifact.id})`,
      "ARTIFACT_ID",
    );
  }
  if (String(artifact.workflow_run && artifact.workflow_run.id) !== String(run.id)) {
    fail("artifact is not owned by the official QA7 run", "ARTIFACT_RUN");
  }
  if (artifact.expired === true) {
    fail("artifact is expired", "ARTIFACT_EXPIRED");
  }
  const exp = Date.parse(artifact.expires_at || "");
  if (!Number.isFinite(exp) || exp <= nowMs) {
    fail("artifact expires_at must be in the future", "ARTIFACT_EXPIRED");
  }
  if (expected.artifactExpiresAt) {
    const cliExp = Date.parse(expected.artifactExpiresAt);
    if (Number.isFinite(cliExp) && cliExp !== exp) {
      fail("CLI artifact expires_at does not match GitHub metadata", "ARTIFACT_EXPIRED");
    }
  }
}

function assertOfficialZipDigest(githubDigest, downloadedDigest, expectedDigest) {
  const gh = normalizeDigest(githubDigest);
  const zip = normalizeDigest(downloadedDigest);
  if (!gh) fail("GitHub artifact digest missing", "ARTIFACT_DIGEST_MISSING");
  if (!zip) fail("downloaded official zip digest missing", "ARTIFACT_DIGEST_MISSING");
  if (!/^[0-9a-f]{64}$/.test(gh) || !/^[0-9a-f]{64}$/.test(zip)) {
    fail("artifact digest must be 64-char sha256 hex", "ARTIFACT_DIGEST");
  }
  if (gh !== zip) fail("GitHub artifact digest does not match downloaded zip digest", "ARTIFACT_DIGEST");
  if (expectedDigest) {
    const exp = normalizeDigest(expectedDigest);
    if (exp !== gh) {
      fail("CLI artifact digest does not match official GitHub digest", "ARTIFACT_DIGEST");
    }
  }
}

function evaluateQa7Provenance(opts) {
  const expected = opts.expected || {};
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  if (!expected.actionsRunId || !/^[0-9]+$/.test(String(expected.actionsRunId))) {
    fail("actions run id must be numeric GitHub Actions run id", "RUN_ID");
  }
  if (!expected.artifactId || !/^[0-9]+$/.test(String(expected.artifactId))) {
    fail("artifact id must be numeric GitHub artifact id", "ARTIFACT_ID");
  }
  if (!expected.headSha || !/^[0-9a-f]{40}$/i.test(expected.headSha)) {
    fail("requested QA7 subject SHA must be 40-char hex", "RUN_SHA");
  }
  if (!expected.headBranch) fail("requested head branch required", "RUN_BRANCH");

  const github = opts.githubClient;
  if (!github || typeof github.getRun !== "function" || typeof github.getArtifact !== "function") {
    fail("official GitHub metadata provider required", "GITHUB_API_UNAVAILABLE");
  }

  let run;
  try {
    run = github.getRun(expected.actionsRunId);
  } catch (e) {
    if (e && e.code === "GITHUB_API_UNAVAILABLE") throw e;
    fail("GitHub API unavailable while reading run", "GITHUB_API_UNAVAILABLE");
  }
  if (!run) fail("Actions run ID not found", "RUN_ID");
  assertOfficialQa7Run(run, expected);

  let jobs = null;
  if (typeof github.listJobs === "function") {
    try {
      jobs = github.listJobs(run.id);
    } catch (e) {
      if (e && e.code === "GITHUB_API_UNAVAILABLE") throw e;
      fail("GitHub API unavailable while reading jobs", "GITHUB_API_UNAVAILABLE");
    }
  }
  if (jobs == null) fail("GitHub job list unavailable", "GITHUB_API_UNAVAILABLE");
  assertOfficialQa7Jobs(jobs);

  let artifact;
  try {
    artifact = github.getArtifact(expected.artifactId);
  } catch (e) {
    if (e && e.code === "GITHUB_API_UNAVAILABLE") throw e;
    fail("GitHub API unavailable while reading artifact", "GITHUB_API_UNAVAILABLE");
  }
  if (!artifact) fail("GitHub artifact not found", "ARTIFACT_ID");
  assertOfficialQa7Artifact(artifact, expected, run, nowMs);
  assertOfficialZipDigest(artifact.digest, opts.downloadedZipSha256, expected.artifactDigest);

  return { run, artifact, jobs };
}

module.exports = {
  OFFICIAL_QA7_WORKFLOW_NAME,
  OFFICIAL_QA7_WORKFLOW_PATH,
  OFFICIAL_QA7_JOB,
  OFFICIAL_QA7_ARTIFACT,
  AGGREGATOR_ARTIFACT,
  normalizeDigest,
  sha256File,
  defaultGithubClient,
  evaluateQa7Provenance,
  assertOfficialQa7Run,
  assertOfficialQa7Artifact,
  assertOfficialQa7Jobs,
  assertOfficialZipDigest,
};

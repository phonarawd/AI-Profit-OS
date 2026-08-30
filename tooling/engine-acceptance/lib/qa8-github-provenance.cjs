/**
 * QA8 formal publisher — 공식 GitHub Actions provenance.
 * CLI 값은 expected only. 진실은 GitHub metadata + zip digest.
 */
"use strict";

const { execSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");

const OFFICIAL_QA8_WORKFLOW_NAME = "engine-acceptance";
const OFFICIAL_QA8_WORKFLOW_PATH = ".github/workflows/engine-acceptance.yml";
const OFFICIAL_QA8_JOB = "qa-matrix";
const OFFICIAL_QA8_ARTIFACT = "engine-acceptance-QA8";
const OFFICIAL_QA8_SUITE = "QA8";
const AGGREGATOR_ARTIFACT = "engine-acceptance-evidence";
const STANDALONE_ADVERSARIAL_JOB = "qa8-adversarial";
const REPO = "phonarawd/AI-Profit-OS";
const OFFICIAL_RETENTION_DAYS = 90;
const OFFICIAL_RETENTION_MS = OFFICIAL_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const ALLOWED_ALWAYS_JOBS = Object.freeze(["qa0-baseline", "aggregator"]);
const FORBIDDEN_EXECUTED_JOBS = Object.freeze([
  "qa1-deterministic",
  "qa2-synthetic-personas",
  "qa7-ai-eval",
  "qa5-fault",
  "qa6-measure",
  STANDALONE_ADVERSARIAL_JOB,
]);
const EXECUTED = Object.freeze(new Set(["success", "failure", "cancelled"]));

function fail(message, code) {
  const err = new Error(message);
  err.code = code || "AIPO_QA8_PROVENANCE_BLOCKED";
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
      const r = parseGhJson(`gh api repos/${REPO}/actions/runs/${id}`, `run ${id}`);
      if (!r) return null;
      const repo =
        (r.repository && (r.repository.full_name || r.repository.name)) || null;
      return {
        id: String(r.id),
        name: r.name,
        path: r.path,
        event: r.event,
        conclusion: r.conclusion,
        status: r.status,
        run_attempt: Number(r.run_attempt || 0),
        head_sha: r.head_sha,
        head_branch: r.head_branch,
        html_url: r.html_url || null,
        repository: repo,
        created_at: r.created_at || null,
        run_started_at: r.run_started_at || null,
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
        created_at: a.created_at,
        expired: a.expired === true,
        workflow_run: { id: String(a.workflow_run && a.workflow_run.id) },
      };
    },
    listJobs(runId) {
      const raw = parseGhJson(
        `gh api repos/${REPO}/actions/runs/${runId}/jobs --paginate`,
        `jobs ${runId}`,
      );
      if (!raw) return null;
      const jobs = Array.isArray(raw.jobs) ? raw.jobs : [];
      return jobs.map((j) => ({
        name: j.name,
        conclusion: j.conclusion,
        status: j.status,
        run_attempt: Number(j.run_attempt || 0),
      }));
    },
  };
}

function matrixSuiteOf(name) {
  const m = String(name || "").match(/^qa-matrix \((?:suite: )?(QA[0-9])\)$/);
  return m ? m[1] : null;
}

function jobExecuted(job) {
  return Boolean(job && EXECUTED.has(job.conclusion));
}

/**
 * 공식 retention 기준점 = GitHub run `created_at`.
 *
 * GitHub Actions 의 artifact `expires_at` 은 workflow run 시작 시각
 * (`created_at` / `run_started_at`) 에 가깝게 계산된다.
 * `artifact.created_at` 은 업로드 완료 관측값일 뿐이며 retention 시작점으로
 * 단독 사용하지 않는다. created_at 과 run_started_at 중 더 느슨한 값을
 * 비교·선택하지 않는다.
 *
 * `run_started_at` 은 GitHub metadata 에 직접 있고 created_at 이 없을 때만
 * fallback 한다. 둘 다 있으면 created_at 이 공식 기준이고, run_started_at 은
 * created_at 이후(또는 동일)인지 정합성만 검사한다.
 */
function officialRunRetentionReferenceMs(run) {
  const created = Date.parse(run && run.created_at ? run.created_at : "");
  const started = Date.parse(run && run.run_started_at ? run.run_started_at : "");
  if (Number.isFinite(created) && Number.isFinite(started) && started < created) {
    fail("run_started_at precedes created_at", "RUN_RETENTION_REFERENCE");
  }
  if (Number.isFinite(created)) return created;
  if (Number.isFinite(started)) return started;
  fail("missing run created/start reference", "RUN_RETENTION_REFERENCE");
}

function sliceYamlStepAround(text, nameIndex) {
  const before = text.slice(0, nameIndex);
  const stepMarks = ["\n      - name:", "\n    - name:", "\n  - name:", "\n- name:"];
  let start = 0;
  for (const mark of stepMarks) {
    const idx = before.lastIndexOf(mark);
    if (idx > start) start = idx;
  }
  const after = text.slice(nameIndex);
  const next = after.search(/\n\s+-\s+name:|\n  [A-Za-z][A-Za-z0-9_-]*:\s*$/m);
  const end = nameIndex + (next >= 0 ? next : Math.min(after.length, 4000));
  return text.slice(start, end);
}

function extractQa8MatrixUploadRetentionDays(workflowYaml) {
  const text = String(workflowYaml || "").replace(/\r\n/g, "\n");
  const needle = /name:\s*engine-acceptance-\$\{\{\s*matrix\.suite\s*\}\}/g;
  let match;
  while ((match = needle.exec(text))) {
    const step = sliceYamlStepAround(text, match.index);
    if (!/upload-artifact@/.test(step)) continue;
    if (!/\bQA8\b/.test(step)) continue;
    const ret = step.match(/retention-days:\s*(\d+)/);
    if (!ret) return { foundStep: true, declared: false, days: null };
    return { foundStep: true, declared: true, days: Number(ret[1]) };
  }
  return { foundStep: false, declared: false, days: null };
}

function assertQa8WorkflowRetentionDeclaration(workflowYaml) {
  const info = extractQa8MatrixUploadRetentionDays(workflowYaml);
  if (!info.foundStep || !info.declared) {
    fail("QA8 workflow upload retention-days declaration missing", "WORKFLOW_RETENTION");
  }
  if (!(Number.isFinite(info.days) && info.days >= OFFICIAL_RETENTION_DAYS)) {
    fail(
      `QA8 workflow upload retention-days must be >= ${OFFICIAL_RETENTION_DAYS} (got ${info.days})`,
      "WORKFLOW_RETENTION",
    );
  }
}

function assertOfficialQa8Workflow(run) {
  if (!run || !run.id) fail("Actions run ID not found", "RUN_ID");
  if (run.repository && run.repository !== REPO) {
    fail(`repository must be ${REPO} (got ${run.repository})`, "REPO_OWNER");
  }
  if (!run.repository) fail("GitHub run repository ownership missing", "REPO_OWNER");
  if (run.path !== OFFICIAL_QA8_WORKFLOW_PATH) {
    fail(
      `workflow path must be ${OFFICIAL_QA8_WORKFLOW_PATH} (got ${run.path})`,
      "RUN_WORKFLOW",
    );
  }
  if (run.name !== OFFICIAL_QA8_WORKFLOW_NAME) {
    fail(
      `workflow name must be ${OFFICIAL_QA8_WORKFLOW_NAME} (got ${run.name})`,
      "RUN_WORKFLOW",
    );
  }
}

function assertOfficialQa8Run(run, expected) {
  assertOfficialQa8Workflow(run);
  if (String(run.id) !== String(expected.actionsRunId)) {
    fail(`run id mismatch (expected ${expected.actionsRunId} github=${run.id})`, "RUN_ID");
  }
  if (run.event !== "workflow_dispatch") {
    fail(`run event must be workflow_dispatch (got ${run.event})`, "RUN_EVENT");
  }
  if (run.status !== "completed") {
    fail(`run status must be completed (got ${run.status})`, "RUN_STATUS");
  }
  if (run.conclusion !== "success") {
    fail(`run conclusion must be success (got ${run.conclusion})`, "RUN_CONCLUSION");
  }
  if (Number(run.run_attempt) !== 1) {
    fail(`run attempt must be 1 (got ${run.run_attempt})`, "RUN_ATTEMPT");
  }
  if (String(run.head_sha || "").toLowerCase() !== String(expected.headSha || "").toLowerCase()) {
    fail("run head SHA mismatch vs requested QA8 subject SHA", "RUN_SHA");
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

function assertOfficialQa8Jobs(jobs) {
  if (!Array.isArray(jobs)) fail("GitHub job list unavailable", "GITHUB_API_UNAVAILABLE");
  const executedMatrix = [];
  let qa8Job = null;
  for (const job of jobs) {
    if (Number(job.run_attempt || 0) > 1) {
      fail(`job ${job.name} run_attempt>1 is retry/flaky`, "RETRY_FLAKY");
    }
    const suite = matrixSuiteOf(job.name);
    if (suite) {
      if (jobExecuted(job)) executedMatrix.push(suite);
      if (suite === OFFICIAL_QA8_SUITE) qa8Job = job;
    }
    const base = String(job.name || "").split(" ")[0];
    if (FORBIDDEN_EXECUTED_JOBS.includes(job.name) || FORBIDDEN_EXECUTED_JOBS.includes(base)) {
      if (jobExecuted(job)) {
        if (job.name === STANDALONE_ADVERSARIAL_JOB || base === STANDALONE_ADVERSARIAL_JOB) {
          fail("standalone qa8-adversarial executed unexpectedly", "STANDALONE_ADVERSARIAL");
        }
        fail(`unexpected ${job.name} execution (conclusion=${job.conclusion})`, "UNEXPECTED_SUITE");
      }
    }
    if (!suite && !ALLOWED_ALWAYS_JOBS.includes(job.name) && !FORBIDDEN_EXECUTED_JOBS.includes(job.name)) {
      if (job.name && job.name.startsWith("qa-matrix") && jobExecuted(job) && !suite) {
        fail(`unexpected qa-matrix cell ${job.name}`, "UNEXPECTED_SUITE");
      }
    }
  }
  if (!qa8Job) fail("official QA8 matrix job missing on run", "QA8_JOB");
  if (qa8Job.conclusion === "skipped") fail("QA8 job was skipped", "QA8_JOB_SKIPPED");
  if (qa8Job.conclusion !== "success" || qa8Job.status !== "completed") {
    fail(
      `official QA8 job conclusion must be success (got ${qa8Job.conclusion})`,
      "QA8_JOB",
    );
  }
  if (executedMatrix.length !== 1 || executedMatrix[0] !== OFFICIAL_QA8_SUITE) {
    fail(
      `actual matrix suite must be [QA8] only (got ${JSON.stringify(executedMatrix)})`,
      "MATRIX_SUITE",
    );
  }
}

function assertOfficialQa8Artifact(artifact, expected, run, nowMs) {
  if (!artifact || !artifact.id) fail("GitHub artifact not found", "ARTIFACT_ID");
  if (artifact.name === AGGREGATOR_ARTIFACT || expected.artifactName === AGGREGATOR_ARTIFACT) {
    fail(
      "engine-acceptance-evidence aggregator artifact is not an allowed publisher input",
      "AGGREGATOR_ARTIFACT",
    );
  }
  if (artifact.local_only === true || /local/i.test(String(artifact.name || ""))) {
    fail("local-only artifact is not official QA8 evidence", "LOCAL_ARTIFACT");
  }
  if (artifact.name !== OFFICIAL_QA8_ARTIFACT) {
    fail(
      `artifact name must be ${OFFICIAL_QA8_ARTIFACT} (got ${artifact.name})`,
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
    fail("artifact is not owned by the official QA8 run", "ARTIFACT_RUN");
  }
  if (artifact.expired === true) fail("artifact is expired", "ARTIFACT_EXPIRED");
  const exp = Date.parse(artifact.expires_at || "");
  if (!Number.isFinite(exp)) {
    fail("artifact expires_at missing", "ARTIFACT_EXPIRED");
  }
  if (exp <= nowMs) {
    fail("artifact expires_at must be in the future", "ARTIFACT_EXPIRED");
  }
  const refMs = officialRunRetentionReferenceMs(run);
  const createdArt = Date.parse(artifact.created_at || "");
  if (!Number.isFinite(createdArt)) {
    fail("artifact created_at missing", "ARTIFACT_CREATED");
  }
  if (createdArt < refMs) {
    fail("artifact created_at precedes official run retention reference", "ARTIFACT_CREATED");
  }
  const retentionMs = exp - refMs;
  if (retentionMs < OFFICIAL_RETENTION_MS) {
    fail("artifact retention must be >= 90 days from official run start", "ARTIFACT_RETENTION");
  }
  if (!normalizeDigest(artifact.digest)) {
    fail("GitHub artifact digest missing", "ARTIFACT_DIGEST_MISSING");
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

function workflowHashReachable(fromHash, toHash, amendments) {
  const from = String(fromHash || "");
  const to = String(toHash || "");
  if (!from || !to) return false;
  if (from === to) return true;
  const list = Array.isArray(amendments) ? amendments : [];
  let cur = from;
  const seen = new Set();
  while (cur !== to) {
    if (seen.has(cur)) return false;
    seen.add(cur);
    const next = list.find((a) => a && a.old_acceptance_workflow_hash === cur);
    if (!next) return false;
    cur = next.new_acceptance_workflow_hash;
  }
  return true;
}

function evaluateQa8Provenance(opts) {
  const expected = opts.expected || {};
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  if (!expected.actionsRunId || !/^[0-9]+$/.test(String(expected.actionsRunId))) {
    fail("actions run id must be numeric GitHub Actions run id", "RUN_ID");
  }
  if (!expected.artifactId || !/^[0-9]+$/.test(String(expected.artifactId))) {
    fail("artifact id must be numeric GitHub artifact id", "ARTIFACT_ID");
  }
  if (!expected.headSha || !/^[0-9a-f]{40}$/i.test(expected.headSha)) {
    fail("requested QA8 subject SHA must be 40-char hex", "RUN_SHA");
  }
  if (!expected.headBranch) fail("requested head branch required", "RUN_BRANCH");
  assertQa8WorkflowRetentionDeclaration(opts.workflowYaml);

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
  assertOfficialQa8Run(run, expected);

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
  assertOfficialQa8Jobs(jobs);

  let artifact;
  try {
    artifact = github.getArtifact(expected.artifactId);
  } catch (e) {
    if (e && e.code === "GITHUB_API_UNAVAILABLE") throw e;
    fail("GitHub API unavailable while reading artifact", "GITHUB_API_UNAVAILABLE");
  }
  if (!artifact) fail("GitHub artifact not found", "ARTIFACT_ID");
  assertOfficialQa8Artifact(artifact, expected, run, nowMs);
  assertOfficialZipDigest(artifact.digest, opts.downloadedZipSha256, expected.artifactDigest);

  return { run, artifact, jobs };
}

module.exports = {
  OFFICIAL_QA8_WORKFLOW_NAME,
  OFFICIAL_QA8_WORKFLOW_PATH,
  OFFICIAL_QA8_JOB,
  OFFICIAL_QA8_ARTIFACT,
  OFFICIAL_QA8_SUITE,
  AGGREGATOR_ARTIFACT,
  STANDALONE_ADVERSARIAL_JOB,
  REPO,
  OFFICIAL_RETENTION_DAYS,
  OFFICIAL_RETENTION_MS,
  normalizeDigest,
  sha256File,
  defaultGithubClient,
  evaluateQa8Provenance,
  workflowHashReachable,
  matrixSuiteOf,
  assertOfficialQa8Jobs,
  officialRunRetentionReferenceMs,
  extractQa8MatrixUploadRetentionDays,
  assertQa8WorkflowRetentionDeclaration,
};

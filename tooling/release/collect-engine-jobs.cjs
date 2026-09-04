"use strict";

/**
 * engine-acceptance run → job 결론 수집.
 * caller SHA/event/qa_phase 를 믿지 않는다. GitHub run 메타 + 실제 job 이름만 쓴다.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const MATRIX_SUITES = ["QA3", "QA4", "QA5", "QA6", "QA8"];
const MATRIX_JOB_IDS = MATRIX_SUITES.map((s) => "qa-matrix:" + s);
const FULL_SIGNATURE_JOBS = [
  "qa7-ai-eval",
  "qa5-fault",
  "qa6-measure",
  "qa8-adversarial",
  ...MATRIX_JOB_IDS,
];

const JOB_IDS = [
  "qa0-baseline",
  "qa1-deterministic",
  "qa2-synthetic-personas",
  ...MATRIX_JOB_IDS,
  "qa7-ai-eval",
  "qa5-fault",
  "qa6-measure",
  "qa8-adversarial",
  "aggregator",
];

const ENGINE_WORKFLOW_NAME = "engine-acceptance";
const ENGINE_WORKFLOW_PATH = ".github/workflows/engine-acceptance.yml";

function parseArgs(argv) {
  const out = { runId: "", sha: "", out: "" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--run-id") out.runId = argv[i + 1] || "";
    if (argv[i] === "--sha") out.sha = argv[i + 1] || "";
    if (argv[i] === "--out") out.out = argv[i + 1] || "";
  }
  return out;
}

function canonicalizeJobName(name) {
  const raw = String(name || "").trim();
  const m = raw.match(/^qa-matrix\s*\(\s*(QA(?:3|4|5|6|8))\s*\)$/i);
  if (m) return "qa-matrix:" + m[1].toUpperCase();
  return raw;
}

function mapConclusion(job) {
  if (!job) return "missing";
  if (job.conclusion) return String(job.conclusion);
  if (job.status === "completed") return "success";
  return "missing";
}

function collectFromJobs(apiJobs, opts) {
  const byName = new Map();
  for (const job of apiJobs || []) {
    const id = canonicalizeJobName(job.name);
    // 맨 이름 "qa-matrix" 는 matrix cell 이 아니다. 5칸을 뭉뚱그리지 않는다.
    if (id === "qa-matrix") continue;
    byName.set(id, job);
  }
  const jobs = {};
  for (const id of JOB_IDS) {
    jobs[id] = mapConclusion(byName.get(id));
  }
  return {
    sha: opts.sha || "",
    event_name: opts.eventName || "",
    qa_phase: opts.qaPhase || "",
    jobs,
  };
}

function failClosed(fails) {
  const err = new Error(fails.join("\n"));
  err.code = "FAIL_CLOSED";
  err.fails = fails;
  return err;
}

function normalizeSha(sha) {
  return String(sha || "")
    .trim()
    .toLowerCase();
}

function isFullSha(sha) {
  return /^[0-9a-f]{40}$/.test(sha);
}

function normalizeWorkflowPath(wfPath) {
  return String(wfPath || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .trim();
}

function workflowPathOk(run) {
  const wfPath = normalizeWorkflowPath(run.path);
  return wfPath === ENGINE_WORKFLOW_PATH || wfPath.endsWith("/" + ENGINE_WORKFLOW_PATH);
}

function workflowNameMatches(run) {
  const name = String(run.name || run.workflow_name || "").trim();
  return name === ENGINE_WORKFLOW_NAME;
}

function workflowOk(run) {
  // path = authoritative identity. name is auxiliary evidence only.
  return workflowPathOk(run);
}

function extractQaPhaseFromInputs(run) {
  if (run && run.inputs && run.inputs.qa_phase != null && String(run.inputs.qa_phase) !== "") {
    return String(run.inputs.qa_phase);
  }
  return "";
}

function hasFullJobSignature(jobs) {
  return FULL_SIGNATURE_JOBS.every((id) => {
    const result = jobs[id];
    return result && result !== "missing" && result !== "skipped";
  });
}

function resolveQaPhase(run, jobs) {
  const fromInputs = extractQaPhaseFromInputs(run);
  if (fromInputs) {
    return { qa_phase: fromInputs, qa_phase_proof: "run.inputs.qa_phase" };
  }
  // GitHub REST run 객체는 workflow_dispatch inputs 를 저장하지 않는다.
  // full 만의 job 서명(qa7+fault+measure+adversarial+matrix 5칸)으로 증명한다.
  if (String(run.event || "") === "workflow_dispatch" && hasFullJobSignature(jobs)) {
    return { qa_phase: "full", qa_phase_proof: "full_job_signature" };
  }
  return { qa_phase: "", qa_phase_proof: "unproven" };
}

function assertEngineRunBinding(run, requested) {
  const fails = [];
  if (!run || typeof run !== "object") {
    throw failClosed(["FAIL_CLOSED:engine_run_missing"]);
  }
  if (!workflowOk(run)) {
    fails.push(
      "FAIL_CLOSED:engine_workflow_mismatch:" +
        String(run.name || "") +
        ":" +
        String(run.path || ""),
    );
  }
  const head = normalizeSha(run.head_sha);
  const want = normalizeSha(requested.sha);
  if (!isFullSha(want)) fails.push("FAIL_CLOSED:requested_sha_not_full");
  if (!isFullSha(head)) fails.push("FAIL_CLOSED:engine_head_sha_not_full");
  if (isFullSha(want) && isFullSha(head) && head !== want) {
    fails.push("FAIL_CLOSED:engine_head_sha_mismatch");
  }
  const event = String(run.event || "");
  if (event !== "workflow_dispatch") {
    fails.push("FAIL_CLOSED:engine_event_not_workflow_dispatch:" + event);
  }
  const status = String(run.status || "");
  if (status !== "completed") {
    fails.push("FAIL_CLOSED:engine_status_not_completed:" + status);
  }
  const mappedJobs = requested.jobs || {};
  const phase = resolveQaPhase(run, mappedJobs);
  if (phase.qa_phase !== "full") {
    fails.push("FAIL_CLOSED:engine_qa_phase_not_full:" + (phase.qa_phase || "unproven"));
  }
  if (fails.length) throw failClosed(fails);
  return {
    sha: head,
    event,
    qa_phase: phase.qa_phase,
    qa_phase_proof: phase.qa_phase_proof,
    status,
    workflow: workflowNameMatches(run) ? ENGINE_WORKFLOW_NAME : String(run.name || ""),
    workflow_name_auxiliary: true,
    path: normalizeWorkflowPath(run.path) || ENGINE_WORKFLOW_PATH,
    id: run.id || run.databaseId || null,
  };
}

function collectFromRun(opts) {
  const jobDraft = collectFromJobs(opts.jobs, { sha: "", eventName: "", qaPhase: "" });
  const bound = assertEngineRunBinding(opts.run, {
    sha: opts.requestedSha,
    jobs: jobDraft.jobs,
  });
  const out = collectFromJobs(opts.jobs, {
    sha: bound.sha,
    eventName: bound.event,
    qaPhase: bound.qa_phase,
  });
  out.engine_run = {
    id: bound.id,
    workflow: bound.workflow,
    workflow_name_auxiliary: bound.workflow_name_auxiliary === true,
    path: bound.path,
    head_sha: bound.sha,
    event: bound.event,
    qa_phase: bound.qa_phase,
    qa_phase_proof: bound.qa_phase_proof,
    status: bound.status,
  };
  return out;
}

function repoSlug() {
  return process.env.GITHUB_REPOSITORY || "phonarawd/AI-Profit-OS";
}

function fetchJson(apiPath) {
  const raw = execFileSync("gh", ["api", apiPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(raw);
}

function fetchWorkflowRun(runId) {
  return fetchJson(`repos/${repoSlug()}/actions/runs/${runId}`);
}

function fetchWorkflowJobs(runId) {
  const payload = fetchJson(`repos/${repoSlug()}/actions/runs/${runId}/jobs?per_page=100`);
  return payload.jobs || [];
}

function main(argv) {
  const args = parseArgs(argv);
  if (!args.runId || !args.sha || !args.out) {
    process.stderr.write("usage: collect-engine-jobs.cjs --run-id <id> --sha <sha> --out <file>\n");
    process.exit(2);
  }
  let out;
  try {
    const run = fetchWorkflowRun(args.runId);
    const jobs = fetchWorkflowJobs(args.runId);
    out = collectFromRun({ run, jobs, requestedSha: args.sha });
  } catch (err) {
    const fails = err && err.fails ? err.fails : ["FAIL_CLOSED:" + (err && err.message ? err.message : err)];
    out = {
      sha: normalizeSha(args.sha),
      event_name: "",
      qa_phase: "",
      jobs: {},
      verdict_preflight: "FAIL_CLOSED",
      fails,
    };
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, JSON.stringify(out, null, 2) + "\n");
    process.stderr.write("[collect-engine-jobs] FAIL_CLOSED\n- " + fails.join("\n- ") + "\n");
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(out, null, 2) + "\n");
}

if (require.main === module) {
  main(process.argv);
}

module.exports = {
  collectFromJobs,
  collectFromRun,
  canonicalizeJobName,
  assertEngineRunBinding,
  resolveQaPhase,
  workflowOk,
  workflowPathOk,
  workflowNameMatches,
  JOB_IDS,
  MATRIX_JOB_IDS,
  MATRIX_SUITES,
  FULL_SIGNATURE_JOBS,
  mapConclusion,
};

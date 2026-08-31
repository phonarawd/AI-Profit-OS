"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const JOB_IDS = [
  "qa0-baseline",
  "qa1-deterministic",
  "qa2-synthetic-personas",
  "qa-matrix",
  "qa7-ai-eval",
  "qa5-fault",
  "qa6-measure",
  "qa8-adversarial",
  "aggregator",
];

function parseArgs(argv) {
  const out = { runId: "", sha: "", eventName: "", out: "", qaPhase: "" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--run-id") out.runId = argv[i + 1] || "";
    if (argv[i] === "--sha") out.sha = argv[i + 1] || "";
    if (argv[i] === "--event-name") out.eventName = argv[i + 1] || "";
    if (argv[i] === "--out") out.out = argv[i + 1] || "";
    if (argv[i] === "--qa-phase") out.qaPhase = argv[i + 1] || "";
  }
  return out;
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
    const name = String(job.name || "").trim();
    byName.set(name, job);
  }
  const jobs = {};
  for (const id of JOB_IDS) {
    jobs[id] = mapConclusion(byName.get(id));
  }
  let qaPhase = opts.qaPhase || "";
  if (!qaPhase && opts.eventName === "workflow_dispatch" && jobs["qa7-ai-eval"] !== "skipped" && jobs["qa7-ai-eval"] !== "missing") {
    qaPhase = "full";
  }
  return {
    sha: opts.sha,
    event_name: opts.eventName,
    qa_phase: qaPhase,
    jobs,
  };
}

function main(argv) {
  const args = parseArgs(argv);
  if (!args.runId || !args.out) {
    process.stderr.write("usage: collect-engine-jobs.cjs --run-id <id> --sha <sha> --event-name <name> --out <file>\n");
    process.exit(2);
  }
  const raw = execFileSync(
    "gh",
    ["api", `repos/${process.env.GITHUB_REPOSITORY || "phonarawd/AI-Profit-OS"}/actions/runs/${args.runId}/jobs`],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const payload = JSON.parse(raw);
  const out = collectFromJobs(payload.jobs || [], args);
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(out, null, 2) + "\n");
}

if (require.main === module) {
  main(process.argv);
}

module.exports = { collectFromJobs, JOB_IDS, mapConclusion };

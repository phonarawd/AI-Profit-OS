"use strict";

const fs = require("fs");
const path = require("path");
const { evaluateVerdict, loadContract } = require("../release/release-acceptance-verdict.cjs");
const { evaluateGuard } = require("../release/require-accepted-sha.cjs");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

const contract = loadContract(root);
if (contract.aggregator_is_not_verdict !== true) fail("contract must separate aggregator");
if (!Array.isArray(contract.mandatory_core) || contract.mandatory_core.length < 7) {
  fail("mandatory_core incomplete");
}
if (!contract.mandatory_when_full_dispatch.includes("qa7-ai-eval")) {
  fail("qa7 must be mandatory on full dispatch");
}

const successJobs = {
  "qa0-baseline": "success",
  "qa1-deterministic": "success",
  "qa2-synthetic-personas": "success",
  "qa-matrix": "success",
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
    { sha: "a".repeat(40), event_name: "workflow_dispatch", qa_phase: "full", jobs: successJobs },
    contract,
  ),
  "PASS",
);

check(
  "qa7_fail_full",
  evaluateVerdict(
    {
      sha: "a".repeat(40),
      event_name: "workflow_dispatch",
      qa_phase: "full",
      jobs: { ...successJobs, "qa7-ai-eval": "failure" },
    },
    contract,
  ),
  "FAIL",
);

check(
  "qa6_fail",
  evaluateVerdict(
    {
      sha: "a".repeat(40),
      event_name: "workflow_dispatch",
      qa_phase: "full",
      jobs: { ...successJobs, "qa-matrix": "failure" },
    },
    contract,
  ),
  "FAIL",
);

check(
  "qa8_fail",
  evaluateVerdict(
    {
      sha: "a".repeat(40),
      event_name: "workflow_dispatch",
      qa_phase: "full",
      jobs: { ...successJobs, "qa8-adversarial": "failure" },
    },
    contract,
  ),
  "FAIL",
);

check(
  "unexpected_skip",
  evaluateVerdict(
    {
      sha: "a".repeat(40),
      event_name: "workflow_dispatch",
      qa_phase: "full",
      jobs: { ...successJobs, "qa5-fault": "skipped" },
    },
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
  {
    sha: "a".repeat(40),
    event_name: "workflow_dispatch",
    qa_phase: "full",
    jobs: { ...successJobs, "qa7-ai-eval": "failure", aggregator: "success" },
  },
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
  verdict: { verdict: "FAIL", kind: "PRODUCTION_RELEASE", sha },
});
if (g.ok) fail("failed acceptance must block production");

g = evaluateGuard({ target: "production", sha });
if (g.ok) fail("missing acceptance artifact must block production");

g = evaluateGuard({ target: "production", sha, artifact: tmp });
if (!g.ok) fail("matching accepted sha must allow production guard");

fs.unlinkSync(tmp);

const { collectFromJobs } = require("../release/collect-engine-jobs.cjs");
const collected = collectFromJobs(
  [
    { name: "qa0-baseline", conclusion: "success" },
    { name: "qa7-ai-eval", conclusion: "success" },
    { name: "aggregator", conclusion: "success" },
  ],
  { sha: "a".repeat(40), eventName: "workflow_dispatch" },
);
if (collected.qa_phase !== "full") fail("dispatch + qa7 ran must infer qa_phase=full");
if (collected.jobs["qa-matrix"] !== "missing") fail("absent jobs must be missing");

const wf = fs.readFileSync(path.join(root, ".github/workflows/release-acceptance.yml"), "utf8");
if (!/release-acceptance-verdict\.cjs/.test(wf)) {
  fail("release-acceptance.yml must invoke release-acceptance-verdict.cjs");
}
if (!/workflow_run:/.test(wf)) fail("release-acceptance.yml must follow engine-acceptance via workflow_run");

const deploy = fs.readFileSync(path.join(root, ".github/workflows/deploy-cloudflare.yml"), "utf8");
if (!/require-accepted-sha\.cjs/.test(deploy)) {
  fail("deploy-cloudflare.yml must invoke require-accepted-sha.cjs");
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

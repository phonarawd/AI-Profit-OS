"use strict";

/**
 * 동일 SHA의 release-build 산출물을 받는다.
 * 해당 SHA의 workflow run을 끝까지 페이지네이션한 뒤
 * successful_release_build_count === 1 만 허용한다.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { ARTIFACT_NAME, RELEASE_BUILD_WORKFLOW } = require("./artifact-provenance.cjs");

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGES = 200;

function parseArgs(argv) {
  const out = { sha: "", out: "", optional: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--sha") out.sha = argv[i + 1] || "";
    if (argv[i] === "--out") out.out = argv[i + 1] || "";
    if (argv[i] === "--optional") out.optional = true;
  }
  return out;
}

function gh(args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function ghFetchPage({ sha, workflow, page, perPage }) {
  const raw = gh([
    "api",
    "-H",
    "Accept: application/vnd.github+json",
    `repos/{owner}/{repo}/actions/workflows/${workflow}/runs?head_sha=${sha}&per_page=${perPage}&page=${page}`,
  ]);
  return JSON.parse(raw);
}

function listReleaseBuildRuns(sha, opts) {
  const fetchPage = opts && opts.fetchPage ? opts.fetchPage : ghFetchPage;
  const workflow = (opts && opts.workflow) || RELEASE_BUILD_WORKFLOW;
  const perPage = (opts && opts.perPage) || DEFAULT_PAGE_SIZE;
  const all = [];
  let page = 1;
  for (;;) {
    const payload = fetchPage({ sha, workflow, page, perPage });
    const batch = Array.isArray(payload) ? payload : (payload && payload.workflow_runs) || [];
    all.push(...batch);
    const total = payload && typeof payload.total_count === "number" ? payload.total_count : null;
    if (batch.length === 0) break;
    if (total != null && all.length >= total) break;
    if (batch.length < perPage) break;
    page += 1;
    if (page > MAX_PAGES) {
      const err = new Error("FAIL_CLOSED:release_build_pagination_runaway");
      err.code = "PAGINATION_RUNAWAY";
      throw err;
    }
  }
  return all;
}

function selectSuccessfulReleaseBuild(runs) {
  const successes = (Array.isArray(runs) ? runs : []).filter((run) => {
    if (!run) return false;
    const status = String(run.status || "");
    const conclusion = String(run.conclusion || "");
    return status === "completed" && conclusion === "success";
  });
  if (successes.length === 0) {
    const err = new Error("no release-build success for this SHA");
    err.code = "MISSING";
    err.count = 0;
    throw err;
  }
  if (successes.length !== 1) {
    const err = new Error("FAIL_CLOSED:artifact_built_more_than_once");
    err.code = "BUILT_MORE_THAN_ONCE";
    err.count = successes.length;
    throw err;
  }
  return successes[0];
}

function runId(run) {
  return run && (run.databaseId != null ? run.databaseId : run.id);
}

function prepareDestination(dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
}

function hasCompleteBundleShape(dest) {
  return (
    fs.existsSync(path.join(dest, "release-manifest.json")) &&
    fs.existsSync(path.join(dest, "payload")) &&
    fs.statSync(path.join(dest, "payload")).isDirectory()
  );
}

function main(argv) {
  const args = parseArgs(argv);
  if (!/^[0-9a-f]{40}$/i.test(args.sha) || !args.out) {
    process.stderr.write("usage: fetch-release-bundle.cjs --sha <40hex> --out <dir> [--optional]\n");
    process.exit(2);
  }
  let run;
  try {
    const runs = listReleaseBuildRuns(args.sha);
    run = selectSuccessfulReleaseBuild(runs);
  } catch (err) {
    if (err && err.code === "BUILT_MORE_THAN_ONCE") {
      process.stderr.write("FAIL_CLOSED:artifact_built_more_than_once\n");
      process.exit(1);
    }
    process.stderr.write("no release-build success for this SHA\n");
    if (args.optional) process.exit(0);
    process.exit(1);
  }
  const dest = path.resolve(args.out);
  prepareDestination(dest);
  try {
    execFileSync("gh", ["run", "download", String(runId(run)), "-n", ARTIFACT_NAME, "-D", dest], {
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    process.stderr.write("FAIL_CLOSED:artifact_missing\n");
    if (args.optional) process.exit(0);
    process.exit(1);
  }
  if (!hasCompleteBundleShape(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
    process.stderr.write("FAIL_CLOSED:artifact_incomplete\n");
    if (args.optional) process.exit(0);
    process.exit(1);
  }
  process.stdout.write("fetched release-bundle for " + args.sha.slice(0, 12) + "\n");
}

if (require.main === module) {
  main(process.argv);
}

module.exports = {
  parseArgs,
  ARTIFACT_NAME,
  listReleaseBuildRuns,
  selectSuccessfulReleaseBuild,
  ghFetchPage,
  prepareDestination,
  hasCompleteBundleShape,
  runId,
};

"use strict";

/**
 * Download the UNIQUE release-acceptance PRODUCTION_RELEASE PASS verdict for an exact SHA.
 * Production deploy uses this. No deploy, no DB mutation.
 *
 * Fail-closed rules:
 * - enumerate all release-acceptance runs for the SHA (paginated)
 * - only completed/success runs are candidates
 * - isolate every run download in its own directory (no stale verdict reuse)
 * - artifact_source_sha must be present and exactly match the requested SHA
 * - exactly one valid PRODUCTION_RELEASE PASS artifact is allowed
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const WORKFLOW = "release-acceptance.yml";
const ARTIFACT = "release-acceptance-verdict";
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGES = 200;

function parseArgs(argv) {
  const out = { sha: "", out: "" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--sha") out.sha = argv[i + 1] || "";
    if (argv[i] === "--out") out.out = argv[i + 1] || "";
  }
  return out;
}

function isFullSha(value) {
  return /^[0-9a-f]{40}$/i.test(String(value || ""));
}

function isSha256(value) {
  return /^[0-9a-f]{64}$/i.test(String(value || ""));
}

function repoSlug() {
  return process.env.GITHUB_REPOSITORY || "phonarawd/AI-Profit-OS";
}

function gh(args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function ghFetchPage({ sha, page, perPage }) {
  const raw = gh([
    "api",
    "-H",
    "Accept: application/vnd.github+json",
    `repos/${repoSlug()}/actions/workflows/${WORKFLOW}/runs?head_sha=${sha}&per_page=${perPage}&page=${page}`,
  ]);
  return JSON.parse(raw);
}

function listReleaseAcceptanceRuns(sha, opts) {
  const fetchPage = opts && opts.fetchPage ? opts.fetchPage : ghFetchPage;
  const perPage = (opts && opts.perPage) || DEFAULT_PAGE_SIZE;
  const all = [];
  let page = 1;
  for (;;) {
    const payload = fetchPage({ sha, page, perPage });
    const batch = Array.isArray(payload)
      ? payload
      : (payload && payload.workflow_runs) || [];
    all.push(...batch);
    const total =
      payload && typeof payload.total_count === "number"
        ? payload.total_count
        : null;
    if (batch.length === 0) break;
    if (total != null && all.length >= total) break;
    if (batch.length < perPage) break;
    page += 1;
    if (page > MAX_PAGES) {
      const err = new Error("FAIL_CLOSED:release_acceptance_pagination_runaway");
      err.code = "PAGINATION_RUNAWAY";
      throw err;
    }
  }
  return all;
}

function runId(run) {
  return run && (run.databaseId != null ? run.databaseId : run.id);
}

function completedSuccess(run) {
  return (
    run &&
    String(run.status || "") === "completed" &&
    String(run.conclusion || "") === "success"
  );
}

function validProductionPass(verdict, requestedSha) {
  if (!verdict || typeof verdict !== "object") return false;
  const want = String(requestedSha || "").toLowerCase();
  const source = String(verdict.artifact_source_sha || "").toLowerCase();
  const sha = String(verdict.sha || "").toLowerCase();
  return (
    isFullSha(want) &&
    verdict.verdict === "PASS" &&
    verdict.kind === "PRODUCTION_RELEASE" &&
    verdict.qa_phase === "full" &&
    sha === want &&
    isFullSha(source) &&
    source === want &&
    isSha256(verdict.artifact_digest) &&
    verdict.artifact_built_once === true
  );
}

function selectUniqueProductionPass(candidates) {
  const valid = Array.isArray(candidates) ? candidates : [];
  if (valid.length === 0) {
    const err = new Error(
      "FAIL_CLOSED:no_PRODUCTION_RELEASE_PASS_artifact_with_digest_for_SHA",
    );
    err.code = "MISSING";
    throw err;
  }
  if (valid.length !== 1) {
    const err = new Error(
      "FAIL_CLOSED:multiple_PRODUCTION_RELEASE_PASS_artifacts_for_SHA",
    );
    err.code = "AMBIGUOUS";
    err.count = valid.length;
    throw err;
  }
  return valid[0];
}

function runDownloadDir(root, id) {
  const value = String(id == null ? "" : id);
  if (!/^[0-9]+$/.test(value)) {
    throw new Error("FAIL_CLOSED:release_acceptance_run_id_invalid");
  }
  return path.join(root, "run-" + value);
}

function downloadVerdict(run, root, execFile) {
  const id = runId(run);
  const dir = runDownloadDir(root, id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const execute = execFile || execFileSync;
  execute(
    "gh",
    ["run", "download", String(id), "-n", ARTIFACT, "-D", dir],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const verdictPath = path.join(dir, "verdict.json");
  if (!fs.existsSync(verdictPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(verdictPath, "utf8"));
  } catch {
    return null;
  }
}

function collectValidPasses(runs, requestedSha, opts) {
  const root =
    (opts && opts.root) ||
    fs.mkdtempSync(path.join(os.tmpdir(), "aipo-acceptance-"));
  const download =
    opts && opts.downloadVerdict
      ? opts.downloadVerdict
      : (run) => downloadVerdict(run, root);
  const valid = [];
  for (const run of Array.isArray(runs) ? runs : []) {
    if (!completedSuccess(run)) continue;
    let verdict = null;
    try {
      verdict = download(run, root);
    } catch {
      continue;
    }
    if (!validProductionPass(verdict, requestedSha)) continue;
    valid.push({ run_id: runId(run), verdict });
  }
  return valid;
}

function main(argv) {
  const args = parseArgs(argv);
  if (!isFullSha(args.sha) || !args.out) {
    process.stderr.write(
      "usage: fetch-acceptance-artifact.cjs --sha <40hex> --out <file>\n",
    );
    process.exit(2);
  }

  let runs;
  try {
    runs = listReleaseAcceptanceRuns(args.sha);
  } catch (err) {
    process.stderr.write(
      "[fetch-acceptance-artifact] " +
        (err && err.message ? err.message : String(err)) +
        "\n",
    );
    process.exit(1);
  }

  let chosen;
  try {
    const valid = collectValidPasses(runs, args.sha);
    chosen = selectUniqueProductionPass(valid);
  } catch (err) {
    process.stderr.write(
      "[fetch-acceptance-artifact] " +
        (err && err.message ? err.message : String(err)) +
        "\n",
    );
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(
    args.out,
    JSON.stringify(chosen.verdict, null, 2) + "\n",
  );
  process.stdout.write(
    "fetched unique release-acceptance PASS for " +
      args.sha.slice(0, 12) +
      " from run " +
      String(chosen.run_id) +
      "\n",
  );
}

if (require.main === module) {
  main(process.argv);
}

module.exports = {
  WORKFLOW,
  ARTIFACT,
  parseArgs,
  isFullSha,
  isSha256,
  listReleaseAcceptanceRuns,
  completedSuccess,
  validProductionPass,
  selectUniqueProductionPass,
  runDownloadDir,
  downloadVerdict,
  collectValidPasses,
  ghFetchPage,
  runId,
};

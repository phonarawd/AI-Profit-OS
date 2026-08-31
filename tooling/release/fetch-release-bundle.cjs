"use strict";

/**
 * 동일 SHA의 release-build 산출물을 받는다.
 * 성공 빌드가 0이면 missing, 2개 이상이면 built_more_than_once.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { ARTIFACT_NAME, RELEASE_BUILD_WORKFLOW } = require("./artifact-provenance.cjs");

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

function main(argv) {
  const args = parseArgs(argv);
  if (!/^[0-9a-f]{40}$/i.test(args.sha) || !args.out) {
    process.stderr.write("usage: fetch-release-bundle.cjs --sha <40hex> --out <dir> [--optional]\n");
    process.exit(2);
  }
  const raw = gh([
    "run",
    "list",
    "--workflow",
    RELEASE_BUILD_WORKFLOW,
    "--commit",
    args.sha,
    "--limit",
    "20",
    "--json",
    "databaseId,conclusion,event,status",
  ]);
  const runs = JSON.parse(raw);
  const successes = (Array.isArray(runs) ? runs : []).filter(
    (run) => run && run.status === "completed" && run.conclusion === "success",
  );
  if (successes.length === 0) {
    process.stderr.write("no release-build success for this SHA\n");
    if (args.optional) process.exit(0);
    process.exit(1);
  }
  if (successes.length > 1) {
    process.stderr.write("FAIL_CLOSED:artifact_built_more_than_once\n");
    process.exit(1);
  }
  const run = successes[0];
  const dest = path.resolve(args.out);
  fs.mkdirSync(dest, { recursive: true });
  try {
    execFileSync("gh", ["run", "download", String(run.databaseId), "-n", ARTIFACT_NAME, "-D", dest], {
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    process.stderr.write("FAIL_CLOSED:artifact_missing\n");
    if (args.optional) process.exit(0);
    process.exit(1);
  }
  if (!fs.existsSync(path.join(dest, "release-manifest.json")) && !fs.existsSync(path.join(dest, "payload"))) {
    process.stderr.write("FAIL_CLOSED:artifact_missing\n");
    if (args.optional) process.exit(0);
    process.exit(1);
  }
  process.stdout.write("fetched release-bundle for " + args.sha.slice(0, 12) + "\n");
}

if (require.main === module) {
  main(process.argv);
}

module.exports = { parseArgs, ARTIFACT_NAME };

"use strict";

/**
 * Download release-acceptance-verdict for an exact SHA.
 * Production deploy uses this. No deploy, no DB mutation.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const out = { sha: "", out: "" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--sha") out.sha = argv[i + 1] || "";
    if (argv[i] === "--out") out.out = argv[i + 1] || "";
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
    process.stderr.write("usage: fetch-acceptance-artifact.cjs --sha <40hex> --out <file>\n");
    process.exit(2);
  }
  const raw = gh([
    "run",
    "list",
    "--workflow",
    "release-acceptance.yml",
    "--commit",
    args.sha,
    "--limit",
    "20",
    "--json",
    "databaseId,conclusion,event,status",
  ]);
  const runs = JSON.parse(raw);
  if (!Array.isArray(runs) || runs.length === 0) {
    process.stderr.write("no engine-acceptance run for this SHA\n");
    process.exit(1);
  }
  const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "aipo-acc-"));
  for (const run of runs) {
    try {
      execFileSync(
        "gh",
        ["run", "download", String(run.databaseId), "-n", "release-acceptance-verdict", "-D", tmp],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch {
      continue;
    }
    const verdictPath = path.join(tmp, "verdict.json");
    if (!fs.existsSync(verdictPath)) continue;
    const verdict = JSON.parse(fs.readFileSync(verdictPath, "utf8"));
    if (verdict.verdict === "PASS" && verdict.kind === "PRODUCTION_RELEASE" && String(verdict.sha).toLowerCase() === args.sha.toLowerCase()) {
      fs.mkdirSync(path.dirname(args.out), { recursive: true });
      fs.writeFileSync(args.out, JSON.stringify(verdict, null, 2) + "\n");
      process.stdout.write("fetched release-acceptance PASS for " + args.sha.slice(0, 12) + "\n");
      return;
    }
  }
  process.stderr.write("no PRODUCTION_RELEASE PASS artifact for this SHA\n");
  process.exit(1);
}

if (require.main === module) {
  main(process.argv);
}

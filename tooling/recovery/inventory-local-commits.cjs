"use strict";

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "governance", "recovery", "local-24-commits.v1.json");

function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

const HOME_RE =
  /(spark-dash-home|HomeDesktop|HomeMobile|home-approval-freeze|home-presentation-freeze|home-visual-v2)/i;
const SECRET_RE = /(\.env$|mcp\.json|credentials|service_role|id_rsa|\.pem$)/i;
const DB_RE = /(supabase\/migrations|governance\/db-recon|b3-promotion)/i;
const RELEASE_RE = /(\.github\/workflows|engine-acceptance|deploy-cloudflare|release-acceptance)/i;

function classifyCommit(title, files) {
  if (files.some((f) => SECRET_RE.test(f))) return "SECRET_RISK";
  if (files.some((f) => HOME_RE.test(f))) return "HOME_FROZEN";
  return "REVIEW";
}

function main() {
  const lines = git(["log", "--format=%H\t%s", "origin/cursor/rel-602-staging-rollback-a907..HEAD"])
    .split(/\r?\n/)
    .filter(Boolean);
  const commits = [];
  for (const line of lines) {
    const i = line.indexOf("\t");
    const sha = line.slice(0, i);
    const title = line.slice(i + 1);
    const files = git(["diff-tree", "--no-commit-id", "--name-only", "-r", sha])
      .split(/\r?\n/)
      .filter(Boolean);
    let onMain = false;
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", sha, "origin/main"], {
        cwd: ROOT,
        stdio: "ignore",
      });
      onMain = true;
    } catch {
      onMain = false;
    }
    commits.push({
      sha,
      title,
      files,
      file_count: files.length,
      home_impact: files.some((f) => HOME_RE.test(f)),
      db_impact: files.some((f) => DB_RE.test(f)),
      release_impact: files.some((f) => RELEASE_RE.test(f)),
      on_origin_main: onMain,
      verdict: onMain ? "OBSOLETE_AGAINST_MAIN" : classifyCommit(title, files),
    });
  }
  const out = {
    schema: "governance.recovery.local-24-commits.v1",
    observed_at: new Date().toISOString(),
    range: "origin/cursor/rel-602-staging-rollback-a907..HEAD",
    count: commits.length,
    commits,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  process.stdout.write(`wrote ${OUT} count=${commits.length}\n`);
}

main();

"use strict";

/**
 * Restore only STATUS_DIRTY_EMPTY_DIFF paths (git diff empty).
 * Never restores SEMANTIC / UNTRACKED / HOME-FROZEN semantic files.
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const STATE = path.join(ROOT, "governance", "recovery", "current-local-state.v1.json");

function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function main() {
  const state = JSON.parse(fs.readFileSync(STATE, "utf8"));
  const paths = state.status_dirty_empty_diff;
  if (!Array.isArray(paths) || paths.length === 0) {
    process.stdout.write("no empty-diff paths\n");
    return;
  }
  const semantic = new Set((state.semantic || []).map((r) => r.path));
  const safe = paths.filter((p) => !semantic.has(p));
  const BATCH = 40;
  let restored = 0;
  for (let i = 0; i < safe.length; i += BATCH) {
    const batch = safe.slice(i, i + BATCH);
    git(["restore", "--worktree", "--", ...batch]);
    restored += batch.length;
  }
  process.stdout.write(`restored_empty_diff=${restored}\n`);
}

main();

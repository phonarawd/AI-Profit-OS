/**
 * git-blob-hash.cjs
 *
 * Small, pure helper: compute the sha256 of a path's TRUE committed content at a given git ref,
 * independent of whatever bytes happen to be sitting in the local working tree.
 *
 * Root cause this exists for (D1-S1E, 2026-09-05): apps/web/scripts/asset-pipeline/home-lock.v1.json's
 * recorded sha256 for 38 apps/web/public/spark-dash/*.svg entries was originally computed by reading the
 * *local working-tree* file bytes on a Windows machine whose working tree had stray CRLF line-ending
 * conversion for those specific files (a pre-existing, git-status-invisible artifact - see
 * _audit-d0-20260904/session-1e-correction/logs/d1s1e-*.log for the full forensic proof). That baked a
 * WRONG "expected" hash into the lock: correct for a CRLF-contaminated local disk, wrong for the actual
 * committed (LF) git blob that any clean checkout - including every CI runner - receives. This helper lets
 * a verify script assert the lock's expected hash against the one source of truth that is always correct
 * on every machine and every OS: the committed git object itself.
 */
"use strict";

const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");

/**
 * @param {string} cwd repo root (or any dir inside the repo)
 * @param {string} ref git ref, e.g. "HEAD"
 * @param {string} relPath repo-relative path, forward-slash form
 * @returns {{ ok: true, sha256: string, bytes: number } | { ok: false, error: string }}
 */
function gitBlobSha256(cwd, ref, relPath) {
  const object = `${ref}:${relPath}`;
  const res = spawnSync("git", ["cat-file", "-p", object], {
    cwd,
    maxBuffer: 1024 * 1024 * 64,
  });
  if (res.error) {
    return { ok: false, error: `git spawn failed: ${res.error.message}` };
  }
  if (res.status !== 0) {
    const stderr = (res.stderr || Buffer.from("")).toString("utf8").trim();
    return { ok: false, error: `git cat-file failed for ${object}: ${stderr || "exit " + res.status}` };
  }
  const buf = res.stdout;
  return {
    ok: true,
    sha256: crypto.createHash("sha256").update(buf).digest("hex"),
    bytes: buf.length,
  };
}

module.exports = { gitBlobSha256 };

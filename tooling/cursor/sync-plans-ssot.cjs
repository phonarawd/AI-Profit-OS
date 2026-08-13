#!/usr/bin/env node
/**
 * Plan SSOT sync — prevent Cursor UI todo drift (ADR-016)
 *
 * Problem (실측):
 * - Cursor Plan UI / registry는 워크스페이스 `.cursor/plans` 또는
 *   `%USERPROFILE%\.cursor\plans` 둘 다 열 수 있다.
 * - 예전 sync는 copy라서 두 경로가 다른 inode → UI에서 status 완료 후
 *   `pnpm cursor:sync-plans`(prepare/sessionStart/sessionEnd)가 워크스페이스본으로
 *   홈을 덮어쓰면 체크가 다시 pending으로 되돌아간다.
 *
 * Fix:
 * - 워크스페이스 파일이 유일한 바이트 SSOT.
 * - 홈 경로는 가능하면 **hardlink(동일 inode)** 로 붙인다.
 *   → 어느 쪽을 편집해도 status가 동시에 반영되고, sync가 되돌리지 않는다.
 * - hardlink 불가(EXDEV 등)일 때만 copy fallback.
 *
 * Default: ensure hardlink (or copy) workspace → home + quarantine home-only aliases.
 * --check: verify hash match (+ hardlink when possible) · used by verify:plans-ssot
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "../..");
const wsPlans = path.join(root, ".cursor", "plans");
const homePlans = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  ".cursor",
  "plans",
);
const archiveDir = path.join(homePlans, "_archive", "ai_profit_os_stale");

const checkOnly = process.argv.includes("--check");
const quiet = process.argv.includes("--quiet");

function log(msg) {
  if (!quiet) console.log(msg);
}

function sha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function listActiveWorkspacePlans() {
  if (!fs.existsSync(wsPlans)) return [];
  return fs
    .readdirSync(wsPlans)
    .filter((n) => /^ai_profit_os_.+\.plan\.md$/i.test(n))
    .sort();
}

function listHomeAiProfitPlans() {
  if (!fs.existsSync(homePlans)) return [];
  return fs
    .readdirSync(homePlans)
    .filter((n) => /^ai_profit_os_.+\.plan\.md$/i.test(n))
    .sort();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sameInode(a, b) {
  try {
    const sa = fs.statSync(a);
    const sb = fs.statSync(b);
    return sa.dev === sb.dev && sa.ino === sb.ino;
  } catch {
    return false;
  }
}

function unlinkIfExists(p) {
  try {
    fs.unlinkSync(p);
  } catch (e) {
    if (e && e.code !== "ENOENT") throw e;
  }
}

/**
 * Ensure home path is the same bytes as workspace.
 * Prefer hardlink so UI edits cannot drift from git SSOT.
 * @returns {"linked"|"already-linked"|"copied"|"already-copied"}
 */
function mirrorWorkspaceToHome(src, dst) {
  ensureDir(path.dirname(dst));
  if (fs.existsSync(dst) && sameInode(src, dst)) {
    return "already-linked";
  }
  const srcHash = sha256(src);
  if (fs.existsSync(dst) && !sameInode(src, dst) && sha256(dst) === srcHash) {
    // Same bytes, separate inode — replace copy with hardlink when possible.
    unlinkIfExists(dst);
    try {
      fs.linkSync(src, dst);
      return "linked";
    } catch {
      // Recreate copy if link fails after unlink
      fs.copyFileSync(src, dst);
      return "copied";
    }
  }
  if (fs.existsSync(dst) && sha256(dst) === srcHash) {
    return "already-copied";
  }
  unlinkIfExists(dst);
  try {
    fs.linkSync(src, dst);
    return "linked";
  } catch (e) {
    fs.copyFileSync(src, dst);
    if (!quiet) {
      log(
        `[cursor:sync-plans] hardlink failed (${e.code || e.message}) · copied ${path.basename(dst)}`,
      );
    }
    return "copied";
  }
}

function quarantineHome(name) {
  const src = path.join(homePlans, name);
  if (!fs.existsSync(src)) return false;
  ensureDir(archiveDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dst = path.join(archiveDir, `${stamp}__${name}`);
  fs.renameSync(src, dst);
  return dst;
}

function main() {
  const active = listActiveWorkspacePlans();
  if (!active.length) {
    console.error("[cursor:sync-plans] FAIL — no workspace ai_profit_os_*.plan.md");
    process.exit(1);
  }

  // CI has no Cursor home Plan UI — only assert workspace ACTIVE set exists.
  if (process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true") {
    if (checkOnly) {
      console.log(
        `[verify:plans-ssot] PASS (CI skip home mirror · ${active.length} workspace ACTIVE)`,
      );
      return;
    }
    console.log(
      `[cursor:sync-plans] skip home sync on CI · active=${active.length}`,
    );
    return;
  }

  if (!process.env.USERPROFILE && !process.env.HOME) {
    console.warn("[cursor:sync-plans] skip — no USERPROFILE/HOME");
    process.exit(0);
  }

  const activeSet = new Set(active);
  const fails = [];
  let linked = 0;
  let alreadyLinked = 0;
  let copied = 0;
  let alreadyCopied = 0;
  let quarantined = 0;

  ensureDir(homePlans);

  for (const name of active) {
    const src = path.join(wsPlans, name);
    const dst = path.join(homePlans, name);
    const srcHash = sha256(src);
    const exists = fs.existsSync(dst);
    const linkedNow = exists && sameInode(src, dst);
    const hashMatch = exists && sha256(dst) === srcHash;

    if (checkOnly) {
      if (!exists) {
        fails.push(`MISSING home copy of ${name}`);
        continue;
      }
      if (!hashMatch) {
        fails.push(`DRIFT ${name} (home ≠ workspace)`);
        continue;
      }
      // hash match is enough for PASS; hardlink is preferred but not required on EXDEV
      continue;
    }

    const result = mirrorWorkspaceToHome(src, dst);
    if (result === "linked") {
      linked += 1;
      log(`[cursor:sync-plans] hardlinked ${name}`);
    } else if (result === "already-linked") {
      alreadyLinked += 1;
    } else if (result === "copied") {
      copied += 1;
      log(`[cursor:sync-plans] copied ${name}`);
    } else {
      alreadyCopied += 1;
    }

    // silence unused in quiet path
    void linkedNow;
  }

  for (const name of listHomeAiProfitPlans()) {
    if (activeSet.has(name)) continue;
    if (checkOnly) {
      fails.push(
        `STALE home alias ${name} (quarantine via pnpm cursor:sync-plans)`,
      );
      continue;
    }
    const moved = quarantineHome(name);
    if (moved) {
      quarantined += 1;
      log(`[cursor:sync-plans] quarantined ${name} → _archive/ai_profit_os_stale/`);
    }
  }

  if (checkOnly) {
    if (fails.length) {
      console.error(
        "[verify:plans-ssot] FAIL — Cursor home plans drift\n- " +
          fails.join("\n- ") +
          "\nFix: pnpm cursor:sync-plans",
      );
      process.exit(1);
    }
    // Report how many are true hardlinks (informational)
    let hard = 0;
    for (const name of active) {
      if (
        sameInode(path.join(wsPlans, name), path.join(homePlans, name))
      ) {
        hard += 1;
      }
    }
    console.log(
      `[verify:plans-ssot] PASS (${active.length} ACTIVE · home hash match · hardlink=${hard}/${active.length} · stale aliases 0)`,
    );
    return;
  }

  console.log(
    `[cursor:sync-plans] done · linked=${linked} already-linked=${alreadyLinked} copied=${copied} already-copied=${alreadyCopied} quarantined=${quarantined} active=${active.length}`,
  );
}

main();

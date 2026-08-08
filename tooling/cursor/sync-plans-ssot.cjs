#!/usr/bin/env node
/**
 * Plan SSOT sync — prevent Cursor UI todo drift (ADR-016)
 *
 * Problem: Cursor Plan UI may read %USERPROFILE%\.cursor\plans\ copies.
 * Workspace `.cursor/plans/ai_profit_os_*.plan.md` is the only editable SSOT.
 * Stale home copies (pre File-Serial names, *_ssot stubs) cause "todo not completed".
 *
 * Default: sync workspace → home + quarantine home-only AI Profit OS aliases.
 * --check: verify only (exit 1 on drift) · used by verify:plans-ssot
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

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
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
  let synced = 0;
  let already = 0;
  let quarantined = 0;

  ensureDir(homePlans);

  for (const name of active) {
    const src = path.join(wsPlans, name);
    const dst = path.join(homePlans, name);
    const srcHash = sha256(src);
    if (fs.existsSync(dst) && sha256(dst) === srcHash) {
      already += 1;
      continue;
    }
    if (checkOnly) {
      fails.push(
        fs.existsSync(dst)
          ? `DRIFT ${name} (home ≠ workspace)`
          : `MISSING home copy of ${name}`,
      );
      continue;
    }
    copyFile(src, dst);
    synced += 1;
    log(`[cursor:sync-plans] synced ${name}`);
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
    console.log(
      `[verify:plans-ssot] PASS (${active.length} ACTIVE · home hash match · stale aliases 0)`,
    );
    return;
  }

  // Always emit one summary line (hooks parse exit code; quiet only hides per-file noise)
  console.log(
    `[cursor:sync-plans] done · synced=${synced} already=${already} quarantined=${quarantined} active=${active.length}`,
  );
}

main();

#!/usr/bin/env node
/**
 * Plan integrity — frontmatter parse · CURRENT_ACTIVE uniqueness ·
 * legacy pending counts (이력 위조 금지) · completed slice must not stay YES
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const plansDir = path.join(root, ".cursor", "plans");

const LEGACY_PENDING = {
  "ai_profit_os_00_index_a1b2c3d4.plan.md": 0,
  "ai_profit_os_01_money_c3d4e5f6.plan.md": 0,
  "ai_profit_os_02_engine_b2c3d4e5.plan.md": 0,
  "ai_profit_os_02_5_engine_acceptance_qa_fd1cd7cc.plan.md": 0,
  "ai_profit_os_03_ui_ux_d4e5f6a7.plan.md": 14,
  "ai_profit_os_04_admin_e5f6a7b8.plan.md": 17,
  "ai_profit_os_05_pwa_f6a7b8c9.plan.md": 7,
  "ai_profit_os_06_infra_a7b8c9d0.plan.md": 17,
  "ai_profit_os_launch_54c1261e.plan.md": 5,
};

function stripBom(buf) {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return { bom: true, buf: buf.slice(3) };
  }
  return { bom: false, buf };
}

function parseTodos(fm) {
  const todos = [];
  let cur = null;
  for (const line of fm.split(/\r?\n/)) {
    const id = line.match(/^\s+- id:\s*(\S+)/);
    if (id) {
      if (cur) todos.push(cur);
      cur = { id: id[1], status: "" };
      continue;
    }
    const st = line.match(/^\s+status:\s*(\S+)/);
    if (st && cur) cur.status = st[1];
  }
  if (cur) todos.push(cur);
  return todos;
}

const fails = [];
function isIntegrityPlanName(n) {
  return /^(ai_profit_os_|PUTDUK_CURRENT_).+\.plan\.md$/i.test(n);
}

const files = fs
  .readdirSync(plansDir)
  .filter(isIntegrityPlanName)
  .sort();

if (!files.filter((n) => /^ai_profit_os_/i.test(n)).length) {
  fails.push("no workspace ai_profit_os_*.plan.md");
}

const activeYes = [];

for (const name of files) {
  const raw = fs.readFileSync(path.join(plansDir, name));
  const { bom, buf } = stripBom(raw);
  if (bom) {
    fails.push(`${name}: UTF-8 BOM before frontmatter`);
  }
  const text = buf.toString("utf8");
  if (!text.startsWith("---")) {
    fails.push(`${name}: YAML frontmatter must start at byte 0`);
    continue;
  }
  const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    fails.push(`${name}: unclosed YAML frontmatter`);
    continue;
  }
  const todos = parseTodos(fmMatch[1]);
  const pending = todos.filter((t) => t.status === "pending").length;
  const completed = todos.filter((t) => t.status === "completed").length;
  const bad = todos.filter(
    (t) => t.status !== "pending" && t.status !== "completed",
  );
  if (bad.length) {
    fails.push(
      `${name}: illegal todo status ${bad.map((t) => `${t.id}:${t.status}`).join(",")}`,
    );
  }

  const yes = /\bCURRENT_ACTIVE_PLAN\s*=\s*YES\b/.test(text);
  const no = /\bCURRENT_ACTIVE_PLAN\s*=\s*NO\b/.test(text);
  if (yes && no) {
    fails.push(`${name}: CURRENT_ACTIVE_PLAN YES and NO both present`);
  }
  // File-Serial uniqueness는 ai_profit_os_* 슬라이스에만 적용.
  // PUTDUK Current Master는 Track A~G가 동시에 YES일 수 있다.
  if (yes && /^ai_profit_os_/i.test(name)) activeYes.push(name);

  if (Object.prototype.hasOwnProperty.call(LEGACY_PENDING, name)) {
    if (yes) {
      fails.push(`${name}: legacy must not be CURRENT_ACTIVE_PLAN = YES`);
    }
    if (pending !== LEGACY_PENDING[name]) {
      fails.push(
        `${name}: legacy pending ${pending} ≠ authority ${LEGACY_PENDING[name]} (이력 위조 금지)`,
      );
    }
  } else if (
    todos.length &&
    completed === todos.length &&
    pending === 0 &&
    yes
  ) {
    fails.push(`${name}: completed slice must set CURRENT_ACTIVE_PLAN = NO`);
  }
}

if (activeYes.length > 1) {
  fails.push(
    `CURRENT_ACTIVE_PLAN = YES count ${activeYes.length} > 1: ${activeYes.join(", ")}`,
  );
}

if (fails.length) {
  console.error("[verify:plans-ssot] FAIL — plan integrity");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log(
  `[verify:plans-ssot] integrity PASS (${files.length} plans · CURRENT_ACTIVE_YES=${activeYes.length})`,
);

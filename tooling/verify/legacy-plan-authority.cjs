#!/usr/bin/env node
/**
 * verify:legacy-plan-authority — Phase 2
 * 레거시 9플랜 자동실행 0 · 헌법 Consumer presentation 권위 0 · 미래 플랜 시스템 보존
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

function mustInclude(rel, token) {
  const t = read(rel);
  if (t && !t.includes(token)) fail(`${rel} must contain: ${token}`);
}

const LEGACY_PLANS = [
  "ai_profit_os_00_index_a1b2c3d4.plan.md",
  "ai_profit_os_01_money_c3d4e5f6.plan.md",
  "ai_profit_os_02_engine_b2c3d4e5.plan.md",
  "ai_profit_os_02_5_engine_acceptance_qa_fd1cd7cc.plan.md",
  "ai_profit_os_03_ui_ux_d4e5f6a7.plan.md",
  "ai_profit_os_04_admin_e5f6a7b8.plan.md",
  "ai_profit_os_05_pwa_f6a7b8c9.plan.md",
  "ai_profit_os_06_infra_a7b8c9d0.plan.md",
  "ai_profit_os_launch_54c1261e.plan.md",
];

if (LEGACY_PLANS.length !== 9) fail("LEGACY_PLAN_COUNT internal != 9");

for (const name of LEGACY_PLANS) {
  const rel = path.posix.join(".cursor/plans", name);
  const t = read(rel);
  if (!t) continue;
  if (!t.includes("PHASE 2 PLAN AUTHORITY")) {
    fail(`${name}: missing PHASE 2 PLAN AUTHORITY`);
  }
  if (!t.includes("AUTO_EXECUTION = DISABLED")) {
    fail(`${name}: AUTO_EXECUTION not DISABLED`);
  }
  if (!t.includes("CONSUMER_PRESENTATION_AUTHORITY = NO")) {
    fail(`${name}: CONSUMER_PRESENTATION_AUTHORITY not NO`);
  }
  if (/\bCURRENT_ACTIVE_PLAN\s*=\s*YES\b/.test(t)) {
    fail(`${name}: must not be CURRENT_ACTIVE_PLAN = YES`);
  }
}

mustInclude(
  "AGENTS.md",
  "LEGACY_00_06_FILE_SERIAL_AUTO_EXECUTION = 0"
);
mustInclude("AGENTS.md", "LEGACY_LAUNCH_PLAN_AUTO_EXECUTION = 0");
mustInclude("AGENTS.md", "FUTURE_ACTIVE_PLAN_SYSTEM = PRESERVED");
mustInclude("AGENTS.md", "CURRENT_ACTIVE_PLAN = YES");

mustInclude(
  ".cursor/rules/plan-file-serial.mdc",
  "LEGACY_00_06_FILE_SERIAL_AUTO_EXECUTION = 0"
);
mustInclude(
  ".cursor/rules/plan-file-serial.mdc",
  "LEGACY_LAUNCH_PLAN_AUTO_EXECUTION = 0"
);
mustInclude(
  ".cursor/rules/plan-file-serial.mdc",
  "FUTURE_ACTIVE_PLAN_SYSTEM = PRESERVED"
);
mustInclude(
  ".cursor/rules/plan-file-serial.mdc",
  "CURRENT_ACTIVE_PLAN = YES"
);

mustInclude(
  "docs/CONSTITUTION_BOOTSTRAP.md",
  "LEGACY_CONSTITUTION_CONSUMER_PRESENTATION_AUTHORITY = 0"
);
mustInclude(
  "docs/CONSTITUTION_BOOTSTRAP.md",
  "LEGACY_PLAN_AUTO_EXECUTION = 0"
);

const constDir = path.join(root, "CONSTITUTION");
if (!fs.existsSync(constDir)) {
  fail("CONSTITUTION/ missing");
} else {
  const n = fs.readdirSync(constDir).filter((f) => f.endsWith(".md")).length;
  if (n !== 29) fail(`LEGACY_CONSTITUTION_COUNT expected 29 got ${n}`);
}

const intent = [
  "docs/reference/founder-intent/README.md",
  "docs/reference/founder-intent/PLAN_AUTHORITY_MATRIX.md",
  "docs/reference/founder-intent/CONSTITUTION_AUTHORITY_MATRIX.md",
  "docs/reference/founder-intent/FOUNDER_INTENT_EXTRACT.md",
  "docs/reference/founder-intent/LEGACY_CONFLICT_REGISTER.md",
];
for (const rel of intent) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing: ${rel}`);
}

const osRel =
  "docs/product/PUTDUK_PRODUCT_DESIGN_ENGINEERING_OPERATING_SYSTEM.md";
mustInclude(osRel, "PROCESS AUTHORITY");
mustInclude(
  osRel,
  "OPERATING_SYSTEM_FREEZES_VISUAL_STYLE_BEFORE_FIGMA = NO"
);
mustInclude(osRel, "CURRENT_ACTIVE_PLAN");
const os = read(osRel);
if (os && /defines visual design before Figma = YES/.test(os)) {
  fail("OS doc must not define visual design before Figma");
}

mustInclude(
  ".cursor/rules/legacy-plan-authority.mdc",
  "LEGACY_00_06_FILE_SERIAL_AUTO_EXECUTION = 0"
);

if (!fs.existsSync(path.join(root, "tooling/cursor/sync-plans-ssot.cjs"))) {
  fail("future plan system missing: tooling/cursor/sync-plans-ssot.cjs");
}
if (!fs.existsSync(path.join(root, "tooling/verify/plans-ssot.cjs"))) {
  fail("future plan system missing: tooling/verify/plans-ssot.cjs");
}

const pkg = JSON.parse(read("package.json") || "{}");
if (!pkg.scripts?.["cursor:sync-plans"]) {
  fail("package.json missing cursor:sync-plans");
}
if (!pkg.scripts?.["verify:plans-ssot"]) {
  fail("package.json missing verify:plans-ssot");
}

if (fails.length) {
  console.error("[verify:legacy-plan-authority] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log(
  "[verify:legacy-plan-authority] PASS — legacy plans=9 auto-exec=0 · constitution=29 presentation=0 · future plan system preserved"
);

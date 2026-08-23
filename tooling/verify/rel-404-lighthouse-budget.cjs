/**
 * verify:rel-404-lighthouse-budget
 * 예산 파일 존재 + image/lazy 배선 + Home 시각 후퇴 금지.
 * 로컬 풀 Lighthouse 0.
 */
const fs = require("fs");
const path = require("path");
const { staticBudgetAudit } = require("../perf/lighthouse.ci.cjs");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const audit = staticBudgetAudit();
for (const f of audit.fails) fails.push(f);

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const workflow = read(".github/workflows/lighthouse.yml");
const doc = read("governance/performance/LIGHTHOUSE.md");
const evidence = read("governance/release-master/REL-404-LIGHTHOUSE-BUDGET.md");

for (const rel of [
  "governance/performance/budgets.v1.json",
  "governance/performance/LIGHTHOUSE.md",
  "tooling/perf/lighthouse.ci.cjs",
]) {
  if (!fs.existsSync(path.join(root, rel))) fails.push("missing: " + rel);
}

if (!pkg.includes("verify:rel-404-lighthouse-budget")) {
  fails.push("package.json missing verify:rel-404-lighthouse-budget");
}
if (!catalog.includes("rel-404-lighthouse-budget")) {
  fails.push("CATALOG missing rel-404-lighthouse-budget");
}
if (!gate.includes("verify:rel-404-lighthouse-budget")) {
  fails.push("gate.yml must run verify:rel-404-lighthouse-budget");
}
if (!workflow.includes("workflow_dispatch")) {
  fails.push("lighthouse.yml must stay HUMAN workflow_dispatch");
}
if (/branches:\s*\[main\]/.test(workflow) || /pull_request:/.test(workflow)) {
  fails.push("lighthouse.yml must not auto-run full LH on every PR");
}
for (const needle of [
  "LOCAL_FULL_LIGHTHOUSE: 0",
  "NUMERIC_SLO_INVENTED: 0",
  "HOME_VISUAL_DOWNGRADE: 0",
  "EXIT_GATE",
]) {
  if (!doc.includes(needle)) fails.push("LIGHTHOUSE.md missing " + needle);
}
if (!evidence.includes("STATUS = COMPLETED")) {
  fails.push("REL-404 evidence must be COMPLETED");
}
if (!evidence.includes("HOME_GEOMETRY_DIFF = 0")) {
  fails.push("evidence must keep HOME_GEOMETRY_DIFF = 0");
}

if (fails.length) {
  console.error("[verify:rel-404-lighthouse-budget] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:rel-404-lighthouse-budget] PASS (budgets · Home lock · CI-delegated LH)",
);

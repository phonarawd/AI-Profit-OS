#!/usr/bin/env node
/**
 * verify:founder-execution-delegation
 * 실행 주체는 에이전트. hard gate 스킵·CERT 세탁 금지. api-prod는 Nest만.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { evaluate, loadDelegation } = require("../release/agent-execute.cjs");

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

const d = loadDelegation();
if (d.founder_execution_delegation !== "FULL") {
  fails.push("founder_execution_delegation must be FULL");
}
if (d.founder_tasks !== 0) fails.push("founder_tasks must be 0");
if (d.executor !== "agent") fails.push("executor must be agent");
if (d.skip_hard_gates !== false) fails.push("skip_hard_gates must be false");
if (d.cert_issued_by_delegation !== false) {
  fails.push("cert_issued_by_delegation must be false");
}
if (d.full_real_money_released_by_delegation !== false) {
  fails.push("delegation must not flip FULL_REAL_MONEY by itself");
}
if (d.rc_formal_lock_untouched !== true) {
  fails.push("RC_FORMAL lock must stay untouched by this delegation");
}

const rel701 = evaluate("rel-701");
if (rel701.ok) {
  fails.push("rel-701 must stay BLOCKED until CERT+hardGatePassed are real PASS");
}
if (!rel701.blocks.some((b) => /FINAL_ACCEPTANCE|hardGatePassed/.test(b))) {
  fails.push("rel-701 blocks must name CERT or hardGate");
}

const money = evaluate("money-yes");
if (money.ok) fails.push("money-yes must stay BLOCKED until public switch+CERT+hardGate");

const merge = evaluate("merge");
if (merge.ok) fails.push("merge must stay BLOCKED without RC required checks + CERT");

const preview = evaluate("preview");
if (!preview.ok) fails.push("preview redeploy must be agent-executable without Founder wait");

if (d.actions.api_prod_render !== "agent_backend_only") {
  fails.push("api_prod_render must be agent_backend_only");
}
const apiProd = evaluate("api-prod");
if (!apiProd.ok) {
  fails.push("api-prod must be READY for backend-only Nest");
}

const dry = spawnSync(process.execPath, [path.join(root, "tooling/release/agent-execute.cjs"), "rel-701"], {
  cwd: root,
  encoding: "utf8",
});
if (dry.status === 0) fails.push("rel-701 dry-run must fail-closed today");
if (String(dry.stdout + dry.stderr).includes("EXECUTED")) {
  fails.push("dry-run must not EXECUTE");
}

const src = read("tooling/release/agent-execute.cjs");
if (!src.includes("evaluate(") || !src.includes("if (!verdict.ok)")) {
  fails.push("executor must evaluate readiness before gh");
}
if (!/if \(!executeFlag\)/.test(src)) {
  fails.push("executor must default to dry-run");
}
if (!src.includes("redeploy-production-api.cjs")) {
  fails.push("api-prod must deploy Render Nest via redeploy-production-api.cjs");
}
if (/action === ["']api-prod["'][\s\S]{0,400}deploy-cloudflare\.yml/.test(src)) {
  fails.push("api-prod must not dispatch Cloudflare production");
}

const resend = read("tooling/dev/provision-production-resend.cjs");
if (!resend.includes("/env-vars/") || !resend.includes('method: "PUT"')) {
  fails.push("production Resend provision must PUT one key at a time");
}
if (!resend.includes("limit=100")) {
  fails.push("production Resend provision must page env-vars beyond default 20");
}
if (/env-vars["'][\s\S]{0,80}method:\s*["']PUT["']/.test(resend) && !resend.includes("/env-vars/")) {
  fails.push("production Resend provision must not replace the full env list");
}
if (!resend.includes("refused: staging service id")) {
  fails.push("production Resend provision must refuse staging");
}

const rule = read(".cursor/rules/founder-execution-delegation.mdc");
if (!rule.includes("alwaysApply: true")) fails.push("delegation rule must be alwaysApply");
if (!rule.includes("FOUNDER_TASKS=0")) fails.push("rule must keep FOUNDER_TASKS=0");

const ops = read(".cursor/rules/cursor-autonomous-ops.mdc");
if (!ops.includes("PRODUCTION_AGENT_GATE_WHEN_HARD_GATES_PASS")) {
  fails.push("cursor-autonomous-ops must name PRODUCTION_AGENT_GATE_WHEN_HARD_GATES_PASS");
}
if (/PRODUCTION_HUMAN_GATE = REQUIRED/.test(ops)) {
  fails.push("PRODUCTION_HUMAN_GATE must be superseded");
}

const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
if (!plan.includes("FIRST_EXECUTION_TODO = REL-701")) {
  fails.push("plan pointer must stay REL-701");
}
if (d.actions.rel_701_workflow_dispatch !== "agent_when_hard_gates_pass") {
  fails.push("delegation must make REL-701 agent-executable");
}

if (fails.length) {
  console.error("[verify:founder-execution-delegation] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:founder-execution-delegation] PASS (agent executor · hard gates fail-closed · CERT wash 0)",
);

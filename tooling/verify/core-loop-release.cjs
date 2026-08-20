#!/usr/bin/env node
/**
 * verify:core-loop-release — B-LOOP-002 Core Loop certification
 * 성공/Safe-Stop 인프로세스 E2E · known defect 0
 * Engine/Money 재작성 0 · 레거시 Canon 복구 0 · Home freeze 0
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

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

function readJson(rel) {
  const raw = read(rel);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    fail(`${rel} invalid JSON`);
    return null;
  }
}

const CONTRACT = "docs/product/consumer/CONSUMER_CORE_LOOP_CONTRACT.md";
const GOV = "governance/consumer-loop/core-loop.v1.json";
const RELEASE = "governance/consumer-loop/core-loop-release.v1.json";

const required = [
  CONTRACT,
  GOV,
  RELEASE,
  "tooling/verify/lib/core-loop-release-runtime.cjs",
  "apps/web/app/profits/[id]/OpportunityDetailClient.tsx",
  "apps/web/app/trades/[id]/execute/TradeExecuteClient.tsx",
  "packages/sdk/src/participate/fetch.ts",
  "packages/sdk/src/execution-stream/useTradeExecution.ts",
  "services/api-nest/src/opportunities/participate.service.ts",
  "services/api-nest/src/trades/trades.execution.service.ts",
  "services/engine-rust/settlement_rule.cjs",
];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const prereqs = [
  "match-success-rule.cjs",
  "participate-http.cjs",
  "execute-rule-loop.cjs",
  "bucket-invariant.cjs",
];
for (const script of prereqs) {
  if (!fs.existsSync(path.join(__dirname, script))) {
    fail(`missing prereq verifier: ${script}`);
  }
}

const surfacePointers = [
  "profits-live-wire.cjs",
  "execution-surfaces.cjs",
  "preflight-may-stop.cjs",
  "participate-proof.cjs",
  "cta-earn-profit.cjs",
  "user-trader-jargon-0.cjs",
  "margin-compare-surface.cjs",
  "asset-image-surface.cjs",
  "participate-web-wire.cjs",
  "execute-web-wire.cjs",
  "trades-web-wire.cjs",
  "core-loop-contract.cjs",
];
for (const script of surfacePointers) {
  if (!fs.existsSync(path.join(__dirname, script))) {
    fail(`missing surface/wire verifier: ${script}`);
  }
}

const md = read(CONTRACT);
for (const token of [
  "CORE_LOOP_CERTIFICATION = PASS",
  "verify:core-loop-release",
  "B-LOOP-002",
  "ENGINE_RULE_REDEFINITION = FORBIDDEN",
  "FAKE_STEPPER = 0",
  "StoppedSafely",
]) {
  if (md && !md.includes(token)) fail(`${CONTRACT} must contain: ${token}`);
}

const gov = readJson(GOV);
if (gov) {
  if (gov.certification?.status !== "RELEASE_PASS") {
    fail("core-loop.v1 certification.status must be RELEASE_PASS");
  }
  if (gov.certification?.task !== "B-LOOP-002") {
    fail("core-loop.v1 certification.task must be B-LOOP-002");
  }
  if ((gov.nextSlices || []).includes("B-LOOP-002")) {
    fail("nextSlices must drop B-LOOP-002 after certification");
  }
  if (gov.authority.ENGINE_RULE_REDEFINITION !== "FORBIDDEN") {
    fail("ENGINE_RULE_REDEFINITION must stay FORBIDDEN");
  }
}

const release = readJson(RELEASE);
if (release) {
  if (release.status !== "RELEASE_PASS") fail("release status must be RELEASE_PASS");
  if (!Array.isArray(release.knownDefects) || release.knownDefects.length !== 0) {
    fail("knownDefects must be []");
  }
  const wantStop = [
    "PRICE_MOVED",
    "BELOW_MIN_PROFIT",
    "MATCH_TIMEOUT",
    "CIRCUIT_OPEN",
  ];
  for (const code of wantStop) {
    if (!(release.e2e?.safeStop || []).includes(code)) {
      fail(`release e2e.safeStop missing ${code}`);
    }
  }
  if (!(release.e2e?.success || []).includes("MATCH_SUCCESS")) {
    fail("release e2e.success must include MATCH_SUCCESS");
  }
}

const participate = read("services/api-nest/src/opportunities/participate.service.ts");
const execute = read("services/api-nest/src/trades/trades.execution.service.ts");
const detail = read("apps/web/app/profits/[id]/OpportunityDetailClient.tsx");
const client = read("apps/web/app/trades/[id]/execute/TradeExecuteClient.tsx");

for (const needle of [
  'journalType: "participate_lock"',
  "idempotencyKey: `participate_lock:${input.idempotencyKey}`",
  "direction: \"debit\"",
  'bucket: "principal"',
  'bucket: "locked"',
  "amountUsdt must equal requiredCapitalUsdt",
  "preflight.assertValid",
]) {
  if (participate && !participate.includes(needle)) {
    fail(`participate.service missing journal/guard lock: ${needle}`);
  }
}
if (participate && /assertWithdrawKyc|KYC_WITHDRAW_REQUIRED/.test(participate)) {
  fail("participate must not require KYC");
}

for (const needle of [
  'journalType: "settlement"',
  "idempotencyKey: `settlement:${trade.id}`",
  'journalType: "participate_unlock"',
  "idempotencyKey: `participate_unlock:${trade.id}`",
  'status = \'success\'',
  "result_code = 'MATCH_SUCCESS'",
  "settled_profit_usdt = $3::numeric",
  "evaluateExecution",
  "TERMINAL_STATUSES",
]) {
  if (execute && !execute.includes(needle)) {
    fail(`execution.service missing terminal journal lock: ${needle}`);
  }
}
if (execute && !execute.includes('resultCode === "SYSTEM_FAILED" ? "failed" : "safe_stop"')) {
  fail("SYSTEM_FAILED must map to failed, other safe-stop codes to safe_stop");
}

if (!client.includes('state.status === "success"')) {
  fail("Settled must require success status");
}
if (!client.includes("settledProfitUsdt")) {
  fail("Settled must require settledProfitUsdt");
}
if (!client.includes('case "safe_stop":')) {
  fail("execute must map safe_stop → StoppedSafely");
}
if (!client.includes("StoppedSafely")) {
  fail("execute missing StoppedSafely");
}
if (!client.includes("이번엔 맞지 않았어요. 원금은 그대로예요.")) {
  fail("StoppedSafely copy lock missing");
}
if (!client.includes("정산이 반영됐어요.")) {
  fail("Settled copy lock missing");
}
if (/progressPct|stepIndex/.test(client)) {
  fail("execute must not bind progressPct/stepIndex as truth");
}

const bannedRecover = [
  "AiProgressRoom",
  "ExecutionSuccessReceipt",
  "ExecutionSafeStop",
  "HomeDesktop",
  "HomeMobile",
  "spark-dash-home.css",
];
for (const ban of bannedRecover) {
  if (client.includes(ban) || detail.includes(ban)) {
    fail(`must not recover forbidden surface ${ban}`);
  }
}

const moneySurfaces = `${detail}\n${client}`;
if (moneySurfaces.includes("12.50") || /Math\.random/.test(moneySurfaces)) {
  fail("consumer loop surfaces must not invent money or RNG");
}
if (/낙첨|당첨\s*실패|원금이 사라/.test(moneySurfaces)) {
  fail("Safe-Stop must not be framed as loss/lottery");
}

if (process.env.CORE_LOOP_RELEASE_NESTED !== "1") {
  for (const script of prereqs) {
    const r = spawnSync(process.execPath, [path.join(__dirname, script)], {
      cwd: root,
      encoding: "utf8",
    });
    process.stdout.write(r.stdout || "");
    process.stderr.write(r.stderr || "");
    if (r.status !== 0) fail(`prereq ${script} failed`);
  }
}

const runtime = require("./lib/core-loop-release-runtime.cjs");
const ran = runtime.runAll();
for (const msg of ran.fails) fail(msg);

const pkg = readJson("package.json");
if (
  pkg &&
  pkg.scripts?.["verify:core-loop-release"] !==
    "node tooling/verify/core-loop-release.cjs"
) {
  fail("package.json missing verify:core-loop-release");
}
const catalog = read("tooling/verify/CATALOG.md");
if (catalog && !catalog.includes("core-loop-release")) {
  fail("CATALOG.md must list core-loop-release");
}

if (fails.length) {
  console.error("[verify:core-loop-release] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:core-loop-release] PASS (success+Safe-Stop in-process E2E · known defect 0 · Engine KEEP)",
);

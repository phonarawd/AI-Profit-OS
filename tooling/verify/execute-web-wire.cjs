#!/usr/bin/env node
/**
 * verify:execute-web-wire — B-EXECUTION-001
 * /trades/[id]/execute → useTradeExecution 실배선
 * FAKE_FINANCIAL_VALUE_BUG=CLOSED · progressPct/stepIndex 표시 0
 * 레거시 Canon/AiProgressRoom 복구 0 · /trades 목록은 B-TRADES-001
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

const required = [
  "packages/sdk/src/execution-stream/useTradeExecution.ts",
  "packages/sdk/src/execution-stream/polling-transport.ts",
  "packages/sdk/src/execution-stream/errors.ts",
  "apps/web/app/trades/[id]/execute/page.tsx",
  "apps/web/app/trades/[id]/execute/TradeExecuteClient.tsx",
  "apps/web/app/trades/page.tsx",
  "services/api-nest/src/trades/trades.execution.service.ts",
];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const page = read("apps/web/app/trades/[id]/execute/page.tsx");
const client = read("apps/web/app/trades/[id]/execute/TradeExecuteClient.tsx");
const css = read("apps/web/app/trades/[id]/execute/trade-execute.module.css");
const trades = read("apps/web/app/trades/page.tsx");
const polling = read("packages/sdk/src/execution-stream/polling-transport.ts");
const hook = read("packages/sdk/src/execution-stream/useTradeExecution.ts");
const errors = read("packages/sdk/src/execution-stream/errors.ts");
const sdkIdx = read("packages/sdk/src/index.ts");
const surface = `${page}\n${client}`;

if (!page.includes("TradeExecuteClient")) {
  fail("execute page must mount TradeExecuteClient");
}
if (page.includes("PendingFigma") || client.includes("PendingFigma")) {
  fail("execute must not stay PendingFigma after B-EXECUTION-001");
}
if (!client.includes("useTradeExecution")) {
  fail("TradeExecuteClient must call useTradeExecution");
}
if (!client.includes("@aipo/sdk/execution-stream")) {
  fail("TradeExecuteClient must import from @aipo/sdk/execution-stream");
}
if (!surface.includes("data-execution-transport")) {
  fail("execute surface must expose data-execution-transport");
}
if (!client.includes("getAccessToken")) {
  fail("execute must pass getAccessToken into useTradeExecution");
}

if (!polling.includes('credentials: "include"')) {
  fail("polling transport must send session cookie");
}
if (!polling.includes("Authorization")) {
  fail("polling transport must still send Bearer when token exists");
}
if (!polling.includes('method: "POST"') || !polling.includes("execute-tick")) {
  fail("polling must POST …/execute-tick");
}
if (/if\s*\(\s*!token\s*\)\s*\{[\s\S]*return;/.test(polling)) {
  fail("polling must tick with cookie session even when Bearer token is null");
}
if (!errors.includes("export class TradeExecutionRequestError")) {
  fail("execution-stream must export TradeExecutionRequestError");
}
if (!client.includes("isTradeExecutionRequestError")) {
  fail("execute must branch 401/404 from TradeExecutionRequestError");
}
if (!client.includes('href="/auth/login"')) {
  fail("AUTH_REQUIRED recovery must link /auth/login");
}
if (!client.includes('href="/"') && !client.includes('href="/">')) {
  fail("trade 404 / Home recovery must link /");
}
if (!client.includes('href="/wallet"')) {
  fail("Settled recovery must link /wallet");
}
if (!client.includes('href="/profits"')) {
  fail("StoppedSafely recovery must link /profits");
}
if (!client.includes('href="/me/support"')) {
  fail("Failed recovery must link /me/support");
}
if (!client.includes("data-execute-chrome") || !client.includes("주요 화면")) {
  fail("execute must keep consumer chrome/navigation");
}
if (!client.includes("/me/inbox") || !/href:\s*"\/me"/.test(client)) {
  fail("mobile execute chrome must reach inbox and account");
}
if (!client.includes("data-execute-context")) {
  fail("execute must show owned opportunity/state context");
}

for (const kind of [
  "MatchingInProgress",
  "MatchingRetrying",
  "Settled",
  "StoppedSafely",
  "Cancelled",
  "Failed",
]) {
  if (!client.includes(kind)) fail(`execute must map consumer state ${kind}`);
}
if (!client.includes("isSettled") && !client.includes("settledProfitUsdt")) {
  fail("Settled must require settledProfitUsdt");
}
if (!client.includes('state.status === "success"') && !client.includes("status === \"success\"")) {
  fail("Settled must require success status");
}

const bannedUi = [
  "AiProgressRoom",
  "ExecutionSuccessReceipt",
  "ExecutionSafeStop",
  "ExecutionStepList",
  "spark-dash-home",
  "HomeDesktop",
  "HomeMobile",
  "@aipo/ui/components/execution",
];
for (const ban of bannedUi) {
  if (surface.includes(ban) || css.includes(ban)) {
    fail(`execute must not recover legacy surface ${ban}`);
  }
}

if (/progressPct|stepIndex/.test(client)) {
  fail("execute must not bind progressPct/stepIndex (indeterminate matching)");
}
if (/role=["']progressbar["']|width:\s*.*progressPct/.test(client + css)) {
  fail("execute must not render a percent bar");
}
if (client.includes("12.50") || client.includes("Math.random")) {
  fail("execute must not invent money or RNG");
}
if (/["'`]0 USDT["'`]|settledProfitUsdt\s*\?\? ["']0["']/.test(client)) {
  fail("execute must not fill missing money with 0");
}

const cancelCta = /취소/.test(client);
if (cancelCta && /<button[^>]*>[\s\S]*취소/.test(client)) {
  fail("cancel matching CTA must stay hidden (D-05)");
}

const userLits = [...client.matchAll(/["'`]([^"'`\\]|\\.)*["'`]/g)].map((m) => m[1]);
for (const lit of userLits) {
  if (/\bAPI\b|\bpreflight\b|\bjournal\b|\bcircuit\b|\bSSE\b|\btoken\b/i.test(lit)) {
    if (!/getAccessToken|preflightToken|TradeExecute/.test(lit)) {
      fail(`user-visible IT jargon: ${lit}`);
    }
  }
}

if (trades.includes("PendingFigma")) {
  fail("/trades must not stay PendingFigma after B-TRADES-001");
}

if (!hook.includes("export function useTradeExecution")) {
  fail("useTradeExecution export must stay");
}
if (!sdkIdx.includes("useTradeExecution")) {
  fail("sdk index must keep useTradeExecution");
}

const pkg = JSON.parse(read("package.json") || "{}");
if (pkg.scripts?.["verify:execute-web-wire"] !== "node tooling/verify/execute-web-wire.cjs") {
  fail("package.json missing verify:execute-web-wire");
}
const catalog = read("tooling/verify/CATALOG.md");
if (catalog && !catalog.includes("execute-web-wire")) {
  fail("CATALOG.md must list execute-web-wire");
}

if (fails.length) {
  console.error("[verify:execute-web-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:execute-web-wire] PASS (useTradeExecution · cookie tick · state table · execute KEEP)",
);

#!/usr/bin/env node
/**
 * verify:trades-web-wire — B-TRADES-001
 * /trades → GET /api/v1/trades 실목록 + buckets.profitUsdt
 * list-by-user = 기존 toState 투영 · 새 money/cancel/필터 0
 * progressPct 표시 0 · 레거시 Canon 복구 0
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
  "apps/web/app/trades/page.tsx",
  "apps/web/app/trades/TradesClient.tsx",
  "packages/sdk/src/trades/fetch.ts",
  "packages/sdk/src/trades/index.ts",
  "packages/sdk/src/index.ts",
  "services/api-nest/src/trades/trades.user.routes.ts",
  "services/api-nest/src/trades/trades.user.controller.ts",
  "services/api-nest/src/trades/trades.execution.service.ts",
];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const page = read("apps/web/app/trades/page.tsx");
const client = read("apps/web/app/trades/TradesClient.tsx");
const css = read("apps/web/app/trades/trades.module.css");
const sdkFetch = read("packages/sdk/src/trades/fetch.ts");
const sdkIdx = read("packages/sdk/src/index.ts");
const sdkPkg = read("packages/sdk/package.json");
const routes = read("services/api-nest/src/trades/trades.user.routes.ts");
const ctrl = read("services/api-nest/src/trades/trades.user.controller.ts");
const svc = read("services/api-nest/src/trades/trades.execution.service.ts");
const surface = `${page}\n${client}`;

if (page.includes("PendingFigma") || client.includes("PendingFigma")) {
  fail("/trades must not stay PendingFigma after B-TRADES-001");
}
if (!page.includes("TradesClient")) {
  fail("trades page must mount TradesClient");
}
if (!client.includes("fetchTradeList") || !client.includes("@aipo/sdk/trades")) {
  fail("TradesClient must call fetchTradeList from @aipo/sdk/trades");
}
if (!client.includes("fetchWalletBuckets")) {
  fail("TradesClient must read profitUsdt from existing wallet buckets GET");
}
if (!surface.includes("data-trades-list")) {
  fail("trades surface must expose data-trades-list");
}
if (!client.includes('href="/auth/login"')) {
  fail("AUTH_REQUIRED recovery must link /auth/login");
}
if (!client.includes('href="/wallet"')) {
  fail("earnings recovery must link /wallet");
}
if (!client.includes('href="/profits"')) {
  fail("empty/recovery must link /profits");
}
if (!client.includes('href="/"') && !client.includes('href="/">')) {
  fail("Home recovery must link /");
}

for (const kind of [
  "MatchingInProgress",
  "MatchingRetrying",
  "Settled",
  "StoppedSafely",
  "Cancelled",
  "Failed",
]) {
  if (!client.includes(kind)) fail(`trades list must map consumer state ${kind}`);
}
if (!client.includes("isSettled") && !client.includes("settledProfitUsdt")) {
  fail("Settled list rows must require settledProfitUsdt");
}
if (!client.includes('state.status === "success"') && !client.includes('status === "success"')) {
  fail("Settled must require success status");
}
if (/expectedProfitUsdt/.test(client) && /정산/.test(client)) {
  const settledUsesExpected =
    /정산[\s\S]{0,80}expectedProfitUsdt|expectedProfitUsdt[\s\S]{0,80}정산/.test(
      client,
    );
  if (settledUsesExpected) {
    fail("list must not present expectedProfitUsdt as settled");
  }
}
if (client.includes("expectedProfitUsdt")) {
  fail("list UI must not bind expectedProfitUsdt (expected ≠ settled)");
}

if (/progressPct|stepIndex/.test(client)) {
  fail("trades list must not bind progressPct/stepIndex");
}
if (/role=["']progressbar["']/.test(client + css)) {
  fail("trades list must not render a percent bar");
}
if (client.includes("12.50") || client.includes("Math.random")) {
  fail("trades list must not invent money or RNG");
}
if (/["'`]0 USDT["'`]|settledProfitUsdt\s*\?\? ["']0["']|profitUsdt\s*\?\? ["']0["']/.test(client)) {
  fail("trades list must not fill missing money with 0");
}
if (/reduce\(|\.reduce\(/.test(client) && /settledProfitUsdt/.test(client)) {
  fail("list must not sum settledProfitUsdt (profit owner = buckets)");
}
if (client.includes("CountUpNumber") || /value=\{0\}/.test(client + page)) {
  fail("trades must not keep hardcoded CountUp 0");
}

const bannedUi = [
  "AiProgressRoom",
  "ExecutionSuccessReceipt",
  "ExecutionSafeStop",
  "spark-dash-home",
  "HomeDesktop",
  "HomeMobile",
  "@aipo/ui/components/execution",
];
for (const ban of bannedUi) {
  if (surface.includes(ban) || css.includes(ban)) {
    fail(`trades must not recover legacy surface ${ban}`);
  }
}

const cancelCta = /취소/.test(client);
if (cancelCta && /<button[^>]*>[\s\S]*취소/.test(client)) {
  fail("cancel matching CTA must stay hidden (D-05)");
}

const userLits = [...client.matchAll(/["'`]([^"'`\\]|\\.)*["'`]/g)].map((m) => m[1]);
for (const lit of userLits) {
  if (/\bAPI\b|\bpreflight\b|\bjournal\b|\bcircuit\b|\bSSE\b|\btoken\b/i.test(lit)) {
    if (!/getAccessToken|TradeList|fetchTrade/.test(lit)) {
      fail(`user-visible IT jargon: ${lit}`);
    }
  }
}

if (!sdkFetch.includes('method: "GET"') || !sdkFetch.includes("/api/v1/trades")) {
  fail("fetchTradeList must GET /api/v1/trades");
}
if (sdkFetch.includes("/api/v1/trades/") && !sdkFetch.includes('"/api/v1/trades"')) {
  fail("fetchTradeList must call collection GET /api/v1/trades not :id");
}
if (!sdkFetch.includes('credentials: "include"')) {
  fail("trade list client must send session cookie");
}
if (/userId/.test(sdkFetch) && /[?&]userId|body\.userId/.test(sdkFetch)) {
  fail("trade list client must not send userId");
}
if (!sdkFetch.includes("asMoney") && !sdkFetch.includes("MONEY_RE")) {
  fail("trade list client must validate money strings");
}
if (/settledProfitUsdt[\s\S]{0,40}\|\| ["']0["']|settledProfitUsdt[\s\S]{0,40}\?\? ["']0["']/.test(sdkFetch)) {
  fail("SDK must not default settledProfitUsdt to 0");
}
if (!sdkIdx.includes("fetchTradeList")) {
  fail("sdk index must export fetchTradeList");
}
if (!sdkPkg.includes('"./trades"')) {
  fail("packages/sdk/package.json must export ./trades");
}

if (!routes.includes('list: "trades"')) {
  fail('TRADE_USER_ROUTES.list must be "trades"');
}
if (!ctrl.includes("@Get(TRADE_USER_ROUTES.list)")) {
  fail("GET list must bind TRADE_USER_ROUTES.list");
}
if (/@Query\(\s*["']userId["']\s*\)/.test(ctrl)) {
  fail("list must not take @Query('userId')");
}
if (!svc.includes("async list(") && !svc.includes("async list (")) {
  fail("TradeExecutionService must expose list()");
}
if (!svc.includes("toState(row)") && !svc.includes("this.toState(")) {
  fail("list must reuse toState projection");
}
if (!svc.includes("FROM public.trade_executions") || !svc.includes("WHERE user_id")) {
  fail("list must read trade_executions by session user_id");
}
if (!svc.includes("LIMIT")) {
  fail("list must be bounded (LIMIT)");
}
if (/kyc|assertKyc|KYC_WITHDRAW/i.test(svc) && /async list/.test(svc)) {
  fail("trade list must not add KYC");
}

const pkg = JSON.parse(read("package.json") || "{}");
if (pkg.scripts?.["verify:trades-web-wire"] !== "node tooling/verify/trades-web-wire.cjs") {
  fail("package.json missing verify:trades-web-wire");
}
const catalog = read("tooling/verify/CATALOG.md");
if (catalog && !catalog.includes("trades-web-wire")) {
  fail("CATALOG.md must list trades-web-wire");
}

if (fails.length) {
  console.error("[verify:trades-web-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:trades-web-wire] PASS (GET /trades list · buckets profit · /trades wired)",
);

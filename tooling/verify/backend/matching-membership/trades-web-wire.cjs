#!/usr/bin/env node
/**
 * BACKEND-ONLY PORT of tooling/verify/trades-web-wire.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:trades-web-wire — B-TRADES-001
 * /trades → GET /api/v1/trades 실목록 + buckets.profitUsdt
 * list-by-user = 기존 toState 투영 · 새 money/cancel/필터 0
 * progressPct 표시 0 · 레거시 Canon 복구 0
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../../..");
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
  "services/api-nest/src/trades/trades.user.routes.ts",
  "services/api-nest/src/trades/trades.user.controller.ts",
  "services/api-nest/src/trades/trades.execution.service.ts",
];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const routes = read("services/api-nest/src/trades/trades.user.routes.ts");
const ctrl = read("services/api-nest/src/trades/trades.user.controller.ts");
const svc = read("services/api-nest/src/trades/trades.execution.service.ts");

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

if (fails.length) {
  console.error("[verify:trades-web-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:trades-web-wire] PASS (GET /trades list · TRADE_USER_ROUTES · toState projection · bounded · no KYC)",
);

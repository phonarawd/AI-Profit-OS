#!/usr/bin/env node
/**
 * verify:participate-web-wire — B-PARTICIPATION-001
 * SDK preflight+participate export · /profits/[id] 실배선 · 목록 POST 0
 * Engine/Money 재작성 0 · execute/trades는 다음 슬라이스
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

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next" || ent.name === "dist") {
      continue;
    }
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

const required = [
  "packages/sdk/src/participate/index.ts",
  "packages/sdk/src/participate/fetch.ts",
  "packages/sdk/src/participate/types.ts",
  "packages/sdk/src/index.ts",
  "apps/web/app/profits/[id]/page.tsx",
  "apps/web/app/profits/[id]/OpportunityDetailClient.tsx",
  "apps/web/app/profits/page.tsx",
  "apps/web/app/trades/page.tsx",
  "apps/web/app/trades/[id]/execute/page.tsx",
  "services/api-nest/src/loop/preflight.service.ts",
  "services/api-nest/src/opportunities/participate.service.ts",
];
for (const f of required) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const sdkIdx = read("packages/sdk/src/index.ts");
const sdkFetch = read("packages/sdk/src/participate/fetch.ts");
const sdkTypes = read("packages/sdk/src/participate/types.ts");
const sdkPkg = read("packages/sdk/package.json");
const detail = read("apps/web/app/profits/[id]/OpportunityDetailClient.tsx");
const detailPage = read("apps/web/app/profits/[id]/page.tsx");
const list = read("apps/web/app/profits/page.tsx");
const trades = read("apps/web/app/trades/page.tsx");
const execute = read("apps/web/app/trades/[id]/execute/page.tsx");

if (!sdkIdx.includes('from "./participate"')) {
  fail("sdk index must export participate module");
}
for (const name of ["issuePreflight", "postParticipate", "newParticipateIdempotencyKey"]) {
  if (!sdkIdx.includes(name)) fail(`sdk index must export ${name}`);
  if (!sdkFetch.includes(`export function ${name}`) && !sdkFetch.includes(`export async function ${name}`)) {
    fail(`participate/fetch must export ${name}`);
  }
}
if (!sdkPkg.includes('"./participate"')) {
  fail("packages/sdk/package.json must export ./participate");
}
if (!sdkFetch.includes("/api/v1/opportunities/${id}/preflight")) {
  fail("issuePreflight must POST /api/v1/opportunities/:id/preflight");
}
if (!sdkFetch.includes("/api/v1/opportunities/${id}/participate")) {
  fail("postParticipate must POST /api/v1/opportunities/:id/participate");
}
if (!sdkFetch.includes('method: "POST"')) {
  fail("participate client must POST");
}
if (!sdkFetch.includes('credentials: "include"')) {
  fail("participate client must send session cookie");
}
if (/userId/.test(sdkFetch) && /body\.userId|userId:/.test(sdkFetch)) {
  fail("participate client must not send userId");
}
if (/kyc|assertKyc|KYC_WITHDRAW/i.test(sdkFetch + sdkTypes)) {
  fail("participate client must not add KYC");
}
for (const field of [
  "opportunityId",
  "pricingVersion",
  "minProfitUsdt",
  "amountUsdt",
  "idempotencyKey",
  "preflightToken",
]) {
  if (!sdkFetch.includes(field)) fail(`participate body must include ${field}`);
}

if (!detailPage.includes("OpportunityDetailClient")) {
  fail("profits/[id] page must mount OpportunityDetailClient");
}
if (detailPage.includes("PendingFigma") || detail.includes("PendingFigma")) {
  fail("profits/[id] must not stay PendingFigma after B-PARTICIPATION-001");
}
if (!detail.includes("fetchOpportunityDetail")) {
  fail("detail must live-wire fetchOpportunityDetail");
}
if (!detail.includes("issuePreflight") || !detail.includes("postParticipate")) {
  fail("detail must call issuePreflight and postParticipate");
}
if (!detail.includes("preflightToken")) {
  fail("detail must pass preflightToken into participate");
}
if (!detail.includes("amountUsdt: item.requiredCapitalUsdt") && !detail.includes("amountUsdt = item.requiredCapitalUsdt")) {
  fail("amountUsdt must be requiredCapitalUsdt (no client amount)");
}
if (!detail.includes("minProfitUsdt: item.expectedProfitUsdt") && !detail.includes("minProfitUsdt = item.expectedProfitUsdt")) {
  fail("minProfitUsdt must be the expectedProfitUsdt the user saw");
}
if (!detail.includes("이 기회로 수익 벌기")) {
  fail("detail CTA must be 이 기회로 수익 벌기");
}
if (!detail.includes("수익 벌기")) {
  fail("confirm CTA domain must stay 수익 벌기");
}
if (!detail.includes("시세가 움직이면 안전하게 멈출 수 있어요")) {
  fail("confirm must show locked mayStop copy");
}
if (!detail.includes('data-requires-preflight="true"')) {
  fail("primary CTA must require preflight");
}
if (!detail.includes('href="/wallet/deposit"')) {
  fail("insufficient principal recovery must link /wallet/deposit");
}
if (!detail.includes('href="/auth/login"')) {
  fail("AUTH_REQUIRED recovery must link /auth/login");
}
if (!detail.includes("/trades/${result.tradeId}/execute") && !detail.includes("`/trades/${result.tradeId}/execute`")) {
  fail("accepted participate must go to /trades/:tradeId/execute");
}

const bannedCta = [
  "이 상품으로 수익 벌기",
  "매칭 참여",
  "구매하기",
  "판매하기",
  "거래하기",
  "참여하기",
];
for (const ban of bannedCta) {
  if (detail.includes(`"${ban}"`) || detail.includes(`'${ban}'`)) {
    fail(`detail must not use banned CTA ${ban}`);
  }
}
if (detail.includes("12.50") || detail.includes("progressPct") || detail.includes("useTradeExecution")) {
  fail("detail must not invent money, progressPct, or execute hook");
}
if (detail.includes("spark-dash-home.css") || detail.includes("HomeDesktop") || detail.includes("HomeMobile")) {
  fail("detail must not depend on Home geometry");
}
if (/principalUsdt\s*-\s*|requiredCapitalUsdt\s*-/.test(detail)) {
  fail("detail must not recompute suggestDepositUsdt");
}
if (/\bAPI\b|\bpreflight\b|\bjournals?\b|\bcircuit\b/i.test(detail.replace(/preflightToken|issuePreflight|@aipo\/sdk\/participate/g, ""))) {
  const userCopy = [...detail.matchAll(/["'`]([^"'`\\]|\\.)*["'`]/g)].map((m) => m[1]);
  for (const lit of userCopy) {
    if (/\bAPI\b|\bpreflight\b|\bjournal\b|\bcircuit\b/i.test(lit) && !/preflightToken/.test(lit)) {
      fail(`user-visible IT jargon: ${lit}`);
    }
  }
}

if (list.includes("issuePreflight") || list.includes("postParticipate") || list.includes("preflightToken")) {
  fail("/profits list must stay discovery-only (no participate POST)");
}

if (!trades.includes("PendingFigma")) {
  fail("/trades must remain PendingFigma until B-TRADES-001");
}
if (!execute.includes("PendingFigma")) {
  fail("execute page must remain PendingFigma until B-EXECUTION-001");
}
if (execute.includes("useTradeExecution")) {
  fail("execute page must not import useTradeExecution in this slice");
}

const webFiles = walk(path.join(root, "apps/web"));
let wired = 0;
for (const fp of webFiles) {
  const rel = path.relative(root, fp).replace(/\\/g, "/");
  if (rel.startsWith("apps/web/scripts/")) continue;
  const src = fs.readFileSync(fp, "utf8");
  const hits =
    src.includes("postParticipate") ||
    (src.includes("/participate") && /opportunities/.test(src));
  if (!hits) continue;
  if (rel.includes("spark-dash-home") || rel.includes("spark-dash-profits/")) {
    fail(`participate POST leaked into ${rel}`);
    continue;
  }
  if (rel === "apps/web/app/profits/page.tsx" || rel.includes("ProfitsDesktopClient")) {
    fail(`participate POST leaked into ${rel}`);
    continue;
  }
  if (rel.includes("profits/[id]/")) wired += 1;
}
if (wired < 1) fail("web participate wiring missing under profits/[id]");

const pkg = JSON.parse(read("package.json") || "{}");
if (pkg.scripts?.["verify:participate-web-wire"] !== "node tooling/verify/participate-web-wire.cjs") {
  fail("package.json missing verify:participate-web-wire");
}
const catalog = read("tooling/verify/CATALOG.md");
if (catalog && !catalog.includes("participate-web-wire")) {
  fail("CATALOG.md must list participate-web-wire");
}

if (fails.length) {
  console.error("[verify:participate-web-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:participate-web-wire] PASS (SDK preflight+participate · /profits/[id] wired · list/execute untouched)",
);

#!/usr/bin/env node
/**
 * verify:core-loop-contract — B-LOOP-001
 * Product·Visual·Implementation 계약 + 2026-08-20 재실측 갭.
 * Engine Rule 재정의 0 · web/SDK participate POST 0 을 잠근다.
 * B-LOOP-002 release E2E 가 아니다.
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

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ent.name === "node_modules" ||
      ent.name === ".next" ||
      ent.name === "dist"
    ) {
      continue;
    }
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

const CONTRACT = "docs/product/consumer/CONSUMER_CORE_LOOP_CONTRACT.md";
const GOV = "governance/consumer-loop/core-loop.v1.json";

const requiredFiles = [
  CONTRACT,
  GOV,
  "apps/web/app/profits/[id]/page.tsx",
  "apps/web/app/profits/page.tsx",
  "apps/web/app/trades/page.tsx",
  "apps/web/app/trades/[id]/execute/page.tsx",
  "packages/sdk/src/index.ts",
  "services/api-nest/src/loop/preflight.service.ts",
  "services/api-nest/src/opportunities/participate.service.ts",
  "services/api-nest/src/opportunities/opportunities.user.routes.ts",
  "services/api-nest/src/trades/trades.user.routes.ts",
  "services/api-nest/src/trades/trades.execution.service.ts",
  "services/engine-rust/settlement_rule.cjs",
  "schemas/participate-request.v1.json",
  "schemas/participate-proof.v1.json",
  "packages/sdk/src/execution-stream/useTradeExecution.ts",
];
for (const f of requiredFiles) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const md = read(CONTRACT);
for (const token of [
  "## 1. Product Contract",
  "## 2. Visual Contract",
  "## 3. Implementation Contract",
  "## 4. Gap analysis",
  "ENGINE_RULE_REDEFINITION = FORBIDDEN",
  "APPROVED FIGMA = NONE",
  "NEW_VISUAL_LOCK = NO",
  "amountUsdt",
  "requiredCapitalUsdt",
  "FAKE_STEPPER = 0",
  "FAKE_MATCHING_PROGRESS = 0",
  "WEB_PARTICIPATE_POST = 0",
  "SDK_PARTICIPATE_EXPORT = MISSING",
  "WIRE_WITHOUT_APPROVED_FIGMA = ALLOWED",
  "INVENT_PRESENTATION = FORBIDDEN",
  "HOME_GEOMETRY_DEPENDENCY = FORBIDDEN",
  "B-PARTICIPATION-001",
  "PendingFigma",
]) {
  if (md && !md.includes(token)) fail(`${CONTRACT} must contain: ${token}`);
}
if (md.includes("12.50")) fail(`${CONTRACT} must not invent 12.50`);

const gov = readJson(GOV);
if (gov) {
  if (gov.status !== "CONTRACT_READY") {
    fail("governance status must be CONTRACT_READY");
  }
  if (gov.implementationStatus !== "GAP_DOCUMENTED") {
    fail("implementationStatus must be GAP_DOCUMENTED until next slices");
  }
  if (gov.authority.ENGINE_RULE_REDEFINITION !== "FORBIDDEN") {
    fail("ENGINE_RULE_REDEFINITION must stay FORBIDDEN");
  }
  if (gov.authority.KYC_ON_PARTICIPATE !== "FORBIDDEN") {
    fail("KYC_ON_PARTICIPATE must stay FORBIDDEN");
  }
  if (gov.authority.AMOUNT_MUST_EQUAL_REQUIRED_CAPITAL !== true) {
    fail("AMOUNT_MUST_EQUAL_REQUIRED_CAPITAL must stay true");
  }
  if (gov.authority.APPROVED_FIGMA_CORE_LOOP !== "NONE") {
    fail("APPROVED_FIGMA_CORE_LOOP must stay NONE");
  }
  if (gov.authority.NEW_VISUAL_LOCK !== false) {
    fail("NEW_VISUAL_LOCK must stay false");
  }
  if (gov.authority.MATCH_EQUALS_OPPORTUNITY !== false) {
    fail("MATCH_EQUALS_OPPORTUNITY must stay false");
  }
  if (gov.measured.webParticipatePost !== 0) {
    fail("measured.webParticipatePost must be 0 until B-PARTICIPATION-001");
  }
  if (gov.measured.webPreflightPost !== 0) {
    fail("measured.webPreflightPost must be 0 until B-PARTICIPATION-001");
  }
  if (gov.measured.sdkParticipateExport !== "MISSING") {
    fail("measured.sdkParticipateExport must be MISSING until SDK slice");
  }
  if (gov.measured.executePageHook !== 0) {
    fail("measured.executePageHook must be 0 until B-EXECUTION-001");
  }
  if (gov.measured.fakeFinancialValueBug !== "CLOSED") {
    fail("fakeFinancialValueBug must stay CLOSED");
  }
}

const detail = read("apps/web/app/profits/[id]/page.tsx");
if (detail && !detail.includes("PendingFigma")) {
  fail("profits/[id] must remain PendingFigma until B-PARTICIPATION-001");
}
if (detail && /useTradeExecution|preflightToken|\/participate/.test(detail)) {
  fail("profits/[id] must not call participate/preflight in this slice");
}

const trades = read("apps/web/app/trades/page.tsx");
if (trades && !trades.includes("PendingFigma")) {
  fail("trades page must remain PendingFigma until B-TRADES-001");
}

const execute = read("apps/web/app/trades/[id]/execute/page.tsx");
if (execute && !execute.includes("PendingFigma")) {
  fail("execute page must remain PendingFigma until B-EXECUTION-001");
}
if (execute && execute.includes("useTradeExecution")) {
  fail("execute page must not import useTradeExecution in this slice");
}

const profitsList = read("apps/web/app/profits/page.tsx");
if (profitsList && !profitsList.includes("ProfitsDesktopClient")) {
  fail("profits list must stay ProfitsDesktopClient (discovery)");
}

const sdkIndex = read("packages/sdk/src/index.ts");
if (
  sdkIndex &&
  (/fetchPreflight|postParticipate|issuePreflight/.test(sdkIndex) ||
    /export \{[^}]*\bparticipate\b/i.test(sdkIndex))
) {
  fail("sdk index must not export participate/preflight until B-PARTICIPATION-001");
}
if (sdkIndex && !sdkIndex.includes("useTradeExecution")) {
  fail("sdk index must keep useTradeExecution export");
}
if (sdkIndex && !sdkIndex.includes("fetchOpportunityDetail")) {
  fail("sdk index must keep fetchOpportunityDetail export");
}

const wiringNeedles = [
  "preflightToken",
  "/opportunities/",
];
const webFiles = walk(path.join(root, "apps/web"));
let webParticipate = 0;
let webPreflight = 0;
for (const fp of webFiles) {
  const rel = path.relative(root, fp).replace(/\\/g, "/");
  if (rel.startsWith("apps/web/scripts/")) continue;
  const src = fs.readFileSync(fp, "utf8");
  if (
    src.includes("/participate") &&
    /opportunities/.test(src) &&
    !rel.includes("spark-dash")
  ) {
    webParticipate += 1;
    fail(`web participate API path in ${rel}`);
  }
  if (src.includes("preflightToken") || /\/preflight["'`]/.test(src)) {
    webPreflight += 1;
    fail(`web preflight wiring in ${rel}`);
  }
}
void wiringNeedles;

const sdkFiles = walk(path.join(root, "packages/sdk/src"));
for (const fp of sdkFiles) {
  const rel = path.relative(root, fp).replace(/\\/g, "/");
  if (rel.includes("execution-stream")) continue;
  const src = fs.readFileSync(fp, "utf8");
  if (src.includes("/participate") && /opportunities/.test(src)) {
    fail(`sdk participate client in ${rel}`);
  }
  if (src.includes("preflightToken") || /\/preflight["'`]/.test(src)) {
    fail(`sdk preflight client in ${rel}`);
  }
}

const pf = read("services/api-nest/src/loop/preflight.service.ts");
if (pf && !pf.includes("TTL_SEC = 300")) {
  fail("preflight TTL must stay 300s");
}
if (pf && !pf.includes("PREFLIGHT_REQUIRED")) {
  fail("preflight must throw PREFLIGHT_REQUIRED");
}

const part = read("services/api-nest/src/opportunities/participate.service.ts");
if (part && !part.includes("preflight.assertValid")) {
  fail("ParticipateService must call preflight.assertValid");
}
if (part && !part.includes("amountUsdt must equal requiredCapitalUsdt")) {
  fail("ParticipateService must require amountUsdt === requiredCapitalUsdt");
}
if (part && /kyc/i.test(part) && /requireKyc|kycRequired|assertKyc/.test(part)) {
  fail("participate must not require KYC");
}

const routes = read(
  "services/api-nest/src/opportunities/opportunities.user.routes.ts",
);
if (routes && !routes.includes('preflight: "opportunities/:id/preflight"')) {
  fail("OPPORTUNITY_USER_ROUTES.preflight mismatch");
}
if (routes && !routes.includes('participate: "opportunities/:id/participate"')) {
  fail("OPPORTUNITY_USER_ROUTES.participate mismatch");
}

const tradeRoutes = read("services/api-nest/src/trades/trades.user.routes.ts");
if (tradeRoutes && !tradeRoutes.includes('executeTick: "trades/:id/execute-tick"')) {
  fail("TRADE_USER_ROUTES.executeTick mismatch");
}

const exec = read("services/api-nest/src/trades/trades.execution.service.ts");
if (exec && !exec.includes("settlement_rule.cjs")) {
  fail("execution service must reuse settlement_rule.cjs");
}
if (exec && !exec.includes('journalType: "settlement"')) {
  fail("MATCH_SUCCESS must post settlement journal");
}

const schema = readJson("schemas/participate-request.v1.json");
if (schema) {
  for (const req of [
    "opportunityId",
    "pricingVersion",
    "minProfitUsdt",
    "amountUsdt",
    "idempotencyKey",
    "preflightToken",
  ]) {
    if (!(schema.required || []).includes(req)) {
      fail(`participate-request.v1 must require ${req}`);
    }
  }
}

const pkg = readJson("package.json");
if (
  pkg &&
  pkg.scripts?.["verify:core-loop-contract"] !==
    "node tooling/verify/core-loop-contract.cjs"
) {
  fail("package.json missing verify:core-loop-contract script");
}

const catalog = read("tooling/verify/CATALOG.md");
if (catalog && !catalog.includes("core-loop-contract")) {
  fail("CATALOG.md must list core-loop-contract");
}

if (fails.length) {
  console.error("[verify:core-loop-contract] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:core-loop-contract] PASS (contract + gap reconfirm · web participate=" +
    webParticipate +
    " preflight=" +
    webPreflight +
    " · Engine KEEP)",
);

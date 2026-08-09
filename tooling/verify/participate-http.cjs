/**
 * verify:participate-http — Engine §0.9 E-R4 · §48.13.1
 * POST /api/v1/opportunities/:id/participate · P0b~P5
 * participate_requests+trade_executions · idempotency · KYC0
 * practice/circuit/principal guards · JWT session userId only · external HTTP 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = [
  "schemas/participate-request.v1.json",
  "services/api-nest/src/opportunities/opportunities.user.routes.ts",
  "services/api-nest/src/opportunities/opportunities.user.controller.ts",
  "services/api-nest/src/opportunities/participate.service.ts",
  "services/api-nest/src/opportunities/opportunities.module.ts",
  "services/engine-rust/settlement_rule.cjs",
];
for (const f of files) mustExist(f);

if (fails.length) {
  console.error("[verify:participate-http] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const routes = read(
  "services/api-nest/src/opportunities/opportunities.user.routes.ts",
);
const ctrl = read(
  "services/api-nest/src/opportunities/opportunities.user.controller.ts",
);
const svc = read("services/api-nest/src/opportunities/participate.service.ts");
const mod = read("services/api-nest/src/opportunities/opportunities.module.ts");
const events = read("services/api-nest/src/opportunities/opportunities.events.ts");
const idx = read("services/api-nest/src/opportunities/index.ts");
const schema = JSON.parse(read("schemas/participate-request.v1.json"));
const rule = require(path.join(
  root,
  "services/engine-rust/settlement_rule.cjs",
));

// --- routes ---
if (!routes.includes('participate: "opportunities/:id/participate"')) {
  fails.push(
    'OPPORTUNITY_USER_ROUTES.participate must be "opportunities/:id/participate"',
  );
}
if (!/as const/.test(routes)) {
  fails.push("OPPORTUNITY_USER_ROUTES must use as const");
}

// --- controller ---
if (!ctrl.includes("@Post(OPPORTUNITY_USER_ROUTES.participate)")) {
  fails.push("POST participate must bind OPPORTUNITY_USER_ROUTES.participate");
}
if (!ctrl.includes("ParticipateService")) {
  fails.push("controller must inject ParticipateService");
}
if (/@Controller\(\s*["']admin["']\s*\)/.test(ctrl)) {
  fails.push("user controller must not be under admin");
}
if (/@Query\(\s*["']userId["']\s*\)/.test(ctrl)) {
  fails.push("must not take @Query('userId') — WalletController pattern forbidden");
}
if (/body\.userId/.test(ctrl)) {
  fails.push("must not trust body.userId");
}
if (!ctrl.includes("req.user")) {
  fails.push("must derive userId from JWT req.user");
}
if (!ctrl.includes("AUTH_REQUIRED") && !ctrl.includes("UnauthorizedException")) {
  fails.push("missing UnauthorizedException / AUTH_REQUIRED");
}

// --- service P0b~P5 + inserts ---
for (const needle of [
  "guardParticipate",
  "MATCH_BLOCKED",
  "COMPARE_NOT_READY",
  "PRICE_STALE_DATA",
  "PRICE_STALE",
  "assertBeforeParticipate",
  "INSUFFICIENT_PRINCIPAL",
  "participate_requests",
  "trade_executions",
  "idempotency",
  "participate_lock",
  "priceSoftAccept",
]) {
  if (!svc.includes(needle)) {
    fails.push(`participate.service missing: ${needle}`);
  }
}

// KYC must not gate participate
if (/assertWithdrawKyc|WithdrawKycGuard|KYC_WITHDRAW_REQUIRED/.test(svc)) {
  fails.push("participate must not require KYC");
}

// External HTTP 0 on participate path
if (
  /\bfetch\s*\(|\baxios\b|\bhttps?\.(get|request|post)\b|node-fetch|undici/.test(
    svc,
  )
) {
  fails.push("participate path must not call external HTTP APIs");
}

// JWT-only userId
if (/@Query\(\s*["']userId["']\s*\)/.test(svc) || /body\.userId/.test(svc)) {
  fails.push("service must not trust body/query userId");
}
if (!svc.includes("AUTH_REQUIRED") && !svc.includes("UnauthorizedException")) {
  fails.push("service must reject invalid session userId");
}

// practice / circuit via RiskService
if (!svc.includes("RiskService") || !svc.includes("assertBeforeParticipate")) {
  fails.push("must reuse RiskService.assertBeforeParticipate (practice/circuit)");
}

// P2-1 (Engine Final Re-Verification Audit) — opp.slotsLeft must be a real
// per-opportunity running-trade count, not the global policy constant.
if (/slotsLeft:\s*Number\(policy\.dailyOppSlotsDefault\)\s*\|\|\s*1/.test(svc)) {
  fails.push(
    "participate.service must not feed a global constant as slotsLeft — compute real per-opportunity capacity",
  );
}
if (!svc.includes("countActiveTradesForOpportunity")) {
  fails.push("participate.service missing countActiveTradesForOpportunity (real slotsLeft)");
}
if (!/status IN \('running', ?'requeue'\)/.test(svc)) {
  fails.push("countActiveTradesForOpportunity must count running+requeue trade_executions");
}

// module wiring
if (!mod.includes("ParticipateService")) {
  fails.push("OpportunitiesModule must provide ParticipateService");
}
if (!mod.includes("RiskModule")) {
  fails.push("OpportunitiesModule must import RiskModule");
}
if (!idx.includes("ParticipateService")) {
  fails.push("opportunities/index.ts must export ParticipateService");
}
if (!events.includes("participate.confirmed")) {
  fails.push("OPPORTUNITY_EVENTS must emit participate.confirmed");
}

// schema contract
for (const req of [
  "opportunityId",
  "pricingVersion",
  "minProfitUsdt",
  "amountUsdt",
  "idempotencyKey",
]) {
  if (!(schema.required || []).includes(req)) {
    fails.push(`participate-request.v1 must require ${req}`);
  }
}
if (schema.additionalProperties !== false) {
  fails.push("participate-request.v1 must set additionalProperties:false");
}

// Rule guard unit (P0b / P1 / P5) — no HTTP
if (typeof rule.guardParticipate !== "function") {
  fails.push("settlement_rule.guardParticipate missing");
}
const p0b = rule.guardParticipate({
  matchBlocked: true,
  compareReady: true,
  nowMs: 1000,
  staleAtMs: 999,
});
if (p0b !== "MATCH_BLOCKED") {
  fails.push(`P0b want MATCH_BLOCKED got ${p0b}`);
}
const p1 = rule.guardParticipate({
  matchBlocked: false,
  compareReady: false,
  nowMs: 1000,
  staleAtMs: 999,
});
if (p1 !== "COMPARE_NOT_READY") {
  fails.push(`P1 want COMPARE_NOT_READY got ${p1}`);
}
const p5 = rule.guardParticipate({
  matchBlocked: false,
  compareReady: true,
  nowMs: 10_000,
  staleAtMs: 1000,
  priceStaleMaxSec: 3,
});
if (p5 !== "PRICE_STALE_DATA") {
  fails.push(`P5 want PRICE_STALE_DATA got ${p5}`);
}
const ok = rule.guardParticipate({
  matchBlocked: false,
  compareReady: true,
  nowMs: 2000,
  staleAtMs: 1000,
  priceStaleMaxSec: 3,
});
if (ok !== "OK") {
  fails.push(`fresh compareReady want OK got ${ok}`);
}

// package + catalog
const pkg = JSON.parse(read("package.json"));
if (
  pkg.scripts?.["verify:participate-http"] !==
  "node tooling/verify/participate-http.cjs"
) {
  fails.push("package.json missing verify:participate-http script");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("participate-http")) {
  fails.push("CATALOG.md must list participate-http");
}

if (fails.length) {
  console.error("[verify:participate-http] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:participate-http] PASS (POST participate · P0b~P5 · idempotency · JWT-only · KYC0 · HTTP0)",
);

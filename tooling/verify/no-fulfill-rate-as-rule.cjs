/**
 * verify:no-fulfill-rate-as-rule — Engine §0.0.7 C
 * fulfillRate7d = display only · NEVER evaluateMatchSuccess / mergeEffectivePolicy input
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const mem = require(path.join(
  root,
  "services/market-intelligence/src/membership.cjs",
));
const rule = require(path.join(root, "services/engine-rust/settlement_rule.cjs"));

// computeFulfillRate7d math
const r0 = mem.computeFulfillRate7d({
  matchSuccess: 0,
  priceMoved: 0,
  belowMinProfit: 0,
});
if (r0 !== null) fails.push("zero attempts → null");

const r1 = mem.computeFulfillRate7d({
  matchSuccess: 3,
  priceMoved: 1,
  belowMinProfit: 1,
});
if (r1 !== 0.6) fails.push(`3/5 want 0.6 got ${r1}`);

const r2 = mem.computeFulfillRate7d({
  matchSuccess: 2,
  priceMoved: 1,
  belowMinProfit: 1,
  requeueTerminal: 0,
});
if (r2 !== 0.5) fails.push(`2/4 want 0.5 got ${r2}`);

// mergeEffectivePolicy rejects fulfillRate smuggling
let threw = false;
try {
  mem.mergeEffectivePolicy({
    basePolicy: {
      matchStrictness: "standard",
      minProfitUsdt: "5",
      staleAllowanceSec: 3,
      maxRematchCount: 2,
      slippageBoundBps: 50,
      dailyUserMatchCap: 5,
      dailyOppSlotsDefault: 12,
      retryWaitSec: 4,
    },
    membership: "sprout",
    capitalBand: "micro",
    fulfillRate7d: 0.92,
  });
} catch (e) {
  threw = String(e.message || e).includes("FULFILL_RATE");
}
if (!threw) fails.push("mergeEffectivePolicy must reject fulfillRate7d");

// settlement_rule must not reference fulfillRate
const ruleSrc = stripComments(
  read("services/engine-rust/settlement_rule.cjs"),
);
for (const bad of [
  /fulfillRate/,
  /fulfill_rate/,
  /successRatePercent/,
  /Math\.random\s*\(/,
]) {
  if (bad.test(ruleSrc)) {
    fails.push(`settlement_rule forbidden: ${bad}`);
  }
}

// evaluateMatchSuccess ignores any stray fulfillRate on context
const ctx = {
  nowMs: 1_000_000,
  participateAcceptedAtMs: 1_000_000,
  circuitStatus: "closed",
  userStatus: "active",
  opportunityStatus: "available",
  compareReady: true,
  staleAtMs: 999_000,
  tradePricingVersion: 1,
  opportunityPricingVersion: 1,
  simulationPayoutFeasible: true,
  listingLegsFresh: true,
  rematchCount: 0,
  presentationDurationSec: 12,
  expectedProfitUsdt: "6",
  fulfillRate7d: 0.99,
  policy: {
    minProfitUsdt: "5",
    staleAllowanceSec: 3,
    maxRematchCount: 2,
    retryWaitSec: 4,
  },
};
const got = rule.evaluateMatchSuccess(ctx);
if (got !== "MATCH_SUCCESS") {
  fails.push(`Rule with fulfillRate7d noise got ${got} want MATCH_SUCCESS`);
}

// membership.cjs: computeFulfillRate must not call evaluateMatchSuccess
const memSrc = stripComments(
  read("services/market-intelligence/src/membership.cjs"),
);
if (/evaluateMatchSuccess/.test(memSrc)) {
  fails.push("membership.cjs must not call evaluateMatchSuccess");
}

// Nest: write path forbids fulfillRate7d
const ctrl = read(
  "services/api-nest/src/membership/membership.admin.controller.ts",
);
if (!ctrl.includes("fulfillRate7d") || !ctrl.includes("FORBIDDEN")) {
  fails.push("controller must forbid fulfillRate7d on write");
}
const svc = read(
  "services/api-nest/src/membership/membership.admin.service.ts",
);
if (!svc.includes("fulfillRateReadOnly") && !svc.includes("refreshFulfillRate7d")) {
  fails.push("service must expose fulfillRate as read-only refresh");
}
if (!/Display-only|read-only|읽기/.test(svc) && !svc.includes("fulfillRateReadOnly")) {
  fails.push("service must document fulfillRate display-only");
}

// Schema description
const schema = JSON.parse(read("schemas/user-membership.v1.json"));
const fr = schema.properties?.fulfillRate7d;
if (!fr || !/NEVER|display|Display/i.test(fr.description || "")) {
  fails.push("schema fulfillRate7d must say display-only / NEVER Rule");
}

// Admin UI
const page = read("apps/admin/app/admin/users/[id]/page.tsx");
for (const needle of [
  'data-kpi="fulfillRate7d"',
  'data-readonly="true"',
  'data-forbid="fulfillRate_as_rule_input"',
  "요즘 조건이 맞은 비율",
]) {
  if (!page.includes(needle)) fails.push(`admin page missing: ${needle}`);
}

// Canon membership-home forbids fulfillRate as rule
const wire = JSON.parse(
  read("packages/ui/canon/surfaces/membership-home.wire.json"),
);
if (!(wire.forbidden || []).includes("fulfillRate_as_rule_input")) {
  fails.push("membership-home canon must forbid fulfillRate_as_rule_input");
}

// Migration comment
const mig = read(
  "supabase/migrations/20260809101114_user_membership_match_policy.sql",
);
if (!/Display-only|NEVER Rule/i.test(mig)) {
  fails.push("migration must comment fulfill_rate_7d display-only");
}
if (/success_rate_percent/i.test(mig) && !/FORBIDDEN/.test(mig)) {
  fails.push("migration must not add success_rate_percent");
}

if (fails.length) {
  console.error("[verify:no-fulfill-rate-as-rule] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:no-fulfill-rate-as-rule] PASS");

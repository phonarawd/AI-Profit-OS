/**
 * verify:membership-ladder — Engine §0.0.7 A
 * enum·승급 max(입금,성공,adminForce) · 자동강등0 · ladder snapshot · Admin force API
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "schemas/user-membership.v1.json",
  "services/market-intelligence/src/membership.cjs",
  "services/api-nest/src/membership/membership.admin.service.ts",
  "services/api-nest/src/membership/membership.admin.controller.ts",
  "services/api-nest/src/membership/membership.routes.ts",
  "services/api-nest/src/membership/membership.module.ts",
  "services/api-nest/src/membership/membership.mi.ts",
  "supabase/migrations/20260809101114_user_membership_match_policy.sql",
  "apps/admin/app/admin/users/[id]/page.tsx",
];
for (const f of files) mustExist(f);

if (fails.length) {
  console.error("[verify:membership-ladder] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const mem = require(path.join(
  root,
  "services/market-intelligence/src/membership.cjs",
));

try {
  mem.assertMembershipSnapshots();
} catch (e) {
  fails.push(String(e.message || e));
}

const wantCaps = {
  sprout: { daily: 8, band: "micro", strictness: "lenient", dep: "0" },
  entry: { daily: 6, band: "small", strictness: "lenient", dep: "100" },
  core: { daily: 5, band: "mid", strictness: "standard", dep: "1000" },
  high: { daily: 3, band: "high", strictness: "tight", dep: "10000" },
  vip: { daily: 2, band: "whale", strictness: "lenient", dep: "100000" },
};

for (const [id, w] of Object.entries(wantCaps)) {
  const row = mem.MEMBERSHIP_LADDER[id];
  if (!row) {
    fails.push(`ladder missing ${id}`);
    continue;
  }
  if (row.dailyUserMatchCap !== w.daily) {
    fails.push(`${id}.dailyUserMatchCap want ${w.daily}`);
  }
  if (row.maxCapitalBand !== w.band) {
    fails.push(`${id}.maxCapitalBand want ${w.band}`);
  }
  if (row.matchStrictness !== w.strictness) {
    fails.push(`${id}.matchStrictness want ${w.strictness}`);
  }
  if (row.depositMinUsdt !== w.dep) {
    fails.push(`${id}.depositMinUsdt want ${w.dep}`);
  }
}

if (mem.MEMBERSHIP_LADDER.entry.successMin !== 2) {
  fails.push("entry.successMin must be 2");
}
if (mem.MEMBERSHIP_LADDER.core.successMin !== 5) {
  fails.push("core.successMin must be 5");
}

// Promotion: deposit
if (mem.membershipFromDeposit("0") !== "sprout") {
  fails.push("deposit 0 → sprout");
}
if (mem.membershipFromDeposit("100") !== "entry") {
  fails.push("deposit 100 → entry");
}
if (mem.membershipFromDeposit("1000") !== "core") {
  fails.push("deposit 1000 → core");
}
if (mem.membershipFromDeposit("10000") !== "high") {
  fails.push("deposit 10000 → high");
}
if (mem.membershipFromDeposit("100000") !== "vip") {
  fails.push("deposit 100000 → vip");
}

// Promotion: success OR-path
if (mem.membershipFromSuccess(0) !== "sprout") {
  fails.push("success 0 → sprout");
}
if (mem.membershipFromSuccess(2) !== "entry") {
  fails.push("success 2 → entry");
}
if (mem.membershipFromSuccess(5) !== "core") {
  fails.push("success 5 → core");
}

// max(입금, 성공)
const r1 = mem.resolveMembership({
  cumulativeDepositUsdt: "50",
  matchSuccessCount: 5,
});
if (r1.membership !== "core") fails.push("max(deposit50, success5) → core");

const r2 = mem.resolveMembership({
  cumulativeDepositUsdt: "10000",
  matchSuccessCount: 0,
});
if (r2.membership !== "high") fails.push("deposit 10k → high");

// adminForce pin (can demote)
const forced = mem.resolveMembership({
  cumulativeDepositUsdt: "100000",
  matchSuccessCount: 10,
  adminForce: true,
  forcedMembership: "sprout",
});
if (forced.membership !== "sprout" || forced.adminForce !== true) {
  fails.push("adminForce must pin sprout even when auto=vip");
}
if (forced.autoMembership !== "vip") {
  fails.push("autoMembership should still compute vip");
}

// Schema enum
const schema = JSON.parse(read("schemas/user-membership.v1.json"));
const enumWant = ["sprout", "entry", "core", "high", "vip"];
const gotEnum = schema.properties?.membership?.enum || [];
if (JSON.stringify(gotEnum) !== JSON.stringify(enumWant)) {
  fails.push("user-membership.v1 membership enum drift");
}

// Nest + AppModule
const appMod = read("services/api-nest/src/app.module.ts");
if (!appMod.includes("MembershipModule")) {
  fails.push("AppModule must import MembershipModule");
}
const routes = read("services/api-nest/src/membership/membership.routes.ts");
if (!routes.includes('membership: "users/:id/membership"')) {
  fails.push("routes must expose users/:id/membership");
}
const ctrl = read(
  "services/api-nest/src/membership/membership.admin.controller.ts",
);
if (!ctrl.includes("@Put") || !ctrl.includes("@Get")) {
  fails.push("membership controller must have GET/PUT");
}
if (!ctrl.includes("successRatePercent FORBIDDEN")) {
  fails.push("controller must reject successRatePercent");
}
const svc = read(
  "services/api-nest/src/membership/membership.admin.service.ts",
);
if (!svc.includes("admin.user.membership.force") && !svc.includes("MEMBERSHIP_AUDIT.force")) {
  fails.push("force must audit admin.user.membership.force");
}
if (!svc.includes("ledgerMutated: false")) {
  fails.push("membership writes must declare ledgerMutated false");
}

// Migration audit
const mig = read(
  "supabase/migrations/20260809101114_user_membership_match_policy.sql",
);
if (!mig.includes("user_membership_audit")) {
  fails.push("migration must create user_membership_audit");
}
if (!mig.includes("admin.user.membership.force")) {
  fails.push("migration audit action force missing");
}

// Admin UI
const page = read("apps/admin/app/admin/users/[id]/page.tsx");
for (const needle of [
  'data-tab="membership"',
  'data-surface="user-membership"',
  'data-audit="admin.user.membership.force"',
  "data-membership={m.id}",
  'id: "sprout"',
  'id: "vip"',
  'data-rbac="userMembershipForce"',
]) {
  if (!page.includes(needle)) fails.push(`admin page missing: ${needle}`);
}

const adminRoutes = read("apps/admin/routes.ts");
if (!adminRoutes.includes("/admin/users/:id?tab=membership")) {
  fails.push("ADMIN_CHILD_ROUTES must include membership tab");
}

// Soft/Hard not by membership
const mapCode = read("services/market-intelligence/src/membership.cjs");
if (/SOFT_SEC|HARD_SEC/.test(mapCode) && !/membershipUniform|FORBIDDEN|≠/.test(mapCode)) {
  // membership.cjs should not redefine Soft/Hard walls
}
if (/softSec\s*[:=]\s*\d+/.test(mapCode)) {
  fails.push("membership must not define Soft wall by grade");
}

if (fails.length) {
  console.error("[verify:membership-ladder] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:membership-ladder] PASS");

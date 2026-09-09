/**
 * verify:admin-user-matching-b7 — S3 / B7
 * Server-side user product visibility. Client filter is not enough.
 * Live E2E (items 19-20 / ADMIN_USER_MATCHING_LIVE_E2E) is S6/J3, not this script.
 */
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail("missing: " + rel);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const mig = read("supabase/migrations/20260906130000_user_matching_policy_b7.sql");
for (const table of [
  "matching_policy_versions",
  "matching_policy_assignments",
  "matching_policy_audit",
]) {
  if (!mig.includes("public." + table)) fail("migration missing " + table);
}
if (/CREATE TABLE[\s\S]{0,80}OPPORTUNITY_POOL/i.test(mig)) {
  fail("B7 must not recreate SYS:OPPORTUNITY_POOL");
}
if (!mig.includes("required_capital_usdt_snapshot")) {
  fail("trade snapshot column missing");
}

const engine = read("services/api-nest/src/matching-policy/matching-policy.engine.ts");
if (!engine.includes("evaluateMatchingPolicy")) fail("engine missing evaluate");
if (!engine.includes("void input.clientPolicy")) fail("client policy must be ignored");
if (!engine.includes("ASSIGN_MONEY_MUTATION_FORBIDDEN")) {
  fail("assign money mutation deny missing");
}

const userSvc = read("services/api-nest/src/opportunities/opportunities.user.service.ts");
if (!userSvc.includes("matchingPolicy.filterForUser")) {
  fail("listFeed must filter through matchingPolicy");
}
if (!userSvc.includes("evaluateForUser")) {
  fail("getById must evaluate matchingPolicy");
}

const participate = read("services/api-nest/src/opportunities/participate.service.ts");
if (!participate.includes("assertParticipable")) {
  fail("participate must re-check matchingPolicy");
}
if (!participate.includes("matchingSnapshot")) {
  fail("participate must snapshot policy id/version/amount");
}

const coach = read("services/api-nest/src/ai/coach.orchestrator.ts");
if (!coach.includes("applyToFactCards") && !coach.includes("factsForUser")) {
  fail("peotteok facts must pass matchingPolicy");
}

const caps = read("services/api-nest/src/common/admin-capabilities.ts");
if (!caps.includes("MatchingPolicyAdminController")) {
  fail("admin capability table missing MatchingPolicyAdminController");
}
if (!caps.includes("userMatchPolicy")) {
  fail("B7 maps user.matching_policy.* onto userMatchPolicy");
}

const page = read("apps/admin/app/admin/users/[id]/page.tsx");
if (!page.includes('data-tab="policy"') || !page.includes("user-matching-policy")) {
  fail("User 360 policy tab missing");
}

const fixture = read("tooling/verify/fixtures/migrations-applied.v1.json");
if (!fixture.includes("20260906130000")) {
  fail("committedUnapplied must list B7 migration");
}

// CATALOG.md table edits are often hook-blocked; domain-by-path + package.json are the live wiring.

const runtime = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    "--test",
    "services/api-nest/src/matching-policy/matching-policy.runtime.test.ts",
  ],
  { cwd: root, encoding: "utf8" },
);
if (runtime.status !== 0) {
  fail("matching-policy.runtime.test.ts failed");
  if (runtime.stdout) fail(runtime.stdout.slice(0, 800));
  if (runtime.stderr) fail(runtime.stderr.slice(0, 400));
}

if (fails.length) {
  console.error("[verify:admin-user-matching-b7] FAIL");
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}
console.log(
  "[verify:admin-user-matching-b7] PASS (engine 1-15,18 · list/detail/participate/AI · LIVE_E2E=NOT_RUN)",
);

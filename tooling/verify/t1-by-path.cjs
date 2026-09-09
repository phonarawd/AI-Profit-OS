/**
 * verify:t1-by-path — 백엔드 T1 extras. 레거시 프론트 자동 실행 0.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const {
  T1_CORE_ALWAYS,
  T1_BACKEND,
  T1_FRONTEND,
  T1_SHARED,
  T1_PUSH,
  classifyPath,
  t1Plan,
} = require("./lib/t1-by-path.cjs");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

if (T1_PUSH.includes("api-nest-build.cjs") || T1_PUSH.includes("next-build.cjs")) {
  fails.push("T1_PUSH must not include nest/next builds");
}
if (T1_PUSH.includes("lux-theme-sync.cjs") || T1_PUSH.includes("ia-tabs.cjs")) {
  fails.push("T1_PUSH must not include legacy frontend extras");
}
if (T1_PUSH.includes("stubs/run-all.cjs")) {
  fails.push("stubs/run-all must not run on every backend T1");
}
for (const name of T1_CORE_ALWAYS) {
  if (!T1_PUSH.includes(name)) fails.push("CORE missing from T1_PUSH: " + name);
}
const union = [...new Set([...T1_CORE_ALWAYS, ...T1_BACKEND, ...T1_SHARED])];
if (union.length !== T1_PUSH.length || union.some((s) => !T1_PUSH.includes(s))) {
  fails.push("lane union CORE+BACKEND+SHARED must equal T1_PUSH");
}
if (!T1_FRONTEND.includes("lux-theme-sync.cjs")) {
  fails.push("T1_FRONTEND inventory list must keep lux-theme-sync");
}

const docs = t1Plan(["governance/release-master/MIGRATION_READINESS.md"]);
if (docs.scripts.join() !== T1_CORE_ALWAYS.join() || docs.reason !== "docs") {
  fails.push("docs lane must be CORE only");
}

const backend = t1Plan(["services/api-nest/src/ledger/trial-state.service.ts"]);
if (backend.reason !== "backend") fails.push("nest file must classify backend");
if (backend.scripts.includes("lux-theme-sync.cjs") || backend.scripts.includes("stubs/run-all.cjs")) {
  fails.push("backend lane must not run lux or stubs/run-all");
}
if (!backend.scripts.includes("domain-clock.cjs")) {
  fails.push("backend lane must run domain-clock");
}

const frontend = t1Plan(["apps/web/app/page.tsx"]);
if (frontend.reason !== "frontend-inventory") {
  fails.push("web file must be frontend-inventory CORE only");
}
if (frontend.scripts.join() !== T1_CORE_ALWAYS.join()) {
  fails.push("frontend inventory must not add extras");
}

const shared = t1Plan(["infra/web/wrangler.toml"]);
if (shared.reason !== "shared") fails.push("infra file must classify shared");
if (!shared.scripts.includes("cf-infra.cjs") || !shared.scripts.includes("root-domain-env.cjs")) {
  fails.push("shared lane must run cf-infra + root-domain-env");
}
if (shared.scripts.includes("ia-tabs.cjs") || shared.scripts.includes("opennext-workers-origin.cjs")) {
  fails.push("shared lane must not run frontend extras");
}

const mixed = t1Plan([
  "services/api-nest/src/app.module.ts",
  "apps/web/app/page.tsx",
]);
if (!mixed.reason.includes("backend") || !mixed.reason.includes("frontend")) {
  fails.push("mixed diff must keep both lane labels");
}
if (!mixed.scripts.includes("domain-clock.cjs")) {
  fails.push("mixed diff must keep backend extras");
}
if (mixed.scripts.includes("lux-theme-sync.cjs")) {
  fails.push("mixed diff must not add frontend extras");
}

const unknownApp = t1Plan(["apps/mobile/app.tsx"]);
if (unknownApp.reason !== "full-unknown" || unknownApp.scripts.join() !== T1_PUSH.join()) {
  fails.push("unknown apps/* must fail-closed to backend T1_PUSH");
}

const newTop = t1Plan(["brand-new-root/secret.ts"]);
if (newTop.reason !== "full-unknown" || newTop.scripts.join() !== T1_PUSH.join()) {
  fails.push("new top-level dir must fail-closed to backend T1_PUSH");
}

const closed = t1Plan([], { failClosed: true });
if (closed.reason !== "full-failclosed" || closed.scripts.join() !== T1_PUSH.join()) {
  fails.push("missing upstream must fail-closed to backend T1_PUSH");
}

if (classifyPath("tooling/verify/fixtures/migrations-applied.v1.json") !== "docs") {
  fails.push("verify fixtures must be docs lane");
}
if (classifyPath("tooling/verify/gate-tiers.cjs") !== "full") {
  fails.push("gate-tiers change must be full T1");
}

const tiers = read("tooling/verify/gate-tiers.cjs");
if (!tiers.includes("t1PushPlan")) {
  fails.push("gate-tiers must call t1PushPlan");
}
if (!tiers.includes('if (tier === "fast" || tier === "push")')) {
  fails.push("T2 full must not re-run domainSteps");
}
if (tiers.includes("next-build.cjs") || tiers.includes("opennext-build.cjs")) {
  fails.push("gate-tiers must not keep next/opennext in T2");
}
if (tiers.includes("brand-consumer.cjs")) {
  fails.push("brand-consumer must leave T0_ALWAYS");
}
if (!tiers.includes('T2_CI = ["api-nest-build.cjs"]')) {
  fails.push("T2_CI must be api-nest-build only");
}

const gate = read("tooling/verify/gate.cjs");
if (!gate.includes('stepsForTier("full")') || !gate.includes("api-nest-build.cjs")) {
  fails.push("gate.cjs must use stepsForTier full + mention api-nest-build");
}

const husky = read(".husky/pre-push");
if (!husky.includes("verify:gate:push") || husky.includes("backend:fast")) {
  fails.push("pre-push must stay verify:gate:push");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:t1-by-path"') || !pkg.includes('"backend:fast"')) {
  fails.push("package.json missing t1-by-path or backend:fast");
}

const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("t1-by-path")) fails.push("CATALOG must list t1-by-path");

const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("t1-by-path.cjs")) {
  fails.push("domain-by-path must trigger t1-by-path");
}
if (!domain.includes("brand-consumer.cjs")) {
  fails.push("domain-by-path must trigger brand-consumer on brand paths");
}

const workflow = read(".github/workflows/gate.yml");
if (workflow.includes("pnpm --filter @aipo/web build:cf")) {
  fails.push("gate.yml must not build legacy web OpenNext");
}
const leftoverAlways = [
  "verify:rel-404-lighthouse-budget",
  "verify:rel-409-r6-cert",
  "verify:rel-500-qa-lab-expansion",
  "verify:rel-506-r8-infra-core",
  "verify:rel-507-production-e2e",
  "verify:rel-600-staging",
  "verify:s5-dedicated-staging",
  "verify:hard-gate-live",
  "verify:j0-admin-auth-live",
  "verify:rel-601-staging-regression",
  "verify:rel-602-staging-rollback",
  "verify:rel-603-age-usability-spotcheck",
];
for (const step of leftoverAlways) {
  if (workflow.includes(step)) {
    fails.push("backend gate.yml must not always-run leftover " + step);
  }
}

const { stepsForTier } = require("./gate-tiers.cjs");
const full = stepsForTier("full");
if (!full.includes("api-nest-build.cjs")) fails.push("T2 full missing api-nest-build");
if (full.includes("next-build.cjs") || full.includes("opennext-build.cjs")) {
  fails.push("T2 full must not run next/opennext");
}
if (full.includes("lux-theme-sync.cjs")) {
  fails.push("T2 full must not add lux unless domainSteps did");
}

if (fails.length) {
  console.error("[verify:t1-by-path] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:t1-by-path] PASS (backend T1 · frontend inventory=CORE · T2=api-nest-build)",
);

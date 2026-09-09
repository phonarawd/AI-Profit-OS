/**
 * verify:t1-by-path — T1 추가 검사 경로 분류. 침묵 스킵 금지.
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

const FROZEN_T1_PUSH = [
  "settlement-rule-parity.cjs",
  "pg-module-scan.cjs",
  "brand-assets.cjs",
  "cf-infra.cjs",
  "ebay-worker-deploy-path.cjs",
  "p0-ebay-secret-provisioning.cjs",
  "nest-production-provenance.cjs",
  "workers-types.cjs",
  "phase0-bootstrap.cjs",
  "root-domain-env.cjs",
  "domain-bootstrap.cjs",
  "opennext-workers-origin.cjs",
  "next-major-pin.cjs",
  "tailwind-v4.cjs",
  "lux-theme-sync.cjs",
  "dark-leak-guard.cjs",
  "cf-deploy-packages.cjs",
  "no-admin-in-web.cjs",
  "ia-tabs.cjs",
  "admin-routes.cjs",
  "admin-boundary.cjs",
  "domain-clock.cjs",
  "db-recovery.cjs",
  "privacy-purge.cjs",
  "stubs/run-all.cjs",
];

if (T1_PUSH.join() !== FROZEN_T1_PUSH.join()) {
  fails.push("T1_PUSH must stay the frozen 25-script set");
}
if (T1_PUSH.includes("api-nest-build.cjs")) {
  fails.push("api-nest-build must not enter T1_PUSH");
}
for (const name of T1_CORE_ALWAYS) {
  if (!T1_PUSH.includes(name)) fails.push("CORE missing from T1_PUSH: " + name);
}

const union = [...new Set([...T1_CORE_ALWAYS, ...T1_BACKEND, ...T1_FRONTEND, ...T1_SHARED])];
if (union.length !== T1_PUSH.length || union.some((s) => !T1_PUSH.includes(s))) {
  fails.push("lane union must equal T1_PUSH (do not drop stubs/run-all)");
}

const docs = t1Plan(["governance/release-master/MIGRATION_READINESS.md"]);
if (docs.scripts.join() !== T1_CORE_ALWAYS.join() || docs.reason !== "docs") {
  fails.push("docs lane must be CORE only");
}
if (docs.scripts.includes("lux-theme-sync.cjs") || docs.scripts.includes("ia-tabs.cjs")) {
  fails.push("docs lane must not run frontend extras");
}

const backend = t1Plan(["services/api-nest/src/ledger/trial-state.service.ts"]);
if (backend.reason !== "backend") fails.push("nest file must classify backend");
if (!backend.scripts.includes("stubs/run-all.cjs")) {
  fails.push("backend lane must keep stubs/run-all");
}
if (backend.scripts.includes("lux-theme-sync.cjs") || backend.scripts.includes("ia-tabs.cjs")) {
  fails.push("backend lane must not run lux/ia-tabs");
}
if (backend.scripts.includes("admin-routes.cjs")) {
  fails.push("backend lane must not run admin-routes");
}

const frontend = t1Plan(["apps/web/app/page.tsx"]);
if (frontend.reason !== "frontend") fails.push("web file must classify frontend");
if (!frontend.scripts.includes("lux-theme-sync.cjs")) {
  fails.push("frontend lane must run lux-theme-sync");
}
if (!frontend.scripts.includes("stubs/run-all.cjs")) {
  fails.push("frontend lane must keep stubs/run-all");
}
if (frontend.scripts.includes("ebay-worker-deploy-path.cjs")) {
  fails.push("frontend lane must not run ebay worker path");
}

const shared = t1Plan(["infra/web/wrangler.toml"]);
if (shared.reason !== "shared") fails.push("infra file must classify shared");
if (!shared.scripts.includes("cf-infra.cjs") || !shared.scripts.includes("root-domain-env.cjs")) {
  fails.push("shared lane must run cf-infra + root-domain-env");
}
if (shared.scripts.includes("ia-tabs.cjs")) {
  fails.push("shared lane must not run ia-tabs");
}

const mixed = t1Plan([
  "services/api-nest/src/app.module.ts",
  "apps/web/app/page.tsx",
]);
if (!mixed.reason.includes("backend") || !mixed.reason.includes("frontend")) {
  fails.push("mixed diff must union lanes");
}
if (!mixed.scripts.includes("lux-theme-sync.cjs") || !mixed.scripts.includes("domain-clock.cjs")) {
  fails.push("mixed diff must include both lane extras");
}

const unknownApp = t1Plan(["apps/mobile/app.tsx"]);
if (unknownApp.reason !== "full-unknown" || unknownApp.scripts.join() !== T1_PUSH.join()) {
  fails.push("unknown apps/* must fail-closed to full T1_PUSH");
}

const newTop = t1Plan(["brand-new-root/secret.ts"]);
if (newTop.reason !== "full-unknown" || newTop.scripts.join() !== T1_PUSH.join()) {
  fails.push("new top-level dir must fail-closed to full T1_PUSH");
}

const closed = t1Plan([], { failClosed: true });
if (closed.reason !== "full-failclosed" || closed.scripts.join() !== T1_PUSH.join()) {
  fails.push("missing upstream must fail-closed to full T1_PUSH");
}

if (classifyPath("tooling/verify/fixtures/migrations-applied.v1.json") !== "docs") {
  fails.push("verify fixtures must be docs lane");
}
if (classifyPath("tooling/verify/gate-tiers.cjs") !== "full") {
  fails.push("gate-tiers change must be full T1");
}
if (classifyPath("package.json") !== "full") {
  fails.push("package.json must be full T1");
}

const tiers = read("tooling/verify/gate-tiers.cjs");
if (!tiers.includes("t1PushPlan") || !tiers.includes('tier === "push"')) {
  fails.push("gate-tiers push must call t1PushPlan");
}
if (!/tier === "full"[\s\S]*T1_PUSH/.test(tiers)) {
  fails.push("T2 full must still spread complete T1_PUSH");
}

const gatePush = read("tooling/verify/gate-push.cjs");
if (!gatePush.includes("t1PushPlan") || !gatePush.includes('stepsForTier("push")')) {
  fails.push("gate-push must keep stepsForTier push after t1PushPlan");
}

const husky = read(".husky/pre-push");
if (!husky.includes("verify:gate:push")) {
  fails.push("pre-push must stay verify:gate:push");
}
if (husky.includes("backend:fast")) {
  fails.push("pre-push must not switch to backend:fast");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:t1-by-path"')) fails.push("package.json missing verify:t1-by-path");
if (!pkg.includes('"backend:fast"')) fails.push("package.json missing backend:fast");

const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("t1-by-path")) fails.push("CATALOG must list t1-by-path");

const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("t1-by-path.cjs")) {
  fails.push("domain-by-path must trigger t1-by-path");
}

const { stepsForTier } = require("./gate-tiers.cjs");
const full = stepsForTier("full");
for (const step of T1_PUSH) {
  if (!full.includes(step)) fails.push("T2 full missing T1 extra: " + step);
}
for (const step of ["api-nest-build.cjs", "next-build.cjs", "opennext-build.cjs"]) {
  if (!full.includes(step)) fails.push("T2 full missing " + step);
}

if (fails.length) {
  console.error("[verify:t1-by-path] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:t1-by-path] PASS (docs=CORE · backend skips lux · unknown=full T1 · T2 keeps all 25)",
);

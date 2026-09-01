/**
 * leftover-browser-harness — leftover Chromium evidence spec is gated.
 * 브라우저 실기동은 LEFTOVER_BROWSER=1. CI 기본 0. Home geometry 0.
 */
const fs = require("fs");
const path = require("path");

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

const web = read("tooling/e2e/specs/leftover-browser-web.spec.cjs");
const admin = read("tooling/e2e/specs/leftover-browser-admin.spec.cjs");
const evidence = read("governance/recovery/leftover-browser-evidence.v1.json");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");

if (!web.includes("LEFTOVER_BROWSER")) fails.push("web spec must gate LEFTOVER_BROWSER");
if (!web.includes("expect(keys.size).toBe(1)") || web.includes("keys.size <= 1")) {
  fails.push("ticket93 must require exactly one non-empty idempotency identity");
}
if (!web.includes("Promise.all") || !web.includes("withdraw-submit")) {
  fails.push("ticket93 must race concurrent submit clicks, not idle no-op");
}
if (!web.includes("ticket95 latest intent") || !web.includes("late A")) {
  fails.push("ticket95 must prove latest intent B after late A");
}
if (!web.includes("expect(puts).toBeGreaterThanOrEqual(2)")) {
  fails.push("ticket95 must require at least two PUTs");
}
if (!admin.includes("LEFTOVER_BROWSER")) fails.push("admin spec must gate LEFTOVER_BROWSER");
if (!admin.includes("ticketI5 beginner language")) {
  fails.push("ticketI5 must sweep beginner language on operator surfaces");
}
if (!web.includes("ensureLocalWebRuntime")) fails.push("web spec must use local web runtime");
if (!admin.includes("ensureLocalAdminRuntime")) fails.push("admin spec must use local admin runtime");
if (/hiptk\.app|pages\.dev|ai-profit-os\.onrender\.com/.test(web + admin)) {
  fails.push("leftover specs must not name production hosts as fallback");
}
if (!evidence.includes("STATIC_NE_LOCAL_RUNTIME_NE_BROWSER_NE_REMOTE_CI_NE_RELEASE_READY")) {
  fails.push("evidence must keep layer inequality");
}
if (/CLOSED_VERIFIED/.test(evidence) && /"100_axe": "CLOSED_VERIFIED"/.test(evidence)) {
  fails.push("ticket 100 must not be CLOSED_VERIFIED without full AXE_BROWSER evidence");
}
if (!pkg.includes("verify:leftover-browser-harness")) {
  fails.push("package.json missing leftover-browser-harness script");
}
if (!catalog.includes("leftover-browser-harness")) {
  fails.push("CATALOG.md must list leftover-browser-harness");
}
if (!domain.includes("leftover-browser-harness.cjs")) {
  fails.push("domain-by-path must trigger leftover-browser-harness");
}

if (fails.length) {
  console.error("[verify:leftover-browser-harness] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log("[verify:leftover-browser-harness] PASS");

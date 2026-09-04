/**
 * Bounded Firefox/WebKit closure is a real engine matrix, not a skip-as-PASS.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const read = (rel) => {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
};

const wf = read(".github/workflows/critical-cross-browser.yml");
const spec = read("tooling/e2e/specs/critical-cross-browser.spec.cjs");
const cfg = read("tooling/e2e/playwright.cross-browser.config.cjs");
const axeWf = read(".github/workflows/critical-axe.yml");
const axeSpec = read("tooling/e2e/specs/critical-axe.spec.cjs");

for (const engine of ["chromium", "firefox", "webkit"]) {
  if (!wf.includes(engine) || !cfg.includes(engine)) {
    fails.push("matrix/config must include " + engine);
  }
}
if (wf.includes("test.skip") || spec.includes("test.skip(")) {
  fails.push("critical cross-browser must not skip an engine as PASS");
}
if (!spec.includes("browser-engine") || !spec.includes("prefers-reduced-motion")) {
  fails.push("spec must record engine and reduced-motion");
}
if (!axeWf.includes("critical-axe.spec.cjs") || axeSpec.includes("test.skip(")) {
  fails.push("live Axe workflow must run critical-axe without skip-as-PASS");
}
if (!axeSpec.includes("REMOTE_AXE_PASS") || !axeSpec.includes("LOCAL_AXE_PASS")) {
  fails.push("Axe spec must distinguish local vs remote layers");
}
if (!wf.includes("webkit-home-session.spec.cjs")) {
  fails.push("workflow must run WebKit home session resolution, not loading paint");
}
if (!wf.includes("ticket93|ticket95")) {
  fails.push("workflow must run leftover 93/95 concurrent race");
}
if (!wf.includes("critical-admin-cross-browser.spec.cjs")) {
  fails.push("admin job must run system-control truthful readout");
}
if (!axeWf.includes("full-product-axe.spec.cjs")) {
  fails.push("critical-axe must run full-product inventory sweep");
}

if (fails.length) {
  console.error("[verify:critical-cross-browser] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log("[verify:critical-cross-browser] PASS (STATIC_VERIFIER_PASS · skipped engine ≠ PASS)");

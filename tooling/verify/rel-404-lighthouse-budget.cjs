/**
 * verify:rel-404-lighthouse-budget — budget file + CI path. No local full LH.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const budgetRel = "governance/performance/lighthouse-budget.json";
const budgetRaw = read(budgetRel);
const workflow = read(".github/workflows/lighthouse.yml");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");

let budget;
try {
  budget = JSON.parse(budgetRaw || "{}");
} catch {
  fails.push("lighthouse-budget.json must be JSON");
  budget = {};
}

if (!Array.isArray(budget.budgets) || budget.budgets.length < 1) {
  fails.push("budget file must include budgets[]");
}
if (budget.homeGeometryLock !== true) {
  fails.push("budget must lock Home geometry");
}
if (budget.localFullLighthouse !== false) {
  fails.push("local full Lighthouse must stay false");
}
if (budget.image?.homeHeroDowngradeForbidden !== true) {
  fails.push("Home hero downgrade must be forbidden");
}
if (!String(budget.lazyLoad?.belowFoldRequired)) {
  fails.push("lazy-load below-fold rule missing");
}

if (!workflow.includes("verify:rel-404-lighthouse-budget")) {
  fails.push("lighthouse.yml must run the budget verifier");
}
if (workflow.includes("verify:gate") && workflow.includes("next-build")) {
  fails.push("do not fold full LH into T2 gate");
}
if (!pkg.includes("verify:rel-404-lighthouse-budget")) {
  fails.push("package.json missing verify:rel-404-lighthouse-budget");
}
if (!catalog.includes("rel-404-lighthouse-budget")) {
  fails.push("CATALOG.md missing rel-404-lighthouse-budget");
}

if (fails.length) {
  console.error("[verify:rel-404-lighthouse-budget] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-404-lighthouse-budget] PASS (budget + CI path · local full LH 0)");

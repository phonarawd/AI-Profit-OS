/**
 * verify:s3-37-merge-rules — S3 / 3.7 GitHub merge contract (code slice)
 * RC/production merge must include engine-acceptance, evidence-refresh, CodeQL.
 * verify-gate alone is not mergeable. Live ruleset apply and paid-plan buy stay NOT_RUN.
 */
"use strict";

const fs = require("fs");
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

const matrixRel = "governance/github/s3-37-connection-matrix.v1.json";
let matrix;
try {
  matrix = JSON.parse(read(matrixRel));
} catch (err) {
  fail("matrix JSON invalid: " + err.message);
  matrix = { checks: {} };
}

if (matrix.liveE2e !== "NOT_RUN") fail("matrix.liveE2e must stay NOT_RUN");
if (matrix.productionDbApply !== false) fail("matrix must not claim production DB apply");
if (matrix.launchYes !== false) fail("matrix.launchYes must stay false");
if (matrix.liveRulesetApply !== "NOT_RUN") fail("live GitHub ruleset apply must stay NOT_RUN");
if (matrix.paidPlanPurchase !== false) fail("paidPlanPurchase must stay false");
if (matrix.checks && matrix.checks.live_github_ruleset_apply !== "NOT_RUN") {
  fail("matrix.live_github_ruleset_apply must stay NOT_RUN");
}
if (matrix.checks && matrix.checks.paid_plan_purchase !== "NOT_RUN") {
  fail("matrix.paid_plan_purchase must stay NOT_RUN");
}

const {
  loadContract,
  isRcProductionMergeable,
} = require(path.join(root, "tooling/github/rc-production-merge.cjs"));

let contract;
try {
  contract = loadContract();
} catch (err) {
  fail("RC required-check contract invalid: " + err.message);
  contract = { required_status_checks: [] };
}

if (contract.dailyMainGateIsNotSufficient !== true) {
  fail("RC contract must declare daily main-gate is not sufficient");
}
if (contract.liveRulesetApply !== "NOT_RUN") {
  fail("RC contract liveRulesetApply must stay NOT_RUN");
}
if (contract.paidPlanPurchase !== false) {
  fail("RC contract must not purchase a paid plan");
}

const contexts = (contract.required_status_checks || []).map((row) => row.context);
const need = [
  "gate / verify-gate",
  "codeql / analyze",
  "engine-acceptance / aggregator",
  "engine-evidence-refresh-check / evidence-only",
];
for (const ctx of need) {
  if (!contexts.includes(ctx)) fail("RC required checks missing " + ctx);
}
if (contexts.length < 4) fail("RC required checks must not be verify-gate alone");

const onlyGate = isRcProductionMergeable(["gate / verify-gate"], contract);
if (onlyGate.mergeable) fail("verify-gate alone must not be RC/production mergeable");
if (!onlyGate.missing.includes("codeql / analyze")) {
  fail("verify-gate-only must still miss CodeQL");
}

const allGreen = isRcProductionMergeable(need, contract);
if (!allGreen.mergeable || allGreen.missing.length) {
  fail("all required RC contexts together must be mergeable");
}

const daily = JSON.parse(read("tooling/github/main-gate.ruleset.json") || "{}");
const dailyCtx = (((daily.rules || []).find((r) => r.type === "required_status_checks") || {})
  .parameters || {}).required_status_checks || [];
const dailyNames = dailyCtx.map((row) => row.context);
if (dailyNames.length === 1 && dailyNames[0] === "gate / verify-gate") {
  // expected: daily gate stays narrow so path-filtered workflows do not brick every PR
} else if (dailyNames.length === 0) {
  fail("daily main-gate must still require verify-gate");
}

const apply = read("tooling/github/apply-main-gate.ps1");
if (!/Live ruleset apply = NOT_RUN/i.test(apply) && !/NOT_RUN/.test(apply)) {
  fail("apply-main-gate.ps1 must record live apply as NOT_RUN for this slice");
}
if (/must buy|purchase GitHub Pro|buy GitHub Pro/i.test(apply)) {
  fail("apply script must not instruct a paid-plan purchase");
}

const workflows = {
  "gate / verify-gate": [".github/workflows/gate.yml", "verify-gate:"],
  "codeql / analyze": [".github/workflows/codeql.yml", "analyze:"],
  "engine-acceptance / aggregator": [".github/workflows/engine-acceptance.yml", "aggregator:"],
  "engine-evidence-refresh-check / evidence-only": [
    ".github/workflows/engine-evidence-refresh-check.yml",
    "evidence-only:",
  ],
};
for (const [ctx, [rel, needle]] of Object.entries(workflows)) {
  const body = read(rel);
  if (!body.includes(needle)) fail(ctx + " workflow job missing in " + rel);
}

const pkg = read("package.json");
if (!pkg.includes('"verify:s3-37-merge-rules"')) fail("package.json missing verify:s3-37-merge-rules");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("s3-37-merge-rules.cjs")) fail("domain-by-path must trigger s3-37-merge-rules.cjs");
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("s3-37-merge-rules")) fail("CATALOG.md must list s3-37-merge-rules");

if (fails.length) {
  console.error("[verify:s3-37-merge-rules] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:s3-37-merge-rules] PASS (RC checks>verify-gate · live apply=NOT_RUN · paid plan 0)",
);

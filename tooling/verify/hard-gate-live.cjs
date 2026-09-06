/**
 * verify:hard-gate-live
 * §0.C 카탈로그를 다시 센다. 0/10 고정 분수 금지. PASS 위조 금지.
 */
"use strict";

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

function readJson(rel) {
  const text = read(rel);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    fails.push(rel + " invalid JSON: " + err.message);
    return {};
  }
}

const REQUIRED_IDS = [
  "HG-M1",
  "HG-M2",
  "HG-M3",
  "HG-M4",
  "HG-M5",
  "HG-M6",
  "HG-M7",
  "HG-M8",
  "HG-M9",
  "HG-M10",
  "HG-A1",
  "HG-A2",
  "HG-A3",
  "HG-A4",
  "HG-A5",
  "HG-A6",
  "HG-A7",
  "HG-A8",
  "HG-A9",
  "HG-P1",
  "HG-P2",
  "HG-P3",
  "HG-P4",
  "HG-P5",
  "HG-P6",
  "HG-L1",
  "HG-L2",
  "HG-L3",
  "HG-L4",
  "HG-L5",
  "HG-L6",
  "HG-L7",
  "HG-L8",
  "HG-L9",
  "HG-L10",
  "HG-L11",
  "HG-L12",
];

const live = readJson("governance/release-master/HARD_GATE_LIVE.v1.json");
const s5 = readJson("governance/release-master/S5-DEDICATED-STAGING.v1.json");
const migrations = readJson("governance/release-master/S5-STAGING-MIGRATIONS.v1.json");
const fixture = readJson("tooling/verify/fixtures/migrations-applied.v1.json");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");

const gates = Array.isArray(live.gates) ? live.gates : [];
const ids = gates.map((g) => g && g.id);

if (live.schema !== "hard-gate-live.v1") fails.push("schema must be hard-gate-live.v1");
if (live.fullRealMoneyReleased !== "NO") fails.push("fullRealMoneyReleased must stay NO");
if (live.releaseSha !== "NOT_CUT") fails.push("releaseSha must stay NOT_CUT");
if (live.productionDeploy !== 0) fails.push("productionDeploy must be 0");
if (live.staleFraction !== "0/10") fails.push("stale 0/10 fraction must remain labeled stale");
if (live.hardGateDefined !== REQUIRED_IDS.length) {
  fails.push("hardGateDefined must equal catalog " + REQUIRED_IDS.length);
}
if (gates.length !== REQUIRED_IDS.length) {
  fails.push("gates.length must equal " + REQUIRED_IDS.length);
}
for (const id of REQUIRED_IDS) {
  if (!ids.includes(id)) fails.push("missing gate " + id);
}
if (new Set(ids.filter(Boolean)).size !== ids.filter(Boolean).length) {
  fails.push("duplicate gate ids");
}

const passed = gates.filter((g) => g && g.status === "PASS");
if (live.hardGatePassed !== passed.length) {
  fails.push("hardGatePassed must equal counted PASS rows");
}
if (passed.length !== 0) {
  fails.push("no HARD_GATE may be PASS without live SHA evidence (current allowlist empty)");
}

const byId = Object.fromEntries(gates.filter((g) => g && g.id).map((g) => [g.id, g]));
if (!byId["HG-A8"] || byId["HG-A8"].status !== "BLOCKED_EXTERNAL") {
  fails.push("HG-A8 must stay BLOCKED_EXTERNAL until Access+J0 live");
}
if (!byId["HG-L8"] || byId["HG-L8"].status !== "NOT_READY") {
  fails.push("HG-L8 must stay NOT_READY while production migrations are unapplied");
}
if (!byId["HG-M2"] || byId["HG-M2"].status === "PASS") {
  fails.push("HG-M2 must not be PASS before live payout E2E");
}

if (s5.j0 === "PASS") fails.push("S5 must not declare J0 PASS");
if (s5.productionDeploy !== 0) fails.push("S5 productionDeploy must be 0");
if (migrations.productionApply !== 0) fails.push("staging migrations evidence must keep productionApply=0");
if (migrations.productionFixtureMoved !== false) {
  fails.push("staging apply must not move production fixture");
}
if (migrations.matchProfitExpense !== true) fails.push("staging MATCH_PROFIT_EXPENSE must be true");
if (migrations.productOnboardingTable !== true) fails.push("staging product_onboarding table must be true");

const pending = (fixture.committedUnapplied || []).map((row) =>
  typeof row === "string" ? row : row.version,
);
for (const version of migrations.applied || []) {
  if (!pending.includes(version)) {
    fails.push("production fixture lost committedUnapplied " + version);
  }
}
if (pending.length < 9) fails.push("production committedUnapplied must stay 9 until production apply");

if (!pkg.includes("verify:hard-gate-live")) fails.push("package.json missing verify:hard-gate-live");
if (!catalog.includes("hard-gate-live")) fails.push("CATALOG missing hard-gate-live");
if (!gate.includes("verify:hard-gate-live")) fails.push("gate.yml must run verify:hard-gate-live");
if (!domain.includes("hard-gate-live.cjs")) fails.push("domain-by-path must trigger hard-gate-live");

if (fails.length) {
  console.error("[verify:hard-gate-live] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:hard-gate-live] PASS (defined=" +
    REQUIRED_IDS.length +
    " · passed=" +
    passed.length +
    " · 0/10 stale)",
);

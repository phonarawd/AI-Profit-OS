/**
 * verify:rel-408-security-baseline
 * RLS/role evidence + secrets scan + rollback runbook.
 * EXIT_GATE: 이 슬라이스 apply_migration / production DDL 0.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

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

const fixture = JSON.parse(
  read("tooling/verify/fixtures/rel-408-security-baseline.v1.json") || "{}",
);
const baseline = read("governance/release-master/SECURITY_BASELINE.md");
const rel408Record = read("governance/release-master/REL-408-SECURITY-BASELINE.md");
const runbook = read("governance/release-master/ROLLBACK_RUNBOOK.md");
const versioning = read("governance/release-master/VERSIONING.md");
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");

for (const historicalNeedle of [
  "HISTORICAL_SNAPSHOT_ONLY = 1",
  "CURRENT_RELEASE_AUTHORITY = governance/recovery/founder-action-packet.current.v2.json",
  "CURRENT_REUSE_AS_PRODUCTION_SECURITY_PROOF = FORBIDDEN",
]) {
  if (!baseline.includes(historicalNeedle)) fails.push("SECURITY_BASELINE historical semantics missing " + historicalNeedle);
  if (!rel408Record.includes(historicalNeedle)) fails.push("REL-408 evidence historical semantics missing " + historicalNeedle);
}

if (fixture.projectRef !== "mgsytcetsiecllmhcyox") {
  fails.push("fixture projectRef must stay mgsytcetsiecllmhcyox");
}
if (fixture.rlsOff !== 0) fails.push("fixture rlsOff must be 0");
if (fixture.publicTables !== fixture.rlsOn) {
  fails.push("every measured public table must have RLS ON");
}
if (fixture.anonAuthenticatedPublicGrants !== 0) {
  fails.push("anon/authenticated/PUBLIC grants must be 0");
}
if (fixture.applyMigration !== 0) {
  fails.push("REL-408 applyMigration must be 0");
}

for (const needle of [
  "PRODUCTION_DB_APPLY = 0",
  "APPLY_MIGRATION = 0",
  "public 테이블 | 80",
  "RLS OFF | 0",
  "verify:secrets",
  "ROLLBACK_RUNBOOK.md",
  "EXIT_GATE",
]) {
  if (!baseline.includes(needle)) fails.push("SECURITY_BASELINE missing " + needle);
}

const rel602TodoCompleted = /- id: rel-602\r?\n(?:.*\r?\n){0,3}\s*status: completed/.test(plan);
const rel602FormalIdx = plan.indexOf("ID: REL-602");
const rel602FormalCompleted =
  rel602FormalIdx >= 0 && /STATUS:\s*COMPLETED/.test(plan.slice(rel602FormalIdx, rel602FormalIdx + 300));
const rel602Completed = rel602TodoCompleted || rel602FormalCompleted;

if (rel602Completed) {
  for (const needle of [
    "STATUS = STAGING_PRACTICED",
    "THIS_REL_PRACTICE = 1",
    "REL-602_EVIDENCE = governance/release-master/REL-602-STAGING-ROLLBACK.md",
  ]) {
    if (!runbook.includes(needle)) fails.push("completed REL-602 runbook missing " + needle);
  }
} else {
  if (!runbook.includes("STATUS = DRAFT_FOR_REL_602")) {
    fails.push("pending REL-602 runbook must stay DRAFT_FOR_REL_602");
  }
  if (!runbook.includes("THIS_REL_PRACTICE = 0")) {
    fails.push("pending REL-602 runbook THIS_REL_PRACTICE must stay 0");
  }
}

for (const needle of [
  "PRODUCTION_EXECUTE = 0",
  "pnpm release:id",
  "REL-701",
  "ledger_*` UPDATE",
  "apply_migration",
]) {
  if (!runbook.includes(needle)) fails.push("ROLLBACK_RUNBOOK missing " + needle);
}
if (!versioning.includes("ROLLBACK_CONSUMER = REL-602")) {
  fails.push("VERSIONING must keep REL-602 as rollback consumer");
}

const secrets = spawnSync("node", ["tooling/verify/secrets.cjs"], {
  cwd: root,
  encoding: "utf8",
});
if (secrets.status !== 0) {
  fails.push("verify:secrets must PASS for REL-408");
}

const sqlFiles = [
  "governance/release-master/SECURITY_BASELINE.md",
  "governance/release-master/ROLLBACK_RUNBOOK.md",
  "tooling/verify/rel-408-security-baseline.cjs",
];
for (const rel of sqlFiles) {
  const text = read(rel);
  if (/apply_migration|CREATE TABLE|ALTER TABLE/i.test(text) && rel.endsWith(".cjs") === false) {
    if (/CREATE TABLE|ALTER TABLE/.test(text)) {
      fails.push(rel + " must not ship DDL");
    }
  }
}
if (baseline.includes("apply_migration") === false) {
  fails.push("baseline must name the apply_migration ban");
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
if (!pkg.includes("verify:rel-408-security-baseline")) {
  fails.push("package.json missing verify:rel-408-security-baseline");
}
if (!catalog.includes("rel-408-security-baseline")) {
  fails.push("CATALOG missing rel-408-security-baseline");
}
if (!gate.includes("verify:rel-408-security-baseline")) {
  fails.push("gate.yml must run verify:rel-408-security-baseline");
}

const webAdmin = path.join(root, "apps/web/app/admin");
if (fs.existsSync(webAdmin)) fails.push("apps/web must not grow /admin");

if (fails.length) {
  console.error("[verify:rel-408-security-baseline] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:rel-408-security-baseline] PASS (HISTORICAL 2026-08-23 snapshot only · RLS 80/80 then · current release authority separate · apply 0)",
);

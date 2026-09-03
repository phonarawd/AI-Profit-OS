/**
 * verify:rel-504-migration-readiness
 * READY document + audited migration source parity only. Production DB apply = 0.
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

const fixture = JSON.parse(read("tooling/verify/fixtures/rel-504-migration-readiness.v1.json") || "{}");
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const ready = read("governance/release-master/MIGRATION_READINESS.md");
const cert = read("governance/engine-acceptance/FINAL_ACCEPTANCE.md");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");
const applied = JSON.parse(read("tooling/verify/fixtures/migrations-applied.v1.json") || "{}");

function todoCompleted(relId) {
  const id = relId.replace(/^REL-/i, "rel-").toLowerCase();
  const re = new RegExp("- id: " + id + "\\r?\\n(?:.*\\r?\\n){0,3}\\s*status: (\\w+)");
  const m = plan.match(re);
  return m && m[1] === "completed";
}

function yamlCompleted(relId) {
  const idx = plan.indexOf("ID: " + relId);
  if (idx < 0) return false;
  return /STATUS:\s*COMPLETED/.test(plan.slice(idx, idx + 240));
}

if (fixture.applyMigration !== 0) fails.push("fixture applyMigration must be 0");
if (fixture.productionDbApply !== 0) fails.push("fixture productionDbApply must be 0");
if (fixture.applyLog !== 0) fails.push("fixture applyLog must be 0");
if (fixture.applyOwner !== "REL-701-DB") fails.push("apply owner must stay REL-701-DB");
if (fixture.projectRef !== "mgsytcetsiecllmhcyox") fails.push("fixture projectRef must stay mgsytcetsiecllmhcyox");
if (fixture.blindReplayForbidden !== true) fails.push("blind replay must stay forbidden");
if (fixture.productionMutation !== 0) fails.push("fixture productionMutation must be 0");
const effectPresent = Array.isArray(fixture.schemaEffectPresentLedgerUnrecorded)
  ? fixture.schemaEffectPresentLedgerUnrecorded
  : [];
const effectPending = Array.isArray(fixture.actualEffectPending)
  ? fixture.actualEffectPending
  : [];
if (effectPresent.length !== 10) fails.push("schemaEffectPresentLedgerUnrecorded must contain 10 versions");
if (effectPending.length !== 1 || effectPending[0] !== "20260903092000") {
  fails.push("actualEffectPending must be exactly production_db_hardening");
}
if (!fixture.effectReconciliationEvidence) fails.push("effectReconciliationEvidence missing");
else if (!fs.existsSync(path.join(root, fixture.effectReconciliationEvidence))) {
  fails.push("effect reconciliation evidence file missing");
}

const rebaseRequired = /REBASE_REQUIRED = 1/.test(read("governance/engine-acceptance/FINAL_ACCEPTANCE.md"));
for (const dep of fixture.deps || []) {
  if (dep === "REL-502" && rebaseRequired) continue;
  if (!todoCompleted(dep)) fails.push("EXIT_GATE: plan todo not completed " + dep);
  if (!yamlCompleted(dep)) fails.push("EXIT_GATE: YAML STATUS not COMPLETED " + dep);
}

for (const needle of [
  "STATUS = COMPLETED",
  "READY = 1",
  "PRODUCTION_DB_APPLY = 0",
  "APPLY_MIGRATION = 0",
  "APPLY_LOG = 0",
  "APPLY_OWNER = REL-701-DB",
  "PROJECT_REF = mgsytcetsiecllmhcyox",
  "PRIMARY_SCHEMA_EFFECT_PRESENT_LEDGER_UNRECORDED = 10",
  "ACTUAL_EFFECT_PENDING = 1",
  "BLIND_REPLAY_FORBIDDEN = 1",
]) {
  if (!ready.includes(needle)) fails.push("readiness doc missing " + needle);
}

// Preserve the original hard stop: the readiness evidence may describe the
// owner, but it must never contain an executable apply_migration invocation.
if (/apply_migration\s*\(/.test(ready)) {
  fails.push("readiness doc must not invoke apply_migration");
}
if (/APPLY_LOG = 1/.test(ready) || /PRODUCTION_DB_APPLY = 1/.test(ready)) {
  fails.push("readiness doc flipped apply bits");
}
if (!/BLIND_REPLAY_FORBIDDEN/.test(plan) || !/PRODUCTION_DB_EFFECT_RECONCILIATION_AND_APPLY/.test(plan)) {
  fails.push("REL-701-DB plan must require effect reconciliation and forbid blind replay");
}
if (/PRODUCTION_MIGRATION_APPLY: source_observations\/canonical_products\/match_results 원격 Supabase 반영/.test(plan)) {
  fails.push("stale REL-701-DB blind apply wording reintroduced");
}

const migDir = path.join(root, "supabase", "migrations");
const localFiles = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql"));
if (!ready.includes("LOCAL_MIGRATION_FILES = " + localFiles.length)) {
  fails.push("readiness LOCAL_MIGRATION_FILES stale vs " + localFiles.length);
}
if (!ready.includes("REMOTE_APPLIED_SNAPSHOT = " + applied.versions.length)) {
  fails.push("readiness REMOTE_APPLIED_SNAPSHOT stale");
}
if (!Number.isInteger(applied.remoteRawAppliedCount) || applied.remoteRawAppliedCount < 1) {
  fails.push("fixture remoteRawAppliedCount missing/invalid");
} else if (!ready.includes("REMOTE_RAW_APPLIED = " + applied.remoteRawAppliedCount)) {
  fails.push("readiness REMOTE_RAW_APPLIED stale");
}
if (!ready.includes("COMMITTED_UNAPPLIED = " + applied.committedUnapplied.length)) {
  fails.push("readiness COMMITTED_UNAPPLIED stale");
}

for (const ver of fixture.trackAVersions || []) {
  const hit = localFiles.some((f) => f.startsWith(ver + "_"));
  if (!hit) fails.push("Track A migration missing locally: " + ver);
  if (!(applied.committedUnapplied || []).includes(ver)) {
    fails.push("Track A version must stay committedUnapplied until REL-701-DB: " + ver);
  }
}
if (!fs.existsSync(path.join(root, fixture.trackAReprice))) {
  fails.push("Track A reprice service missing: " + fixture.trackAReprice);
}

if (rebaseRequired) {
  if (!/STATUS = NOT_ISSUED/.test(cert) || !/CERT_ISSUED = 0/.test(cert)) {
    fails.push("rebase-required cert must be NOT_ISSUED");
  }
} else if (!/STATUS = ISSUED/.test(cert) || !/CERT_ISSUED = 1/.test(cert)) {
  fails.push("REL-502 cert must be ISSUED before READY");
}

if (!pkg.includes("verify:rel-504-migration-readiness")) fails.push("package.json missing verify:rel-504-migration-readiness");
if (!catalog.includes("rel-504-migration-readiness")) fails.push("CATALOG missing rel-504-migration-readiness");
if (!gate.includes("verify:rel-504-migration-readiness")) fails.push("gate.yml must run verify:rel-504-migration-readiness");
if (!domain.includes("rel-504-migration-readiness.cjs")) fails.push("domain-by-path must trigger rel-504");

if (fails.length === 0) {
  for (const script of fixture.extraVerifies || []) {
    const run = spawnSync(process.execPath, [path.join(root, "tooling/verify", script)], {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
    });
    if (run.status !== 0) {
      fails.push("re-run FAIL " + script + ": " + String(run.stderr || run.stdout || "").split("\n")[0]);
    }
  }
}

if (fails.length) {
  console.error("[verify:rel-504-migration-readiness] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  `[verify:rel-504-migration-readiness] PASS (READY · ${localFiles.length} local · ${applied.versions.length} canonical applied · ${applied.remoteRawAppliedCount} remote raw · apply 0 · REL-701-DB owner)`,
);

/**
 * QA1 — DB consistency (정적 · Docker OFF 로컬)
 * live SQL 강제 금지 · migrations + ledger guards + 기존 bucket-invariant oracle
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("../lib/hash-scope.cjs");
const { spawnVerify } = require("../lib/spawn-verify.cjs");

const REQUIRED_MIGRATIONS = [
  "supabase/migrations/20260808205846_ledger_accounts_journals.sql",
  "supabase/migrations/20260808205901_rls_ledger_guards.sql",
  "supabase/migrations/20260811062000_idempotency_request_fingerprint.sql",
];

const REQUIRED_NEEDLES = [
  {
    file: "supabase/migrations/20260808205901_rls_ledger_guards.sql",
    needles: ["ledger_forbid_mutation", "ledger_require_posting_flag"],
  },
  {
    file: "supabase/migrations/20260811062000_idempotency_request_fingerprint.sql",
    needles: ["request_fingerprint", "ledger_journals", "participate_requests"],
  },
  {
    file: "supabase/migrations/20260808205846_ledger_accounts_journals.sql",
    needles: ["ledger_accounts", "ledger_journals", "ledger_entries"],
  },
];

function listMigrations() {
  const dir = path.join(ROOT, "supabase/migrations");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

function runDbConsistency() {
  const findings = [];
  const migrations = listMigrations();
  if (migrations.length < 1) findings.push("no migrations under supabase/migrations");

  for (const rel of REQUIRED_MIGRATIONS) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      findings.push(`missing required migration ${rel}`);
    }
  }

  for (const row of REQUIRED_NEEDLES) {
    const abs = path.join(ROOT, row.file);
    if (!fs.existsSync(abs)) continue;
    const body = fs.readFileSync(abs, "utf8");
    for (const n of row.needles) {
      if (!body.includes(n)) findings.push(`${row.file} missing needle: ${n}`);
    }
  }

  // live DB probe — 로컬 기본 NOT_RUN (원격 강제·Docker 금지)
  const liveProbe = {
    status: "NOT_RUN",
    reason:
      "QA1 local deterministic path = static migrations + bucket-invariant; live SQL optional via CI only",
  };

  const bucket = spawnVerify("tooling/verify/bucket-invariant.cjs");
  if (!bucket.ok) {
    findings.push(`verify:bucket-invariant exit=${bucket.exitCode}`);
  }

  const staticOk = findings.length === 0;
  const status = staticOk && bucket.ok ? "PASS" : "FAIL";

  return {
    check_id: "QA1_DB_CONSISTENCY",
    status,
    invariant_id: "INV-LEDGER-01",
    migrationCount: migrations.length,
    migrations,
    live_db_probe: liveProbe,
    child_verifies: [bucket],
    findings,
  };
}

module.exports = { runDbConsistency };

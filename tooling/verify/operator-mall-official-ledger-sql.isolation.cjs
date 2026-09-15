"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const official = require("./operator-mall-official-ledger-sql.cjs");

const root = path.resolve(__dirname, "../..");
const ledgerFile = "supabase/migrations/20260808205846_ledger_accounts_journals.sql";
const text = fs.readFileSync(path.join(root, ledgerFile), "utf8");
const stmts = official.splitSqlRespectingDollar(text);
const fn = stmts.find((s) => s.includes("provision_user_bucket_accounts"));
assert.ok(fn, "official function statement missing");
assert.ok(fn.includes("ON CONFLICT (owner_user_id, bucket) DO NOTHING"), "function body split");
assert.equal(fn.includes("CREATE TABLE public.ledger_journals"), false);

const slices = official.officialSlices();
official.assertNoInventedLedgerTable(slices);
assert.ok(slices.every((s) => s.rel.startsWith("supabase/migrations/")));
const createJournal = slices
  .flatMap((s) => s.statements)
  .find((s) => /create table public\.ledger_journals/i.test(s));
assert.ok(createJournal, "official ledger_journals CREATE missing");
assert.ok(createJournal.includes("idempotency_key"));
const invented = slices
  .flatMap((s) => s.statements)
  .some((s) => /operator_mall_settlement_journals/i.test(s));
assert.equal(invented, false);

const fp = official.pickStatements(
  "supabase/migrations/20260811062000_idempotency_request_fingerprint.sql",
  "ledger_journals_only",
  official.splitSqlRespectingDollar(
    fs.readFileSync(
      path.join(root, "supabase/migrations/20260811062000_idempotency_request_fingerprint.sql"),
      "utf8",
    ),
  ),
);
assert.ok(fp.some((s) => s.includes("request_fingerprint")));
assert.equal(
  fp.some((s) => s.toLowerCase().includes("participate_requests")),
  false,
);

const guardFile = "supabase/migrations/20260808205901_rls_ledger_guards.sql";
const guardStmts = official.pickStatements(
  guardFile,
  "ledger_posting_guards",
  official.splitSqlRespectingDollar(fs.readFileSync(path.join(root, guardFile), "utf8")),
);
assert.ok(guardStmts.some((s) => s.includes("CREATE OR REPLACE FUNCTION public.ledger_require_posting_flag")));
assert.equal(guardStmts.some((s) => /^\s*balance only/i.test(s)), false);

console.log("[operator-mall-official-ledger-sql.isolation] PASS official_slices_only");

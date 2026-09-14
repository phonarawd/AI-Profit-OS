/**
 * GHA 일회용 PG에 레포 공식 ledger migration 조각을 적용한다.
 * 모양만 같은 임시 원장 표를 만들지 않는다. 운영 DB 적용 금지.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

const OFFICIAL = Object.freeze([
  {
    rel: "supabase/migrations/20260808205846_ledger_accounts_journals.sql",
    pick: "all",
  },
  {
    rel: "supabase/migrations/20260811062100_ledger_outbox_events.sql",
    pick: "all",
  },
  {
    rel: "supabase/migrations/20260811062000_idempotency_request_fingerprint.sql",
    pick: "ledger_journals_only",
  },
  {
    rel: "supabase/migrations/20260809042549_mission_auto_accrual_fanout.sql",
    pick: "ledger_journals_type_check",
  },
  {
    rel: "supabase/migrations/20260808205901_rls_ledger_guards.sql",
    pick: "ledger_posting_guards",
  },
  {
    rel: "supabase/migrations/20260809102109_simulation_engine_m05_platform_reserve.sql",
    pick: "ledger_reserve_account",
  },
]);

const IGNORE_SQLSTATE = new Set([
  "42P07",
  "42710",
  "42701",
  "42P16",
  "42704",
  "23505",
]);

function splitSqlRespectingDollar(text) {
  const src = String(text || "");
  const stmts = [];
  let cur = "";
  let i = 0;
  let dollarTag = null;
  let inSingle = false;
  while (i < src.length) {
    if (dollarTag) {
      if (src.startsWith(dollarTag, i)) {
        cur += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      cur += src[i];
      i += 1;
      continue;
    }
    if (inSingle) {
      if (src[i] === "'") {
        if (src[i + 1] === "'") {
          cur += "''";
          i += 2;
          continue;
        }
        inSingle = false;
      }
      cur += src[i];
      i += 1;
      continue;
    }
    if (src[i] === "'") {
      inSingle = true;
      cur += src[i];
      i += 1;
      continue;
    }
    if (src[i] === "$") {
      const m = src.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (m) {
        dollarTag = m[0];
        cur += m[0];
        i += m[0].length;
        continue;
      }
    }
    if (src[i] === ";") {
      stmts.push(cur.trim());
      cur = "";
      i += 1;
      continue;
    }
    cur += src[i];
    i += 1;
  }
  if (cur.trim()) stmts.push(cur.trim());
  return stmts.filter((s) => {
    if (!s) return false;
    const body = s
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("--"));
    return body.length > 0;
  });
}

function pickStatements(rel, pick, stmts) {
  if (pick === "all") return stmts;
  if (pick === "ledger_journals_only") {
    return stmts.filter((s) => {
      const low = s.toLowerCase();
      return low.includes("ledger_journals") && !low.includes("participate_requests");
    });
  }
  if (pick === "ledger_journals_type_check") {
    return stmts.filter((s) => {
      const low = s.toLowerCase();
      return (
        low.includes("ledger_journals") &&
        (low.includes("journal_type_check") || low.includes("journal_type in"))
      );
    });
  }
  if (pick === "ledger_posting_guards") {
    return stmts.filter((s) => {
      const low = s.toLowerCase();
      return (
        low.includes("ledger_require_posting_flag") ||
        low.includes("ledger_forbid_mutation") ||
        low.includes("ledger_accounts_balance_guard") ||
        low.includes("ledger_journals_immutable") ||
        low.includes("ledger_entries_immutable")
      );
    });
  }
  if (pick === "ledger_reserve_account") {
    return stmts.filter((s) => {
      const low = s.toLowerCase();
      return (
        low.includes("insert into public.ledger_accounts") &&
        low.includes("ops.platform_reserve_usdt")
      );
    });
  }
  throw new Error("unknown official ledger pick: " + pick + " in " + rel);
}

function officialSlices() {
  return OFFICIAL.map((item) => {
    const abs = path.join(ROOT, item.rel);
    const text = fs.readFileSync(abs, "utf8");
    const stmts = pickStatements(item.rel, item.pick, splitSqlRespectingDollar(text));
    return {
      rel: item.rel,
      pick: item.pick,
      officialPath: item.rel,
      statements: stmts,
    };
  });
}

function assertNoInventedLedgerTable(slices) {
  for (const slice of slices) {
    for (const stmt of slice.statements) {
      const low = stmt.toLowerCase();
      if (low.includes("create table") && low.includes("ledger_")) {
        if (!slice.rel.startsWith("supabase/migrations/")) {
          throw new Error("invented ledger table outside official migrations");
        }
      }
    }
  }
}

async function applyOfficialLedgerSchema(db) {
  if (!db || typeof db.query !== "function") {
    throw new Error("official ledger apply needs isolated db.query");
  }
  const slices = officialSlices();
  assertNoInventedLedgerTable(slices);
  for (const slice of slices) {
    for (const stmt of slice.statements) {
      try {
        await db.query(stmt);
      } catch (err) {
        const code = err && err.code;
        if (IGNORE_SQLSTATE.has(code)) continue;
        const e = new Error(
          "official ledger SQL failed in " + slice.rel + ": " + String((err && err.message) || err),
        );
        e.code = "OFFICIAL_LEDGER_SQL_FAILED";
        e.cause = err;
        throw e;
      }
    }
  }
  return { ok: true, files: slices.map((s) => s.rel) };
}

module.exports = {
  OFFICIAL,
  IGNORE_SQLSTATE,
  splitSqlRespectingDollar,
  pickStatements,
  officialSlices,
  assertNoInventedLedgerTable,
  applyOfficialLedgerSchema,
};

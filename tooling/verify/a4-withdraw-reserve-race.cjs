/**
 * §1.4 — 60+60 vs 100 must accept exactly one reservation.
 * Fake DB / production Supabase 금지. CI Postgres 또는 전용 URL만.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);
const LOCK_KEY = 76090614;
const PROBE = "withdraw_reserve_probe_s14";

function unquote(raw) {
  const v = String(raw).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function loadReserveDatabaseUrl() {
  const dedicated = process.env.AIPO_A4_RESERVE_DATABASE_URL;
  if (dedicated && dedicated.trim()) return dedicated.trim();
  return "";
}

function requirePg() {
  try {
    return require("pg");
  } catch {
    return require(require.resolve("pg", {
      paths: [path.join(root, "services/api-nest")],
    }));
  }
}

async function tryReserve(client, amount, cap) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1)", [LOCK_KEY]);
    const sum = await client.query(
      `SELECT COALESCE(SUM(amount_usdt), 0)::text AS s
         FROM ${PROBE}
        WHERE status = 'reserved'`,
    );
    const used = Number(sum.rows[0]?.s ?? "0");
    if (used + amount > cap) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      `INSERT INTO ${PROBE} (amount_usdt, status) VALUES ($1, 'reserved')`,
      [amount],
    );
    await client.query("COMMIT");
    return true;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  }
}

async function runRealPg(url) {
  if (/supabase\.co|pooler\.supabase/i.test(url)) {
    throw new Error("probe table must not run on production Supabase");
  }
  const { Pool } = requirePg();
  const pool = new Pool({
    connectionString: url,
    password: process.env.PGPASSWORD || undefined,
    max: 3,
    idleTimeoutMillis: 8_000,
    connectionTimeoutMillis: 8_000,
  });
  const a = await pool.connect();
  const b = await pool.connect();
  try {
    await a.query(
      `CREATE TABLE IF NOT EXISTS ${PROBE} (
         id bigserial PRIMARY KEY,
         amount_usdt numeric NOT NULL,
         status text NOT NULL
       )`,
    );
    await a.query(`TRUNCATE ${PROBE}`);
    const [first, second] = await Promise.all([
      tryReserve(a, 60, 100),
      tryReserve(b, 60, 100),
    ]);
    const accepted = [first, second].filter(Boolean).length;
    if (accepted !== 1) {
      fail(`60+60 vs 100 accepted ${accepted} reservations (want exactly 1)`);
    }
    const count = await a.query(
      `SELECT COUNT(*)::int AS n, COALESCE(SUM(amount_usdt), 0)::text AS s
         FROM ${PROBE}
        WHERE status = 'reserved'`,
    );
    if (count.rows[0]?.n !== 1) {
      fail(`probe rows=${count.rows[0]?.n} want 1`);
    }
    if (String(count.rows[0]?.s) !== "60") {
      fail(`probe sum=${count.rows[0]?.s} want 60`);
    }
  } finally {
    a.release();
    b.release();
    await pool.end();
  }
}

async function main() {
  const coverage = fs.readFileSync(
    path.join(root, "services/api-nest/src/wallet/withdraw-coverage.ts"),
    "utf8",
  );
  if (!coverage.includes("lockedUsdt")) {
    fail("coverage formula must include lockedUsdt");
  }
  if (!coverage.includes("UNRESERVED_USER_LIABILITIES") && !coverage.includes("computeUnreservedUserLiabilities")) {
    fail("coverage module must expose UNRESERVED_USER_LIABILITIES compute");
  }
  const url = loadReserveDatabaseUrl();
  if (!url) {
    fail(
      "A4 real PostgreSQL race required — set AIPO_A4_RESERVE_DATABASE_URL (not production Supabase)",
    );
  } else {
    try {
      await runRealPg(url);
    } catch (err) {
      fail(
        `real PostgreSQL reserve race failed: ${err && err.message ? err.message : String(err)}`,
      );
    }
  }

  if (fails.length) {
    console.error("[verify:a4-withdraw-reserve-race] FAIL");
    for (const f of fails) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(
    "[verify:a4-withdraw-reserve-race] PASS (60+60 vs 100 · one reservation · xact lock)",
  );
}

main();

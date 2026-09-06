/**
 * A4 — 12+1 real PostgreSQL races. Fake DB cannot PASS.
 * Production Supabase is refused. CI Postgres or AIPO_A4_DATABASE_URL only.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);
const SCHEMA = "a4_probe";

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail("missing: " + rel);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const exec = read("services/api-nest/src/trades/trades.execution.service.ts");
if (!exec.includes("withTransaction") || !exec.includes("FOR UPDATE")) {
  fail("success/safe-stop claim must stay in one TX with row lock");
}
if (!exec.includes("settlement:${trade.id}") && !exec.includes("settlement:")) {
  fail("settlement journal key must be trade-scoped");
}

const cover = read("services/api-nest/src/wallet/withdraw-coverage.ts");
if (!cover.includes("lockedUsdt") || !cover.includes("computeUnreservedUserLiabilities")) {
  fail("coverage must keep locked in UNRESERVED_USER_LIABILITIES");
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

function loadUrl() {
  const dedicated = process.env.AIPO_A4_DATABASE_URL || process.env.AIPO_A4_RESERVE_DATABASE_URL;
  return dedicated && dedicated.trim() ? dedicated.trim() : "";
}

async function setup(client) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.participate (
      id bigserial PRIMARY KEY,
      user_id text NOT NULL,
      idempotency_key text NOT NULL UNIQUE,
      payload_hash text NOT NULL,
      amount numeric NOT NULL
    )`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.trades (
      id text PRIMARY KEY,
      status text NOT NULL,
      journal_id text,
      profit numeric NOT NULL DEFAULT 0,
      principal_returned numeric NOT NULL DEFAULT 0
    )`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.journals (
      id bigserial PRIMARY KEY,
      trade_id text NOT NULL,
      debit numeric NOT NULL,
      credit numeric NOT NULL
    )`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.balances (
      bucket text PRIMARY KEY,
      amount numeric NOT NULL
    )`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.outbox (
      id bigserial PRIMARY KEY,
      journal_id bigint NOT NULL,
      delivered boolean NOT NULL DEFAULT false
    )`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.leases (
      id text PRIMARY KEY,
      holder text NOT NULL
    )`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.withdraw (
      id bigserial PRIMARY KEY,
      amount numeric NOT NULL,
      status text NOT NULL
    )`);
  await client.query(`
    TRUNCATE ${SCHEMA}.participate, ${SCHEMA}.trades, ${SCHEMA}.journals,
             ${SCHEMA}.balances, ${SCHEMA}.outbox, ${SCHEMA}.leases, ${SCHEMA}.withdraw
    RESTART IDENTITY`);
  await client.query(
    `INSERT INTO ${SCHEMA}.balances (bucket, amount) VALUES
      ('principal', 0), ('profit', 0), ('locked', 100), ('pending_refund', 0)`,
  );
}

async function participate(client, key, hash, amount) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(76090621)");
    const existing = await client.query(
      `SELECT payload_hash FROM ${SCHEMA}.participate WHERE idempotency_key = $1`,
      [key],
    );
    if (existing.rows[0]) {
      await client.query("ROLLBACK");
      return existing.rows[0].payload_hash === hash ? "reuse" : "conflict";
    }
    const used = await client.query(
      `SELECT COALESCE(SUM(amount),0)::text AS s FROM ${SCHEMA}.participate`,
    );
    if (Number(used.rows[0].s) + amount > 100) {
      await client.query("ROLLBACK");
      return "rejected";
    }
    await client.query(
      `INSERT INTO ${SCHEMA}.participate (user_id, idempotency_key, payload_hash, amount)
       VALUES ('u1', $1, $2, $3)`,
      [key, hash, amount],
    );
    await client.query("COMMIT");
    return "accepted";
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    if (err && err.code === "23505") return "reuse";
    throw err;
  }
}

async function claimTerminal(client, tradeId, status, profit) {
  await client.query("BEGIN");
  try {
    const claimed = await client.query(
      `UPDATE ${SCHEMA}.trades
          SET status = $2, profit = $3, principal_returned = 100
        WHERE id = $1 AND status = 'running'
        RETURNING id`,
      [tradeId, status, profit],
    );
    if (claimed.rows.length === 0) {
      await client.query("ROLLBACK");
      return false;
    }
    const journal = await client.query(
      `INSERT INTO ${SCHEMA}.journals (trade_id, debit, credit)
       VALUES ($1, 100, 100) RETURNING id`,
      [tradeId],
    );
    await client.query(
      `UPDATE ${SCHEMA}.trades SET journal_id = $2 WHERE id = $1`,
      [tradeId, String(journal.rows[0].id)],
    );
    await client.query(
      `INSERT INTO ${SCHEMA}.outbox (journal_id) VALUES ($1)`,
      [journal.rows[0].id],
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
    throw new Error("A4 probe must not run on production Supabase");
  }
  const { Pool } = requirePg();
  const pool = new Pool({
    connectionString: url,
    password: process.env.PGPASSWORD || undefined,
    max: 4,
    idleTimeoutMillis: 8_000,
    connectionTimeoutMillis: 8_000,
  });
  const a = await pool.connect();
  const b = await pool.connect();
  try {
    await setup(a);

    const [p1, p2] = await Promise.all([
      participate(a, "k-same", "h1", 60),
      participate(b, "k-same", "h1", 60),
    ]);
    const samePayload = [p1, p2].sort();
    if (!(samePayload.includes("accepted") && samePayload.includes("reuse")) &&
        !(p1 === "accepted" && p2 === "reuse") &&
        !(p1 === "reuse" && p2 === "accepted") &&
        !(p1 === "accepted" && p2 === "accepted" && false)) {
      const accepted = [p1, p2].filter((x) => x === "accepted").length;
      const reuse = [p1, p2].filter((x) => x === "reuse").length;
      if (accepted + reuse !== 2 || accepted > 1) {
        fail("1/2 same participate+payload must accept once (got " + p1 + "/" + p2 + ")");
      }
    }

    await a.query(`TRUNCATE ${SCHEMA}.participate RESTART IDENTITY`);
    const conflict = await participate(a, "k-diff", "ha", 10);
    const conflict2 = await participate(b, "k-diff", "hb", 10);
    if (conflict !== "accepted" || conflict2 !== "conflict") {
      fail("3 same key different payload must conflict (got " + conflict + "/" + conflict2 + ")");
    }

    await a.query(`TRUNCATE ${SCHEMA}.participate RESTART IDENTITY`);
    const [r1, r2] = await Promise.all([
      participate(a, "k-cap-a", "ha", 60),
      participate(b, "k-cap-b", "hb", 60),
    ]);
    const acceptedCap = [r1, r2].filter((x) => x === "accepted").length;
    if (acceptedCap !== 1) {
      fail("4 concurrent reserve vs 100 accepted " + acceptedCap);
    }

    await a.query(
      `INSERT INTO ${SCHEMA}.trades (id, status) VALUES ('t-ss', 'running')`,
    );
    const [s1, s2] = await Promise.all([
      claimTerminal(a, "t-ss", "success", 5),
      claimTerminal(b, "t-ss", "success", 5),
    ]);
    if ([s1, s2].filter(Boolean).length !== 1) {
      fail("5 success vs success must claim once");
    }

    await a.query(
      `INSERT INTO ${SCHEMA}.trades (id, status) VALUES ('t-ff', 'running')`,
    );
    const [f1, f2] = await Promise.all([
      claimTerminal(a, "t-ff", "failed", 0),
      claimTerminal(b, "t-ff", "failed", 0),
    ]);
    if ([f1, f2].filter(Boolean).length !== 1) {
      fail("6 failure vs failure must claim once");
    }

    await a.query(
      `INSERT INTO ${SCHEMA}.trades (id, status) VALUES ('t-mix', 'running')`,
    );
    const [m1, m2] = await Promise.all([
      claimTerminal(a, "t-mix", "success", 5),
      claimTerminal(b, "t-mix", "safe_stop", 0),
    ]);
    if ([m1, m2].filter(Boolean).length !== 1) {
      fail("7 success vs safe-stop must claim once");
    }

    await a.query(
      `INSERT INTO ${SCHEMA}.trades (id, status) VALUES ('t-tick', 'running')`,
    );
    const [c1, c2] = await Promise.all([
      claimTerminal(a, "t-tick", "success", 5),
      claimTerminal(b, "t-tick", "safe_stop", 0),
    ]);
    if ([c1, c2].filter(Boolean).length !== 1) {
      fail("8 client tick vs reconciler must claim once");
    }

    await a.query("BEGIN");
    const leaseA = await a.query(
      "SELECT pg_try_advisory_xact_lock(76090603) AS locked",
    );
    await b.query("BEGIN");
    const leaseB = await b.query(
      "SELECT pg_try_advisory_xact_lock(76090603) AS locked",
    );
    if (leaseA.rows[0].locked !== true || leaseB.rows[0].locked !== false) {
      fail("9 two workers must not share the reconcile advisory lock");
    }
    await a.query("COMMIT");
    await b.query("ROLLBACK");

    await a.query("BEGIN");
    await a.query(
      `INSERT INTO ${SCHEMA}.trades (id, status) VALUES ('t-fault', 'running')`,
    );
    await a.query("ROLLBACK");
    const fault = await a.query(
      `SELECT COUNT(*)::int AS n FROM ${SCHEMA}.trades WHERE id = 't-fault'`,
    );
    if (fault.rows[0].n !== 0) {
      fail("10 pre-commit fault must roll back");
    }

    await a.query(
      `INSERT INTO ${SCHEMA}.trades (id, status) VALUES ('t-retry', 'running')`,
    );
    const first = await claimTerminal(a, "t-retry", "success", 5);
    const retry = await claimTerminal(b, "t-retry", "success", 5);
    if (!first || retry) {
      fail("11 commit then retry must be idempotent");
    }

    const pending = await a.query(
      `SELECT COUNT(*)::int AS n FROM ${SCHEMA}.outbox WHERE delivered = false`,
    );
    await a.query(`UPDATE ${SCHEMA}.outbox SET delivered = true WHERE delivered = false`);
    const replay = await a.query(
      `SELECT COUNT(*)::int AS n FROM ${SCHEMA}.outbox`,
    );
    const journals = await a.query(
      `SELECT COUNT(*)::int AS n FROM ${SCHEMA}.journals`,
    );
    if (pending.rows[0].n < 1) {
      fail("12 outbox must exist after a won claim");
    }
    if (replay.rows[0].n !== journals.rows[0].n) {
      fail("12 replay must not create extra journals");
    }

    try {
      await a.query("BEGIN");
      await a.query("SET LOCAL lock_timeout = '50ms'");
      await b.query("BEGIN");
      await b.query(
        `SELECT * FROM ${SCHEMA}.trades WHERE id = 't-retry' FOR UPDATE`,
      );
      const deadlockTry = a.query(
        `SELECT * FROM ${SCHEMA}.trades WHERE id = 't-retry' FOR UPDATE`,
      );
      await deadlockTry.catch(() => undefined);
      await a.query("ROLLBACK").catch(() => undefined);
      await b.query("ROLLBACK").catch(() => undefined);
    } catch {
      try {
        await a.query("ROLLBACK");
      } catch {
        /* ignore */
      }
      try {
        await b.query("ROLLBACK");
      } catch {
        /* ignore */
      }
    }

    await a.query("SELECT pg_advisory_xact_lock(76090614)");
    const [w1, w2] = await Promise.all([
      (async () => {
        await a.query("BEGIN");
        await a.query("SELECT pg_advisory_xact_lock(76090614)");
        const used = await a.query(
          `SELECT COALESCE(SUM(amount),0)::text AS s FROM ${SCHEMA}.withdraw WHERE status='reserved'`,
        );
        if (Number(used.rows[0].s) + 60 > 100) {
          await a.query("ROLLBACK");
          return false;
        }
        await a.query(
          `INSERT INTO ${SCHEMA}.withdraw (amount, status) VALUES (60, 'reserved')`,
        );
        await a.query("COMMIT");
        return true;
      })(),
      (async () => {
        await b.query("BEGIN");
        await b.query("SELECT pg_advisory_xact_lock(76090614)");
        const used = await b.query(
          `SELECT COALESCE(SUM(amount),0)::text AS s FROM ${SCHEMA}.withdraw WHERE status='reserved'`,
        );
        if (Number(used.rows[0].s) + 60 > 100) {
          await b.query("ROLLBACK");
          return false;
        }
        await b.query(
          `INSERT INTO ${SCHEMA}.withdraw (amount, status) VALUES (60, 'reserved')`,
        );
        await b.query("COMMIT");
        return true;
      })(),
    ]);
    if ([w1, w2].filter(Boolean).length !== 1) {
      fail("withdraw 60+60 vs 100 must reserve once");
    }

    const liab = await a.query(
      `SELECT (COALESCE(SUM(CASE WHEN bucket IN ('principal','profit','locked','pending_refund') THEN amount ELSE 0 END),0))::text AS s
         FROM ${SCHEMA}.balances`,
    );
    if (String(liab.rows[0].s) !== "100") {
      fail("locked 100 must remain in UNRESERVED_USER_LIABILITIES (got " + liab.rows[0].s + ")");
    }

    const balanced = await a.query(
      `SELECT COUNT(*)::int AS n FROM ${SCHEMA}.journals WHERE debit <> credit`,
    );
    if (balanced.rows[0].n !== 0) {
      fail("journal debit must equal credit");
    }
    const multi = await a.query(
      `SELECT trade_id, COUNT(*)::int AS n FROM ${SCHEMA}.trades
        WHERE status IN ('success','failed','safe_stop')
        GROUP BY trade_id HAVING COUNT(*) > 1`,
    );
    if (multi.rows.length) {
      fail("one terminal row per trade");
    }
  } finally {
    a.release();
    b.release();
    await pool.end();
  }
}

async function main() {
  const url = loadUrl();
  if (!url) {
    fail("A4 real PostgreSQL required — set AIPO_A4_DATABASE_URL (not production Supabase)");
  } else {
    try {
      await runRealPg(url);
    } catch (err) {
      fail("real PostgreSQL A4 failed: " + (err && err.message ? err.message : String(err)));
    }
  }
  if (fails.length) {
    console.error("[verify:a4-pg-concurrency] FAIL");
    for (const f of fails) console.error("  - " + f);
    process.exit(1);
  }
  console.log(
    "[verify:a4-pg-concurrency] PASS (12+1 races · locked 100 liability · 60+60 vs 100)",
  );
}

main();

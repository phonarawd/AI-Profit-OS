/**
 * A3 — session advisory lock must live on one physical PostgreSQL session.
 * Fake DB cannot PASS this script. Two independent PoolClients compete.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);

const TEST_LOCK_KEY = 76090699;

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const svc = read("services/api-nest/src/trades/trades.execution.service.ts");
const pg = read("services/api-nest/src/db/postgres.ts");
if (!pg.includes("async withClient<") && !pg.includes("async withClient(")) {
  fail("PostgresService must expose withClient (same physical session)");
}
if (!svc.includes("this.db.withClient")) {
  fail("reconcileStuckTrades must call this.db.withClient");
}
const reconcileFn = svc.match(
  /async reconcileStuckTrades\([\s\S]*?\n  async get\(/,
);
if (!reconcileFn) {
  fail("could not isolate reconcileStuckTrades");
} else if (reconcileFn[0].includes("this.db.query")) {
  fail("reconcileStuckTrades still uses this.db.query — pool.query is another session");
}

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

function loadLockDatabaseUrl() {
  const dedicated = process.env.AIPO_A3_LOCK_DATABASE_URL;
  if (dedicated && dedicated.trim()) return dedicated.trim();
  const dbKey = "DATABASE_" + "URL";
  if (process.env[dbKey] && process.env[dbKey].trim()) {
    return process.env[dbKey].trim();
  }
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return "";
  const text = fs.readFileSync(envPath, "utf8");
  const prefix = dbKey + "=";
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith(prefix)) return unquote(line.slice(prefix.length));
  }
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

function sslFor(url) {
  return /supabase\.co|pooler\.supabase/i.test(url)
    ? { rejectUnauthorized: false }
    : undefined;
}

async function runRealPg(url) {
  const { Pool } = requirePg();
  const pool = new Pool({
    connectionString: url,
    password: process.env.PGPASSWORD || undefined,
    max: 3,
    idleTimeoutMillis: 8_000,
    connectionTimeoutMillis: 8_000,
    ssl: sslFor(url),
  });
  const a = await pool.connect();
  const b = await pool.connect();
  const key = TEST_LOCK_KEY;
  try {
    await a.query("SELECT pg_advisory_unlock($1)", [key]).catch(() => {});
    await b.query("SELECT pg_advisory_unlock($1)", [key]).catch(() => {});

    const first = await a.query("SELECT pg_try_advisory_lock($1) AS locked", [key]);
    const second = await b.query("SELECT pg_try_advisory_lock($1) AS locked", [
      key,
    ]);
    if (first.rows[0]?.locked !== true) {
      fail("first PoolClient failed to acquire pg_try_advisory_lock");
    }
    if (second.rows[0]?.locked !== false) {
      fail(
        "second independent PoolClient also acquired the lock — session lock is not exclusive",
      );
    }

    const unlockOther = await b.query(
      "SELECT pg_advisory_unlock($1) AS unlocked",
      [key],
    );
    if (unlockOther.rows[0]?.unlocked === true) {
      fail("unlock on a different session released the holder lock");
    }
    const stillBlocked = await b.query(
      "SELECT pg_try_advisory_lock($1) AS locked",
      [key],
    );
    if (stillBlocked.rows[0]?.locked !== false) {
      fail("holder lock vanished after unlock on the other connection");
    }

    const released = await a.query("SELECT pg_advisory_unlock($1) AS unlocked", [
      key,
    ]);
    if (released.rows[0]?.unlocked !== true) {
      fail("holder PoolClient could not unlock its own session lock");
    }
    const after = await b.query("SELECT pg_try_advisory_lock($1) AS locked", [
      key,
    ]);
    if (after.rows[0]?.locked !== true) {
      fail("second client could not acquire the lock after holder unlock");
    }
    await b.query("SELECT pg_advisory_unlock($1)", [key]);
  } finally {
    try {
      await a.query("SELECT pg_advisory_unlock_all()");
    } catch {
      /* ignore */
    }
    try {
      await b.query("SELECT pg_advisory_unlock_all()");
    } catch {
      /* ignore */
    }
    a.release();
    b.release();
    await pool.end();
  }
}

async function main() {
  const url = loadLockDatabaseUrl();
  if (!url) {
    fail(
      "A3 real PostgreSQL competition required — set AIPO_A3_LOCK_DATABASE_URL or DATABASE_URL (Fake DB is not enough)",
    );
  } else {
    try {
      await runRealPg(url);
    } catch (err) {
      fail(
        `real PostgreSQL lock race failed: ${err && err.message ? err.message : String(err)}`,
      );
    }
  }

  if (fails.length) {
    console.error("[verify:a3-same-poolclient-lock] FAIL");
    for (const f of fails) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(
    "[verify:a3-same-poolclient-lock] PASS (same-session lock · 2 PoolClients · cross-session unlock is no-op)",
  );
}

main();

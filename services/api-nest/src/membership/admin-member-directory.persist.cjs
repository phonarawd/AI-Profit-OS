/**
 * 회원 디렉터리 persist. 운영 DATABASE_URL / 운영 Supabase 금지.
 * 목록은 public.users 페이지. /me/membership 대체 금지.
 */
"use strict";

const path = require("node:path");
const isolated = require(path.join(__dirname, "..", "..", "isolated-qa-pg.cjs"));

const USER_COLS = ["id", "status", "referral_code"];

const SQL = Object.freeze({
  schemaPreflight: `
SELECT
  (SELECT COUNT(*)::int FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users') AS users_table,
  (SELECT COUNT(*)::int FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name = ANY($1::text[])) AS user_cols
`.trim(),
  findById: `
SELECT id::text, email, phone, status, referral_code
  FROM public.users
 WHERE id = $1::uuid`.trim(),
  listPage: `
SELECT id::text, email, phone, status, referral_code
  FROM public.users
 ORDER BY id ASC
 OFFSET $1 LIMIT $2`.trim(),
});

function evaluateDirectoryPreflight(row) {
  const r = row || {};
  const ready =
    Number(r.users_table) >= 1 && Number(r.user_cols) >= USER_COLS.length;
  return {
    ready,
    code: ready ? "READY" : "STORE_UNREADY",
    applied: false,
  };
}

async function preflightDirectorySchema(db) {
  if (!db || typeof db.query !== "function") {
    return evaluateDirectoryPreflight(null);
  }
  try {
    const out = await db.query(SQL.schemaPreflight, [USER_COLS]);
    return evaluateDirectoryPreflight(out && out.rows && out.rows[0]);
  } catch {
    return { ...evaluateDirectoryPreflight(null), queryFailed: true };
  }
}

function rowToMember(row) {
  if (!row) return null;
  return {
    userId: String(row.id),
    email: row.email || null,
    phone: row.phone || null,
    status: row.status || null,
    resellerId: row.referral_code || null,
    referralCode: row.referral_code || null,
    membership: null,
  };
}

function createUnreadyPersistDirectoryStore(detail) {
  return {
    ready: false,
    kind: "persist_unready",
    persist: true,
    qaInjection: true,
    notProductionPostgresService: true,
    detail: detail || "schema_unready",
  };
}

async function createPersistDirectoryStore(db) {
  const pre = await preflightDirectorySchema(db);
  if (pre.ready !== true) {
    return createUnreadyPersistDirectoryStore(pre.code);
  }
  return {
    ready: true,
    kind: "persist",
    persist: true,
    qaInjection: true,
    notProductionPostgresService: true,
    testOnly: true,
    preflight: pre,
    async findById(id) {
      const r = await db.query(SQL.findById, [id]);
      return rowToMember(r.rows[0]);
    },
    async listPage({ offset, limit }) {
      const r = await db.query(SQL.listPage, [offset, limit]);
      const items = (r.rows || []).map(rowToMember);
      const nextOffset = items.length === limit ? offset + limit : null;
      return { items, nextOffset };
    },
  };
}

async function resolveRuntimeMemberDirectoryStore(env, opts) {
  if (opts && opts.useFake === true) {
    const err = new Error("fake directory persist cannot be runtime store");
    err.code = "FAKE_PERSIST_FORBIDDEN_IN_RUNTIME";
    throw err;
  }
  const resolved = isolated.resolveIsolatedQaPgUrl(env || {});
  if (resolved.allowed !== true) {
    return createUnreadyPersistDirectoryStore(resolved.denied || "isolated_url_unset");
  }
  let db;
  try {
    db = isolated.createIsolatedQaPgDb(resolved.url);
    const store = await createPersistDirectoryStore(db);
    if (store.ready !== true) {
      if (db.end) await db.end();
      return createUnreadyPersistDirectoryStore("schema_unready");
    }
    store.isolatedSource = resolved.source;
    store._db = db;
    return store;
  } catch {
    if (db && db.end) {
      try {
        await db.end();
      } catch {
        /* ignore */
      }
    }
    return createUnreadyPersistDirectoryStore("isolated_connect_failed");
  }
}

module.exports = {
  SQL,
  USER_COLS,
  evaluateDirectoryPreflight,
  preflightDirectorySchema,
  createPersistDirectoryStore,
  createUnreadyPersistDirectoryStore,
  resolveRuntimeMemberDirectoryStore,
};

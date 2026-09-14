/**
 * 직원 자격 persist. 운영 DATABASE_URL 주입 금지.
 * demo 직원·고정 비밀번호·사용자를 Admin 으로 재사용 금지.
 * 스키마 없으면 STORE_UNREADY. 행이 없으면 저장소 ready 여도 401.
 */
"use strict";

const isolated = require("./isolated-qa-pg.cjs");

const STAFF_COLS = ["admin_id", "email", "password_hash", "role", "status"];

const SQL = Object.freeze({
  schemaPreflight: `
SELECT
  (SELECT COUNT(*)::int FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admin_staff') AS staff_table,
  (SELECT COUNT(*)::int FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_staff'
      AND column_name = ANY($1::text[])) AS staff_cols
`.trim(),
  findByEmail: `
SELECT admin_id::text, email, password_hash, role, status
  FROM public.admin_staff
 WHERE lower(email) = lower($1)
 LIMIT 1`.trim(),
});

function evaluateStaffPreflight(row) {
  const r = row || {};
  const ready =
    Number(r.staff_table) >= 1 && Number(r.staff_cols) >= STAFF_COLS.length;
  return {
    ready,
    code: ready ? "READY" : "STORE_UNREADY",
    applied: false,
    persistence: ready ? "isolated_qa_persist" : "schema_unready",
  };
}

async function preflightStaffSchema(db) {
  if (!db || typeof db.query !== "function") {
    return evaluateStaffPreflight(null);
  }
  try {
    const out = await db.query(SQL.schemaPreflight, [STAFF_COLS]);
    return evaluateStaffPreflight(out && out.rows && out.rows[0]);
  } catch {
    return { ...evaluateStaffPreflight(null), queryFailed: true };
  }
}

function createUnreadyPersistStaffStore(detail) {
  return {
    ready: false,
    kind: "persist_unready",
    persist: true,
    testOnly: true,
    qaInjection: true,
    notProductionPostgresService: true,
    detail: detail || "schema_unready",
  };
}

async function createPersistStaffStore(db, opts) {
  const pre = await preflightStaffSchema(db);
  if (pre.ready !== true) {
    return createUnreadyPersistStaffStore(pre.code);
  }
  return {
    ready: true,
    kind: "persist",
    persist: true,
    testOnly: true,
    qaInjection: true,
    notProductionPostgresService: true,
    preflight: pre,
    async findByEmail(email) {
      const r = await db.query(SQL.findByEmail, [String(email || "")]);
      const row = r.rows[0];
      if (!row) return null;
      return {
        adminId: String(row.admin_id),
        email: String(row.email),
        passwordHash: String(row.password_hash),
        role: String(row.role || "cs"),
        status: String(row.status || ""),
      };
    },
  };
}

function createFakeStaffPersistDb(opts) {
  const ready = opts && opts.schemaReady === true;
  const rows = Array.isArray(opts && opts.rows) ? opts.rows.slice() : [];
  return {
    async query(text, params) {
      const sql = String(text);
      if (sql.includes("information_schema")) {
        return {
          rows: [
            {
              staff_table: ready ? 1 : 0,
              staff_cols: ready ? STAFF_COLS.length : 0,
            },
          ],
          rowCount: 1,
        };
      }
      if (sql.includes("FROM public.admin_staff")) {
        const key = String(params[0] || "").trim().toLowerCase();
        const hit = rows.find((r) => String(r.email || "").toLowerCase() === key);
        if (!hit) return { rows: [], rowCount: 0 };
        return {
          rows: [
            {
              admin_id: hit.adminId,
              email: hit.email,
              password_hash: hit.passwordHash,
              role: hit.role,
              status: hit.status,
            },
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

async function resolveRuntimeStaffStore(env, opts) {
  if (opts && opts.useFake === true) {
    const err = new Error("fake staff persist cannot be runtime store");
    err.code = "FAKE_PERSIST_FORBIDDEN_IN_RUNTIME";
    throw err;
  }
  if (opts && opts.useMemory === true) {
    const err = new Error("test_memory staff store cannot be runtime store");
    err.code = "TEST_PROVIDER_FORBIDDEN_IN_RUNTIME";
    throw err;
  }
  const resolved = isolated.resolveIsolatedQaPgUrl(env || {});
  if (resolved.allowed !== true) {
    return createUnreadyPersistStaffStore(resolved.denied || "isolated_url_unset");
  }
  let db;
  try {
    db = isolated.createIsolatedQaPgDb(resolved.url);
    const store = await createPersistStaffStore(db, opts);
    if (store.ready !== true) {
      if (db.end) await db.end();
      return createUnreadyPersistStaffStore("schema_unready");
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
    return createUnreadyPersistStaffStore("isolated_connect_failed");
  }
}

function draftSqlPath() {
  return "quality/migrations-draft/20260915080000_admin_staff_credentials.sql";
}

module.exports = {
  SQL,
  STAFF_COLS,
  evaluateStaffPreflight,
  preflightStaffSchema,
  createPersistStaffStore,
  createUnreadyPersistStaffStore,
  createFakeStaffPersistDb,
  resolveRuntimeStaffStore,
  draftSqlPath,
};

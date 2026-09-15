/**
 * 리셀러 ID 조회·발급 persist. 운영 backfill / 운영 DB 쓰기 금지.
 * 가입 발급 권위는 users.referral_code UNIQUE + mintReferralCode.
 */
"use strict";

const core = require("./reseller-id.core.cjs");

const PRODUCTION_SUPABASE_REF = "mgsytcetsiecllmhcyox";

const SQL = Object.freeze({
  schemaPreflight: `
SELECT COUNT(*)::int AS referral_cols
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'users'
   AND column_name = 'referral_code'`.trim(),
  lookup: `
SELECT id::text, status, referral_code
  FROM public.users
 WHERE id = $1::uuid`.trim(),
  putIfAbsent: `
UPDATE public.users
   SET referral_code = $2, updated_at = now()
 WHERE id = $1::uuid
   AND referral_code IS NULL
   AND status = 'active'
RETURNING id::text, status, referral_code`.trim(),
});

function isOpsDbTarget(env) {
  const blob = [
    env && env.databaseUrl,
    env && env.catalogTestDatabaseUrl,
    env && env.supabaseUrl,
    env && env.supabaseProjectRef,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  return blob.includes(PRODUCTION_SUPABASE_REF);
}

function allowsResellerBackfillWrite(env) {
  if (!env || env.ensureFlag !== "1") return false;
  if (isOpsDbTarget(env)) return false;
  return true;
}

async function preflightResellerColumn(db) {
  if (!db || typeof db.query !== "function") {
    return { ready: false, code: "STORE_UNREADY", applied: false };
  }
  try {
    const r = await db.query(SQL.schemaPreflight, []);
    const n = Number(r.rows[0] && r.rows[0].referral_cols);
    return {
      ready: n >= 1,
      code: n >= 1 ? "READY" : "STORE_UNREADY",
      applied: false,
    };
  } catch {
    return { ready: false, code: "STORE_UNREADY", queryFailed: true, applied: false };
  }
}

async function lookupResellerId(db, userId) {
  const pre = await preflightResellerColumn(db);
  if (pre.ready !== true) {
    return {
      ok: false,
      applied: false,
      code: "STORE_UNREADY",
      resellerId: null,
      source: "users.referral_code",
    };
  }
  const r = await db.query(SQL.lookup, [userId]);
  const row = r.rows[0];
  if (!row) {
    return {
      ok: false,
      applied: false,
      code: "USER_NOT_FOUND",
      resellerId: null,
      source: "users.referral_code",
    };
  }
  const proj = core.asResellerId(row.referral_code);
  return {
    ok: true,
    applied: false,
    reused: Boolean(proj.resellerId),
    resellerId: proj.resellerId,
    source: proj.source,
    notAuthToken: true,
  };
}

async function issueIfAbsentIsolated(db, userId, mint, env) {
  if (!allowsResellerBackfillWrite(env || {})) {
    return { ok: false, applied: false, code: "BACKFILL_BLOCKED", opsDb: isOpsDbTarget(env || {}) };
  }
  const current = await lookupResellerId(db, userId);
  if (current.ok && current.resellerId) {
    return { ok: true, applied: false, reused: true, resellerId: current.resellerId };
  }
  const taken = new Set();
  const issued = core.issueResellerIdOnSignup({ mint, taken });
  if (!issued.ok) return issued;
  try {
    const r = await db.query(SQL.putIfAbsent, [userId, issued.resellerId]);
    const row = r.rows[0];
    if (!row) return lookupResellerId(db, userId);
    return {
      ok: true,
      applied: true,
      reused: false,
      resellerId: core.asResellerId(row.referral_code).resellerId,
    };
  } catch (err) {
    if (core.classifyUniqueAsReseller(err)) {
      return lookupResellerId(db, userId);
    }
    throw err;
  }
}

function createFakeResellerPersistDb(opts) {
  const ready = opts && opts.schemaReady !== false;
  const users = new Map();
  for (const row of (opts && opts.users) || []) {
    users.set(row.userId, {
      id: row.userId,
      status: row.status || "active",
      referral_code: row.referralCode || null,
    });
  }
  return {
    async query(text, params) {
      const sql = String(text);
      if (sql.includes("information_schema")) {
        return { rows: [{ referral_cols: ready ? 1 : 0 }], rowCount: 1 };
      }
      if (sql.includes("FROM public.users") && sql.includes("WHERE id")) {
        const u = users.get(params[0]);
        return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
      }
      if (sql.includes("SET referral_code")) {
        const u = users.get(params[0]);
        if (!u || u.referral_code) return { rows: [], rowCount: 0 };
        for (const other of users.values()) {
          if (other.referral_code === params[1] && other.id !== params[0]) {
            const e = new Error("duplicate");
            e.code = "23505";
            e.constraint = "users_referral_code_key";
            throw e;
          }
        }
        u.referral_code = params[1];
        return { rows: [u], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

function draftBackfillPath() {
  return "quality/migrations-draft/operator-reseller-id-backfill.v1.md";
}

module.exports = {
  SQL,
  isOpsDbTarget,
  allowsResellerBackfillWrite,
  preflightResellerColumn,
  lookupResellerId,
  issueIfAbsentIsolated,
  createFakeResellerPersistDb,
  draftBackfillPath,
};

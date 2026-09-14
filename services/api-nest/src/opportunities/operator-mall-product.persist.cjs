/**
 * 운영자 상품·공개 범위·가격 확인 메모 persist.
 * 운영 DATABASE_URL / 운영 DDL apply 금지. 스키마 없으면 STORE_UNREADY.
 */
"use strict";

const path = require("node:path");
const mall = require("./operator-mall-product.core.cjs");
const isolated = require(path.join(__dirname, "..", "..", "isolated-qa-pg.cjs"));

const PRODUCTION_SUPABASE_REF = isolated.PRODUCTION_SUPABASE_REF;

const PRODUCT_COLS = [
  "id",
  "name",
  "description",
  "photos",
  "composition_qty",
  "configured_payout_usdt",
  "currency",
  "visibility",
  "selected_member_ids",
  "price_confirmation_memo",
  "product_revision",
  "supply_source",
];
const PARTICIPATION_COLS = [
  "id",
  "user_id",
  "product_id",
  "idempotency_key",
  "status",
  "payout_status",
  "snapshot",
  "journal_id",
];
const JOURNAL_COLS = [
  "id",
  "idempotency_key",
  "journal_type",
  "reference_type",
  "reference_id",
  "user_id",
  "amount_usdt",
];
const OPP_MALL_COLS = [
  "visibility",
  "selected_member_ids",
  "price_confirmation_memo",
  "composition_qty",
  "product_revision",
  "configured_payout_usdt",
];

const SQL = Object.freeze({
  schemaPreflight: `
SELECT
  (SELECT COUNT(*)::int FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'operator_mall_products') AS product_table,
  (SELECT COUNT(*)::int FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'operator_mall_products'
      AND column_name = ANY($1::text[])) AS product_cols,
  (SELECT COUNT(*)::int FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'operator_mall_participations') AS participation_table,
  (SELECT COUNT(*)::int FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'operator_mall_participations'
      AND column_name = ANY($2::text[])) AS participation_cols,
  (SELECT COUNT(*)::int FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'operator_mall_settlement_journals') AS journal_table,
  (SELECT COUNT(*)::int FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'operator_mall_settlement_journals'
      AND column_name = ANY($3::text[])) AS journal_cols,
  (SELECT COUNT(*)::int FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'opportunities'
      AND column_name = ANY($4::text[])) AS opp_mall_cols
`.trim(),
  upsertProduct: `
INSERT INTO public.operator_mall_products (
  id, name, description, photos, composition_qty, configured_payout_usdt,
  currency, visibility, selected_member_ids, price_confirmation_memo,
  product_revision, supply_source, updated_at
) VALUES (
  $1::uuid, $2, $3, $4::jsonb, $5, $6::numeric,
  $7, $8, $9::uuid[], $10, $11, 'operator', now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  photos = EXCLUDED.photos,
  composition_qty = EXCLUDED.composition_qty,
  configured_payout_usdt = EXCLUDED.configured_payout_usdt,
  currency = EXCLUDED.currency,
  visibility = EXCLUDED.visibility,
  selected_member_ids = EXCLUDED.selected_member_ids,
  price_confirmation_memo = EXCLUDED.price_confirmation_memo,
  product_revision = EXCLUDED.product_revision,
  updated_at = now()
`.trim(),
  getProduct: `
SELECT id::text, name, description, photos, composition_qty,
       configured_payout_usdt::text, currency, visibility, selected_member_ids,
       price_confirmation_memo, product_revision, supply_source,
       created_at, updated_at
  FROM public.operator_mall_products
 WHERE id = $1::uuid`.trim(),
  listProducts: `
SELECT id::text, name, description, photos, composition_qty,
       configured_payout_usdt::text, currency, visibility, selected_member_ids,
       price_confirmation_memo, product_revision, supply_source,
       created_at, updated_at
  FROM public.operator_mall_products
 ORDER BY created_at ASC`.trim(),
  stampOpportunity: `
UPDATE public.opportunities
   SET visibility = $2,
       selected_member_ids = $3::uuid[],
       price_confirmation_memo = $4,
       composition_qty = $5,
       product_revision = $6,
       configured_payout_usdt = $7::numeric,
       updated_at = now()
 WHERE id = $1::uuid`.trim(),
  upsertParticipation: `
INSERT INTO public.operator_mall_participations (
  id, user_id, product_id, idempotency_key, status, payout_status,
  snapshot, journal_id
) VALUES (
  $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::jsonb, $8::uuid
)
ON CONFLICT (user_id, idempotency_key) DO UPDATE SET
  status = EXCLUDED.status,
  payout_status = EXCLUDED.payout_status,
  snapshot = EXCLUDED.snapshot,
  journal_id = EXCLUDED.journal_id`.trim(),
  getParticipation: `
SELECT id::text, user_id::text, product_id::text, idempotency_key, status,
       payout_status, snapshot, journal_id::text, created_at
  FROM public.operator_mall_participations
 WHERE id = $1::uuid`.trim(),
  findParticipationByIdempotency: `
SELECT id::text, user_id::text, product_id::text, idempotency_key, status,
       payout_status, snapshot, journal_id::text, created_at
  FROM public.operator_mall_participations
 WHERE user_id = $1::uuid AND idempotency_key = $2`.trim(),
  listParticipations: `
SELECT id::text, user_id::text, product_id::text, idempotency_key, status,
       payout_status, snapshot, journal_id::text, created_at
  FROM public.operator_mall_participations`.trim(),
  insertJournal: `
INSERT INTO public.operator_mall_settlement_journals (
  id, idempotency_key, journal_type, reference_type, reference_id,
  user_id, amount_usdt, bucket
) VALUES (
  $1::uuid, $2, 'settlement', 'participation', $3::uuid, $4::uuid, $5::numeric, 'profit'
)
RETURNING id::text, idempotency_key, user_id::text, amount_usdt::text`.trim(),
  findJournal: `
SELECT id::text, idempotency_key, journal_type, reference_type,
       reference_id::text, user_id::text, amount_usdt::text, created_at
  FROM public.operator_mall_settlement_journals
 WHERE idempotency_key = $1`.trim(),
  listJournalsByUser: `
SELECT id::text, idempotency_key, journal_type, reference_type,
       reference_id::text, user_id::text, amount_usdt::text, created_at
  FROM public.operator_mall_settlement_journals
 WHERE user_id = $1::uuid
 ORDER BY created_at ASC`.trim(),
});

function isOpsDbTarget(env) {
  return isolated.isOpsDbTarget(env || {});
}

function allowsMallPersistWrite(env) {
  return isolated.allowsIsolatedQaPg(env || {});
}

function resolveIsolatedMallPersistUrl(env) {
  return isolated.resolveIsolatedQaPgUrl(env || {});
}

function evaluateSchemaPreflight(row) {
  const r = row || {};
  const productReady =
    Number(r.product_table) >= 1 && Number(r.product_cols) >= PRODUCT_COLS.length;
  const participationReady =
    Number(r.participation_table) >= 1 &&
    Number(r.participation_cols) >= PARTICIPATION_COLS.length;
  const journalReady =
    Number(r.journal_table) >= 1 && Number(r.journal_cols) >= JOURNAL_COLS.length;
  const oppMallReady = Number(r.opp_mall_cols) >= OPP_MALL_COLS.length;
  const ready = productReady && participationReady && journalReady;
  return {
    ready,
    productReady,
    participationReady,
    journalReady,
    oppMallReady,
    code: ready ? "READY" : "STORE_UNREADY",
    persistence: ready ? "runtime_persist" : "schema_unready",
    applied: false,
    opsDb: false,
  };
}

async function preflightMallPersistSchema(db) {
  if (!db || typeof db.query !== "function") {
    return evaluateSchemaPreflight(null);
  }
  try {
    const out = await db.query(SQL.schemaPreflight, [
      PRODUCT_COLS,
      PARTICIPATION_COLS,
      JOURNAL_COLS,
      OPP_MALL_COLS,
    ]);
    return evaluateSchemaPreflight(out && out.rows && out.rows[0]);
  } catch {
    return {
      ...evaluateSchemaPreflight(null),
      queryFailed: true,
    };
  }
}

function rowToProduct(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.name,
    description: row.description || "",
    photos: Array.isArray(row.photos) ? row.photos : [],
    compositionQty: Number(row.composition_qty),
    payoutAmount: String(row.configured_payout_usdt),
    currency: row.currency || "USDT",
    visibility: row.visibility,
    selectedMemberIds: Array.isArray(row.selected_member_ids)
      ? row.selected_member_ids.map((x) => String(x))
      : [],
    priceConfirmationMemo: row.price_confirmation_memo
      ? String(row.price_confirmation_memo)
      : "",
    revision: Number(row.product_revision || 1),
    supplySource: "operator",
    compositionIsNotSellableStock: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToParticipation(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    productId: String(row.product_id),
    idempotencyKey: row.idempotency_key,
    status: row.status,
    payoutStatus: row.payout_status,
    snapshot: row.snapshot,
    journalId: row.journal_id ? String(row.journal_id) : null,
    createdAt: row.created_at,
  };
}

function settlementKey(participationId) {
  return `settlement:${participationId}`;
}

function createUnreadyPersistStore(detail) {
  return {
    ready: false,
    kind: "persist_unready",
    persist: true,
    detail: detail || "schema_unready",
  };
}

async function createPersistMallStore(db, opts) {
  const pre = await preflightMallPersistSchema(db);
  if (pre.ready !== true) {
    return createUnreadyPersistStore(pre.code);
  }
  const members = new Map();
  for (const m of (opts && opts.members) || []) {
    members.set(m.userId, {
      userId: m.userId,
      dailyUsed: m.dailyUsed || 0,
      cap: m.cap == null ? 5 : m.cap,
      suspended: m.suspended === true,
      matchBlocked: m.matchBlocked === true,
    });
  }
  const posting = opts && opts.posting;
  const stampOpportunity = pre.oppMallReady === true;
  let poolBalance = opts && opts.poolBalance != null ? opts.poolBalance : null;
  const audit = [];

  return {
    ready: true,
    kind: "persist",
    persist: true,
    testOnly: Boolean(opts && opts.testOnly),
    preflight: pre,
    async saveProduct(p) {
      await db.query(SQL.upsertProduct, [
        p.id,
        p.name,
        p.description || "",
        JSON.stringify(p.photos || []),
        p.compositionQty,
        p.payoutAmount,
        p.currency || "USDT",
        p.visibility,
        p.selectedMemberIds || [],
        p.priceConfirmationMemo || null,
        p.revision,
      ]);
      if (stampOpportunity) {
        try {
          await db.query(SQL.stampOpportunity, [
            p.id,
            p.visibility,
            p.selectedMemberIds || [],
            p.priceConfirmationMemo || null,
            p.compositionQty,
            p.revision,
            p.payoutAmount,
          ]);
        } catch {
          /* 기회 행이 없으면 스탬프만 생략. 상품 persist 는 유지 */
        }
      }
    },
    async getProduct(id) {
      const r = await db.query(SQL.getProduct, [id]);
      return rowToProduct(r.rows[0]);
    },
    async listProducts() {
      const r = await db.query(SQL.listProducts, []);
      return (r.rows || []).map(rowToProduct);
    },
    async saveParticipation(p) {
      await db.query(SQL.upsertParticipation, [
        p.id,
        p.userId,
        p.productId,
        p.idempotencyKey,
        p.status,
        p.payoutStatus,
        JSON.stringify(p.snapshot || {}),
        p.journalId || null,
      ]);
    },
    async getParticipation(id) {
      const r = await db.query(SQL.getParticipation, [id]);
      return rowToParticipation(r.rows[0]);
    },
    async findParticipationByIdempotency(userId, key) {
      const r = await db.query(SQL.findParticipationByIdempotency, [userId, key]);
      return rowToParticipation(r.rows[0]);
    },
    async listParticipations(filter) {
      const r = await db.query(SQL.listParticipations, []);
      return (r.rows || []).map(rowToParticipation).filter((p) => {
        if (filter && filter.productId && p.productId !== filter.productId) return false;
        if (filter && filter.userId && p.userId !== filter.userId) return false;
        return true;
      });
    },
    async getMember(userId) {
      if (members.has(userId)) return members.get(userId);
      try {
        const r = await db.query(
          `SELECT user_id::text, daily_matches_used, daily_user_match_cap
             FROM public.user_membership WHERE user_id = $1::uuid`,
          [userId],
        );
        const row = r.rows[0];
        if (!row) return null;
        return {
          userId: row.user_id,
          dailyUsed: Number(row.daily_matches_used || 0),
          cap: row.daily_user_match_cap == null ? 5 : Number(row.daily_user_match_cap),
        };
      } catch {
        return null;
      }
    },
    async incrementDailyUsed(userId) {
      const m = members.get(userId);
      if (m) m.dailyUsed += 1;
      try {
        await db.query(
          `UPDATE public.user_membership
              SET daily_matches_used = daily_matches_used + 1, updated_at = now()
            WHERE user_id = $1::uuid`,
          [userId],
        );
      } catch {
        /* 멤버십 표 없으면 메모리만 */
      }
    },
    async saveJournal(j) {
      if (posting && typeof posting.postJournal === "function") {
        const posted = await posting.postJournal({
          idempotencyKey: j.idempotencyKey,
          journalType: "settlement",
          referenceType: "participation",
          referenceId: j.referenceId,
          memo: "MATCH_SUCCESS mall settlement",
          createdBy: j.userId,
          amountUsdt: j.amountUsdt,
        });
        return posted;
      }
      try {
        const r = await db.query(SQL.insertJournal, [
          j.id,
          j.idempotencyKey,
          j.referenceId,
          j.userId,
          j.amountUsdt,
        ]);
        if (poolBalance != null) {
          poolBalance = mall.formatAmount(
            mall.parseAmount(poolBalance) - mall.parseAmount(j.amountUsdt),
          );
        }
        return r.rows[0];
      } catch (err) {
        if (err && err.code === "23505") {
          const replay = await db.query(SQL.findJournal, [j.idempotencyKey]);
          if (replay.rows[0]) return replay.rows[0];
        }
        throw err;
      }
    },
    async findJournal(key) {
      const r = await db.query(SQL.findJournal, [key]);
      const row = r.rows[0];
      if (!row) return null;
      return {
        id: String(row.id),
        idempotencyKey: row.idempotency_key,
        amountUsdt: String(row.amount_usdt),
        userId: String(row.user_id),
      };
    },
    async listJournalsByUser(userId) {
      const r = await db.query(SQL.listJournalsByUser, [userId]);
      return (r.rows || []).map((row) => ({
        id: String(row.id),
        idempotencyKey: row.idempotency_key,
        amountUsdt: String(row.amount_usdt),
        userId: String(row.user_id),
        referenceId: row.reference_id ? String(row.reference_id) : null,
      }));
    },
    async getPoolBalance() {
      return poolBalance;
    },
    async appendAudit(row) {
      audit.push(row);
    },
    audit,
  };
}

function createFakePersistMallDb(opts) {
  const ready = opts && opts.schemaReady === true;
  const oppReady = opts && opts.oppMallReady === true;
  const state = {
    products: new Map(),
    participations: new Map(),
    journals: new Map(),
    journalsByRef: new Map(),
    opportunities: new Map(),
    members: new Map(),
  };
  for (const m of (opts && opts.members) || []) {
    state.members.set(m.userId, { ...m });
  }

  function readyRow() {
    return {
      product_table: ready ? 1 : 0,
      product_cols: ready ? PRODUCT_COLS.length : 0,
      participation_table: ready ? 1 : 0,
      participation_cols: ready ? PARTICIPATION_COLS.length : 0,
      journal_table: ready ? 1 : 0,
      journal_cols: ready ? JOURNAL_COLS.length : 0,
      opp_mall_cols: oppReady ? OPP_MALL_COLS.length : 0,
    };
  }

  const db = {
    state,
    async query(text, params) {
      const sql = String(text);
      if (sql.includes("information_schema")) {
        return { rows: [readyRow()], rowCount: 1 };
      }
      if (sql.includes("INSERT INTO public.operator_mall_products")) {
        const row = {
          id: params[0],
          name: params[1],
          description: params[2],
          photos: JSON.parse(params[3]),
          composition_qty: params[4],
          configured_payout_usdt: params[5],
          currency: params[6],
          visibility: params[7],
          selected_member_ids: params[8],
          price_confirmation_memo: params[9],
          product_revision: params[10],
          supply_source: "operator",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        state.products.set(row.id, row);
        return { rows: [row], rowCount: 1 };
      }
      if (sql.includes("FROM public.operator_mall_products") && sql.includes("WHERE id")) {
        const hit = state.products.get(params[0]);
        return { rows: hit ? [hit] : [], rowCount: hit ? 1 : 0 };
      }
      if (sql.includes("FROM public.operator_mall_products")) {
        const rows = Array.from(state.products.values());
        return { rows, rowCount: rows.length };
      }
      if (sql.includes("UPDATE public.opportunities")) {
        if (!oppReady) {
          const e = new Error("undefined_column");
          e.code = "42703";
          throw e;
        }
        state.opportunities.set(params[0], {
          id: params[0],
          visibility: params[1],
          selected_member_ids: params[2],
          price_confirmation_memo: params[3],
          composition_qty: params[4],
          product_revision: params[5],
          configured_payout_usdt: params[6],
        });
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes("INSERT INTO public.operator_mall_participations")) {
        const row = {
          id: params[0],
          user_id: params[1],
          product_id: params[2],
          idempotency_key: params[3],
          status: params[4],
          payout_status: params[5],
          snapshot: JSON.parse(params[6]),
          journal_id: params[7],
          created_at: new Date().toISOString(),
        };
        for (const cur of state.participations.values()) {
          if (cur.user_id === row.user_id && cur.idempotency_key === row.idempotency_key) {
            Object.assign(cur, row);
            return { rows: [cur], rowCount: 1 };
          }
        }
        state.participations.set(row.id, row);
        return { rows: [row], rowCount: 1 };
      }
      if (sql.includes("FROM public.operator_mall_participations") && sql.includes("WHERE id")) {
        const hit = state.participations.get(params[0]);
        return { rows: hit ? [hit] : [], rowCount: hit ? 1 : 0 };
      }
      if (
        sql.includes("FROM public.operator_mall_participations") &&
        sql.includes("idempotency_key")
      ) {
        const hit = Array.from(state.participations.values()).find(
          (p) => p.user_id === params[0] && p.idempotency_key === params[1],
        );
        return { rows: hit ? [hit] : [], rowCount: hit ? 1 : 0 };
      }
      if (sql.includes("FROM public.operator_mall_participations")) {
        const rows = Array.from(state.participations.values());
        return { rows, rowCount: rows.length };
      }
      if (sql.includes("INSERT INTO public.operator_mall_settlement_journals")) {
        const key = params[1];
        if (state.journals.has(key) || state.journalsByRef.has(params[2])) {
          const e = new Error("duplicate");
          e.code = "23505";
          e.constraint = "operator_mall_settlement_journals_idempotency_key_key";
          throw e;
        }
        const row = {
          id: params[0],
          idempotency_key: key,
          journal_type: "settlement",
          reference_type: "participation",
          reference_id: params[2],
          user_id: params[3],
          amount_usdt: params[4],
          created_at: new Date().toISOString(),
        };
        state.journals.set(key, row);
        state.journalsByRef.set(params[2], row);
        return { rows: [row], rowCount: 1 };
      }
      if (
        sql.includes("FROM public.operator_mall_settlement_journals") &&
        sql.includes("WHERE idempotency_key")
      ) {
        const hit = state.journals.get(params[0]);
        return { rows: hit ? [hit] : [], rowCount: hit ? 1 : 0 };
      }
      if (
        sql.includes("FROM public.operator_mall_settlement_journals") &&
        sql.includes("WHERE user_id")
      ) {
        const rows = Array.from(state.journals.values()).filter((j) => j.user_id === params[0]);
        return { rows, rowCount: rows.length };
      }
      if (sql.includes("FROM public.user_membership")) {
        const m = state.members.get(params[0]);
        if (!m) return { rows: [], rowCount: 0 };
        return {
          rows: [
            {
              user_id: m.userId,
              daily_matches_used: m.dailyUsed || 0,
              daily_user_match_cap: m.cap,
            },
          ],
          rowCount: 1,
        };
      }
      if (sql.includes("UPDATE public.user_membership")) {
        const m = state.members.get(params[0]);
        if (m) m.dailyUsed = (m.dailyUsed || 0) + 1;
        return { rows: [], rowCount: m ? 1 : 0 };
      }
      return { rows: [], rowCount: 0 };
    },
    async withTransaction(fn) {
      return fn(db);
    },
  };
  return db;
}

function draftSqlPath() {
  return "quality/migrations-draft/20260915070000_operator_mall_product.sql";
}

async function resolveRuntimeMallPersistStore(env, opts) {
  if (opts && opts.useFake === true) {
    const err = new Error("fake mall persist cannot be runtime store");
    err.code = "FAKE_PERSIST_FORBIDDEN_IN_RUNTIME";
    throw err;
  }
  const resolved = resolveIsolatedMallPersistUrl(env || {});
  if (resolved.allowed !== true) {
    return createUnreadyPersistStore(resolved.denied || "isolated_url_unset");
  }
  let db;
  try {
    db = isolated.createIsolatedQaPgDb(resolved.url);
    const store = await createPersistMallStore(db, {
      members: (opts && opts.members) || [],
      testOnly: true,
    });
    if (store.ready !== true) {
      if (db.end) await db.end();
      return createUnreadyPersistStore("schema_unready");
    }
    store.isolatedSource = resolved.source;
    store.qaInjection = true;
    store.notProductionPostgresService = true;
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
    return createUnreadyPersistStore("isolated_connect_failed");
  }
}

module.exports = {
  SQL,
  PRODUCT_COLS,
  PARTICIPATION_COLS,
  JOURNAL_COLS,
  OPP_MALL_COLS,
  PRODUCTION_SUPABASE_REF,
  isOpsDbTarget,
  allowsMallPersistWrite,
  resolveIsolatedMallPersistUrl,
  resolveRuntimeMallPersistStore,
  evaluateSchemaPreflight,
  preflightMallPersistSchema,
  createPersistMallStore,
  createUnreadyPersistStore,
  createFakePersistMallDb,
  settlementKey,
  draftSqlPath,
};

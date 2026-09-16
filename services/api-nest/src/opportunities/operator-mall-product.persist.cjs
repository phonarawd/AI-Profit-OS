/**
 * 운영자 상품·공개 범위·가격 확인 메모 persist.
 * 격리 QA URL 또는 운영 PostgresService(mgsytcetsiecllmhcyox)만.
 * 스키마 없으면 STORE_UNREADY. 격리 DB를 운영 persist로 세탁하지 않는다.
 */
"use strict";

const path = require("node:path");
const mall = require("./operator-mall-product.core.cjs");
const ledgerPosting = require("./operator-mall-ledger-posting.cjs");
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
  "register_idempotency_key",
  "required_capital_usdt",
  "expected_profit_krw_approx",
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
const LEDGER_JOURNAL_COLS = [
  "id",
  "idempotency_key",
  "journal_type",
  "reference_type",
  "reference_id",
];
/** 가짜 persist 격리 전용. 실PG 권위 아님. */
const JOURNAL_COLS = LEDGER_JOURNAL_COLS;
const OPP_MALL_COLS = [
  "visibility",
  "selected_member_ids",
  "price_confirmation_memo",
  "composition_qty",
  "product_revision",
  "configured_payout_usdt",
  "expected_profit_usdt",
  "expected_profit_krw_approx",
  "required_capital_usdt",
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
    WHERE table_schema = 'public' AND table_name = 'ledger_journals') AS ledger_journal_table,
  (SELECT COUNT(*)::int FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ledger_journals'
      AND column_name = ANY($3::text[])) AS ledger_journal_cols,
  (SELECT COUNT(*)::int FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ledger_accounts') AS ledger_account_table,
  (SELECT COUNT(*)::int FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ledger_entries') AS ledger_entry_table,
  (SELECT COUNT(*)::int FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ledger_journals'
      AND column_name = 'request_fingerprint') AS ledger_fingerprint,
  (SELECT COUNT(*)::int FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ledger_outbox_events') AS ledger_outbox_table,
  (SELECT COUNT(*)::int FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'opportunities'
      AND column_name = ANY($4::text[])) AS opp_mall_cols
`.trim(),
  insertProduct: `
INSERT INTO public.operator_mall_products (
  id, name, description, photos, composition_qty, configured_payout_usdt,
  currency, visibility, selected_member_ids, price_confirmation_memo,
  product_revision, supply_source, register_idempotency_key,
  required_capital_usdt, expected_profit_krw_approx, updated_at
) VALUES (
  $1::uuid, $2, $3, $4::jsonb, $5, $6::numeric,
  $7, $8, $9::uuid[], $10, $11, 'operator', $12,
  $13::numeric, $14::numeric, now()
)
ON CONFLICT (id) DO NOTHING
RETURNING id::text`.trim(),
  findProductByRegisterKey: `
SELECT id::text, name, description, photos, composition_qty,
       configured_payout_usdt::text, currency, visibility, selected_member_ids,
       price_confirmation_memo, product_revision, supply_source,
       register_idempotency_key, required_capital_usdt::text,
       expected_profit_krw_approx::text, created_at, updated_at
  FROM public.operator_mall_products
 WHERE register_idempotency_key = $1`.trim(),
  updateProductIfRevision: `
UPDATE public.operator_mall_products
   SET name = $3,
       description = $4,
       photos = $5::jsonb,
       composition_qty = $6,
       configured_payout_usdt = $7::numeric,
       currency = $8,
       visibility = $9,
       selected_member_ids = $10::uuid[],
       price_confirmation_memo = $11,
       product_revision = $12,
       required_capital_usdt = $13::numeric,
       expected_profit_krw_approx = $14::numeric,
       updated_at = now()
 WHERE id = $1::uuid
   AND product_revision = $2
RETURNING id::text`.trim(),
  getProduct: `
SELECT id::text, name, description, photos, composition_qty,
       configured_payout_usdt::text, currency, visibility, selected_member_ids,
       price_confirmation_memo, product_revision, supply_source,
       register_idempotency_key, required_capital_usdt::text,
       expected_profit_krw_approx::text, created_at, updated_at
  FROM public.operator_mall_products
 WHERE id = $1::uuid`.trim(),
  listProducts: `
SELECT id::text, name, description, photos, composition_qty,
       configured_payout_usdt::text, currency, visibility, selected_member_ids,
       price_confirmation_memo, product_revision, supply_source,
       register_idempotency_key, required_capital_usdt::text,
       expected_profit_krw_approx::text, created_at, updated_at
  FROM public.operator_mall_products
 ORDER BY created_at ASC`.trim(),
  listProductsPage: `
SELECT id::text, name, description, photos, composition_qty,
       configured_payout_usdt::text, currency, visibility, selected_member_ids,
       price_confirmation_memo, product_revision, supply_source,
       register_idempotency_key, required_capital_usdt::text,
       expected_profit_krw_approx::text, created_at, updated_at
  FROM public.operator_mall_products
 WHERE ($3::text IS NULL OR visibility = $3)
 ORDER BY created_at ASC
 OFFSET $1 LIMIT $2`.trim(),
  stampOpportunity: `
UPDATE public.opportunities
   SET visibility = $2,
       selected_member_ids = $3::uuid[],
       price_confirmation_memo = $4,
       composition_qty = $5,
       product_revision = $6,
       configured_payout_usdt = $7::numeric,
       expected_profit_usdt = $7::numeric,
       expected_profit_krw_approx = $8::numeric,
       required_capital_usdt = $9::numeric,
       updated_at = now()
 WHERE id = $1::uuid
   AND supply_source = 'operator'`.trim(),
  ensureOperatorAsset: `
INSERT INTO public.assets (
  asset_id, category, asset_label, image_url, image_source, image_alt_ko
) VALUES (
  $1, 'trading_card', $2, $3, 'admin_r2', $2
)
ON CONFLICT (asset_id) DO UPDATE SET
  asset_label = EXCLUDED.asset_label,
  image_url = EXCLUDED.image_url,
  image_alt_ko = EXCLUDED.image_alt_ko,
  updated_at = now()`.trim(),
  ensureOperatorFx: `
INSERT INTO public.fx_snapshots (id, usd_krw, source, captured_at)
VALUES ('operator_mall_fx', 1, 'operator_mall', now())
ON CONFLICT (id) DO NOTHING`.trim(),
  insertOperatorOpportunity: `
INSERT INTO public.opportunities (
  id, asset_id, pricing_version, priced_at, expected_profit_usdt,
  expected_profit_krw_approx, fx_snapshot_id, estimated_duration_sec,
  ai_confidence_score, difficulty, tags, required_capital_usdt,
  execution_mode, execution_platforms, category, asset_label,
  asset_image_url, asset_image_source, asset_image_alt_ko,
  arbitrage_type, arbitrage_type_ko, pricing, stale_at, status,
  supply_source, visibility, selected_member_ids, price_confirmation_memo,
  composition_qty, product_revision, configured_payout_usdt
) VALUES (
  $1::uuid, $2, $3, now(), $4::numeric,
  $5::numeric, $6, 3600,
  0, 'normal', '{}', $7::numeric,
  'orchestrate', '{}', 'trading_card', $8,
  $9, 'admin_r2', $8,
  'benefit', '혜택', $10::jsonb, now() + interval '10 years', 'available',
  'operator', $11, $12::uuid[], $13,
  $14, $15, $4::numeric
)
ON CONFLICT (id) DO NOTHING`.trim(),
  peekOpportunitySupply: `
SELECT supply_source
  FROM public.opportunities
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
  insertJournalTestOnly: `
INSERT INTO public.operator_mall_settlement_journals (
  id, idempotency_key, journal_type, reference_type, reference_id,
  user_id, amount_usdt, bucket
) VALUES (
  $1::uuid, $2, 'settlement', 'participation', $3::uuid, $4::uuid, $5::numeric, 'profit'
)
RETURNING id::text, idempotency_key, user_id::text, amount_usdt::text`.trim(),
  findJournalTestOnly: `
SELECT id::text, idempotency_key, journal_type, reference_type,
       reference_id::text, user_id::text, amount_usdt::text, created_at
  FROM public.operator_mall_settlement_journals
 WHERE idempotency_key = $1`.trim(),
  listJournalsByUserTestOnly: `
SELECT id::text, idempotency_key, journal_type, reference_type,
       reference_id::text, user_id::text, amount_usdt::text, created_at
  FROM public.operator_mall_settlement_journals
 WHERE user_id = $1::uuid
 ORDER BY created_at ASC`.trim(),
  findLedgerJournal: `
SELECT j.id::text, j.idempotency_key, j.journal_type, j.reference_type,
       j.reference_id::text, a.owner_user_id::text AS user_id,
       e.amount_usdt::text, j.created_at
  FROM public.ledger_journals j
  JOIN public.ledger_entries e ON e.journal_id = j.id
  JOIN public.ledger_accounts a ON a.id = e.account_id
 WHERE j.idempotency_key = $1
   AND j.journal_type = 'settlement'
   AND a.owner_user_id IS NOT NULL
   AND a.bucket = 'profit'
   AND e.direction = 'credit'`.trim(),
  listLedgerJournalsByUser: `
SELECT j.id::text, j.idempotency_key, j.journal_type, j.reference_type,
       j.reference_id::text, a.owner_user_id::text AS user_id,
       e.amount_usdt::text, j.created_at
  FROM public.ledger_journals j
  JOIN public.ledger_entries e ON e.journal_id = j.id
  JOIN public.ledger_accounts a ON a.id = e.account_id
 WHERE a.owner_user_id = $1::uuid
   AND j.journal_type = 'settlement'
   AND a.bucket = 'profit'
   AND e.direction = 'credit'
 ORDER BY j.created_at ASC`.trim(),
  poolBalance: `
SELECT balance_usdt::text AS balance_usdt
  FROM public.ledger_accounts
 WHERE code = 'SYS:OPPORTUNITY_POOL'`.trim(),
  bucketSnapshot: `
SELECT bucket, balance_usdt::text AS balance_usdt
  FROM public.ledger_accounts
 WHERE owner_user_id = $1::uuid
   AND bucket IN ('principal', 'profit', 'locked', 'practice')`.trim(),
});

function isOpsDbTarget(env) {
  return isolated.isOpsDbTarget(env || {});
}

function allowsMallPersistWrite(env) {
  return isolated.allowsIsolatedQaPg(env || {});
}

function allowsOpsMallPersist(env) {
  return isOpsDbTarget(env || {});
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
  const ledgerReady =
    Number(r.ledger_journal_table) >= 1 &&
    Number(r.ledger_journal_cols) >= LEDGER_JOURNAL_COLS.length &&
    Number(r.ledger_account_table) >= 1 &&
    Number(r.ledger_entry_table) >= 1 &&
    Number(r.ledger_fingerprint) >= 1 &&
    Number(r.ledger_outbox_table) >= 1;
  const oppMallReady = Number(r.opp_mall_cols) >= OPP_MALL_COLS.length;
  const ready = productReady && participationReady && ledgerReady;
  return {
    ready,
    productReady,
    participationReady,
    journalReady: ledgerReady,
    ledgerReady,
    qaSettlementNotAuthority: true,
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
      LEDGER_JOURNAL_COLS,
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
    requiredCapitalUsdt:
      row.required_capital_usdt != null && row.required_capital_usdt !== ""
        ? String(row.required_capital_usdt)
        : null,
    expectedProfitKrwApprox:
      row.expected_profit_krw_approx != null && row.expected_profit_krw_approx !== ""
        ? String(row.expected_profit_krw_approx)
        : null,
    currency: row.currency || "USDT",
    visibility: row.visibility,
    selectedMemberIds: Array.isArray(row.selected_member_ids)
      ? row.selected_member_ids.map((x) => String(x))
      : [],
    priceConfirmationMemo: row.price_confirmation_memo
      ? String(row.price_confirmation_memo)
      : "",
    revision: Number(row.product_revision || 1),
    registerIdempotencyKey: row.register_idempotency_key || null,
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

async function ensureOperatorUserSurface(q, p) {
  const assetId = "operator_mall:" + String(p.id);
  const imageUrl =
    Array.isArray(p.photos) && p.photos[0]
      ? String(p.photos[0])
      : "https://invalid.local/operator-mall-placeholder";
  const label = String(p.name || "operator");
  try {
    await q.query(SQL.ensureOperatorAsset, [assetId, label, imageUrl]);
  } catch {
    /* asset 표가 없으면 유저면 행만 생략 */
    return;
  }
  const fxId = "operator_mall_fx";
  try {
    await q.query(SQL.ensureOperatorFx, []);
  } catch {
    return;
  }
  try {
    const peek = await q.query(SQL.peekOpportunitySupply, [p.id]);
    const existing = peek.rows[0] && peek.rows[0].supply_source;
    if (existing && String(existing) !== "operator") {
      return;
    }
    if (!existing) {
      await q.query(SQL.insertOperatorOpportunity, [
        p.id,
        assetId,
        p.revision || 1,
        p.payoutAmount,
        p.expectedProfitKrwApprox == null ? null : p.expectedProfitKrwApprox,
        fxId,
        p.requiredCapitalUsdt,
        label,
        imageUrl,
        JSON.stringify({
          compareReady: true,
          operatorMall: true,
        }),
        p.visibility,
        p.selectedMemberIds || [],
        p.priceConfirmationMemo || null,
        p.compositionQty,
        p.revision || 1,
      ]);
    }
  } catch {
    /* 기회 INSERT 실패는 상품 persist 를 뒤집지 않는다 */
  }
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
  let posting = opts && opts.posting;
  if (posting === undefined && db && db.kind === "isolated_qa_pool") {
    posting = ledgerPosting.createMallLedgerPosting(db);
  }
  const stampOpportunity = pre.oppMallReady === true;
  let poolBalance = opts && opts.poolBalance != null ? opts.poolBalance : null;
  const audit = [];

  return {
    ready: true,
    kind: "persist",
    persist: true,
    testOnly: Boolean(opts && opts.testOnly),
    postingKind:
      posting && posting.kind
        ? posting.kind
        : opts && opts.testOnly
          ? "test_only_fallback"
          : "none",
    qaSettlementNotAuthority: true,
    preflight: pre,
    async saveProduct(p) {
      return this.insertProduct(p);
    },
    async insertProduct(p) {
      const runner = async (q) => {
        try {
          await q.query(SQL.insertProduct, [
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
            p.registerIdempotencyKey || null,
            p.requiredCapitalUsdt,
            p.expectedProfitKrwApprox == null ? null : p.expectedProfitKrwApprox,
          ]);
        } catch (err) {
          if (err && err.code === "23505") {
            const replay = await q.query(SQL.findProductByRegisterKey, [
              p.registerIdempotencyKey,
            ]);
            if (replay.rows[0]) return rowToProduct(replay.rows[0]);
          }
          throw err;
        }
        const existing = await q.query(SQL.findProductByRegisterKey, [
          p.registerIdempotencyKey,
        ]);
        if (existing.rows[0] && String(existing.rows[0].id) !== String(p.id)) {
          return rowToProduct(existing.rows[0]);
        }
        if (stampOpportunity) {
          try {
            await q.query(SQL.stampOpportunity, [
              p.id,
              p.visibility,
              p.selectedMemberIds || [],
              p.priceConfirmationMemo || null,
              p.compositionQty,
              p.revision,
              p.payoutAmount,
              p.expectedProfitKrwApprox == null ? null : p.expectedProfitKrwApprox,
              p.requiredCapitalUsdt,
            ]);
          } catch {
            /* 기회 행이 없으면 스탬프만 생략. 상품 persist 는 유지 */
          }
          await ensureOperatorUserSurface(q, p);
        }
        return p;
      };
      if (typeof db.withTransaction === "function") {
        return db.withTransaction(runner);
      }
      return runner(db);
    },
    async findProductByRegisterKey(key) {
      const r = await db.query(SQL.findProductByRegisterKey, [key]);
      return rowToProduct(r.rows[0]);
    },
    async updateProductIfRevision(id, expectedRevision, next) {
      const r = await db.query(SQL.updateProductIfRevision, [
        id,
        expectedRevision,
        next.name,
        next.description || "",
        JSON.stringify(next.photos || []),
        next.compositionQty,
        next.payoutAmount,
        next.currency || "USDT",
        next.visibility,
        next.selectedMemberIds || [],
        next.priceConfirmationMemo || null,
        next.revision,
        next.requiredCapitalUsdt,
        next.expectedProfitKrwApprox == null ? null : next.expectedProfitKrwApprox,
      ]);
      if (!r.rows[0]) return false;
      if (stampOpportunity) {
        try {
          await db.query(SQL.stampOpportunity, [
            id,
            next.visibility,
            next.selectedMemberIds || [],
            next.priceConfirmationMemo || null,
            next.compositionQty,
            next.revision,
            next.payoutAmount,
            next.expectedProfitKrwApprox == null ? null : next.expectedProfitKrwApprox,
            next.requiredCapitalUsdt,
          ]);
        } catch {
          /* 스탬프 생략 */
        }
        await ensureOperatorUserSurface(db, { ...next, id });
      }
      return true;
    },
    async getProduct(id) {
      const r = await db.query(SQL.getProduct, [id]);
      return rowToProduct(r.rows[0]);
    },
    async listProducts() {
      const r = await db.query(SQL.listProducts, []);
      return (r.rows || []).map(rowToProduct);
    },
    async listProductsPage({ offset, limit, visibility }) {
      const r = await db.query(SQL.listProductsPage, [
        offset,
        limit,
        visibility || null,
      ]);
      const items = (r.rows || []).map(rowToProduct);
      const nextOffset = items.length === limit ? offset + limit : null;
      return { items, nextOffset };
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
      if (posting && typeof posting.postMallSettlement === "function") {
        return posting.postMallSettlement({
          participationId: j.referenceId,
          userId: j.userId,
          amountUsdt: j.amountUsdt,
          idempotencyKey: j.idempotencyKey,
          fxSnapshotId: j.fxSnapshotId || null,
        });
      }
      if (opts && opts.testOnly === true) {
        try {
          const r = await db.query(SQL.insertJournalTestOnly, [
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
          const row = r.rows[0];
          return row
            ? {
                id: String(row.id),
                journalId: String(row.id),
                amountUsdt: String(row.amount_usdt),
                userId: String(row.user_id),
                reused: false,
                testOnly: true,
              }
            : null;
        } catch (err) {
          if (err && err.code === "23505") {
            const replay = await db.query(SQL.findJournalTestOnly, [j.idempotencyKey]);
            if (replay.rows[0]) {
              return {
                id: String(replay.rows[0].id),
                journalId: String(replay.rows[0].id),
                amountUsdt: String(replay.rows[0].amount_usdt),
                userId: String(replay.rows[0].user_id),
                reused: true,
                testOnly: true,
              };
            }
          }
          throw err;
        }
      }
      const err = new Error("LEDGER_POSTING_REQUIRED");
      err.code = "LEDGER_POSTING_REQUIRED";
      throw err;
    },
    async findJournal(key) {
      if (posting && typeof posting.getByIdempotencyKey === "function") {
        return posting.getByIdempotencyKey(key);
      }
      if (opts && opts.testOnly === true) {
        const r = await db.query(SQL.findJournalTestOnly, [key]);
        const row = r.rows[0];
        if (!row) return null;
        return {
          id: String(row.id),
          idempotencyKey: row.idempotency_key,
          amountUsdt: String(row.amount_usdt),
          userId: String(row.user_id),
          testOnly: true,
        };
      }
      const r = await db.query(SQL.findLedgerJournal, [key]);
      const row = r.rows[0];
      if (!row) return null;
      return {
        id: String(row.id),
        idempotencyKey: row.idempotency_key,
        amountUsdt: String(row.amount_usdt),
        userId: String(row.user_id),
        referenceId: row.reference_id ? String(row.reference_id) : null,
      };
    },
    async listJournalsByUser(userId) {
      if (opts && opts.testOnly === true && !(posting && posting.getByIdempotencyKey)) {
        const r = await db.query(SQL.listJournalsByUserTestOnly, [userId]);
        return (r.rows || []).map((row) => ({
          id: String(row.id),
          idempotencyKey: row.idempotency_key,
          amountUsdt: String(row.amount_usdt),
          userId: String(row.user_id),
          referenceId: row.reference_id ? String(row.reference_id) : null,
          testOnly: true,
        }));
      }
      const r = await db.query(SQL.listLedgerJournalsByUser, [userId]);
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
    async readOfficialBucketSnapshot(userId) {
      const pool = await db.query(SQL.poolBalance);
      const buckets = userId ? await db.query(SQL.bucketSnapshot, [userId]) : { rows: [] };
      const byBucket = {};
      for (const row of buckets.rows || []) {
        byBucket[row.bucket] = String(row.balance_usdt);
      }
      return {
        pool: pool.rows[0] ? String(pool.rows[0].balance_usdt) : null,
        principal: byBucket.principal || "0",
        profit: byBucket.profit || "0",
        locked: byBucket.locked || "0",
        practice: byBucket.practice || "0",
      };
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
      ledger_journal_table: ready ? 1 : 0,
      ledger_journal_cols: ready ? LEDGER_JOURNAL_COLS.length : 0,
      ledger_account_table: ready ? 1 : 0,
      ledger_entry_table: ready ? 1 : 0,
      ledger_fingerprint: ready ? 1 : 0,
      ledger_outbox_table: ready ? 1 : 0,
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
        const key = params[11] || null;
        if (key) {
          for (const cur of state.products.values()) {
            if (cur.register_idempotency_key === key) {
              const e = new Error("duplicate");
              e.code = "23505";
              e.constraint = "operator_mall_products_register_idem_uq";
              throw e;
            }
          }
        }
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
          register_idempotency_key: key,
          required_capital_usdt: params[12],
          expected_profit_krw_approx: params[13],
          supply_source: "operator",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (state.products.has(row.id)) {
          return { rows: [], rowCount: 0 };
        }
        state.products.set(row.id, row);
        return { rows: [row], rowCount: 1 };
      }
      if (
        sql.includes("UPDATE public.operator_mall_products") &&
        sql.includes("product_revision")
      ) {
        const hit = state.products.get(params[0]);
        if (!hit || Number(hit.product_revision) !== Number(params[1])) {
          return { rows: [], rowCount: 0 };
        }
        Object.assign(hit, {
          name: params[2],
          description: params[3],
          photos: JSON.parse(params[4]),
          composition_qty: params[5],
          configured_payout_usdt: params[6],
          currency: params[7],
          visibility: params[8],
          selected_member_ids: params[9],
          price_confirmation_memo: params[10],
          product_revision: params[11],
          required_capital_usdt: params[12],
          expected_profit_krw_approx: params[13],
          updated_at: new Date().toISOString(),
        });
        return { rows: [{ id: hit.id }], rowCount: 1 };
      }
      if (
        sql.includes("FROM public.operator_mall_products") &&
        sql.includes("WHERE register_idempotency_key")
      ) {
        const hit = Array.from(state.products.values()).find(
          (p) => p.register_idempotency_key === params[0],
        );
        return { rows: hit ? [hit] : [], rowCount: hit ? 1 : 0 };
      }
      if (sql.includes("FROM public.operator_mall_products") && sql.includes("WHERE id")) {
        const hit = state.products.get(params[0]);
        return { rows: hit ? [hit] : [], rowCount: hit ? 1 : 0 };
      }
      if (sql.includes("FROM public.operator_mall_products") && sql.includes("OFFSET")) {
        let rows = Array.from(state.products.values());
        if (params[2]) rows = rows.filter((p) => p.visibility === params[2]);
        const offset = Number(params[0] || 0);
        const limit = Number(params[1] || rows.length);
        const slice = rows.slice(offset, offset + limit);
        return { rows: slice, rowCount: slice.length };
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
          expected_profit_usdt: params[6],
          expected_profit_krw_approx: params[7],
          required_capital_usdt: params[8],
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

function officialSqlPaths() {
  return [
    "supabase/migrations/20260916033000_opportunities_supply_source.sql",
    "supabase/migrations/20260916033100_operator_mall_product.sql",
    "supabase/migrations/20260916120000_operator_mall_product_simple_amounts.sql",
  ];
}

async function resolveRuntimeMallPersistStore(env, opts) {
  if (opts && opts.useFake === true) {
    const err = new Error("fake mall persist cannot be runtime store");
    err.code = "FAKE_PERSIST_FORBIDDEN_IN_RUNTIME";
    throw err;
  }
  const opsDb = opts && opts.opsDb;
  if (
    opsDb &&
    typeof opsDb.query === "function" &&
    allowsOpsMallPersist(env || {})
  ) {
    const store = await createPersistMallStore(opsDb, {
      members: (opts && opts.members) || [],
      testOnly: false,
    });
    if (store.ready !== true) {
      return createUnreadyPersistStore("schema_unready");
    }
    store.opsPersist = true;
    store.qaInjection = false;
    store.notProductionPostgresService = false;
    return store;
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
  LEDGER_JOURNAL_COLS,
  OPP_MALL_COLS,
  PRODUCTION_SUPABASE_REF,
  isOpsDbTarget,
  allowsMallPersistWrite,
  allowsOpsMallPersist,
  resolveIsolatedMallPersistUrl,
  resolveRuntimeMallPersistStore,
  evaluateSchemaPreflight,
  preflightMallPersistSchema,
  createPersistMallStore,
  createUnreadyPersistStore,
  createFakePersistMallDb,
  settlementKey,
  draftSqlPath,
  officialSqlPaths,
  ensureOperatorUserSurface,
};

/**
 * public.opportunities 단일 INSERT 경계.
 * Catalog seed · Track A persist · seed CLI 가 이 파일만 재사용한다.
 * market-intelligence 는 이 모듈을 소유하지 않는다.
 */
const crypto = require("crypto");

const ORIGIN = Object.freeze({
  CATALOG_SEED: "catalog_seed",
  TRACK_A: "track_a",
});

const TRACK_A_UUID_NS = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

function deterministicOpportunityUuid(trackAOpportunityId) {
  const hash = crypto
    .createHash("sha1")
    .update(Buffer.from(TRACK_A_UUID_NS.replace(/-/g, ""), "hex"))
    .update(String(trackAOpportunityId || ""), "utf8")
    .digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function insertParams(opp) {
  const pricing = opp.pricing && typeof opp.pricing === "object" ? opp.pricing : {};
  return [
    opp.id || null,
    String(opp.assetId),
    opp.pricingVersion,
    opp.pricedAt,
    opp.expectedProfitUsdt,
    opp.expectedProfitKrwApprox,
    opp.fxSnapshotId,
    opp.estimatedDurationSec,
    opp.aiConfidenceScore,
    opp.difficulty,
    Array.isArray(opp.tags) ? opp.tags : [],
    opp.requiredCapitalUsdt,
    opp.executionMode || "orchestrate",
    Array.isArray(opp.executionPlatforms) ? opp.executionPlatforms : [],
    opp.category,
    opp.assetLabel,
    opp.assetImageUrl,
    opp.assetImageSource,
    opp.assetImageAltKo,
    opp.arbitrageType,
    opp.arbitrageTypeKo,
    JSON.stringify(pricing),
    opp.staleAt,
    opp.status,
    opp.sellSuccessRate ?? null,
    opp.sellSuccessWindowDays ?? null,
    opp.sellSuccessAsOf ?? null,
    opp.riskScore ?? null,
    opp.gradeMismatch === true,
    opp.imageMissing === true,
    opp.capitalBand ?? null,
  ];
}

async function findById(querier, id) {
  const { rows } = await querier.query(
    `SELECT id::text FROM public.opportunities WHERE id = $1::uuid LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function findByAssetId(querier, assetId) {
  const { rows } = await querier.query(
    `SELECT id::text FROM public.opportunities WHERE asset_id = $1 LIMIT 1`,
    [assetId],
  );
  if (rows[0]) return rows[0];
  return null;
}

async function findByTrackAOpportunityId(querier, trackAOpportunityId) {
  const { rows } = await querier.query(
    `SELECT id::text FROM public.opportunities
      WHERE pricing->>'trackAOpportunityId' = $1
      LIMIT 1`,
    [trackAOpportunityId],
  );
  return rows[0] || null;
}

async function countAvailableByOrigin(querier, origin) {
  const { rows } = await querier.query(
    `SELECT count(*)::int AS n
       FROM public.opportunities
      WHERE status = 'available'
        AND pricing->>'origin' = $1`,
    [origin],
  );
  return Number(rows[0]?.n ?? 0);
}

async function loadOpportunityRow(querier, id) {
  const { rows } = await querier.query(
    `SELECT id::text, asset_id, pricing_version, priced_at,
            expected_profit_usdt::text, expected_profit_krw_approx::text,
            fx_snapshot_id, estimated_duration_sec,
            ai_confidence_score::text, difficulty, tags,
            required_capital_usdt::text, execution_mode, execution_platforms,
            category, asset_label, asset_image_url, asset_image_source,
            asset_image_alt_ko, arbitrage_type, arbitrage_type_ko,
            pricing, stale_at, status, capital_band,
            sell_success_rate::text, sell_success_window_days,
            sell_success_as_of, risk_score
       FROM public.opportunities
      WHERE id = $1::uuid`,
    [id],
  );
  return rows[0] || null;
}

async function insertOpportunityRow(querier, opp) {
  const { rows } = await querier.query(
    `INSERT INTO public.opportunities (
       id, asset_id, pricing_version, priced_at, expected_profit_usdt,
       expected_profit_krw_approx, fx_snapshot_id, estimated_duration_sec,
       ai_confidence_score, difficulty, tags, required_capital_usdt,
       execution_mode, execution_platforms, category, asset_label,
       asset_image_url, asset_image_source, asset_image_alt_ko,
       arbitrage_type, arbitrage_type_ko, pricing, stale_at, status,
       sell_success_rate, sell_success_window_days, sell_success_as_of,
       risk_score, grade_mismatch, image_missing, capital_band
     ) VALUES (
       COALESCE($1::uuid, gen_random_uuid()),
       $2,$3,$4::timestamptz,$5::numeric,$6::numeric,$7,$8,
       $9::numeric,$10,$11::text[],$12::numeric,
       $13,$14::text[],$15,$16,
       $17,$18,$19,
       $20,$21,$22::jsonb,$23::timestamptz,$24,
       $25::numeric,$26,$27::timestamptz,
       $28,$29,$30,$31
     )
     RETURNING id::text`,
    insertParams(opp),
  );
  return rows[0] || null;
}

async function insertIfAbsentByAssetId(querier, opp) {
  const existing = await findByAssetId(querier, opp.assetId);
  if (existing) return { inserted: false, idempotent: true, id: existing.id };
  const row = await insertOpportunityRow(querier, opp);
  return { inserted: true, idempotent: false, id: row.id };
}

async function insertIfAbsentByTrackAId(querier, opp) {
  const trackAOpportunityId = String(opp.trackAOpportunityId || "");
  if (!trackAOpportunityId) {
    return { ok: false, inserted: false, reason: "TRACK_A_OPPORTUNITY_ID_REQUIRED" };
  }
  const id = deterministicOpportunityUuid(trackAOpportunityId);
  const existing = await findById(querier, id);
  if (existing) {
    return { ok: true, inserted: false, idempotent: true, id: existing.id };
  }
  const byKey = await findByTrackAOpportunityId(querier, trackAOpportunityId);
  if (byKey) {
    return { ok: true, inserted: false, idempotent: true, id: byKey.id };
  }
  const byAsset = await findByAssetId(querier, opp.assetId);
  if (byAsset) {
    return {
      ok: false,
      inserted: false,
      reason: "ASSET_ALREADY_HAS_OPPORTUNITY",
      id: byAsset.id,
    };
  }
  try {
    const row = await insertOpportunityRow(querier, { ...opp, id });
    return { ok: true, inserted: true, idempotent: false, id: row.id };
  } catch (e) {
    const code = e && e.code ? String(e.code) : "";
    if (code === "23505") {
      const again = await findById(querier, id);
      if (again) {
        return { ok: true, inserted: false, idempotent: true, id: again.id };
      }
    }
    throw e;
  }
}

async function ensureFxSnapshot(querier, snapshot) {
  if (!snapshot || !snapshot.fxSnapshotId) {
    return { ok: false, reason: "FX_SNAPSHOT_REQUIRED" };
  }
  const existing = await querier.query(
    `SELECT id FROM public.fx_snapshots WHERE id = $1 LIMIT 1`,
    [snapshot.fxSnapshotId],
  );
  if (existing.rows[0]) return { ok: true, created: false, id: snapshot.fxSnapshotId };

  const sources = Array.isArray(snapshot.sources) ? snapshot.sources : ["coingecko"];
  await querier.query(
    `INSERT INTO public.fx_snapshots (
       id, usd_krw, source, captured_at, formula_id, sources,
       usdt_usd, usd_krw_frank, gbp_usd, eur_usd, aud_usd, usdt_per_usd,
       rate_provenance
     ) VALUES (
       $1,$2::numeric,$3,$4::timestamptz,$5,$6::text[],
       $7::numeric,$8::numeric,$9::numeric,$10::numeric,$11::numeric,$12::numeric,
       $13::jsonb
     )
     ON CONFLICT (id) DO NOTHING`,
    [
      snapshot.fxSnapshotId,
      snapshot.usdKrw || snapshot.usdtKrw,
      sources[0] || "coingecko",
      snapshot.capturedAt,
      snapshot.formulaId || "cg_usdt_krw",
      sources,
      snapshot.usdtUsd ?? null,
      snapshot.usdKrwFrank ?? null,
      snapshot.gbpUsd ?? null,
      snapshot.eurUsd ?? null,
      snapshot.audUsd ?? null,
      snapshot.usdtPerUsd ?? null,
      JSON.stringify(snapshot.rateProvenance || {}),
    ],
  );
  return { ok: true, created: true, id: snapshot.fxSnapshotId };
}

module.exports = {
  ORIGIN,
  deterministicOpportunityUuid,
  findById,
  findByAssetId,
  findByTrackAOpportunityId,
  countAvailableByOrigin,
  loadOpportunityRow,
  insertOpportunityRow,
  insertIfAbsentByAssetId,
  insertIfAbsentByTrackAId,
  ensureFxSnapshot,
};

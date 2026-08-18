"use strict";
/**
 * Deposit-owned historical FX read.
 * Home POST /api/v1/me/current-fx/approx 를 쓰지 않는다.
 * fx_snapshots.usd_krw = composed usdtKrw = KRW per 1 USDT.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toIso = toIso;
exports.loadLatestDepositFx = loadLatestDepositFx;
exports.loadDepositFxById = loadDepositFxById;
exports.resolveDepositFx = resolveDepositFx;
const FX_SELECT = `id, usd_krw::text AS usd_krw, formula_id, captured_at`;
function toIso(value) {
    if (value == null)
        return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return undefined;
    return date.toISOString();
}
function mapFxRow(row) {
    if (!row?.id || !row.usd_krw)
        return null;
    return {
        id: row.id,
        usdtKrw: row.usd_krw,
        formulaId: row.formula_id ?? null,
        capturedAt: toIso(row.captured_at) ?? null,
    };
}
async function loadLatestDepositFx(db) {
    const latest = await db.query(`SELECT ${FX_SELECT}
       FROM public.fx_snapshots
      ORDER BY captured_at DESC
      LIMIT 1`);
    return latest.rows[0] ? mapFxRow(latest.rows[0]) : null;
}
async function loadDepositFxById(db, fxSnapshotId) {
    const r = await db.query(`SELECT ${FX_SELECT}
       FROM public.fx_snapshots
      WHERE id = $1`, [fxSnapshotId]);
    return r.rows[0] ? mapFxRow(r.rows[0]) : null;
}
async function resolveDepositFx(db, fxSnapshotId) {
    if (fxSnapshotId)
        return loadDepositFxById(db, fxSnapshotId);
    return loadLatestDepositFx(db);
}

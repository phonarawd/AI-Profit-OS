/**
 * Deposit-owned historical FX read.
 * Home display approximation endpoint는 Deposit quote owner가 아니다.
 * fx_snapshots.usd_krw = composed usdtKrw = KRW per 1 USDT.
 */

import type { DbQuerier } from "../db/postgres";

export type DepositFxContext = {
  id: string;
  usdtKrw: string;
  formulaId: string | null;
  capturedAt: string | null;
};

type FxRow = {
  id: string;
  usd_krw: string;
  formula_id: string | null;
  captured_at: Date | string | null;
};

const FX_SELECT = `id, usd_krw::text AS usd_krw, formula_id, captured_at`;

export function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function mapFxRow(row: FxRow): DepositFxContext | null {
  if (!row?.id || !row.usd_krw) return null;
  return {
    id: row.id,
    usdtKrw: row.usd_krw,
    formulaId: row.formula_id ?? null,
    capturedAt: toIso(row.captured_at) ?? null,
  };
}

export async function loadLatestDepositFx(
  db: DbQuerier,
): Promise<DepositFxContext | null> {
  const latest = await db.query<FxRow>(
    `SELECT ${FX_SELECT}
       FROM public.fx_snapshots
      ORDER BY captured_at DESC
      LIMIT 1`,
  );
  return latest.rows[0] ? mapFxRow(latest.rows[0]) : null;
}

export async function loadDepositFxById(
  db: DbQuerier,
  fxSnapshotId: string,
): Promise<DepositFxContext | null> {
  const r = await db.query<FxRow>(
    `SELECT ${FX_SELECT}
       FROM public.fx_snapshots
      WHERE id = $1`,
    [fxSnapshotId],
  );
  return r.rows[0] ? mapFxRow(r.rows[0]) : null;
}

export async function resolveDepositFx(
  db: DbQuerier,
  fxSnapshotId?: string,
): Promise<DepositFxContext | null> {
  if (fxSnapshotId) return loadDepositFxById(db, fxSnapshotId);
  return loadLatestDepositFx(db);
}

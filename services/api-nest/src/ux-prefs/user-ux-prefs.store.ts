/**
 * user_ux_prefs SQL. Nest 데코레이터 없이 테스트 가능.
 */

import type { UserUxPrefsV1 } from "./user-ux-prefs.defaults";
import type { UxPrefsPatch } from "./user-ux-prefs.parse";

export type UxPrefsQuerier = {
  query: (
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: PrefsRow[]; rowCount: number | null }>;
};

export type PrefsRow = {
  user_id: string;
  tone_band: string;
  font_scale: string;
  deposit_pref: string;
  updated_at: Date | string;
};

export class UxPrefsUnavailableError extends Error {
  constructor() {
    super("UX_PREFS_UNAVAILABLE");
    this.name = "UxPrefsUnavailableError";
  }
}

export function mapUxPrefsRow(
  row: PrefsRow | undefined,
  userId: string,
): UserUxPrefsV1 | null {
  if (!row) return null;
  const tone = row.tone_band;
  const scale = row.font_scale;
  const deposit = row.deposit_pref;
  if (
    (tone !== "young" && tone !== "mid" && tone !== "senior") ||
    (scale !== "md" && scale !== "lg" && scale !== "xl") ||
    (deposit !== "usdt" && deposit !== "krw")
  ) {
    return null;
  }
  const updatedAt =
    row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : String(row.updated_at ?? "");
  if (!updatedAt) return null;
  return {
    userId: row.user_id || userId,
    toneBand: tone,
    fontScale: scale,
    depositPref: deposit,
    updatedAt,
  };
}

export async function ensureUxPrefsRow(
  db: UxPrefsQuerier,
  userId: string,
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO public.user_ux_prefs (user_id)
       VALUES ($1::uuid)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
  } catch {
    throw new UxPrefsUnavailableError();
  }
}

export async function readUxPrefsForUser(
  db: UxPrefsQuerier,
  userId: string,
): Promise<UserUxPrefsV1> {
  await ensureUxPrefsRow(db, userId);
  let row: PrefsRow | undefined;
  try {
    const res = await db.query(
      `SELECT user_id::text, tone_band, font_scale, deposit_pref, updated_at
         FROM public.user_ux_prefs
        WHERE user_id = $1::uuid`,
      [userId],
    );
    row = res.rows[0];
  } catch {
    throw new UxPrefsUnavailableError();
  }
  const mapped = mapUxPrefsRow(row, userId);
  if (!mapped) throw new UxPrefsUnavailableError();
  return mapped;
}

export async function writeUxPrefsForUser(
  db: UxPrefsQuerier,
  userId: string,
  patch: UxPrefsPatch,
): Promise<UserUxPrefsV1> {
  const current = await readUxPrefsForUser(db, userId);
  const next = {
    toneBand: patch.toneBand ?? current.toneBand,
    fontScale: patch.fontScale ?? current.fontScale,
    depositPref: patch.depositPref ?? current.depositPref,
  };
  try {
    await db.query(
      `UPDATE public.user_ux_prefs SET
         tone_band = $2,
         font_scale = $3,
         deposit_pref = $4,
         updated_at = now()
       WHERE user_id = $1::uuid`,
      [userId, next.toneBand, next.fontScale, next.depositPref],
    );
  } catch {
    throw new UxPrefsUnavailableError();
  }
  return readUxPrefsForUser(db, userId);
}

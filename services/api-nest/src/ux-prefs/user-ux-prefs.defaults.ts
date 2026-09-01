/**
 * UI §38.9·§50.1 — user_ux_prefs 열 기본값.
 * DDL DEFAULT와 동일. GET이 행을 못 읽으면 이 값을 성공처럼 돌려주지 않는다.
 */

export const UX_TONE_BANDS = ["young", "mid", "senior"] as const;
export const UX_FONT_SCALES = ["md", "lg", "xl"] as const;
export const UX_DEPOSIT_PREFS = ["usdt", "krw"] as const;

export type UxToneBand = (typeof UX_TONE_BANDS)[number];
export type UxFontScale = (typeof UX_FONT_SCALES)[number];
export type UxDepositPref = (typeof UX_DEPOSIT_PREFS)[number];

export type UserUxPrefsV1 = {
  userId: string;
  toneBand: UxToneBand;
  fontScale: UxFontScale;
  depositPref: UxDepositPref;
  updatedAt: string;
};

export const USER_UX_PREFS_DEFAULTS = Object.freeze({
  toneBand: "mid" as UxToneBand,
  fontScale: "md" as UxFontScale,
  depositPref: "usdt" as UxDepositPref,
});

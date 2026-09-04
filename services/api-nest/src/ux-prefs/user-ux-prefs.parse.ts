/**
 * user_ux_prefs — fail-closed 파서. JWT userId만 권위.
 * body.userId / updatedAt 은 무시한다. 그 외 키는 거부.
 */

import type {
  UxDepositPref,
  UxFontScale,
  UxToneBand,
  UserUxPrefsV1,
} from "./user-ux-prefs.defaults";

const UX_TONE_BANDS = ["young", "mid", "senior"] as const;
const UX_FONT_SCALES = ["md", "lg", "xl"] as const;
const UX_DEPOSIT_PREFS = ["usdt", "krw"] as const;

export type UxPrefsPatch = {
  toneBand?: UxToneBand;
  fontScale?: UxFontScale;
  depositPref?: UxDepositPref;
};

const KNOWN_BODY_KEYS = new Set([
  "toneBand",
  "fontScale",
  "depositPref",
  "userId",
  "updatedAt",
]);

function isToneBand(v: unknown): v is UxToneBand {
  return typeof v === "string" && (UX_TONE_BANDS as readonly string[]).includes(v);
}

function isFontScale(v: unknown): v is UxFontScale {
  return typeof v === "string" && (UX_FONT_SCALES as readonly string[]).includes(v);
}

function isDepositPref(v: unknown): v is UxDepositPref {
  return typeof v === "string" && (UX_DEPOSIT_PREFS as readonly string[]).includes(v);
}

export function parseUxPrefsPatch(raw: unknown): UxPrefsPatch | { error: string } {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "UX_PREFS_MALFORMED" };
  }
  const o = raw as Record<string, unknown>;
  for (const key of Object.keys(o)) {
    if (!KNOWN_BODY_KEYS.has(key)) {
      return { error: "UX_PREFS_MALFORMED" };
    }
  }

  const patch: UxPrefsPatch = {};
  if (Object.prototype.hasOwnProperty.call(o, "toneBand")) {
    if (!isToneBand(o.toneBand)) return { error: "UX_PREFS_MALFORMED" };
    patch.toneBand = o.toneBand;
  }
  if (Object.prototype.hasOwnProperty.call(o, "fontScale")) {
    if (!isFontScale(o.fontScale)) return { error: "UX_PREFS_MALFORMED" };
    patch.fontScale = o.fontScale;
  }
  if (Object.prototype.hasOwnProperty.call(o, "depositPref")) {
    if (!isDepositPref(o.depositPref)) return { error: "UX_PREFS_MALFORMED" };
    patch.depositPref = o.depositPref;
  }

  if (
    patch.toneBand === undefined &&
    patch.fontScale === undefined &&
    patch.depositPref === undefined
  ) {
    return { error: "UX_PREFS_MALFORMED" };
  }
  return patch;
}

export function parseStoredUxPrefs(
  raw: unknown,
  expectedUserId?: string,
): UserUxPrefsV1 | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (!isToneBand(o.toneBand) || !isFontScale(o.fontScale) || !isDepositPref(o.depositPref)) {
    return null;
  }
  const userId = typeof o.userId === "string" && o.userId.length > 0 ? o.userId : "";
  if (!userId) return null;
  if (expectedUserId && userId !== expectedUserId) return null;
  const updatedAt =
    typeof o.updatedAt === "string" && o.updatedAt.length > 0 ? o.updatedAt : "";
  if (!updatedAt) return null;
  return {
    userId,
    toneBand: o.toneBand,
    fontScale: o.fontScale,
    depositPref: o.depositPref,
    updatedAt,
  };
}

/**
 * user UX prefs — 서버 권위. 로컬 기본값을 ready처럼 쓰지 않는다.
 */

export type PrefsReadView = "loading" | "ready" | "unauthorized" | "unavailable";

export function classifyUxPrefsHttp(
  status: number,
): Exclude<PrefsReadView, "loading" | "ready"> {
  if (status === 401 || status === 403) return "unauthorized";
  return "unavailable";
}

export type UxToneBand = "young" | "mid" | "senior";
export type UxFontScale = "md" | "lg" | "xl";
export type UxDepositPref = "usdt" | "krw";

export type UserUxPrefs = {
  toneBand: UxToneBand;
  fontScale: UxFontScale;
  depositPref: UxDepositPref;
};

export const UX_FONT_SCALE_CACHE_KEY = "peotteok_ux_font_scale";
export const UX_TONE_BAND_CACHE_KEY = "peotteok_tone_band";

const TONE = new Set<UxToneBand>(["young", "mid", "senior"]);
const SCALE = new Set<UxFontScale>(["md", "lg", "xl"]);
const DEPOSIT = new Set<UxDepositPref>(["usdt", "krw"]);

export function parseUserUxPrefs(raw: unknown): UserUxPrefs | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.toneBand !== "string" || !TONE.has(o.toneBand as UxToneBand)) return null;
  if (typeof o.fontScale !== "string" || !SCALE.has(o.fontScale as UxFontScale)) return null;
  if (typeof o.depositPref !== "string" || !DEPOSIT.has(o.depositPref as UxDepositPref)) {
    return null;
  }
  return {
    toneBand: o.toneBand as UxToneBand,
    fontScale: o.fontScale as UxFontScale,
    depositPref: o.depositPref as UxDepositPref,
  };
}

export function uxPrefsEqual(a: UserUxPrefs, b: UserUxPrefs): boolean {
  return (
    a.toneBand === b.toneBand &&
    a.fontScale === b.fontScale &&
    a.depositPref === b.depositPref
  );
}

export function readFontScaleCache(): UxFontScale | null {
  try {
    const raw = localStorage.getItem(UX_FONT_SCALE_CACHE_KEY);
    if (raw === "md" || raw === "lg" || raw === "xl") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeFontScaleCache(scale: UxFontScale): void {
  try {
    localStorage.setItem(UX_FONT_SCALE_CACHE_KEY, scale);
  } catch {
    /* ignore */
  }
}

export function writeToneBandCache(band: UxToneBand): void {
  try {
    localStorage.setItem(UX_TONE_BAND_CACHE_KEY, band);
  } catch {
    /* ignore */
  }
}

export type DepositTabSource = "url" | "pref" | "default" | "loading";

export function resolveDepositTab(input: {
  urlTab: string | null;
  stored: UxDepositPref | null;
  prefsView: PrefsReadView;
}): { tab: UxDepositPref; source: DepositTabSource } {
  if (input.urlTab === "usdt" || input.urlTab === "krw") {
    return { tab: input.urlTab, source: "url" };
  }
  if (input.prefsView === "loading") {
    return { tab: "usdt", source: "loading" };
  }
  if (input.prefsView === "ready" && (input.stored === "usdt" || input.stored === "krw")) {
    return { tab: input.stored, source: "pref" };
  }
  return { tab: "usdt", source: "default" };
}

export type UxPrefsPutResult = { ok: true; body: unknown } | { ok: false };

export function createUxPrefsWriteController(opts: {
  put: (prefs: UserUxPrefs) => Promise<UxPrefsPutResult>;
  onConfirmed: (prefs: UserUxPrefs) => void;
  onRollback: (prefs: UserUxPrefs) => void;
}) {
  let inFlight = false;
  let queued: UserUxPrefs | null = null;
  let confirmed: UserUxPrefs | null = null;

  function setConfirmed(prefs: UserUxPrefs): void {
    confirmed = prefs;
  }

  async function drain(): Promise<"ok" | "failed"> {
    while (queued) {
      const intent = queued;
      queued = null;
      const res = await opts.put(intent);
      if (queued) {
        continue;
      }
      if (!res.ok) {
        if (confirmed) opts.onRollback(confirmed);
        return "failed";
      }
      const parsed = parseUserUxPrefs(res.body);
      if (!parsed) {
        if (confirmed) opts.onRollback(confirmed);
        return "failed";
      }
      confirmed = parsed;
      opts.onConfirmed(parsed);
    }
    return "ok";
  }

  async function submit(next: UserUxPrefs): Promise<"skipped" | "queued" | "ok" | "failed"> {
    if (confirmed && uxPrefsEqual(confirmed, next) && !inFlight) return "skipped";
    queued = next;
    if (inFlight) return "queued";
    inFlight = true;
    try {
      return await drain();
    } finally {
      inFlight = false;
    }
  }

  return {
    submit,
    setConfirmed,
    isInFlight: () => inFlight,
  };
}

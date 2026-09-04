/**
 * 알림 prefs — 완전한 boolean만 ready. PUT은 1개 in-flight + 최신 intent.
 */

export type NotifyPrefs = {
  master: boolean;
  opportunity: boolean;
  wallet: boolean;
  notice: boolean;
  campaign: boolean;
  opsMessage: boolean;
  strategyMatch: boolean;
};

export const NOTIFY_PREF_KEYS = [
  "master",
  "opportunity",
  "wallet",
  "notice",
  "campaign",
  "opsMessage",
  "strategyMatch",
] as const;

export type PrefsReadView = "loading" | "ready" | "unauthorized" | "unavailable";

export function parseNotificationPrefs(raw: unknown): NotifyPrefs | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out = {} as NotifyPrefs;
  for (const key of NOTIFY_PREF_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(o, key)) return null;
    if (typeof o[key] !== "boolean") return null;
    out[key] = o[key];
  }
  return out;
}

export function classifyPrefsHttp(status: number): Exclude<PrefsReadView, "loading" | "ready"> {
  if (status === 401 || status === 403) return "unauthorized";
  return "unavailable";
}

export function prefsEqual(a: NotifyPrefs, b: NotifyPrefs): boolean {
  return NOTIFY_PREF_KEYS.every((key) => a[key] === b[key]);
}

export type PrefsPutResult = { ok: true; body: unknown } | { ok: false };

export function createPrefsWriteController(opts: {
  put: (prefs: NotifyPrefs) => Promise<PrefsPutResult>;
  onConfirmed: (prefs: NotifyPrefs) => void;
  onRollback: (prefs: NotifyPrefs) => void;
}) {
  let inFlight = false;
  let queued: NotifyPrefs | null = null;
  let confirmed: NotifyPrefs | null = null;

  function setConfirmed(prefs: NotifyPrefs): void {
    confirmed = prefs;
  }

  async function drain(): Promise<"ok" | "failed"> {
    while (queued) {
      const intent = queued;
      queued = null;
      const res = await opts.put(intent);
      if (!res.ok) {
        if (confirmed) opts.onRollback(confirmed);
        return "failed";
      }
      const parsed = parseNotificationPrefs(res.body);
      if (!parsed) {
        if (confirmed) opts.onRollback(confirmed);
        return "failed";
      }
      confirmed = parsed;
      opts.onConfirmed(parsed);
    }
    return "ok";
  }

  async function submit(next: NotifyPrefs): Promise<"skipped" | "queued" | "ok" | "failed"> {
    if (confirmed && prefsEqual(confirmed, next) && !inFlight) return "skipped";
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

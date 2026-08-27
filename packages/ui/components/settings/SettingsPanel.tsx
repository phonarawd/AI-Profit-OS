"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { applyFontScale, type FontScaleKey } from "../../tokens/font-scale";
import { T } from "../../copy/ko";
import { useOptionalToast } from "../toast";

type ToneBand = "young" | "mid" | "senior";
type DepositPref = "usdt" | "krw";
type PrefsView = "loading" | "ready" | "unavailable";

export type NotifyPrefs = {
  master: boolean;
  opportunity: boolean;
  wallet: boolean;
  notice: boolean;
  campaign: boolean;
  opsMessage: boolean;
  strategyMatch: boolean;
};

const PREF_KEYS: (keyof NotifyPrefs)[] = [
  "master",
  "opportunity",
  "wallet",
  "notice",
  "campaign",
  "opsMessage",
  "strategyMatch",
];

const NOTIFY_KEYS: { key: keyof NotifyPrefs; label: string }[] = [
  { key: "master", label: T.settings.notify.master },
  { key: "opportunity", label: T.settings.notify.opportunity },
  { key: "wallet", label: T.settings.notify.wallet },
  { key: "notice", label: T.settings.notify.notice },
  { key: "campaign", label: T.settings.notify.campaign },
  { key: "opsMessage", label: T.settings.notify.opsMessage },
  { key: "strategyMatch", label: T.settings.notify.strategyMatch },
];

const prefsWriteState: {
  confirmed: NotifyPrefs | null;
  desired: NotifyPrefs | null;
  queued: NotifyPrefs | null;
  inFlight: boolean;
} = {
  confirmed: null,
  desired: null,
  queued: null,
  inFlight: false,
};

export function parseNotificationPrefs(raw: unknown): NotifyPrefs | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const rec = raw as Record<string, unknown>;
  if (typeof rec.userId !== "string" || rec.userId.trim() === "") {
    return null;
  }
  const prefs = {} as NotifyPrefs;
  for (const key of PREF_KEYS) {
    const value = rec[key];
    if (typeof value !== "boolean") return null;
    prefs[key] = value;
  }
  return prefs;
}

/**
 * SettingsPanel — §50.1 fontScale 3단 · toneBand · depositPref · §50.1n 알림 · Light 토글 0
 */
export function SettingsPanel({
  onPrefsAuthFailure,
}: {
  onPrefsAuthFailure?: () => void;
}) {
  const toast = useOptionalToast();
  const [fontScale, setFontScale] = useState<FontScaleKey>("md");
  const [toneBand, setToneBand] = useState<ToneBand>("mid");
  const [depositPref, setDepositPref] = useState<DepositPref>("usdt");
  const [prefsView, setPrefsView] = useState<PrefsView>(() =>
    prefsWriteState.desired ? "ready" : "loading",
  );
  const [notify, setNotify] = useState<NotifyPrefs | null>(
    () => prefsWriteState.desired,
  );
  const onPrefsAuthFailureRef = useRef(onPrefsAuthFailure);
  onPrefsAuthFailureRef.current = onPrefsAuthFailure;

  useEffect(() => {
    let cancelled = false;
    if (!prefsWriteState.inFlight && !prefsWriteState.queued) {
      prefsWriteState.confirmed = null;
      prefsWriteState.desired = null;
    }
    async function loadPrefs() {
      try {
        const res = await fetch("/api/v1/me/notification-prefs", {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (cancelled) return;
        if (res.status === 401 || res.status === 403) {
          setNotify(null);
          setPrefsView("unavailable");
          onPrefsAuthFailureRef.current?.();
          return;
        }
        if (!res.ok) {
          setNotify(null);
          setPrefsView("unavailable");
          return;
        }
        let raw: unknown = null;
        try {
          raw = await res.json();
        } catch {
          setNotify(null);
          setPrefsView("unavailable");
          return;
        }
        const parsed = parseNotificationPrefs(raw);
        if (!parsed) {
          setNotify(null);
          setPrefsView("unavailable");
          return;
        }
        if (
          prefsWriteState.inFlight ||
          prefsWriteState.queued ||
          prefsWriteState.desired
        ) {
          const keep = prefsWriteState.desired ?? parsed;
          setNotify(keep);
          setPrefsView("ready");
          return;
        }
        prefsWriteState.confirmed = parsed;
        prefsWriteState.desired = parsed;
        setNotify(parsed);
        setPrefsView("ready");
      } catch {
        if (cancelled) return;
        if (prefsWriteState.desired) {
          setNotify(prefsWriteState.desired);
          setPrefsView("ready");
          return;
        }
        setNotify(null);
        setPrefsView("unavailable");
      }
    }
    void loadPrefs();
    return () => {
      cancelled = true;
    };
  }, []);

  async function flushPrefsWrite() {
    if (prefsWriteState.inFlight) return;
    prefsWriteState.inFlight = true;
    try {
      while (prefsWriteState.queued) {
        const sending = prefsWriteState.queued;
        prefsWriteState.queued = null;
        try {
          const res = await fetch("/api/v1/me/notification-prefs", {
            method: "PUT",
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(sending),
          });
          if (res.status === 401 || res.status === 403) {
            prefsWriteState.desired = prefsWriteState.confirmed;
            prefsWriteState.queued = null;
            setNotify(prefsWriteState.confirmed);
            if (!prefsWriteState.confirmed) setPrefsView("unavailable");
            onPrefsAuthFailureRef.current?.();
            return;
          }
          if (!res.ok) {
            throw new Error("prefs_put_failed");
          }
          prefsWriteState.confirmed = sending;
          if (prefsWriteState.desired === sending) {
            setNotify(sending);
          }
        } catch {
          if (prefsWriteState.queued) continue;
          if (prefsWriteState.desired !== sending) continue;
          prefsWriteState.desired = prefsWriteState.confirmed;
          setNotify(prefsWriteState.confirmed);
          if (!prefsWriteState.confirmed) setPrefsView("unavailable");
        }
      }
    } finally {
      prefsWriteState.inFlight = false;
      if (prefsWriteState.queued) void flushPrefsWrite();
    }
  }

  function toggleNotify(key: keyof NotifyPrefs) {
    if (prefsView !== "ready" && !prefsWriteState.desired) return;
    const current = prefsWriteState.desired;
    if (!current) return;
    const next = { ...current, [key]: !current[key] };
    prefsWriteState.desired = next;
    prefsWriteState.queued = next;
    setNotify(next);
    setPrefsView("ready");
    void flushPrefsWrite();
  }

  const onFont = (next: FontScaleKey) => {
    setFontScale(next);
    if (typeof document !== "undefined") applyFontScale(next);
    toast?.showToast({ code: "FONT_SCALE_CHANGED" });
  };

  const prefsReady = prefsView === "ready" && notify != null;

  return (
    <main
      className="p-6 text-lux-text"
      data-testid="settings-panel"
      data-theme-toggle-allowed="false"
    >
      <h1 className="text-xl font-semibold">{T.settings.title}</h1>

      <section
        className="mt-6"
        data-testid="settings-notify"
        id="notify"
        data-prefs-view={prefsView}
        data-notify-default-all-on={String(T.settings.notify.defaultAllOn)}
      >
        <h2 className="text-sm font-semibold">{T.settings.notify.label}</h2>
        <p className="mt-1 text-xs text-lux-text-muted">
          {T.settings.notify.offPushOnlyNote}
        </p>
        {prefsView === "loading" ? (
          <p
            className="mt-3 text-sm text-lux-text-muted"
            data-testid="settings-notify-status"
            role="status"
          >
            {T.settings.notify.loading}
          </p>
        ) : null}
        {prefsView === "unavailable" ? (
          <p
            className="mt-3 text-sm text-lux-text-muted"
            data-testid="settings-notify-status"
            role="status"
          >
            {T.settings.notify.unavailable}
          </p>
        ) : null}
        {prefsReady ? (
          <ul className="mt-3 space-y-2">
            {NOTIFY_KEYS.map(({ key, label }) => (
              <li key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm" id={`notify-label-${key}`}>
                  {label}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-labelledby={`notify-label-${key}`}
                  aria-checked={notify[key]}
                  data-notify-channel={key}
                  className={[
                    "touch-target rounded-lux-md border px-3 py-2 text-sm",
                    notify[key]
                      ? "border-lux-accent text-lux-accent"
                      : "border-lux-border text-lux-text-muted",
                  ].join(" ")}
                  onClick={() => void toggleNotify(key)}
                >
                  {notify[key] ? T.settings.notify.on : T.settings.notify.off}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mt-6" data-testid="settings-font-scale">
        <h2 className="text-sm font-semibold">{T.settings.fontScale.label}</h2>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup">
          {(
            [
              ["md", T.settings.fontScale.md],
              ["lg", T.settings.fontScale.lg],
              ["xl", T.settings.fontScale.xl],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={fontScale === key}
              data-font-scale-option={key}
              className={[
                "touch-target rounded-lux-md border px-3 py-2 text-sm",
                fontScale === key
                  ? "border-lux-accent text-lux-accent"
                  : "border-lux-border text-lux-text",
              ].join(" ")}
              onClick={() => onFont(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6" data-testid="settings-tone-band">
        <h2 className="text-sm font-semibold">{T.settings.toneBand.label}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              ["young", T.settings.toneBand.young],
              ["mid", T.settings.toneBand.mid],
              ["senior", T.settings.toneBand.senior],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              data-tone-band={key}
              className={[
                "touch-target rounded-lux-md border px-3 py-2 text-sm",
                toneBand === key
                  ? "border-lux-accent text-lux-accent"
                  : "border-lux-border",
              ].join(" ")}
              onClick={() => setToneBand(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6" data-testid="settings-deposit-pref">
        <h2 className="text-sm font-semibold">{T.settings.depositPref.label}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              ["usdt", T.settings.depositPref.usdt],
              ["krw", T.settings.depositPref.krw],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              data-deposit-pref={key}
              className={[
                "touch-target rounded-lux-md border px-3 py-2 text-sm",
                depositPref === key
                  ? "border-lux-accent text-lux-accent"
                  : "border-lux-border",
              ].join(" ")}
              onClick={() => setDepositPref(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">{T.settings.viewStyle.label}</h2>
        <p className="mt-2 text-sm text-lux-text-muted">
          {T.settings.viewStyle.darkFixed}
        </p>
      </section>

      <section className="mt-6" data-testid="settings-legal-links">
        <h2 className="text-sm font-semibold">{T.settings.legalLinks}</h2>
        <ul className="mt-2 space-y-2 text-sm">
          <li>
            <Link href="/me/legal/terms" className="text-lux-accent underline">
              {T.legal.termsTitle}
            </Link>
          </li>
          <li>
            <Link href="/me/legal/privacy" className="text-lux-accent underline">
              {T.legal.privacyTitle}
            </Link>
          </li>
          <li>
            <Link href="/me/legal/oss" className="text-lux-accent underline">
              {T.legal.ossTitle}
            </Link>
          </li>
          <li>
            <Link href="/me/legal/license" className="text-lux-accent underline">
              {T.legal.licenseTitle}
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}

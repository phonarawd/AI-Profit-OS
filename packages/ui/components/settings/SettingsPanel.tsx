"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { applyFontScale, type FontScaleKey } from "../../tokens/font-scale";
import { T } from "../../copy/ko";
import { useOptionalToast } from "../toast";

type ToneBand = "young" | "mid" | "senior";
type DepositPref = "usdt" | "krw";

type NotifyPrefs = {
  master: boolean;
  opportunity: boolean;
  wallet: boolean;
  notice: boolean;
  campaign: boolean;
  opsMessage: boolean;
  strategyMatch: boolean;
};

const NOTIFY_KEYS: { key: keyof NotifyPrefs; label: string }[] = [
  { key: "master", label: T.settings.notify.master },
  { key: "opportunity", label: T.settings.notify.opportunity },
  { key: "wallet", label: T.settings.notify.wallet },
  { key: "notice", label: T.settings.notify.notice },
  { key: "campaign", label: T.settings.notify.campaign },
  { key: "opsMessage", label: T.settings.notify.opsMessage },
  { key: "strategyMatch", label: T.settings.notify.strategyMatch },
];

const DEFAULT_PREFS: NotifyPrefs = {
  master: true,
  opportunity: true,
  wallet: true,
  notice: true,
  campaign: true,
  opsMessage: true,
  strategyMatch: true,
};

/**
 * SettingsPanel — §50.1 fontScale 3단 · toneBand · depositPref · §50.1n 알림 · Light 토글 0
 */
export function SettingsPanel() {
  const toast = useOptionalToast();
  const [fontScale, setFontScale] = useState<FontScaleKey>("md");
  const [toneBand, setToneBand] = useState<ToneBand>("mid");
  const [depositPref, setDepositPref] = useState<DepositPref>("usdt");
  const [notify, setNotify] = useState<NotifyPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    let cancelled = false;
    async function loadPrefs() {
      try {
        const res = await fetch("/api/v1/me/notification-prefs", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as Partial<NotifyPrefs>;
        if (cancelled) return;
        setNotify({
          master: json.master !== false,
          opportunity: json.opportunity !== false,
          wallet: json.wallet !== false,
          notice: json.notice !== false,
          campaign: json.campaign !== false,
          opsMessage: json.opsMessage !== false,
          strategyMatch: json.strategyMatch !== false,
        });
      } catch {
        /* keep defaults ALL ON */
      }
    }
    void loadPrefs();
    return () => {
      cancelled = true;
    };
  }, []);

  const onFont = (next: FontScaleKey) => {
    setFontScale(next);
    if (typeof document !== "undefined") applyFontScale(next);
    toast?.showToast({ code: "FONT_SCALE_CHANGED" });
  };

  async function toggleNotify(key: keyof NotifyPrefs) {
    const next = { ...notify, [key]: !notify[key] };
    setNotify(next);
    try {
      await fetch("/api/v1/me/notification-prefs", {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(next),
      });
    } catch {
      /* optimistic UI */
    }
  }

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
        data-notify-default-all-on={String(T.settings.notify.defaultAllOn)}
      >
        <h2 className="text-sm font-semibold">{T.settings.notify.label}</h2>
        <p className="mt-1 text-xs text-lux-text-muted">
          {T.settings.notify.offPushOnlyNote}
        </p>
        <ul className="mt-3 space-y-2">
          {NOTIFY_KEYS.map(({ key, label }) => (
            <li key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm">{label}</span>
              <button
                type="button"
                role="switch"
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
                {notify[key] ? "켜짐" : "꺼짐"}
              </button>
            </li>
          ))}
        </ul>
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

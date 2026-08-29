"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { applyFontScale, type FontScaleKey } from "../../tokens/font-scale";
import { T } from "../../copy/ko";
import { useOptionalToast } from "../toast";


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
  const [notify, setNotify] = useState<NotifyPrefs>(DEFAULT_PREFS);
  const [saveView, setSaveView] = useState<"idle" | "saving" | "success" | "save_failed">("idle");

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
    const prev = notify;
    const next = { ...notify, [key]: !notify[key] };
    setSaveView("saving");
    setNotify(next);
    try {
      const res = await fetch("/api/v1/me/notification-prefs", {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        setNotify(prev);
        setSaveView("save_failed");
        toast?.showToast({ code: "NETWORK_ERROR" });
        return;
      }
      setSaveView("success");
    } catch {
      setNotify(prev);
      setSaveView("save_failed");
      toast?.showToast({ code: "NETWORK_ERROR" });
    }
  }

  return (
    <main
      className="p-6 text-pd-text"
      data-testid="settings-panel"
      data-theme-toggle-allowed="false"
    >
      <h1 className="text-xl font-semibold">{T.settings.title}</h1>
      <p className="sr-only" aria-live="polite" data-testid="settings-save-status">
        {saveView === "saving"
          ? "저장 중"
          : saveView === "save_failed"
            ? "저장하지 못했어요"
            : saveView === "success"
              ? "저장했어요"
              : ""}
      </p>
      {saveView === "save_failed" ? (
        <p className="mt-3 text-sm text-pd-danger" role="alert">
          저장하지 못했어요. 다시 시도해 주세요.
        </p>
      ) : null}

      <section
        className="mt-6"
        data-testid="settings-notify"
        id="notify"
        data-notify-default-all-on={String(T.settings.notify.defaultAllOn)}
      >
        <h2 className="text-sm font-semibold">{T.settings.notify.label}</h2>
        <p className="mt-1 text-xs text-pd-text-muted">
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
                  "touch-target rounded-pd-md border px-3 py-2 text-sm",
                  notify[key]
                    ? "border-pd-accent text-pd-accent"
                    : "border-pd-border text-pd-text-muted",
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
                "touch-target rounded-pd-md border px-3 py-2 text-sm",
                fontScale === key
                  ? "border-pd-accent text-pd-accent"
                  : "border-pd-border text-pd-text",
              ].join(" ")}
              onClick={() => onFont(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">{T.settings.viewStyle.label}</h2>
        <p className="mt-2 text-sm text-pd-text-muted">
          {T.settings.viewStyle.darkFixed}
        </p>
      </section>

      <section className="mt-6" data-testid="settings-legal-links">
        <h2 className="text-sm font-semibold">{T.settings.legalLinks}</h2>
        <ul className="mt-2 space-y-2 text-sm">
          <li>
            <Link href="/me/legal/terms" className="text-pd-accent underline">
              {T.legal.termsTitle}
            </Link>
          </li>
          <li>
            <Link href="/me/legal/privacy" className="text-pd-accent underline">
              {T.legal.privacyTitle}
            </Link>
          </li>
          <li>
            <Link href="/me/legal/oss" className="text-pd-accent underline">
              {T.legal.ossTitle}
            </Link>
          </li>
          <li>
            <Link href="/me/legal/license" className="text-pd-accent underline">
              {T.legal.licenseTitle}
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}

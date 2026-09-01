"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { applyFontScale } from "../../tokens/font-scale";
import { T } from "../../copy/ko";
import { useOptionalToast } from "../toast";
import {
  classifyPrefsHttp,
  createPrefsWriteController,
  parseNotificationPrefs,
  type NotifyPrefs,
  type PrefsReadView,
} from "./notification-prefs-state";
import {
  createUxPrefsWriteController,
  parseUserUxPrefs,
  classifyUxPrefsHttp,
  writeFontScaleCache,
  writeToneBandCache,
  type UserUxPrefs,
} from "./ux-prefs-state";

const NOTIFY_KEYS: { key: keyof NotifyPrefs; label: string }[] = [
  { key: "master", label: T.settings.notify.master },
  { key: "opportunity", label: T.settings.notify.opportunity },
  { key: "wallet", label: T.settings.notify.wallet },
  { key: "notice", label: T.settings.notify.notice },
  { key: "campaign", label: T.settings.notify.campaign },
  { key: "opsMessage", label: T.settings.notify.opsMessage },
  { key: "strategyMatch", label: T.settings.notify.strategyMatch },
];

async function putJson(path: string, body: unknown) {
  try {
    const res = await fetch(path, {
      method: "PUT",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false as const };
    return { ok: true as const, body: await res.json().catch(() => null) };
  } catch {
    return { ok: false as const };
  }
}

/**
 * SettingsPanel — §50.1 fontScale 3단 · toneBand · depositPref · §50.1n 알림 · Light 토글 0
 * UX prefs 권위 = GET/PUT /api/v1/me/ux-prefs. 로컬 기본값은 ready가 아니다.
 */
export function SettingsPanel() {
  const toast = useOptionalToast();
  const [ux, setUx] = useState<UserUxPrefs | null>(null);
  const [uxView, setUxView] = useState<PrefsReadView>("loading");
  const [notify, setNotify] = useState<NotifyPrefs | null>(null);
  const [prefsView, setPrefsView] = useState<PrefsReadView>("loading");
  const uxWriterRef = useRef(
    createUxPrefsWriteController({
      put: (prefs) => putJson("/api/v1/me/ux-prefs", prefs),
      onConfirmed: (prefs) => {
        setUx(prefs);
        setUxView("ready");
        applyFontScale(prefs.fontScale);
        writeFontScaleCache(prefs.fontScale);
        writeToneBandCache(prefs.toneBand);
      },
      onRollback: (prefs) => {
        setUx(prefs);
        applyFontScale(prefs.fontScale);
        writeFontScaleCache(prefs.fontScale);
        writeToneBandCache(prefs.toneBand);
      },
    }),
  );
  const writerRef = useRef(
    createPrefsWriteController({
      put: (prefs) => putJson("/api/v1/me/notification-prefs", prefs),
      onConfirmed: (prefs) => {
        setNotify(prefs);
        setPrefsView("ready");
      },
      onRollback: (prefs) => {
        setNotify(prefs);
      },
    }),
  );

  useEffect(() => {
    let cancelled = false;
    async function loadPrefs() {
      try {
        const res = await fetch("/api/v1/me/notification-prefs", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (cancelled) return;
        if (!res.ok) {
          setNotify(null);
          setPrefsView(classifyPrefsHttp(res.status));
          return;
        }
        const parsed = parseNotificationPrefs(await res.json().catch(() => null));
        if (cancelled) return;
        if (!parsed) {
          setNotify(null);
          setPrefsView("unavailable");
          return;
        }
        writerRef.current.setConfirmed(parsed);
        setNotify(parsed);
        setPrefsView("ready");
      } catch {
        if (!cancelled) {
          setNotify(null);
          setPrefsView("unavailable");
        }
      }
    }
    async function loadUx() {
      try {
        const res = await fetch("/api/v1/me/ux-prefs", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (cancelled) return;
        if (!res.ok) {
          setUx(null);
          setUxView(classifyUxPrefsHttp(res.status));
          return;
        }
        const parsed = parseUserUxPrefs(await res.json().catch(() => null));
        if (cancelled) return;
        if (!parsed) {
          setUx(null);
          setUxView("unavailable");
          return;
        }
        uxWriterRef.current.setConfirmed(parsed);
        setUx(parsed);
        setUxView("ready");
        applyFontScale(parsed.fontScale);
        writeFontScaleCache(parsed.fontScale);
        writeToneBandCache(parsed.toneBand);
      } catch {
        if (!cancelled) {
          setUx(null);
          setUxView("unavailable");
        }
      }
    }
    void loadPrefs();
    void loadUx();
    return () => {
      cancelled = true;
    };
  }, []);

  async function persistUx(next: UserUxPrefs) {
    setUx(next);
    applyFontScale(next.fontScale);
    const result = await uxWriterRef.current.submit(next);
    if (result === "ok") toast?.showToast({ code: "FONT_SCALE_CHANGED" });
  }

  async function toggleNotify(key: keyof NotifyPrefs) {
    if (prefsView !== "ready" || !notify) return;
    const prev = notify;
    const next = { ...notify, [key]: !notify[key] };
    setNotify(next);
    const result = await writerRef.current.submit(next);
    if (result === "failed") setNotify(prev);
  }

  const uxReady = uxView === "ready" && ux !== null;

  return (
    <main
      className="p-6 text-lux-text"
      data-testid="settings-panel"
      data-theme-toggle-allowed="false"
      data-prefs-view={prefsView}
      data-ux-prefs-view={uxView}
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
        {prefsView === "loading" ? (
          <p className="mt-3 text-sm text-lux-text-muted">불러오는 중…</p>
        ) : null}
        {prefsView === "unauthorized" ? (
          <p className="mt-3 text-sm text-lux-text-muted">
            로그인하면 알림 설정을 볼 수 있어요.
          </p>
        ) : null}
        {prefsView === "unavailable" ? (
          <p className="mt-3 text-sm text-lux-text-muted">
            알림 설정을 확인할 수 없음
          </p>
        ) : null}
        {prefsView === "ready" && notify ? (
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
        ) : null}
      </section>

      <section className="mt-6" data-testid="settings-font-scale">
        <h2 className="text-sm font-semibold">{T.settings.fontScale.label}</h2>
        {uxView === "loading" ? (
          <p className="mt-2 text-sm text-lux-text-muted">불러오는 중…</p>
        ) : null}
        {uxView === "unauthorized" ? (
          <p className="mt-2 text-sm text-lux-text-muted">
            로그인하면 글자 크기를 저장할 수 있어요.
          </p>
        ) : null}
        {uxView === "unavailable" ? (
          <p className="mt-2 text-sm text-lux-text-muted">
            글자 크기를 확인할 수 없음
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup">
          {(
            [
              ["md", T.settings.fontScale.md],
              ["lg", T.settings.fontScale.lg],
              ["xl", T.settings.fontScale.xl],
            ] as const
          ).map(([key, label]) => {
            const checked = uxReady && ux.fontScale === key;
            return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={!uxReady}
              data-font-scale-option={key}
              data-font-scale-confirmed={checked ? "true" : "false"}
              className={[
                "touch-target rounded-lux-md border px-3 py-2 text-sm",
                checked
                  ? "border-lux-accent text-lux-accent"
                  : "border-lux-border text-lux-text",
                uxReady ? "" : "opacity-50",
              ].join(" ")}
              onClick={() => {
                if (!uxReady) return;
                void persistUx({ ...ux, fontScale: key });
              }}
            >
              {label}
            </button>
            );
          })}
        </div>
      </section>

      <section
        className="mt-6"
        data-testid="settings-tone-band"
        data-tone-band-authority={uxReady ? "ux-prefs" : "none"}
      >
        <h2 className="text-sm font-semibold">{T.settings.toneBand.label}</h2>
        <p className="mt-1 text-xs text-lux-text-muted">
          초대 설명에만 쓰여요. 퍼뜩 대화 말투는 여기서 바꾸지 않아요.
        </p>
        {uxView === "loading" ? (
          <p className="mt-2 text-sm text-lux-text-muted">불러오는 중…</p>
        ) : null}
        {uxView === "unauthorized" ? (
          <p className="mt-2 text-sm text-lux-text-muted">
            로그인하면 설명 방식을 저장할 수 있어요.
          </p>
        ) : null}
        {uxView === "unavailable" ? (
          <p className="mt-2 text-sm text-lux-text-muted">
            설명 방식을 확인할 수 없음
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              ["young", T.settings.toneBand.young],
              ["mid", T.settings.toneBand.mid],
              ["senior", T.settings.toneBand.senior],
            ] as const
          ).map(([key, label]) => {
            const checked = uxReady && ux.toneBand === key;
            return (
            <button
              key={key}
              type="button"
              disabled={!uxReady}
              data-tone-band={key}
              data-tone-band-confirmed={checked ? "true" : "false"}
              aria-pressed={checked}
              className={[
                "touch-target rounded-lux-md border px-3 py-2 text-sm",
                checked
                  ? "border-lux-accent text-lux-accent"
                  : "border-lux-border",
                uxReady ? "" : "opacity-50",
              ].join(" ")}
              onClick={() => {
                if (!uxReady) return;
                void persistUx({ ...ux, toneBand: key });
              }}
            >
              {label}
            </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6" data-testid="settings-deposit-pref">
        <h2 className="text-sm font-semibold">{T.settings.depositPref.label}</h2>
        {uxView === "loading" ? (
          <p className="mt-2 text-sm text-lux-text-muted">불러오는 중…</p>
        ) : null}
        {uxView === "unauthorized" ? (
          <p className="mt-2 text-sm text-lux-text-muted">
            로그인하면 충전 화면 기본을 저장할 수 있어요.
          </p>
        ) : null}
        {uxView === "unavailable" ? (
          <p className="mt-2 text-sm text-lux-text-muted">
            충전 화면 기본을 확인할 수 없음
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              ["usdt", T.settings.depositPref.usdt],
              ["krw", T.settings.depositPref.krw],
            ] as const
          ).map(([key, label]) => {
            const checked = uxReady && ux.depositPref === key;
            return (
            <button
              key={key}
              type="button"
              disabled={!uxReady}
              data-deposit-pref={key}
              data-deposit-pref-confirmed={checked ? "true" : "false"}
              aria-pressed={checked}
              className={[
                "touch-target rounded-lux-md border px-3 py-2 text-sm",
                checked
                  ? "border-lux-accent text-lux-accent"
                  : "border-lux-border",
                uxReady ? "" : "opacity-50",
              ].join(" ")}
              onClick={() => {
                if (!uxReady) return;
                void persistUx({ ...ux, depositPref: key });
              }}
            >
              {label}
            </button>
            );
          })}
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

"use client";

import Link from "next/link";
import { useState } from "react";
import { applyFontScale, type FontScaleKey } from "../../tokens/font-scale";
import { T } from "../../copy/ko";
import { useOptionalToast } from "../toast";

type ToneBand = "young" | "mid" | "senior";
type DepositPref = "usdt" | "krw";

/**
 * SettingsPanel — §50.1 fontScale 3단 · toneBand · depositPref · Light 토글 0
 */
export function SettingsPanel() {
  const toast = useOptionalToast();
  const [fontScale, setFontScale] = useState<FontScaleKey>("md");
  const [toneBand, setToneBand] = useState<ToneBand>("mid");
  const [depositPref, setDepositPref] = useState<DepositPref>("usdt");

  const onFont = (next: FontScaleKey) => {
    setFontScale(next);
    if (typeof document !== "undefined") applyFontScale(next);
    toast?.showToast({ code: "FONT_SCALE_CHANGED" });
  };

  return (
    <main
      className="p-6 text-lux-text"
      data-testid="settings-panel"
      data-theme-toggle-allowed="false"
    >
      <h1 className="text-xl font-semibold">{T.settings.title}</h1>

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

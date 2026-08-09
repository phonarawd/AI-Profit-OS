"use client";

import { T } from "../../copy/ko";

export type DemoWalletBannerProps = {
  /** When false, banner hidden (practice=0) */
  visible?: boolean;
  practiceUsdt?: string;
};

/**
 * Money §51.7 · UI §38.7 — practice / demo wallet banner.
 * "연습" 배지 · 실출금 0 · never promote practice→profit.
 */
export function DemoWalletBanner({
  visible = true,
  practiceUsdt,
}: DemoWalletBannerProps) {
  if (!visible) return null;
  const zero =
    practiceUsdt === "0" ||
    practiceUsdt === "0.0" ||
    practiceUsdt === "0.00" ||
    practiceUsdt === undefined;
  if (practiceUsdt !== undefined && zero) return null;

  return (
    <aside
      data-testid="demo-wallet-banner"
      data-practice-only="true"
      data-withdrawable="false"
      className="mt-4 rounded-lux-md border border-lux-border bg-lux-elevated px-4 py-3"
      role="status"
    >
      <div className="flex items-center gap-2">
        <span
          data-testid="practice-badge"
          className="rounded px-2 py-0.5 text-xs font-semibold text-lux-accent"
        >
          {T.practice.badge}
        </span>
        <p className="text-sm font-medium text-lux-text">
          {T.practice.bannerTitle}
        </p>
      </div>
      <p className="mt-1 text-sm text-lux-text-muted">
        {T.practice.bannerBody}
      </p>
      {practiceUsdt !== undefined && !zero ? (
        <p
          className="mt-2 text-sm text-lux-text"
          data-testid="practice-banner-amount"
        >
          {T.walletBuckets.practice}: {practiceUsdt}{" "}
          {T.walletBuckets.usdtSuffix}
        </p>
      ) : null}
    </aside>
  );
}

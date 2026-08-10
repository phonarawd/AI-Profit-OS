"use client";

import Link from "next/link";
import { T } from "../../copy/ko";
import { formatUsdt } from "../../lib/format-usdt";

export type HomePrincipalRailProps = {
  /** Money WalletBuckets.principalUsdt · listFeed Fact pass-through */
  principalUsdt: string;
  /**
   * 표시용 ≈₩ (선택) · 없으면 USDT를 크게 · 환율 재계산 금지
   */
  principalKrwApprox?: string | null;
  /**
   * affordable 카드 expectedProfitUsdt 합 · 페이지가 Engine 필드만 합산해 전달
   * (UI 가격 재계산 금지)
   */
  todayPossibleProfitUsdt: string;
  className?: string;
};

/**
 * HomePrincipalRail / HomeMoneySurface — peotteok-light presentation
 * Data Truth 유지 · count-up 금지 · PART9 slots 유지
 */
export function HomePrincipalRail({
  principalUsdt,
  principalKrwApprox,
  todayPossibleProfitUsdt,
  className = "",
}: HomePrincipalRailProps) {
  const usdt = formatUsdt(principalUsdt);
  const profit = formatUsdt(todayPossibleProfitUsdt);
  const krw =
    typeof principalKrwApprox === "string" && principalKrwApprox.trim()
      ? principalKrwApprox.trim()
      : null;

  return (
    <section
      className={["home-money-grid", className].filter(Boolean).join(" ")}
      data-home-slot="principal-rail"
      data-testid="home-principal-rail"
      data-canon="home-principal-slots"
      aria-label={T.home.money.aria}
    >
      <article
        data-home-slot="principal-balance"
        data-canon-block="principalBalance"
        className="home-money-card rounded-lux-xl border border-lux-border bg-lux-surface p-5"
      >
        <p className="text-sm text-lux-text-muted">{T.feed.balanceLabel}</p>
        {krw ? (
          <>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-lux-text md:text-4xl">
              {T.feed.balanceKrwApprox.replace("{amount}", krw)}
            </p>
            <p className="mt-1 text-sm text-lux-text-muted tabular-nums">
              {T.feed.balanceUsdtSecondary.replace("{n}", usdt)}
            </p>
          </>
        ) : (
          <p className="mt-2 text-3xl font-semibold tabular-nums text-lux-text md:text-4xl">
            {T.feed.balanceUsdtPrimary.replace("{n}", usdt)}
          </p>
        )}
        <Link
          href="/wallet/deposit"
          className="mt-4 inline-flex min-h-12 items-center rounded-lux-md bg-lux-accent px-4 py-2 text-sm font-semibold text-lux-surface"
          data-cta="deposit"
        >
          {T.feed.ctaDeposit}
        </Link>
      </article>

      <article
        data-home-slot="today-possible-profit"
        data-canon-block="todayPossibleProfit"
        className="home-money-card rounded-lux-xl border border-lux-border bg-lux-surface p-5"
      >
        <p className="text-sm text-lux-text-muted">
          {T.feed.todayPossibleProfitLabel}
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums text-lux-profit md:text-4xl">
          {T.feed.todayPossibleProfitUsdt.replace("{n}", profit)}
        </p>
      </article>
    </section>
  );
}

/** Peotteok Home Experience 이름 — 동일 presentation */
export const HomeMoneySurface = HomePrincipalRail;
export type HomeMoneySurfaceProps = HomePrincipalRailProps;

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
 * HomePrincipalRail / HomeMoneySurface — STEP5 Slice3 Money presentation
 * Fact: principalUsdt + todayPossible only · C02/C03 · count-up/chart/split 금지
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
        className="home-money-card home-money-card--balance"
      >
        <p className="home-money__label">{T.feed.balanceLabel}</p>
        <div className="home-money__value-stack">
          {krw ? (
            <>
              <p className="home-money__value home-money__value--balance tabular-nums">
                {T.feed.balanceKrwApprox.replace("{amount}", krw)}
              </p>
              <p className="home-money__secondary tabular-nums">
                {T.feed.balanceUsdtSecondary.replace("{n}", usdt)}
              </p>
            </>
          ) : (
            <p className="home-money__value home-money__value--balance tabular-nums">
              {T.feed.balanceUsdtPrimary.replace("{n}", usdt)}
            </p>
          )}
        </div>
        <Link
          href="/wallet/deposit"
          className="home-money__cta"
          data-cta="deposit"
        >
          {T.feed.ctaDeposit}
        </Link>
      </article>

      <article
        data-home-slot="today-possible-profit"
        data-canon-block="todayPossibleProfit"
        className="home-money-card home-money-card--profit"
      >
        <p className="home-money__label">{T.feed.todayPossibleProfitLabel}</p>
        <div className="home-money__value-stack">
          <p className="home-money__value home-money__value--profit tabular-nums">
            {T.feed.todayPossibleProfitUsdt.replace("{n}", profit)}
          </p>
        </div>
      </article>
    </section>
  );
}

/** Peotteok Home Experience 이름 — 동일 presentation */
export const HomeMoneySurface = HomePrincipalRail;
export type HomeMoneySurfaceProps = HomePrincipalRailProps;

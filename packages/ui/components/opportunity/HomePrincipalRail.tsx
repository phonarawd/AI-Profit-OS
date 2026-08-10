"use client";

import Link from "next/link";
import { T } from "../../copy/ko";

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

function formatUsdt(raw: string): string {
  const t = (raw || "0").trim() || "0";
  const n = Number(t);
  if (!Number.isFinite(n)) return t;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

/**
 * §5.3 [B]/[D] HomePrincipalRail — 잔액 + 오늘 가능한 수익 합계
 * 분류/원장 Owns=Engine·Money · 슬롯·카피 Owns=UI
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
      className={["lux-feed-grid", className].filter(Boolean).join(" ")}
      data-home-slot="principal-rail"
      data-testid="home-principal-rail"
      data-canon="home-principal-slots"
    >
      <article
        data-home-slot="principal-balance"
        data-canon-block="principalBalance"
        className="rounded-lux-lg border border-lux-border bg-lux-surface p-4"
      >
        <p className="text-sm text-lux-text-muted">{T.feed.balanceLabel}</p>
        {krw ? (
          <>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-lux-text">
              {T.feed.balanceKrwApprox.replace("{amount}", krw)}
            </p>
            <p className="mt-1 text-sm text-lux-text-muted tabular-nums">
              {T.feed.balanceUsdtSecondary.replace("{n}", usdt)}
            </p>
          </>
        ) : (
          <p className="mt-1 text-2xl font-semibold tabular-nums text-lux-text">
            {T.feed.balanceUsdtPrimary.replace("{n}", usdt)}
          </p>
        )}
        <Link
          href="/wallet/deposit"
          className="mt-3 inline-flex min-h-12 items-center rounded-lux-md bg-lux-principal px-4 py-2 text-sm font-semibold text-lux-bg"
          data-cta="deposit"
        >
          {T.feed.ctaDeposit}
        </Link>
      </article>

      <article
        data-home-slot="today-possible-profit"
        data-canon-block="todayPossibleProfit"
        className="rounded-lux-lg border border-lux-border bg-lux-surface p-4"
      >
        <p className="text-sm text-lux-text-muted">
          {T.feed.todayPossibleProfitLabel}
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-lux-profit">
          {T.feed.todayPossibleProfitUsdt.replace("{n}", profit)}
        </p>
      </article>
    </section>
  );
}

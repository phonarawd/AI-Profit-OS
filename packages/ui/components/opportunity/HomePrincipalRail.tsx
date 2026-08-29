"use client";

import Link from "next/link";
import { T } from "../../copy/ko";
import { formatUsdt } from "../../lib/format-usdt";

export type HomePrincipalRailViewState =
  | "loading"
  | "ready_empty"
  | "ready_data"
  | "stale"
  | "recoverable_error"
  | "blocked"
  | "unauthorized";

export type HomePrincipalRailSessionStatus =
  | "guest"
  | "authenticated"
  | "expired";

export type HomePrincipalRailProps = {
  /** Money WalletBuckets.principalUsdt · HomeReadModel money Fact */
  principalUsdt: string | null;
  principalKrwApprox?: string | null;
  /** HomeReadModel todayPossibleProfitUsdt · server_derived only */
  todayPossibleProfitUsdt: string | null;
  viewState?: HomePrincipalRailViewState;
  sessionStatus?: HomePrincipalRailSessionStatus;
  className?: string;
};

function moneyDisplay(
  value: string | null,
  viewState: HomePrincipalRailViewState,
  sessionStatus: HomePrincipalRailSessionStatus,
): { ready: boolean; text: string; factState: string } {
  if (viewState === "loading") {
    return { ready: false, text: T.home.money.loading, factState: "loading" };
  }
  if (
    sessionStatus === "guest" ||
    sessionStatus === "expired" ||
    viewState === "unauthorized"
  ) {
    return { ready: false, text: T.home.money.guestHint, factState: "guest" };
  }
  if (value == null) {
    return {
      ready: false,
      text: T.home.money.unavailable,
      factState: "absent",
    };
  }
  return { ready: true, text: formatUsdt(value), factState: "ready" };
}

/**
 * HomePrincipalRail / HomeMoneySurface
 * Fact: principalUsdt + todayPossible only · C02/C03 · absent != 0
 */
export function HomePrincipalRail({
  principalUsdt,
  principalKrwApprox,
  todayPossibleProfitUsdt,
  viewState = "ready_data",
  sessionStatus = "authenticated",
  className = "",
}: HomePrincipalRailProps) {
  const principal = moneyDisplay(principalUsdt, viewState, sessionStatus);
  const profit = moneyDisplay(
    todayPossibleProfitUsdt,
    viewState,
    sessionStatus,
  );
  const krw =
    principal.ready &&
    typeof principalKrwApprox === "string" &&
    principalKrwApprox.trim()
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
        data-fact-state={principal.factState}
        className="home-money-card home-money-card--balance"
      >
        <div className="home-money__header">
          <p className="home-money__label">{T.feed.balanceLabel}</p>
          <Link
            href="/wallet/deposit"
            className="home-money__cta"
            data-cta="deposit"
          >
            {T.feed.ctaDeposit}
          </Link>
        </div>
        <div className="home-money__value-stack">
          {principal.ready && krw ? (
            <>
              <p className="home-money__value home-money__value--balance tabular-nums">
                {T.feed.balanceKrwApprox.replace("{amount}", krw)}
              </p>
              <p className="home-money__secondary tabular-nums">
                {T.feed.balanceUsdtSecondary.replace("{n}", principal.text)}
              </p>
            </>
          ) : principal.ready ? (
            <p className="home-money__value home-money__value--balance tabular-nums">
              {T.feed.balanceUsdtPrimary.replace("{n}", principal.text)}
            </p>
          ) : (
            <p
              className="home-money__value home-money__value--balance text-pd-text-muted"
              data-testid="home-principal-absent"
            >
              {principal.text}
            </p>
          )}
        </div>
      </article>

      <article
        data-home-slot="today-possible-profit"
        data-canon-block="todayPossibleProfit"
        data-fact-state={profit.factState}
        className="home-money-card home-money-card--profit"
      >
        <p className="home-money__label">{T.feed.todayPossibleProfitLabel}</p>
        <div className="home-money__value-stack">
          {profit.ready ? (
            <p className="home-money__value home-money__value--profit tabular-nums">
              {T.feed.todayPossibleProfitUsdt.replace("{n}", profit.text)}
            </p>
          ) : (
            <p
              className="home-money__value home-money__value--profit text-pd-text-muted"
              data-testid="home-today-possible-absent"
            >
              {profit.text}
            </p>
          )}
        </div>
      </article>
    </section>
  );
}

export const HomeMoneySurface = HomePrincipalRail;
export type HomeMoneySurfaceProps = HomePrincipalRailProps;

"use client";

import { useEffect, type ReactNode } from "react";
import { DayPulse, type DayPulseModel } from "../loop";
import {
  HomePayoutCounter,
  LivePayoutTicker,
  type HomePayoutCounterMode,
  type PublicTickerEvent,
} from "../pd";
import {
  BalanceAwareHome,
  HomePrincipalRail,
  type OpportunityCardModel,
} from "../opportunity";
import { useHomeChrome } from "../shell/HomeChromeContext";
import { T } from "../../copy/ko";
import { HomeHero } from "./HomeHero";
import { HomeRightRail, type HomeRightRailProgress } from "./HomeRightRail";

export type HomeExperienceViewState =
  | "loading"
  | "ready_empty"
  | "ready_data"
  | "stale"
  | "recoverable_error"
  | "blocked"
  | "unauthorized";

export type HomeExperienceSessionStatus = "guest" | "authenticated" | "expired";

export type HomeExperienceProps = {
  principalUsdt: string | null;
  principalKrwApprox?: string | null;
  todayPossibleProfitUsdt: string | null;
  items: OpportunityCardModel[];
  affordableCount?: number | null;
  nearMissExtraCount?: number | null;
  topSuggestDepositUsdt?: string | null;
  pulse: DayPulseModel | null;
  tickerMode: "off" | "live" | "demo" | "hybrid";
  tickerEvents: PublicTickerEvent[];
  counterMode: HomePayoutCounterMode;
  ledgerTotal: number | null;
  sessionExpiredSlot?: ReactNode;
  totalResultValue?: string | null;
  progress?: HomeRightRailProgress | null;
  viewState?: HomeExperienceViewState;
  sessionStatus?: HomeExperienceSessionStatus;
};

function scanLabelFromPulse(pulse: DayPulseModel | null): string | null {
  if (!pulse || typeof pulse.settlementCompletedToday !== "number") {
    return null;
  }
  return T.home.header.scanSettled.replace(
    "{n}",
    String(pulse.settlementCompletedToday),
  );
}

/**
 * HomeExperience — Contract layout: Hero → Money → Opportunity · RightRail
 * DayPulse strip 폐기(헤더 chip으로 Owns 이동) · slot은 verify용 sr-only 유지
 */
export function HomeExperience({
  principalUsdt,
  principalKrwApprox = null,
  todayPossibleProfitUsdt,
  items,
  affordableCount,
  nearMissExtraCount,
  topSuggestDepositUsdt,
  pulse,
  tickerMode,
  tickerEvents,
  counterMode,
  ledgerTotal,
  sessionExpiredSlot = null,
  totalResultValue = null,
  progress = null,
  viewState = "ready_data",
  sessionStatus = "authenticated",
}: HomeExperienceProps) {
  const { setScanStatus } = useHomeChrome();
  const topOpportunities = items
    .filter((i) => i.bucket === "affordable")
    .slice(0, 3);

  const settleCount =
    pulse && typeof pulse.settlementCompletedToday === "number"
      ? pulse.settlementCompletedToday
      : null;

  const railProgress: HomeRightRailProgress = progress ?? {
    scan: null,
    confirm: null,
    progress: null,
    settle: settleCount,
  };

  useEffect(() => {
    setScanStatus(scanLabelFromPulse(pulse));
    return () => setScanStatus(null);
  }, [pulse, setScanStatus]);

  return (
    <div
      data-testid="home-experience"
      data-view-state={viewState}
      data-session-status={sessionStatus}
      className="text-pd-text"
    >
      <div data-home-slot="ticker" data-canon-block="tickerSlot">
        <LivePayoutTicker
          mode={tickerMode}
          events={tickerEvents}
          maxItems={50}
        />
      </div>
      <div
        data-home-slot="day-pulse"
        data-canon-block="dayPulseSlot"
        className="sr-only"
      >
        <DayPulse data={pulse} />
      </div>
      <div data-home-slot="counter" data-canon-block="counterSlot">
        <HomePayoutCounter mode={counterMode} ledgerTotal={ledgerTotal} />
      </div>

      {sessionExpiredSlot}

      <div className="home-dashboard-grid" data-testid="home-dashboard-grid">
        <div className="home-dashboard-main">
          <HomeHero />
          <HomePrincipalRail
            principalUsdt={principalUsdt}
            principalKrwApprox={principalKrwApprox}
            todayPossibleProfitUsdt={todayPossibleProfitUsdt}
            viewState={viewState}
            sessionStatus={sessionStatus}
          />
          <BalanceAwareHome
            items={items}
            affordableCount={affordableCount}
            nearMissExtraCount={nearMissExtraCount}
            topSuggestDepositUsdt={topSuggestDepositUsdt}
            viewState={viewState}
            sessionStatus={sessionStatus}
            asSection
            hideScanHero
          />
        </div>
        <HomeRightRail
          totalResultValue={totalResultValue}
          todayPossibleProfitUsdt={todayPossibleProfitUsdt}
          topOpportunities={topOpportunities}
          progress={railProgress}
        />
      </div>
    </div>
  );
}

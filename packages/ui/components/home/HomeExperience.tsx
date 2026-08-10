"use client";

import { useEffect, type ReactNode } from "react";
import { DayPulse, type DayPulseModel } from "../loop";
import {
  HomePayoutCounter,
  LivePayoutTicker,
  type HomePayoutCounterMode,
  type PublicTickerEvent,
} from "../lux";
import {
  BalanceAwareHome,
  HomePrincipalRail,
  type OpportunityCardModel,
} from "../opportunity";
import { useHomeChrome } from "../shell/HomeChromeContext";
import { T } from "../../copy/ko";
import { HomeHero } from "./HomeHero";
import { HomeRightRail, type HomeRightRailProgress } from "./HomeRightRail";

export type HomeExperienceProps = {
  principalUsdt: string;
  principalKrwApprox?: string | null;
  todayPossibleProfitUsdt: string;
  items: OpportunityCardModel[];
  affordableCount?: number;
  nearMissExtraCount?: number;
  topSuggestDepositUsdt?: string | null;
  pulse: DayPulseModel | null;
  tickerMode: "off" | "live" | "demo" | "hybrid";
  tickerEvents: PublicTickerEvent[];
  counterMode: HomePayoutCounterMode;
  ledgerTotal: number;
  sessionExpiredSlot?: ReactNode;
  totalResultValue?: string | null;
  progress?: HomeRightRailProgress | null;
};

function scanLabelFromPulse(pulse: DayPulseModel | null): string {
  if (!pulse) return T.home.header.scanIdle;
  const settled = pulse.settlementCompletedToday ?? 0;
  if (settled > 0) {
    return T.home.header.scanSettled.replace("{n}", String(settled));
  }
  return T.home.header.scanIdle;
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
}: HomeExperienceProps) {
  const { setScanStatus } = useHomeChrome();
  const topOpportunities = items
    .filter((i) => !i.bucket || i.bucket === "affordable")
    .slice(0, 3);

  const settleCount =
    pulse && typeof pulse.settlementCompletedToday === "number"
      ? pulse.settlementCompletedToday
      : 0;

  /** Fact only — 없으면 0 솔직 표기 · 가짜 스캔/매칭 수 금지 */
  const railProgress: HomeRightRailProgress = progress ?? {
    scan: 0,
    confirm: 0,
    progress: 0,
    settle: settleCount,
  };

  useEffect(() => {
    setScanStatus(scanLabelFromPulse(pulse));
    return () => setScanStatus(null);
  }, [pulse, setScanStatus]);

  return (
    <div data-testid="home-experience" className="text-lux-text">
      <div data-home-slot="ticker" data-canon-block="tickerSlot">
        <LivePayoutTicker
          mode={tickerMode}
          events={tickerEvents}
          maxItems={50}
        />
      </div>
      {/* PART9 slot keep · visual Owns moved to AppHeader scan chip */}
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
          />
          <BalanceAwareHome
            items={items}
            affordableCount={affordableCount}
            nearMissExtraCount={nearMissExtraCount}
            topSuggestDepositUsdt={topSuggestDepositUsdt}
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

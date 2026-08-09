"use client";

import { DayPulse } from "@aipo/ui/components/loop";
import { BalanceAwareHome } from "@aipo/ui/components/opportunity";
import {
  HomePayoutCounter,
  LivePayoutTicker,
} from "@aipo/ui/components/lux";

/**
 * Home — §5.3 [A] LivePayoutTicker + [A2] DayPulse + [F] HomePayoutCounter
 * Live items = GET /api/v1/opportunities · DayPulse = GET /api/v1/me/day-pulse
 * ticker_mode / counter_mode = Admin §35.4 · pulse 슬롯 분리(merge 0)
 */
export default function Page() {
  return (
    <main className="text-lux-text" data-testid="home-shell">
      <div data-home-slot="ticker" data-canon-block="tickerSlot">
        <LivePayoutTicker mode="off" events={[]} maxItems={50} />
      </div>
      <div data-home-slot="day-pulse" data-canon-block="dayPulseSlot">
        <DayPulse data={null} />
      </div>
      <div data-home-slot="counter" data-canon-block="counterSlot">
        <HomePayoutCounter mode="off" ledgerTotal={0} />
      </div>
      <BalanceAwareHome items={[]} asSection />
    </main>
  );
}

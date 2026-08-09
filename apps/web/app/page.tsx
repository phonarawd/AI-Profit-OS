"use client";

import { BalanceAwareHome } from "@aipo/ui/components/opportunity";
import { LivePayoutTicker } from "@aipo/ui/components/lux";

/**
 * Home — §5.3 [A] LivePayoutTicker + §5.3a/b 잔액 인식·기회스캔
 * Live items = GET /api/v1/opportunities (auth session) · Day-1 empty shell OK
 * ticker_mode = Admin §35.4 · pulse 슬롯 분리(merge 0)
 */
export default function Page() {
  return (
    <main className="text-lux-text" data-testid="home-shell">
      <div data-home-slot="ticker" data-canon-block="tickerSlot">
        <LivePayoutTicker mode="off" events={[]} maxItems={50} />
      </div>
      <BalanceAwareHome items={[]} asSection />
    </main>
  );
}

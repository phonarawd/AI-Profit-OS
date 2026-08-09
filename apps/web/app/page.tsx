"use client";

import { LivePayoutTicker } from "@aipo/ui/components/lux";
import { T } from "@aipo/ui/copy/ko";

/**
 * Home shell — §5.3 [A] LivePayoutTicker.
 * Opportunity feed depth = PART3 Owns (not this PART5 skeleton).
 * ticker_mode projected from Admin §35.4 — Day-1 default off until Growth ON.
 */
export default function Page() {
  return (
    <main className="text-lux-text" data-testid="home-shell" data-canon-block="tickerSlot">
      <LivePayoutTicker mode="off" events={[]} maxItems={50} />
      <div className="p-6">
        <h1 className="text-xl font-semibold">{T.user.tabs.home}</h1>
        <p className="mt-2 text-sm text-lux-text-muted">
          {T.user.hint.searchOpportunity}
        </p>
      </div>
    </main>
  );
}

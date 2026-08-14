"use client";

import { T } from "../../copy/ko";
import { CountUpNumber } from "./CountUpNumber";

export type HomePayoutCounterMode = "off" | "ledger" | "demo" | "blended";

export type HomePayoutCounterProps = {
  /** Admin §35.4 G4 counter_mode projection */
  mode: HomePayoutCounterMode;
  /**
   * C01 · settlement.completed COUNT
   * null = absent Fact · do not default to 0
   */
  ledgerTotal?: number | null;
  /** demo/blended seed — COUNT unit · no CountUp */
  demoSeed?: number;
};

/**
 * Home [F] today settlement COUNT — C01 semantic lock
 */
export function HomePayoutCounter({
  mode,
  ledgerTotal = null,
  demoSeed = 0,
}: HomePayoutCounterProps) {
  if (mode === "off") return null;

  const hasLedger =
    typeof ledgerTotal === "number" && Number.isFinite(ledgerTotal);
  if ((mode === "ledger" || mode === "blended") && !hasLedger) {
    return null;
  }

  const ledger = hasLedger ? Math.max(0, Math.floor(ledgerTotal)) : 0;
  const demo = Math.max(0, Math.floor(demoSeed));
  const display =
    mode === "ledger" ? ledger : mode === "demo" ? demo : ledger + demo;
  const useCountUp = mode === "ledger";
  const countSuffix = T.ticker.settleCountSuffix;

  return (
    <section
      data-testid="home-payout-counter"
      data-counter-mode={mode}
      data-ledger-unit="count"
      data-day-pulse-merge="false"
      data-home-slot="counter"
      data-fact-state={hasLedger || mode === "demo" ? "ready" : "absent"}
      aria-label={T.ticker.todayPayoutAria}
      className="border-b border-lux-border bg-lux-surface px-4 py-3"
    >
      <p className="text-sm text-lux-text-muted">{T.ticker.todayPayoutLabel}</p>
      <p
        className="mt-1 text-2xl font-semibold tabular-nums text-lux-accent"
        data-testid="home-payout-counter-value"
      >
        {useCountUp ? (
          <CountUpNumber
            value={display}
            source="settlement.completed"
            prefix=""
            suffix={countSuffix}
            decimals={0}
            durationMs={400}
          />
        ) : (
          <span data-testid="home-payout-counter-static">
            {display}
            {countSuffix}
          </span>
        )}
      </p>
    </section>
  );
}

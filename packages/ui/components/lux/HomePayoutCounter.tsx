"use client";

import { T } from "../../copy/ko";
import { CountUpNumber } from "./CountUpNumber";

export type HomePayoutCounterMode = "off" | "ledger" | "demo" | "blended";

export type HomePayoutCounterProps = {
  /** Admin §35.4 G4 counter_mode 투영 — 클라 스케줄 재구현 금지 */
  mode: HomePayoutCounterMode;
  /** settlement.completed ledger 합계 (USDT) */
  ledgerTotal?: number;
  /** demo/blended 시드 — CountUp 구동 금지 */
  demoSeed?: number;
};

/**
 * Home [F] 오늘 지급 합계 — §33.2 / §33.2a
 * DayPulse merge 0 · demo 수치는 CountUp 비적용 (ledger only)
 */
export function HomePayoutCounter({
  mode,
  ledgerTotal = 0,
  demoSeed = 0,
}: HomePayoutCounterProps) {
  if (mode === "off") return null;

  const ledger = Math.max(0, ledgerTotal);
  const demo = Math.max(0, demoSeed);
  const display =
    mode === "ledger" ? ledger : mode === "demo" ? demo : ledger + demo;
  const useCountUp = mode === "ledger";

  return (
    <section
      data-testid="home-payout-counter"
      data-counter-mode={mode}
      data-day-pulse-merge="false"
      data-home-slot="counter"
      aria-label={T.ticker.todayPayoutAria}
      className="border-b border-lux-border bg-lux-surface px-4 py-3"
    >
      <p className="text-sm text-lux-text-muted">{T.ticker.todayPayoutLabel}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-lux-accent">
        {useCountUp ? (
          <CountUpNumber
            value={display}
            source="settlement.completed"
            prefix="+"
            suffix={` ${T.ticker.usdtSuffix}`}
            durationMs={400}
          />
        ) : (
          <span data-testid="home-payout-counter-static">
            +{display.toFixed(2)} {T.ticker.usdtSuffix}
          </span>
        )}
      </p>
    </section>
  );
}

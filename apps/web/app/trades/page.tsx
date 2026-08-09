"use client";

import Link from "next/link";
import { CountUpNumber } from "@aipo/ui/components/lux";
import { T } from "@aipo/ui/copy/ko";

/** PART5b /trades shell — CountUp only on settlement.completed ledger totals */
export default function Page() {
  return (
    <main className="p-6 text-lux-text" data-testid="trades-shell">
      <h1 className="text-xl font-semibold">{T.user.trades.title}</h1>
      <p className="mt-2 text-sm text-lux-text-muted">{T.user.trades.subtitle}</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-lux-md border border-lux-border p-3">
          <p className="text-xs text-lux-text-muted">{T.user.trades.todayLabel}</p>
          <p className="mt-1 text-lg font-semibold text-lux-accent">
            <CountUpNumber
              value={0}
              source="settlement.completed"
              prefix="+"
              suffix=" USDT"
              durationMs={150}
            />
          </p>
        </div>
        <div className="rounded-lux-md border border-lux-border p-3">
          <p className="text-xs text-lux-text-muted">{T.user.trades.monthLabel}</p>
          <p className="mt-1 text-lg font-semibold text-lux-accent">
            <CountUpNumber
              value={0}
              source="settlement.completed"
              prefix="+"
              suffix=" USDT"
              durationMs={150}
            />
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm" role="status">
        {T.user.empty.trades}
      </p>
      <Link href="/profits" className="mt-4 inline-block text-sm text-lux-accent underline">
        {T.user.empty.tradesCta}
      </Link>
    </main>
  );
}

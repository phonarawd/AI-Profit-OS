"use client";

import { WeeklyMarketBriefing } from "@aipo/ui/components/trust/WeeklyMarketBriefing";

/**
 * UI §51.20 — Weekly Market Briefing (guide 계열)
 * spreadDistribution = Engine M0.5 읽기만 · 투자권유 0
 */
export default function Page() {
  return (
    <div className="p-6">
      <WeeklyMarketBriefing toneBand="mid" data={null} />
    </div>
  );
}

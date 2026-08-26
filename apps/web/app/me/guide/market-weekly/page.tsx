"use client";

import { WeeklyMarketBriefing } from "@aipo/ui/components/trust/WeeklyMarketBriefing";
import { GuidePage } from "../GuidePage";

/**
 * UI §51.20 — Weekly Market Briefing (guide 계열)
 * spreadDistribution = Engine M0.5 읽기만 · 투자권유 0
 */
export default function Page() {
  return (
    <GuidePage title="이번 주 시세 안내" testId="guide-market-weekly">
      <WeeklyMarketBriefing toneBand="mid" data={null} />
    </GuidePage>
  );
}

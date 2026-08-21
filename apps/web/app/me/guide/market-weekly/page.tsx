"use client";

import { WeeklyMarketBriefing } from "@aipo/ui/components/trust/WeeklyMarketBriefing";
import { AccountFrame } from "../../AccountFrame";
import styles from "../../account.module.css";

/**
 * UI §51.20 — Weekly Market Briefing (guide 계열)
 * spreadDistribution = Engine M0.5 읽기만 · 투자권유 0
 */
export default function Page() {
  return (
    <AccountFrame title="이번 주 시세 안내" view="ready" testId="guide-market-weekly" hideTitle>
      <div className={styles.surface}>
        <WeeklyMarketBriefing toneBand="mid" data={null} />
      </div>
    </AccountFrame>
  );
}

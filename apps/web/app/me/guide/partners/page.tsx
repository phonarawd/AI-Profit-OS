"use client";

import { MarketPartnerGrid } from "@aipo/ui/components/trust/MarketPartnerGrid";
import { T } from "@aipo/ui/copy/ko";
import { GuidePage } from "../GuidePage";
import styles from "../guide.module.css";

export default function Page() {
  return (
    <GuidePage title={"\uC2DC\uC138 \uD30C\uD2B8\uB108"} testId="guide-partners">
      <MarketPartnerGrid />
      <p className={styles.note}>{T.trust.partners.legFootnote}</p>
    </GuidePage>
  );
}

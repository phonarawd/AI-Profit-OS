"use client";

import { MarketPartnerGrid } from "@aipo/ui/components/trust/MarketPartnerGrid";
import { T } from "@aipo/ui/copy/ko";
import { AccountFrame } from "../../AccountFrame";
import styles from "../../account.module.css";

/**
 * UI §38.10 — 공식 협력사 guide.
 * Logo SVGs = blocking sub-deliverable (status=blocked until Brand Kit ready).
 */
export default function Page() {
  return (
    <AccountFrame title="시세 파트너" view="ready" testId="guide-partners" hideTitle>
      <main className={styles.surface}>
        <MarketPartnerGrid />
        <p className="mt-6 text-xs">
          {T.trust.partners.legFootnote}
        </p>
      </main>
    </AccountFrame>
  );
}

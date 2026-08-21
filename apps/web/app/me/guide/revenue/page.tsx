"use client";

import {
  PlatformRevenueExplainer,
  TaxDisclaimerBlock,
} from "@aipo/ui/components/trust";
import { T } from "@aipo/ui/copy/ko";
import { AccountFrame } from "../../AccountFrame";
import styles from "../../account.module.css";

/** UI §38.3 — /me/guide/revenue */
export default function Page() {
  return (
    <AccountFrame title={T.guide.revenue.title} view="ready" testId="guide-revenue" hideTitle>
    <main className={`${styles.surface} space-y-6`}>
      <p className="sr-only">{T.guide.revenue.title}</p>
      <PlatformRevenueExplainer />
      <TaxDisclaimerBlock />
    </main>
    </AccountFrame>
  );
}

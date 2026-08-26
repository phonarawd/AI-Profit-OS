"use client";

import Link from "next/link";
import { T } from "@aipo/ui/copy/ko";
import { GuidePage } from "../GuidePage";
import styles from "../guide.module.css";

/** Money §49.4 guide — 왜 원금을 두나요? */
export default function Page() {
  return (
    <GuidePage title={T.principalGuide.pageTitle} testId="guide-principal">
      <header className={styles.header}>
        <h1 className="pt-premium-title">{T.principalGuide.pageTitle}</h1>
      </header>
      <p className="pt-premium-description">{T.principalGuide.whyKeep}</p>
      <p className={styles.body}>{T.principalGuide.alwaysWithdraw}</p>
      <p className="pt-premium-description">{T.principalGuide.mergeHint}</p>
      <Link
        href="/wallet/withdraw?mode=principal"
        data-principal-reachable="true"
        className={`${styles.cta} pt-premium-focus`}
      >
        {T.withdrawMode.ctaOpenPrincipal}
      </Link>
    </GuidePage>
  );
}

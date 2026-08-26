"use client";

import type { ReactNode } from "react";
import { PremiumSurface } from "../../../components/putduk-premium";
import { AccountFrame } from "../AccountFrame";
import { GUIDE_KICKER } from "./guide-copy";
import styles from "./guide.module.css";

export function GuidePage({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <AccountFrame title={title} view="ready" testId={testId} hideTitle>
      <div className={styles.page}>
        <p className={`pt-premium-kicker ${styles.kicker}`}>{GUIDE_KICKER}</p>
        <PremiumSurface as="div" className={styles.surface}>
          {children}
        </PremiumSurface>
      </div>
    </AccountFrame>
  );
}

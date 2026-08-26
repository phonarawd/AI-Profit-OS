"use client";

import {
  PremiumEmptyState,
  PremiumSurface,
} from "../../../components/putduk-premium";
import { AccountFrame } from "../AccountFrame";
import { HUB_COPY } from "../account-hub-copy";
import styles from "./strategies-premium.module.css";

const EMPTY_TITLE = "\uC9C0\uAE08 \uBCFC \uC804\uB7B5\uC774 \uC5C6\uC5B4\uC694";
const EMPTY_BODY =
  "\uC9C0\uAE08\uC740 \uD655\uC778\uD560 \uC218 \uC788\uB294 \uC804\uB7B5\uC774 \uC5C6\uC5B4\uC694.";

export default function Page() {
  return (
    <AccountFrame
      title={HUB_COPY.strategies}
      view="ready"
      testId="strategies-page"
      hideTitle
    >
      <div className={styles.page}>
        <p className={`pt-premium-kicker ${styles.kicker}`}>{HUB_COPY.kicker}</p>
        <PremiumSurface
          as="section"
          className={styles.surface}
          aria-labelledby="strategies-title"
        >
          <header className={styles.header}>
            <h1 id="strategies-title" className="pt-premium-title">
              {HUB_COPY.strategies}
            </h1>
          </header>
          <PremiumEmptyState title={EMPTY_TITLE} description={EMPTY_BODY} />
        </PremiumSurface>
      </div>
    </AccountFrame>
  );
}

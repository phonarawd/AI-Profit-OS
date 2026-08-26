"use client";

import { LegalDoc } from "@aipo/ui/components/legal/LegalDoc";
import { T } from "@aipo/ui/copy/ko";
import { PremiumSurface } from "../../../../components/putduk-premium";
import { AccountFrame } from "../../AccountFrame";
import styles from "../legal.module.css";

/** §50.3 A — 이용약관 */
export default function Page() {
  return (
    <AccountFrame title={T.legal.termsTitle} view="ready" testId="legal-terms" hideTitle>
      <div className={styles.page}>
        <PremiumSurface as="div" className={styles.docSurface}>
          <LegalDoc
            title={T.legal.termsTitle}
            intro={T.legal.terms.intro}
            sections={T.legal.terms.sections}
          />
        </PremiumSurface>
      </div>
    </AccountFrame>
  );
}

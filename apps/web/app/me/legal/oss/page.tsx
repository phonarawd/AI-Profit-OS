"use client";

import { LegalDoc } from "@aipo/ui/components/legal/LegalDoc";
import { T } from "@aipo/ui/copy/ko";
import { PremiumSurface } from "../../../../components/putduk-premium";
import { AccountFrame } from "../../AccountFrame";
import styles from "../legal.module.css";

/** §50.3 C — 오픈소스 고지 */
export default function Page() {
  return (
    <AccountFrame title={T.legal.ossTitle} view="ready" testId="legal-oss" hideTitle>
      <div className={styles.page}>
        <PremiumSurface as="div" className={styles.docSurface}>
          <LegalDoc
            title={T.legal.ossTitle}
            intro={T.legal.oss.intro}
            sections={[{ title: T.legal.ossTitle, body: T.legal.oss.body }]}
            showTax={false}
          />
        </PremiumSurface>
      </div>
    </AccountFrame>
  );
}

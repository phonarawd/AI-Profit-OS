"use client";

import { LegalDoc } from "@aipo/ui/components/legal/LegalDoc";
import { T } from "@aipo/ui/copy/ko";
import { AccountFrame } from "../../AccountFrame";
import styles from "../../account.module.css";

/** §50.3 C — 오픈소스 고지 */
export default function Page() {
  return (
    <AccountFrame title={T.legal.ossTitle} view="ready" testId="legal-oss" hideTitle>
      <div className={styles.surface}>
        <LegalDoc
          title={T.legal.ossTitle}
          intro={T.legal.oss.intro}
          sections={[{ title: T.legal.ossTitle, body: T.legal.oss.body }]}
          showTax={false}
        />
      </div>
    </AccountFrame>
  );
}

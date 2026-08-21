"use client";

import { LegalDoc } from "@aipo/ui/components/legal/LegalDoc";
import { T } from "@aipo/ui/copy/ko";
import { AccountFrame } from "../../AccountFrame";
import styles from "../../account.module.css";

/** §50.3 B — 개인정보 처리방침 */
export default function Page() {
  return (
    <AccountFrame title={T.legal.privacyTitle} view="ready" testId="legal-privacy" hideTitle>
      <div className={styles.surface}>
        <LegalDoc
          title={T.legal.privacyTitle}
          intro={T.legal.privacy.intro}
          sections={T.legal.privacy.blocks}
        />
      </div>
    </AccountFrame>
  );
}

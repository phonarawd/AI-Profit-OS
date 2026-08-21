"use client";

import { TrustFAQAccordion } from "@aipo/ui/components/trust";
import { AccountFrame } from "../../AccountFrame";
import styles from "../../account.module.css";

/** UI §38.7 — /me/guide/faq Objection Q1~Q4 */
export default function Page() {
  return (
    <AccountFrame title="자주 묻는 질문" view="ready" testId="guide-faq" hideTitle>
      <div className={styles.surface}>
        <TrustFAQAccordion />
      </div>
    </AccountFrame>
  );
}

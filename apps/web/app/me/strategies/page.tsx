"use client";

import { AccountFrame } from "../AccountFrame";
import styles from "../account.module.css";

export default function Page() {
  return (
    <AccountFrame title="내 전략" view="ready" testId="strategies-page">
      <p className={styles.note}>지금은 확인할 수 있는 전략이 없어요.</p>
    </AccountFrame>
  );
}

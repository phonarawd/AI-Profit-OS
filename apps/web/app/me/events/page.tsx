"use client";

import { AccountFrame } from "../AccountFrame";
import styles from "../account.module.css";

export default function Page() {
  return (
    <AccountFrame title="이벤트" view="ready" testId="events-page">
      <p className={styles.note}>지금은 확인할 수 있는 이벤트가 없어요.</p>
    </AccountFrame>
  );
}

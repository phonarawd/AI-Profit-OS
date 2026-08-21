"use client";

import { GetUsdtGuide } from "@aipo/ui/components/trust";
import { AccountFrame } from "../../AccountFrame";
import styles from "../../account.module.css";

/**
 * UI §38.8 — Canon get-usdt-guide
 * NetworkPlainWarning shared via GetUsdtGuide · 체인코드 영문 유저 렌더 0
 */
export default function Page() {
  return (
    <AccountFrame title="테더 준비" view="ready" testId="guide-get-usdt-page" hideTitle>
      <div className={styles.surface} data-canon="get-usdt-guide">
        <GetUsdtGuide />
      </div>
    </AccountFrame>
  );
}

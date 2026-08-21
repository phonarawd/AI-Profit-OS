"use client";

import { useEffect, useState } from "react";
import { usePeotteokChat } from "@aipo/sdk/peotteok";
import {
  PeotteokChat,
  PEOTTEOK_FALLBACK_CHIPS,
} from "@aipo/ui/components/peotteok";
import { T } from "@aipo/ui/copy/ko";
import { AccountFrame } from "../AccountFrame";
import styles from "../account.module.css";

/**
 * §6.4e /me/peotteok — Canon peotteok-chat
 * SSE · P칩 · G stream · S거절 · degrade · §27.10 voice
 * Coach 런타임 변경은 REL-300대.
 */
export default function Page() {
  const { messages, chips, toneBand, busy, lastDone, error, send } =
    usePeotteokChat({
      getAccessToken: () => null,
      enabled: true,
      fallbackChips: PEOTTEOK_FALLBACK_CHIPS,
    });

  const [degradedToast, setDegradedToast] = useState(false);
  const unauthorized = Boolean(error?.message.includes("401"));

  useEffect(() => {
    if (lastDone?.degraded) {
      setDegradedToast(true);
      const t = window.setTimeout(() => setDegradedToast(false), 0);
      return () => window.clearTimeout(t);
    }
  }, [lastDone]);

  return (
    <AccountFrame
      title={T.peotteok.chatTitle}
      view={unauthorized ? "unauthorized" : "ready"}
      testId="peotteok-page"
      hideTitle
    >
      <p className={styles.note}>
        퍼뜩은 확인된 사실만 말해요. 없는 수익을 만들어 내지 않아요.
      </p>
      <img
        src="/spark-dash/ai-orb.svg"
        alt=""
        width={64}
        height={64}
        data-testid="peotteok-ai-orb"
      />
      <div className={styles.surface}>
        <PeotteokChat
          messages={messages}
          chips={chips}
          toneBand={
            toneBand === "young" || toneBand === "mid" || toneBand === "senior"
              ? toneBand
              : "mid"
          }
          busy={busy}
          degradedToast={degradedToast}
          onSend={send}
        />
      </div>
    </AccountFrame>
  );
}

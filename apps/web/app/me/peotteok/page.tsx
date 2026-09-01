"use client";

import { fetchAuthSession, isAuthError } from "@aipo/sdk/auth";
import { usePeotteokChat } from "@aipo/sdk/peotteok";
import {
  PeotteokChat,
  PEOTTEOK_FALLBACK_CHIPS,
} from "@aipo/ui/components/peotteok";
import { T } from "@aipo/ui/copy/ko";
import { useEffect, useState } from "react";
import {
  AccountAuthActions,
  AccountFrame,
  type AccountView,
} from "../AccountFrame";
import styles from "../account.module.css";

/**
 * §6.4e /me/peotteok — Canon peotteok-chat
 * SSE · P칩 · G stream · S거절 · degrade · §27.10 voice
 * 비로그인 사용자는 채팅 표면을 렌더하지 않는다.
 */
export default function Page() {
  const [view, setView] = useState<AccountView>("loading");
  const { messages, chips, toneBand, busy, lastDone, send } = usePeotteokChat({
    getAccessToken: () => null,
    enabled: view === "ready",
    fallbackChips: PEOTTEOK_FALLBACK_CHIPS,
  });

  const [degradedToast, setDegradedToast] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const session = await fetchAuthSession({ signal: ac.signal });
        if (ac.signal.aborted) return;
        setView(session ? "ready" : "unauthorized");
      } catch (err) {
        if (ac.signal.aborted) return;
        if (isAuthError(err) && err.status === 401) {
          setView("unauthorized");
          return;
        }
        setView("unavailable");
      }
    })();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (lastDone?.degraded) {
      setDegradedToast(true);
      const t = window.setTimeout(() => setDegradedToast(false), 0);
      return () => window.clearTimeout(t);
    }
  }, [lastDone]);

  if (view === "loading") {
    return (
      <AccountFrame title={T.peotteok.chatTitle} view="loading" testId="peotteok-page">
        <p className={styles.lead}>불러오는 중…</p>
      </AccountFrame>
    );
  }

  if (view === "unauthorized") {
    return (
      <AccountFrame
        title={T.peotteok.chatTitle}
        view="unauthorized"
        testId="peotteok-page"
      >
        <p className={styles.lead}>로그인하면 퍼뜩과 대화할 수 있어요.</p>
        <AccountAuthActions />
      </AccountFrame>
    );
  }

  if (view === "unavailable") {
    return (
      <AccountFrame
        title={T.peotteok.chatTitle}
        view="unavailable"
        testId="peotteok-page"
      >
        <p className={styles.err}>퍼뜩을 확인할 수 없음</p>
      </AccountFrame>
    );
  }

  return (
    <AccountFrame
      title={T.peotteok.chatTitle}
      view="ready"
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

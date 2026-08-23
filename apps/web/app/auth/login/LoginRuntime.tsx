"use client";

import {
  continuePathAfterAuth,
  fetchAuthSession,
  isKakaoOAuthReady,
  requestMagicLink,
  startKakaoOAuth,
} from "@aipo/sdk/auth";
import { AuthLogin } from "@aipo/ui/components/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authUserMessage } from "../auth-messages";

export function LoginRuntime() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void fetchAuthSession({ apiBase: "", signal: ac.signal })
      .then((session) => {
        if (!session) return;
        router.replace(continuePathAfterAuth(session.onboardingStage));
      })
      .catch(() => {
        /* 게스트 유지 */
      });
    return () => ac.abort();
  }, [router]);

  async function onKakao() {
    setError(null);
    setNote(null);
    if (!isKakaoOAuthReady()) {
      setError("지금은 카카오로 연결할 수 없어요.");
      return;
    }
    setBusy(true);
    try {
      const out = await startKakaoOAuth({}, { apiBase: "" });
      if (out.status !== "ready") {
        setError("지금은 카카오로 연결할 수 없어요.");
        return;
      }
      window.location.assign(out.authorizeUrl);
    } catch (caught) {
      setError(authUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onMagic(email: string) {
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      await requestMagicLink(email, { apiBase: "" });
      setNote("메일함을 확인해 주세요.");
    } catch (caught) {
      setError(authUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLogin
      embedded
      busy={busy}
      error={error}
      note={note}
      onKakao={onKakao}
      onMagic={onMagic}
    />
  );
}

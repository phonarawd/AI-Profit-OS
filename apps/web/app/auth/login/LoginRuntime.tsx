"use client";

import {
  fetchAuthSession,
  isKakaoOAuthReady,
  loginClassic,
  requestMagicLink,
  startKakaoOAuth,
} from "@aipo/sdk/auth";
import { continueAfterAuth } from "@aipo/sdk/product-onboarding";
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
      .then(async (session) => {
        if (!session) return;
        const next = await continueAfterAuth(session.onboardingStage, {
          apiBase: "",
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        router.replace(next);
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

  async function onMagic(email: string, turnstileToken?: string) {
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      await requestMagicLink(email, { apiBase: "", turnstileToken });
      setNote("메일함을 확인해 주세요.");
    } catch (caught) {
      setError(authUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onClassic(
    identifier: string,
    password: string,
    turnstileToken?: string,
  ) {
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      const session = await loginClassic(identifier, password, {
        apiBase: "",
        turnstileToken,
      });
      router.replace(
        await continueAfterAuth(session.onboardingStage, { apiBase: "" }),
      );
    } catch (caught) {
      setError(authUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLogin
      busy={busy}
      error={error}
      note={note}
      onKakao={onKakao}
      onMagic={onMagic}
      onClassic={onClassic}
    />
  );
}

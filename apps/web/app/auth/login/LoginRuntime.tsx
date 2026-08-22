"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLogin } from "@aipo/ui/components/auth";
import {
  continuePathAfterAuth,
  fetchAuthSession,
  isAuthError,
  requestMagicLink,
  startKakaoOAuth,
} from "@aipo/sdk/auth";
import { authUserMessage } from "../auth-messages";

export function LoginRuntime() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<
    "loading" | "guest" | "unavailable"
  >("loading");

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAuthSession({ signal: ctrl.signal })
      .then((session) => {
        if (session) {
          router.replace(continuePathAfterAuth(session.onboardingStage));
          return;
        }
        setSessionState("guest");
      })
      .catch((err: unknown) => {
        if (isAuthError(err) && err.status === 401) {
          setSessionState("guest");
          return;
        }
        if ((err as { name?: string }).name === "AbortError") return;
        setError(authUserMessage(err));
        setSessionState("unavailable");
      });
    return () => ctrl.abort();
  }, [router]);

  return (
    <AuthLogin
      busy={busy}
      error={error}
      note={note}
      sessionState={sessionState === "loading" ? "loading" : sessionState}
      onKakao={async () => {
        setBusy(true);
        setError(null);
        try {
          const out = await startKakaoOAuth();
          if (out.status === "ready") {
            window.location.assign(out.authorizeUrl);
            return;
          }
          setError(authUserMessage({ code: "KAKAO_UNAVAILABLE" }));
        } catch (err) {
          setError(authUserMessage(err));
        } finally {
          setBusy(false);
        }
      }}
      onMagic={async (email) => {
        setBusy(true);
        setError(null);
        setNote(null);
        try {
          await requestMagicLink(email);
          setNote(authUserMessage({ code: "MAGIC_SENT" }));
        } catch (err) {
          setError(authUserMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

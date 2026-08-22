"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthSignup, type AuthSignupRuntimeInput } from "@aipo/ui/components/auth";
import {
  continuePathAfterAuth,
  fetchAuthSession,
  isAuthError,
  signupStageA,
  startKakaoOAuth,
} from "@aipo/sdk/auth";
import { authUserMessage } from "../auth-messages";

export function SignupRuntime() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function startKakao(input: AuthSignupRuntimeInput) {
    setBusy(true);
    setError(null);
    try {
      const out = await startKakaoOAuth({
        termsAcceptedAt: input.termsAcceptedAt,
        privacyAcceptedAt: input.privacyAcceptedAt,
        marketingConsent: input.marketingConsent,
        referralCode: input.referralCode,
      });
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
  }

  async function startEmail(input: AuthSignupRuntimeInput) {
    if (!input.email) {
      setError(authUserMessage({ code: "VALIDATION_ERROR" }));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await signupStageA({
        method: "email_magic",
        termsAcceptedAt: input.termsAcceptedAt,
        privacyAcceptedAt: input.privacyAcceptedAt,
        marketingConsent: input.marketingConsent,
        referralCode: input.referralCode,
        email: input.email,
      });
      router.replace(continuePathAfterAuth(session.onboardingStage));
    } catch (err) {
      setError(authUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSignup
      busy={busy}
      error={error}
      sessionState={sessionState === "loading" ? "loading" : sessionState}
      onKakao={startKakao}
      onEmail={startEmail}
    />
  );
}

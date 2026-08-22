"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthCompleteProfile,
  type AuthCompleteProfilePayload,
} from "@aipo/ui/components/auth";
import {
  fetchAuthSession,
  isAuthError,
  patchAuthProfile,
} from "@aipo/sdk/auth";
import { authUserMessage, toPhoneE164 } from "../auth-messages";

export function CompleteProfileRuntime() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailMissing, setEmailMissing] = useState(true);
  const [sessionState, setSessionState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAuthSession({ signal: ctrl.signal })
      .then((session) => {
        if (!session) {
          router.replace("/auth/login");
          return;
        }
        if (session.onboardingStage === "B_complete") {
          router.replace("/onboarding");
          return;
        }
        setEmailMissing(session.emailMissing);
        setSessionState("ready");
      })
      .catch((err: unknown) => {
        if (isAuthError(err) && err.status === 401) {
          router.replace("/auth/login");
          return;
        }
        if ((err as { name?: string }).name === "AbortError") return;
        setError(authUserMessage(err));
        setEmailMissing(true);
        setSessionState("unavailable");
      });
    return () => ctrl.abort();
  }, [router]);

  async function save(payload: AuthCompleteProfilePayload) {
    setBusy(true);
    setError(null);
    try {
      await patchAuthProfile({
        displayName: payload.displayName,
        phoneE164: toPhoneE164(payload.phone),
        birthDate: payload.birthDate,
        email: payload.email,
      });
      router.replace("/onboarding");
    } catch (err) {
      setError(authUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCompleteProfile
      busy={busy}
      error={error}
      emailMissing={emailMissing}
      sessionState={sessionState}
      onSave={save}
    />
  );
}

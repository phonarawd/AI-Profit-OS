"use client";

import { fetchAuthSession, patchAuthProfile } from "@aipo/sdk/auth";
import { AuthCompleteProfile } from "@aipo/ui/components/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authUserMessage, toPhoneE164 } from "../auth-messages";

export function CompleteProfileRuntime() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void fetchAuthSession({ apiBase: "", signal: ac.signal })
      .then((session) => {
        if (!session) {
          router.replace("/auth/login");
          return;
        }
        if (session.onboardingStage === "B_complete") {
          router.replace("/onboarding");
        }
      })
      .catch(() => {
        router.replace("/auth/login");
      });
    return () => ac.abort();
  }, [router]);

  return (
    <AuthCompleteProfile
      busy={busy}
      error={error}
      onSave={async (payload) => {
        setBusy(true);
        setError(null);
        try {
          await patchAuthProfile(
            {
              displayName: payload.displayName,
              phoneE164: toPhoneE164(payload.phone),
              birthDate: payload.birthDate,
              email: payload.email,
              emailAlreadyKnown: false,
            },
            { apiBase: "" },
          );
          router.replace("/onboarding");
        } catch (caught) {
          setError(authUserMessage(caught));
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

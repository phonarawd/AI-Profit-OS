"use client";

import { fetchAuthSession, patchAuthProfile } from "@aipo/sdk/auth";
import { continueAfterAuth } from "@aipo/sdk/product-onboarding";
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
      .then(async (session) => {
        if (!session) {
          router.replace("/auth/login");
          return;
        }
        if (session.onboardingStage === "B_complete") {
          const next = await continueAfterAuth("B_complete", {
            apiBase: "",
            signal: ac.signal,
          });
          if (!ac.signal.aborted) router.replace(next);
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
          router.replace(await continueAfterAuth("B_complete", { apiBase: "" }));
        } catch (caught) {
          setError(authUserMessage(caught));
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

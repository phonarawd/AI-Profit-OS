"use client";

import {
  continuePathAfterAuth,
  fetchAuthSession,
  isKakaoOAuthReady,
  requestMagicLinkWithConsent,
  startKakaoOAuth,
} from "@aipo/sdk/auth";
import {
  AuthSignup,
  type AuthSignupRuntimeInput,
} from "@aipo/ui/components/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authUserMessage } from "../auth-messages";

export function SignupRuntime() {
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

  async function onKakao(input: AuthSignupRuntimeInput) {
    setError(null);
    setNote(null);
    if (!isKakaoOAuthReady()) {
      setError("지금은 카카오로 연결할 수 없어요.");
      return;
    }
    setBusy(true);
    try {
      const out = await startKakaoOAuth(
        {
          termsAcceptedAt: input.termsAcceptedAt,
          privacyAcceptedAt: input.privacyAcceptedAt,
          marketingConsent: input.marketingConsent,
          referralCode: input.referralCode,
        },
        { apiBase: "" },
      );
      if (out.status !== "ready") {
        setError("지금은 카카오로 연결할 수 없어요.");
        return;
      }
      try {
        sessionStorage.setItem(
          "aipo.oauth.terms",
          JSON.stringify({
            termsAcceptedAt: input.termsAcceptedAt,
            privacyAcceptedAt: input.privacyAcceptedAt,
            marketingConsent: input.marketingConsent,
            referralCode: input.referralCode,
          }),
        );
      } catch {
        /* ignore */
      }
      window.location.assign(out.authorizeUrl);
    } catch (caught) {
      setError(authUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onMagic(input: AuthSignupRuntimeInput) {
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      // S1F Section 6.2 fix: consent now travels with the request itself
      // (stored server-side), not via sessionStorage - this is what makes
      // opening the link on a different device/tab/browser work, since
      // there is no longer anything that needs to be read back locally.
      await requestMagicLinkWithConsent(
        input.email ?? "",
        {
          termsAcceptedAt: input.termsAcceptedAt,
          privacyAcceptedAt: input.privacyAcceptedAt,
          marketingConsent: input.marketingConsent,
          referralCode: input.referralCode,
        },
        { apiBase: "" },
      );
      setNote("메일함을 확인해 주세요.");
    } catch (caught) {
      setError(authUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSignup
      busy={busy}
      error={error}
      note={note}
      onKakao={onKakao}
      onMagic={onMagic}
    />
  );
}

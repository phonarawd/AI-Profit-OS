"use client";

import {
  continuePathAfterAuth,
  finishOauth,
} from "@aipo/sdk/auth";
import { GuestChrome } from "../../../../components/GuestChrome";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authUserMessage } from "../../../auth-messages";

function readStoredTerms(): {
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
  marketingConsent?: boolean;
  referralCode?: string;
} {
  try {
    const raw = sessionStorage.getItem("aipo.oauth.terms");
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, unknown>;
    return {
      termsAcceptedAt: typeof o.termsAcceptedAt === "string" ? o.termsAcceptedAt : undefined,
      privacyAcceptedAt:
        typeof o.privacyAcceptedAt === "string" ? o.privacyAcceptedAt : undefined,
      marketingConsent: o.marketingConsent === true,
      referralCode: typeof o.referralCode === "string" ? o.referralCode : undefined,
    };
  } catch {
    return {};
  }
}

export function OauthCallbackRuntime({ provider }: { provider: string }) {
  const router = useRouter();
  const [note, setNote] = useState("연결하는 중이에요");

  useEffect(() => {
    if (provider !== "kakao" && provider !== "google") {
      setNote("지금은 연결할 수 없어요.");
      return;
    }
    const q = new URLSearchParams(window.location.search);
    const code = q.get("code") ?? "";
    const state = q.get("state") ?? "";
    if (!code || !state) {
      setNote("연결에 실패했어요. 다시 시도해 주세요.");
      return;
    }
    let cancelled = false;
    void finishOauth(
      { provider, code, state, ...readStoredTerms() },
      { apiBase: "" },
    )
      .then((session) => {
        if (cancelled) return;
        try {
          sessionStorage.removeItem("aipo.oauth.terms");
        } catch {
          /* ignore */
        }
        router.replace(continuePathAfterAuth(session.onboardingStage));
      })
      .catch((err: unknown) => {
        if (!cancelled) setNote(authUserMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [provider, router]);

  return (
    <GuestChrome>
      <main>
        <h1>연결</h1>
        <p role="status">{note}</p>
      </main>
    </GuestChrome>
  );
}

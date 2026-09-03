"use client";

import {
  continuePathAfterAuth,
  verifyMagicLink,
} from "@aipo/sdk/auth";
import { GuestChrome } from "../../components/GuestChrome";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authUserMessage } from "../auth-messages";

function readStoredTerms(): {
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
  marketingConsent?: boolean;
  referralCode?: string;
} {
  try {
    const raw = sessionStorage.getItem("aipo.magic.terms");
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

export function MagicRuntime() {
  const router = useRouter();
  const [note, setNote] = useState("연결하는 중이에요");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    if (!token) {
      setNote("링크가 올바르지 않아요.");
      return;
    }
    let cancelled = false;
    void verifyMagicLink(token, readStoredTerms(), { apiBase: "" })
      .then((session) => {
        if (cancelled) return;
        try {
          sessionStorage.removeItem("aipo.magic.terms");
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
  }, [router]);

  return (
    <GuestChrome>
      <main>
        <h1>로그인</h1>
        <p role="status">{note}</p>
      </main>
    </GuestChrome>
  );
}

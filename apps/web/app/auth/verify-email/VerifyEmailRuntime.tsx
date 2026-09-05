"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { continuePathAfterAuth, signupClassicActivate } from "@aipo/sdk/auth";
import { GuestChrome } from "../../components/GuestChrome";
import { authUserMessage } from "../auth-messages";

export function VerifyEmailRuntime() {
  const router = useRouter();
  const [note, setNote] = useState("가입을 완료하는 중이에요");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    if (!token) {
      setNote("링크가 올바르지 않아요.");
      return;
    }
    let cancelled = false;
    void signupClassicActivate(token, { apiBase: "" })
      .then((session) => {
        if (cancelled) return;
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
      <main data-testid="auth-verify-email">
        <h1>이메일 인증</h1>
        <p role="status">{note}</p>
      </main>
    </GuestChrome>
  );
}

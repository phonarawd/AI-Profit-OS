"use client";

import {
  continuePathAfterAuth,
  verifyMagicLink,
} from "@aipo/sdk/auth";
import { GuestChrome } from "../../components/GuestChrome";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authUserMessage } from "../auth-messages";

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
    // S1F Section 6.2 fix: consent was already captured server-side at
    // request() time (see SignupRuntime.tsx) - this call no longer needs
    // to read/send anything from sessionStorage, which is exactly what
    // makes opening this link on a different device/tab/browser work.
    void verifyMagicLink(token, {}, { apiBase: "" })
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
      <main>
        <h1>로그인</h1>
        <p role="status">{note}</p>
      </main>
    </GuestChrome>
  );
}

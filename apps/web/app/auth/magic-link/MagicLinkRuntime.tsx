"use client";

import {
  continuePathAfterAuth,
  verifyMagicLink,
} from "@aipo/sdk/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function MagicLinkRuntime() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);
  const [message, setMessage] = useState("로그인 링크를 확인하고 있어요.");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = searchParams.get("token")?.trim() ?? "";
    if (!token) {
      setMessage("유효한 로그인 링크가 아니에요.");
      return;
    }

    const ac = new AbortController();
    void verifyMagicLink(token, { apiBase: "", signal: ac.signal })
      .then((session) => {
        setMessage("확인됐어요. 퍼뜩으로 이동할게요.");
        router.replace(continuePathAfterAuth(session.onboardingStage));
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setMessage("링크가 만료됐거나 이미 사용됐어요. 새 링크를 받아 주세요.");
      });
    return () => ac.abort();
  }, [router, searchParams]);

  return (
    <main
      className="flex flex-1 flex-col items-center justify-center gap-4 text-center"
      data-testid="auth-magic-link-verify"
    >
      <h1 className="text-xl font-semibold text-lux-text">로그인 확인</h1>
      <p className="text-sm text-lux-text-muted" role="status">
        {message}
      </p>
      <a
        href="/auth/login"
        className="text-sm text-lux-principal underline-offset-2 hover:underline"
      >
        로그인 화면으로
      </a>
    </main>
  );
}

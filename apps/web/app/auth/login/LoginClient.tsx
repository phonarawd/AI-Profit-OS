"use client";

import {
  continuePathAfterAuth,
  fetchAuthSession,
  isKakaoOAuthReady,
  requestMagicLink,
} from "@aipo/sdk/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authUserMessage } from "../auth-messages";

export function LoginClient() {
  const router = useRouter();
  const kakaoReady = isKakaoOAuthReady();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  async function onMagic(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      await requestMagicLink(email, { apiBase: "" });
      setNote("메일함을 확인해 주세요.");
    } catch (caught) {
      setErr(authUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-auth="login">
      {kakaoReady ? (
        <p>
          <Link href="/auth/oauth/kakao" data-oauth="kakao">
            카카오로 연결
          </Link>
        </p>
      ) : (
        <p data-auth-kakao-unavailable="true">
          지금은 카카오로 연결할 수 없어요.
        </p>
      )}
      <form onSubmit={onMagic}>
        <label>
          이메일
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={busy}>
          다른 방법으로 이어가기
        </button>
      </form>
      {err ? <p>{err}</p> : null}
      {note ? <p>{note}</p> : null}
      <p>
        <Link href="/auth/signup">계정 만들기</Link>
      </p>
    </section>
  );
}

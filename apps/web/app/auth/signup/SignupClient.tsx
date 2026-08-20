"use client";

import {
  continuePathAfterAuth,
  fetchAuthSession,
  isKakaoOAuthReady,
  requestMagicLink,
  startKakaoOAuth,
} from "@aipo/sdk/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authUserMessage } from "../auth-messages";

export function SignupClient() {
  const router = useRouter();
  const kakaoReady = isKakaoOAuthReady();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [referral, setReferral] = useState("");
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

  function acceptedAt(): string {
    return new Date().toISOString();
  }

  async function onKakao() {
    setErr(null);
    setNote(null);
    if (!terms || !privacy) {
      setErr("약관에 동의해 주세요.");
      return;
    }
    if (!kakaoReady) {
      setErr("지금은 카카오로 연결할 수 없어요.");
      return;
    }
    setBusy(true);
    try {
      const out = await startKakaoOAuth(
        {
          termsAcceptedAt: acceptedAt(),
          privacyAcceptedAt: acceptedAt(),
          marketingConsent: marketing,
          referralCode: referral,
        },
        { apiBase: "" },
      );
      if (out.status !== "ready") {
        setErr("지금은 카카오로 연결할 수 없어요.");
        return;
      }
      window.location.assign(out.authorizeUrl);
    } catch (caught) {
      setErr(authUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onMagic(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setNote(null);
    if (!terms || !privacy) {
      setErr("약관에 동의해 주세요.");
      return;
    }
    setBusy(true);
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
    <section data-auth="signup" data-stage="A">
      <label>
        <input
          type="checkbox"
          name="terms"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
        />
        <Link href="/me/legal/terms">이용약관</Link>에 동의
      </label>
      <label>
        <input
          type="checkbox"
          name="privacy"
          checked={privacy}
          onChange={(e) => setPrivacy(e.target.checked)}
        />
        <Link href="/me/legal/privacy">개인정보</Link>에 동의
      </label>
      <label>
        <input
          type="checkbox"
          name="marketing"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
        />
        소식 받기 (선택)
      </label>
      <label>
        초대 코드 (선택)
        <input
          type="text"
          name="referralCode"
          value={referral}
          onChange={(e) => setReferral(e.target.value)}
        />
      </label>
      {kakaoReady ? (
        <p>
          <button
            type="button"
            data-oauth="kakao"
            disabled={busy}
            onClick={() => void onKakao()}
          >
            카카오로 연결
          </button>
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
        <Link href="/auth/login">이미 계정이 있어요</Link>
      </p>
    </section>
  );
}

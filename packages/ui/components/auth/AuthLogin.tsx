"use client";

import { useEffect, useState } from "react";
import { T } from "../../copy/ko";
import { BrandMark } from "../brand/BrandMark";
import { TouchButton } from "../../primitives/Button";
import { isKakaoOAuthReady, kakaoStartHref } from "./kakao-ready";
import {
  isWebAuthnSupported,
  tryPasskeyAuthenticate,
} from "./webauthn-ready";

export type AuthLoginProps = {
  busy?: boolean;
  error?: string | null;
  note?: string | null;
  onKakao?: () => void | Promise<void>;
  onMagic?: (email: string) => void | Promise<void>;
};

/**
 * Canon auth-login — Kakao primary · Google/Passkey secondary · Email tertiary
 * Gender field 0 · stat strip 0
 * REL-022: 미지원/실패 시 기존 로그인 유지. 빈 화면 금지.
 */
export function AuthLogin({
  busy = false,
  error = null,
  note = null,
  onKakao,
  onMagic,
}: AuthLoginProps = {}) {
  const kakaoReady = isKakaoOAuthReady();
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [showPasskeyFallback, setShowPasskeyFallback] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const supported = isWebAuthnSupported();
    setPasskeySupported(supported);
    if (!supported) setShowPasskeyFallback(true);
  }, []);

  function startKakao() {
    if (busy) return;
    if (onKakao) {
      void onKakao();
      return;
    }
    window.location.href = kakaoStartHref();
  }

  function submitMagic(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (onMagic) void onMagic(email);
  }

  return (
    <main
      data-testid="auth-login"
      data-canon="auth-login"
      className="flex flex-1 flex-col gap-6"
    >
      <BrandMark size="compact" />
      <header className="space-y-2 text-center">
        <h1 className="text-xl font-semibold text-pd-text">
          {T.auth.loginHeadline}
        </h1>
        <p className="text-sm text-pd-text-muted">{T.auth.loginSub}</p>
      </header>

      <div className="flex flex-col gap-3">
        {kakaoReady ? (
          <TouchButton
            variant="primary"
            className="w-full bg-[#FEE500] text-[#191600]"
            data-testid="auth-kakao-primary"
            data-oauth="kakao"
            disabled={busy}
            onClick={startKakao}
          >
            {busy ? T.auth.connecting : T.auth.kakaoStart}
          </TouchButton>
        ) : (
          <div className="space-y-2">
            <TouchButton
              variant="primary"
              className="w-full opacity-50"
              disabled
              data-testid="auth-kakao-primary"
              data-oauth="kakao"
              data-oauth-ready="false"
              aria-disabled="true"
            >
              {T.auth.kakaoStart}
            </TouchButton>
            <p
              className="text-center text-xs text-pd-text-muted"
              data-testid="auth-kakao-unavailable"
            >
              {T.auth.kakaoUnavailable}
            </p>
          </div>
        )}

        <TouchButton
          variant="secondary"
          className="w-full"
          disabled
          data-testid="auth-google"
          data-oauth-ready="false"
        >
          {T.auth.googleStart}
        </TouchButton>
        <TouchButton
          variant="secondary"
          className="w-full"
          disabled={!passkeySupported || busy}
          data-testid="auth-passkey"
          data-passkey-supported={passkeySupported ? "true" : "false"}
          data-oauth-ready={passkeySupported ? "true" : "false"}
          onClick={() => {
            void tryPasskeyAuthenticate().then((result) => {
              if (!result.ok || result.usedFallback) {
                setShowPasskeyFallback(true);
              }
            });
          }}
        >
          {T.auth.passkeyStart}
        </TouchButton>
        {showPasskeyFallback ? (
          <p
            className="text-center text-xs text-pd-text-muted"
            data-testid="auth-passkey-fallback"
          >
            {T.auth.passkeyFallback}
          </p>
        ) : null}
        <TouchButton
          variant="ghost"
          className="w-full"
          data-testid="auth-email"
          data-oauth-ready="true"
          disabled={busy}
          onClick={() => setShowEmail((v) => !v)}
        >
          {T.auth.emailMagic}
        </TouchButton>
      </div>

      {showEmail ? (
        <form
          onSubmit={submitMagic}
          className="space-y-3"
          data-testid="auth-email-form"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-pd-text-muted">{T.auth.emailForm}</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={T.auth.emailPlaceholder}
              className="touch-target rounded-pd-md border border-pd-border bg-pd-surface px-3 text-pd-text"
            />
          </label>
          <TouchButton
            type="submit"
            variant="secondary"
            className="w-full"
            data-testid="auth-email-submit"
            disabled={busy}
          >
            {busy ? T.auth.sending : T.auth.emailMagic}
          </TouchButton>
        </form>
      ) : null}

      {error ? (
        <p role="alert" aria-live="assertive" className="text-center text-sm text-pd-text">
          {error}
        </p>
      ) : null}
      {note ? (
        <p role="status" aria-live="polite" className="text-center text-sm text-pd-text-muted">
          {note}
        </p>
      ) : null}

      <p className="text-center text-sm">
        <a
          href="/auth/signup"
          className="text-pd-principal underline-offset-2 hover:underline"
        >
          {T.auth.toSignup}
        </a>
      </p>

      <footer className="mt-auto pt-6 text-center text-xs text-pd-text-muted">
        {T.legal.operator.footerLine}
      </footer>
    </main>
  );
}

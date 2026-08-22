"use client";

import { useEffect, useState, type FormEvent } from "react";
import { T } from "../../copy/ko";
import { AuthShell } from "./AuthShell";
import { isKakaoOAuthReady, kakaoStartHref } from "./kakao-ready";
import {
  isWebAuthnSupported,
  tryPasskeyAuthenticate,
} from "./webauthn-ready";

export type AuthLoginProps = {
  busy?: boolean;
  error?: string | null;
  note?: string | null;
  sessionState?: "guest" | "unavailable" | "ready" | "loading";
  onKakao?: () => void | Promise<void>;
  onMagic?: (email: string) => void | Promise<void>;
};

/**
 * Spark Dash login — Kakao primary · Passkey kept · Google disabled
 */
export function AuthLogin({
  busy = false,
  error = null,
  note = null,
  sessionState = "guest",
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

  function submitMagic(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (onMagic) void onMagic(email);
  }

  return (
    <AuthShell
      tone="login"
      title={T.auth.loginHeadline}
      sub={T.auth.loginSub}
      lead={T.auth.loginLead}
      sessionState={sessionState}
    >
      <main data-testid="auth-login" data-canon="auth-login">
        {kakaoReady ? (
          <button
            type="button"
            className="authSparkBtn authSparkBtnKakao"
            data-testid="auth-kakao-primary"
            data-oauth="kakao"
            disabled={busy}
            onClick={startKakao}
          >
            {busy ? T.auth.connecting : T.auth.kakaoStart}
          </button>
        ) : (
          <div>
            <button
              type="button"
              className="authSparkBtn authSparkBtnDisabled"
              disabled
              data-testid="auth-kakao-primary"
              data-oauth="kakao"
              data-oauth-ready="false"
              aria-disabled="true"
            >
              {T.auth.kakaoStart}
            </button>
            <p className="authSparkHint" data-testid="auth-kakao-unavailable">
              {T.auth.kakaoUnavailable}
            </p>
          </div>
        )}

        <button
          type="button"
          className="authSparkBtn authSparkBtnDisabled"
          disabled
          data-testid="auth-google"
          data-oauth-ready="false"
        >
          {T.auth.googleStart}
        </button>
        <button
          type="button"
          className="authSparkBtn authSparkBtnPasskey"
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
        </button>
        {showPasskeyFallback ? (
          <p className="authSparkHint" data-testid="auth-passkey-fallback">
            {T.auth.passkeyFallback}
          </p>
        ) : null}
        <button
          type="button"
          className="authSparkBtn authSparkBtnGhost"
          data-testid="auth-email"
          data-oauth-ready="true"
          disabled={busy}
          onClick={() => setShowEmail((v) => !v)}
        >
          {T.auth.emailMagic}
        </button>

        {showEmail ? (
          <form
            onSubmit={submitMagic}
            className="authSparkField"
            data-testid="auth-email-form"
          >
            <label className="authSparkField">
              <span>{T.auth.emailForm}</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={T.auth.emailPlaceholder}
              />
            </label>
            <button
              type="submit"
              className="authSparkBtn authSparkBtnPasskey"
              data-testid="auth-email-submit"
              disabled={busy}
            >
              {busy ? T.auth.sending : T.auth.emailMagic}
            </button>
          </form>
        ) : null}

        {error ? (
          <p role="alert" aria-live="assertive" className="authSparkAlert">
            {error}
          </p>
        ) : null}
        {note ? (
          <p role="status" aria-live="polite" className="authSparkNote">
            {note}
          </p>
        ) : null}

        <a href="/auth/signup" className="authSparkLink">
          {T.auth.toSignup}
        </a>
      </main>
    </AuthShell>
  );
}

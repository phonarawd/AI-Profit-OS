"use client";

import { useEffect, useState, type FormEvent } from "react";
import { T } from "../../copy/ko";
import { AuthShell } from "./AuthShell";
import { isKakaoOAuthReady } from "./kakao-ready";

export type AuthSignupRuntimeInput = {
  termsAcceptedAt: string;
  privacyAcceptedAt: string;
  marketingConsent: boolean;
  referralCode?: string;
  email?: string;
};

export type AuthSignupProps = {
  busy?: boolean;
  error?: string | null;
  sessionState?: "guest" | "unavailable" | "ready" | "loading";
  onKakao?: (input: AuthSignupRuntimeInput) => void | Promise<void>;
  onEmail?: (input: AuthSignupRuntimeInput) => void | Promise<void>;
};

/**
 * Spark Dash signup — Desktop Passkey disabled · Mobile Passkey render 0
 */
export function AuthSignup({
  busy = false,
  error = null,
  sessionState = "guest",
  onKakao,
  onEmail,
}: AuthSignupProps = {}) {
  const kakaoReady = isKakaoOAuthReady();
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [referral, setReferral] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [showDesktopPasskey, setShowDesktopPasskey] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setShowDesktopPasskey(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  function nowIso() {
    return new Date().toISOString();
  }

  function payload(withEmail: boolean): AuthSignupRuntimeInput {
    const input: AuthSignupRuntimeInput = {
      termsAcceptedAt: nowIso(),
      privacyAcceptedAt: nowIso(),
      marketingConsent: marketing,
    };
    if (referral.trim()) input.referralCode = referral.trim();
    if (withEmail && email.trim()) input.email = email.trim();
    return input;
  }

  function startKakao() {
    if (busy || !terms || !kakaoReady) return;
    if (onKakao) void onKakao(payload(false));
  }

  function submitEmail(e: FormEvent) {
    e.preventDefault();
    if (busy || !terms) return;
    if (onEmail) void onEmail(payload(true));
  }

  return (
    <AuthShell
      tone="signup"
      title={T.auth.signupHeadline}
      sub={T.auth.signupSub}
      lead={T.auth.signupLead}
      sessionState={sessionState}
    >
      <main data-testid="auth-signup" data-canon="auth-signup" data-stage="A">
        {kakaoReady ? (
          <button
            type="button"
            className={
              terms
                ? "authSparkBtn authSparkBtnKakao"
                : "authSparkBtn authSparkBtnDisabled"
            }
            data-testid="auth-kakao-primary"
            data-oauth="kakao"
            disabled={!terms || busy}
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
        >
          {T.auth.googleStart}
        </button>
        {showDesktopPasskey ? (
          <button
            type="button"
            className="authSparkBtn authSparkBtnDisabled"
            disabled
            data-testid="auth-signup-passkey"
            data-passkey="disabled"
            aria-disabled="true"
          >
            {T.auth.passkeyStart}
          </button>
        ) : null}

        {kakaoReady && !terms ? (
          <p className="authSparkHint" data-testid="auth-terms-needed">
            {T.auth.termsNeeded}
          </p>
        ) : null}

        <button
          type="button"
          className="authSparkBtn authSparkBtnGhost"
          data-testid="auth-email-toggle"
          disabled={busy}
          onClick={() => setShowEmail((v) => !v)}
        >
          {T.auth.emailSignup}
        </button>

        {showEmail ? (
          <form
            onSubmit={submitEmail}
            className="authSparkField"
            data-testid="auth-email-form"
          >
            <div className="authSparkField" data-testid="auth-email-fields">
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
            </div>
            <button
              type="submit"
              className="authSparkBtn authSparkBtnPasskey"
              data-testid="auth-email-submit"
              disabled={!terms || busy}
            >
              {busy ? T.auth.sending : T.auth.emailSignup}
            </button>
          </form>
        ) : null}

        <label className="authSparkCheck">
          <input
            type="checkbox"
            data-testid="auth-terms"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
          />
          <span>{T.auth.termsRequired}</span>
        </label>
        <label className="authSparkCheck">
          <input
            type="checkbox"
            data-testid="auth-marketing"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
          />
          <span>{T.auth.marketingOptional}</span>
        </label>
        <label className="authSparkField">
          <span>{T.auth.referralCode}</span>
          <input
            type="text"
            data-testid="auth-referral"
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
            placeholder={T.auth.inviteHint}
            autoComplete="off"
          />
        </label>

        {error ? (
          <p role="alert" aria-live="assertive" className="authSparkAlert">
            {error}
          </p>
        ) : null}

        <a href="/auth/login" className="authSparkLink">
          {T.auth.toLogin}
        </a>
      </main>
    </AuthShell>
  );
}

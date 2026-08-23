"use client";

import { useState } from "react";
import { T } from "../../copy/ko";
import { BrandMark } from "../brand/BrandMark";
import { TouchButton } from "../lux/TouchButton";
import { isKakaoOAuthReady, kakaoStartHref } from "./kakao-ready";

export type AuthSignupRuntimeInput = {
  termsAcceptedAt: string;
  privacyAcceptedAt: string;
  marketingConsent: boolean;
  referralCode: string;
  email?: string;
};

export type AuthSignupProps = {
  embedded?: boolean;
  busy?: boolean;
  error?: string | null;
  note?: string | null;
  onKakao?: (input: AuthSignupRuntimeInput) => void | Promise<void>;
  onMagic?: (input: AuthSignupRuntimeInput) => void | Promise<void>;
};

/**
 * Canon auth-signup — Stage A · Kakao primary · terms required · forbidden fields 0
 */
export function AuthSignup({
  embedded = false,
  busy = false,
  error = null,
  note = null,
  onKakao,
  onMagic,
}: AuthSignupProps = {}) {
  const kakaoReady = isKakaoOAuthReady();
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [referral, setReferral] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");

  function accepted(): AuthSignupRuntimeInput {
    const at = new Date().toISOString();
    return {
      termsAcceptedAt: at,
      privacyAcceptedAt: at,
      marketingConsent: marketing,
      referralCode: referral,
      email,
    };
  }

  function startKakao() {
    if (!terms || busy) return;
    if (onKakao) {
      void onKakao(accepted());
      return;
    }
    window.location.href = kakaoStartHref();
  }

  function submitMagic(e: React.FormEvent) {
    e.preventDefault();
    if (!terms || busy) return;
    if (onMagic) {
      void onMagic(accepted());
    }
  }

  return (
    <main
      data-testid="auth-signup"
      data-canon="auth-signup"
      data-stage="A"
      data-embedded={embedded ? "true" : "false"}
      className={embedded ? "flex flex-col gap-3" : "flex flex-1 flex-col gap-6"}
    >
      {!embedded ? <BrandMark size="compact" /> : null}
      {!embedded ? (
        <header className="space-y-2 text-center">
          <h1 className="text-xl font-semibold text-lux-text">
            {T.auth.signupHeadline}
          </h1>
          <p className="text-sm text-lux-text-muted">{T.auth.signupSub}</p>
        </header>
      ) : null}

      <div className="flex flex-col gap-3">
        {kakaoReady && terms ? (
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
              data-oauth-ready={kakaoReady ? "true" : "false"}
              aria-disabled="true"
            >
              {T.auth.kakaoStart}
            </TouchButton>
            {!kakaoReady ? (
              <p
                className="text-center text-xs text-lux-text-muted"
                data-testid="auth-kakao-unavailable"
              >
                {T.auth.kakaoUnavailable}
              </p>
            ) : (
              <p
                className="text-center text-xs text-lux-text-muted"
                data-testid="auth-terms-needed"
              >
                {T.auth.termsNeeded}
              </p>
            )}
          </div>
        )}

        <TouchButton variant="secondary" className="w-full" disabled>
          {T.auth.googleStart}
        </TouchButton>
        <TouchButton variant="secondary" className="w-full" disabled>
          {T.auth.passkeyStart}
        </TouchButton>
        <TouchButton
          variant="ghost"
          className="w-full"
          data-testid="auth-email-toggle"
          disabled={busy}
          onClick={() => setShowEmail((v) => !v)}
        >
          {embedded ? T.auth.emailSignup : T.auth.emailMagic}
        </TouchButton>
      </div>

      {embedded ? (
        <p className="text-xs text-lux-text-muted" data-testid="auth-terms-needed">
          {T.auth.termsNeeded}
        </p>
      ) : null}

      {showEmail ? (
        <form
          onSubmit={submitMagic}
          className="space-y-3"
          data-testid="auth-email-form"
        >
          <label
            className="flex flex-col gap-1 text-sm"
            data-testid="auth-email-fields"
          >
            <span className="text-lux-text-muted">{T.auth.emailForm}</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={T.auth.emailPlaceholder}
              className="touch-target rounded-lux-md border border-lux-border bg-lux-surface px-3 text-lux-text"
            />
          </label>
          <TouchButton
            type="submit"
            variant="secondary"
            className="w-full"
            data-testid="auth-email-submit"
            disabled={busy || !terms}
          >
            {busy ? T.auth.sending : T.auth.emailSignup}
          </TouchButton>
        </form>
      ) : null}

      <div className="space-y-3 text-sm">
        <label className="flex items-start gap-3" data-testid="auth-terms">
          <input
            type="checkbox"
            name="terms"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0"
            required
          />
          <span>
            {T.auth.termsRequired}{" "}
            <a
              href="/me/legal"
              className="text-lux-principal underline-offset-2 hover:underline"
            >
              {T.legal.termsTitle}
            </a>
          </span>
        </label>
        <label className="flex items-start gap-3" data-testid="auth-marketing">
          <input
            type="checkbox"
            name="marketing"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0"
          />
          <span>{T.auth.marketingOptional}</span>
        </label>
        <label className="flex flex-col gap-1" data-testid="auth-referral">
          <span className="text-lux-text-muted">{T.auth.referralCode}</span>
          <input
            type="text"
            name="referralCode"
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
            autoComplete="off"
            className="touch-target rounded-lux-md border border-lux-border bg-lux-surface px-3 text-lux-text"
          />
        </label>
      </div>

      {error ? (
        <p role="alert" aria-live="assertive" className="text-center text-sm text-lux-text">
          {error}
        </p>
      ) : null}
      {note ? (
        <p role="status" aria-live="polite" className="text-center text-sm text-lux-text-muted">
          {note}
        </p>
      ) : null}

      <p className="text-center text-sm">
        <a
          href="/auth/login"
          className="text-lux-principal underline-offset-2 hover:underline"
        >
          {T.auth.toLogin}
        </a>
      </p>
    </main>
  );
}

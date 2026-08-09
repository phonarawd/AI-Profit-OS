"use client";

import { T } from "../../copy/ko";
import { BrandMark } from "../brand/BrandMark";
import { TouchButton } from "../lux/TouchButton";
import { isKakaoOAuthReady, kakaoStartHref } from "./kakao-ready";

/**
 * Canon auth-login — Kakao primary · Google/Passkey secondary · Email tertiary
 * Gender field 0 · stat strip 0
 */
export function AuthLogin() {
  const kakaoReady = isKakaoOAuthReady();

  return (
    <main
      data-testid="auth-login"
      data-canon="auth-login"
      className="flex flex-1 flex-col gap-6"
    >
      <BrandMark size="compact" />
      <header className="space-y-2 text-center">
        <h1 className="text-xl font-semibold text-lux-text">
          {T.auth.loginHeadline}
        </h1>
        <p className="text-sm text-lux-text-muted">{T.auth.loginSub}</p>
      </header>

      <div className="flex flex-col gap-3">
        {kakaoReady ? (
          <TouchButton
            variant="primary"
            className="w-full bg-[#FEE500] text-[#191600]"
            data-testid="auth-kakao-primary"
            data-oauth="kakao"
            onClick={() => {
              window.location.href = kakaoStartHref();
            }}
          >
            {T.auth.kakaoStart}
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
              className="text-center text-xs text-lux-text-muted"
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
          disabled
          data-testid="auth-passkey"
          data-oauth-ready="false"
        >
          {T.auth.passkeyStart}
        </TouchButton>
        <TouchButton
          variant="ghost"
          className="w-full"
          disabled
          data-testid="auth-email"
          data-oauth-ready="false"
        >
          {T.auth.emailMagic}
        </TouchButton>
      </div>

      <p className="text-center text-sm">
        <a href="/auth/signup" className="text-lux-principal underline-offset-2 hover:underline">
          {T.auth.toSignup}
        </a>
      </p>

      <footer className="mt-auto pt-6 text-center text-xs text-lux-text-muted">
        {T.legal.operator.footerLine}
      </footer>
    </main>
  );
}

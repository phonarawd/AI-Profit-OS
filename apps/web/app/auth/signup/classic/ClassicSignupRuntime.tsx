"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  continuePathAfterAuth,
  signupClassicRequest,
  type ClassicSignupInput,
} from "@aipo/sdk/auth";
import { T } from "@aipo/ui/copy/ko";
import { BrandMark } from "@aipo/ui/components/brand/BrandMark";
import { TouchButton } from "@aipo/ui/components/lux/TouchButton";
import { authUserMessage, toPhoneE164 } from "../../auth-messages";

export function ClassicSignupRuntime() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [declaredName, setDeclaredName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!terms || !privacy) {
      setError("이용약관과 개인정보 처리방침에 동의해 주세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setError(T.authClassic.passwordMismatch);
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const input: ClassicSignupInput = {
        username: username.trim().toLowerCase(),
        email: email.trim(),
        password,
        passwordConfirm,
        declaredName: declaredName.trim(),
        birthDate,
        phoneE164: phone.trim() ? toPhoneE164(phone.trim()) : undefined,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        marketingConsent: marketing,
      };
      await signupClassicRequest(input, { apiBase: "" });
      setDone(true);
    } catch (caught) {
      setError(authUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main data-testid="auth-signup-classic-done" className="flex flex-1 flex-col gap-6">
        <BrandMark size="compact" />
        <h1 className="text-xl font-semibold text-lux-text">
          {T.authClassic.classicSignupSuccessTitle}
        </h1>
        <p className="text-sm text-lux-text-muted">{T.authClassic.classicSignupSuccessBody}</p>
        <TouchButton variant="secondary" className="w-full" onClick={() => router.push("/auth/login")}>
          {T.auth.toLogin}
        </TouchButton>
      </main>
    );
  }

  return (
    <main data-testid="auth-signup-classic" className="flex flex-1 flex-col gap-6">
      <BrandMark size="compact" />
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-lux-text">{T.authClassic.classicSignupStart}</h1>
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-lux-text-muted">{T.authClassic.username}</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            placeholder={T.authClassic.usernamePlaceholder}
            className="touch-target rounded-lux-md border border-lux-border bg-lux-surface px-3 text-lux-text"
            data-testid="classic-signup-username"
          />
          <span className="text-xs text-lux-text-muted">{T.authClassic.usernameHelp}</span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-lux-text-muted">{T.auth.email}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder={T.auth.emailPlaceholder}
            className="touch-target rounded-lux-md border border-lux-border bg-lux-surface px-3 text-lux-text"
            data-testid="classic-signup-email"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-lux-text-muted">{T.authClassic.password}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={15}
            maxLength={128}
            autoComplete="new-password"
            placeholder={T.authClassic.passwordPlaceholder}
            className="touch-target rounded-lux-md border border-lux-border bg-lux-surface px-3 text-lux-text"
            data-testid="classic-signup-password"
          />
          <span className="text-xs text-lux-text-muted">{T.authClassic.passwordHelp}</span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-lux-text-muted">{T.authClassic.passwordConfirm}</span>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className="touch-target rounded-lux-md border border-lux-border bg-lux-surface px-3 text-lux-text"
            data-testid="classic-signup-password-confirm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-lux-text-muted">{T.authClassic.declaredNameLabel}</span>
          <input
            value={declaredName}
            onChange={(e) => setDeclaredName(e.target.value)}
            required
            autoComplete="name"
            className="touch-target rounded-lux-md border border-lux-border bg-lux-surface px-3 text-lux-text"
            data-testid="classic-signup-declared-name"
          />
          <span className="text-xs text-lux-text-muted">{T.authClassic.declaredNameHelp}</span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-lux-text-muted">{T.authClassic.birthDateLabel}</span>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            className="touch-target rounded-lux-md border border-lux-border bg-lux-surface px-3 text-lux-text"
            data-testid="classic-signup-birth-date"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-lux-text-muted">{T.authClassic.phoneOptionalLabel}</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            className="touch-target rounded-lux-md border border-lux-border bg-lux-surface px-3 text-lux-text"
            data-testid="classic-signup-phone"
          />
          <span className="text-xs text-lux-text-muted">{T.authClassic.phoneOptionalHelp}</span>
        </label>

        <label className="flex items-start gap-3 text-sm" data-testid="classic-signup-terms">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0"
            required
          />
          <span>{T.auth.termsRequired}</span>
        </label>
        <label className="flex items-start gap-3 text-sm" data-testid="classic-signup-privacy">
          <input
            type="checkbox"
            checked={privacy}
            onChange={(e) => setPrivacy(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0"
            required
          />
          <span>{T.legal.privacyTitle}</span>
        </label>
        <label className="flex items-start gap-3 text-sm" data-testid="classic-signup-marketing">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0"
          />
          <span>{T.auth.marketingOptional}</span>
        </label>

        {error ? (
          <p role="alert" aria-live="assertive" className="text-sm text-lux-text">
            {error}
          </p>
        ) : null}

        <TouchButton
          type="submit"
          variant="primary"
          className="w-full"
          disabled={busy}
          data-testid="classic-signup-submit"
        >
          {busy ? T.auth.sending : T.authClassic.classicSignupSubmit}
        </TouchButton>
      </form>
    </main>
  );
}

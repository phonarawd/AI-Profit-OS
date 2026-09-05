"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completePasswordReset, requestPasswordReset } from "@aipo/sdk/auth";
import { T } from "@aipo/ui/copy/ko";
import { BrandMark } from "@aipo/ui/components/brand/BrandMark";
import { TouchButton } from "@aipo/ui/components/lux/TouchButton";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { authUserMessage } from "../auth-messages";

function RequestForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestPasswordReset(email.trim(), { apiBase: "" });
      setDone(true);
    } catch (caught) {
      setError(authUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p role="status" className="text-sm text-lux-text-muted" data-testid="reset-password-request-sent">
        {T.authClassic.resetPasswordRequestSentBody}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
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
          data-testid="reset-password-request-email"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-lux-text">
          {error}
        </p>
      ) : null}
      <TouchButton
        type="submit"
        variant="primary"
        className="w-full"
        disabled={busy}
        data-testid="reset-password-request-submit"
      >
        {busy ? T.auth.sending : T.authClassic.resetPasswordRequestSubmit}
      </TouchButton>
    </form>
  );
}

function CompleteForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(T.authClassic.passwordMismatch);
      return;
    }
    setBusy(true);
    try {
      await completePasswordReset(token, password, { apiBase: "" });
      setDone(true);
    } catch (caught) {
      setError(authUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-3" data-testid="reset-password-complete-done">
        <p role="status" className="text-sm text-lux-text-muted">
          {T.authClassic.resetPasswordCompleteDoneBody}
        </p>
        <TouchButton variant="secondary" className="w-full" onClick={() => router.push("/auth/login")}>
          {T.auth.toLogin}
        </TouchButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-lux-text-muted">{T.authClassic.newPassword}</span>
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
          data-testid="reset-password-complete-new"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-lux-text-muted">{T.authClassic.passwordConfirm}</span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          className="touch-target rounded-lux-md border border-lux-border bg-lux-surface px-3 text-lux-text"
          data-testid="reset-password-complete-confirm"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-lux-text">
          {error}
        </p>
      ) : null}
      <TouchButton
        type="submit"
        variant="primary"
        className="w-full"
        disabled={busy}
        data-testid="reset-password-complete-submit"
      >
        {busy ? T.auth.sending : T.authClassic.resetPasswordCompleteSubmit}
      </TouchButton>
    </form>
  );
}

function ResetPasswordInner() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";

  return (
    <main data-testid="auth-reset-password" className="flex flex-1 flex-col gap-6">
      <BrandMark size="compact" />
      <h1 className="text-xl font-semibold text-lux-text">{T.authClassic.resetPasswordLink}</h1>
      {token ? <CompleteForm token={token} /> : <RequestForm />}
      <a href="/auth/login" className="text-sm underline">
        {T.auth.toLogin}
      </a>
    </main>
  );
}

export function ResetPasswordRuntime() {
  return (
    <SearchParamsBoundary>
      <ResetPasswordInner />
    </SearchParamsBoundary>
  );
}

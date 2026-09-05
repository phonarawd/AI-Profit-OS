"use client";

import { FormEvent, useState } from "react";
import { findId } from "@aipo/sdk/auth";
import { T } from "@aipo/ui/copy/ko";
import { BrandMark } from "@aipo/ui/components/brand/BrandMark";
import { TouchButton } from "@aipo/ui/components/lux/TouchButton";
import { authUserMessage } from "../auth-messages";

export function FindIdRuntime() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await findId(email.trim(), { apiBase: "" });
      setDone(true);
    } catch (caught) {
      setError(authUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main data-testid="auth-find-id" className="flex flex-1 flex-col gap-6">
      <BrandMark size="compact" />
      <h1 className="text-xl font-semibold text-lux-text">{T.authClassic.findIdLink}</h1>
      {done ? (
        <p role="status" className="text-sm text-lux-text-muted" data-testid="find-id-sent">
          {T.authClassic.findIdSentBody}
        </p>
      ) : (
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
              data-testid="find-id-email"
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-lux-text">
              {error}
            </p>
          ) : null}
          <TouchButton type="submit" variant="primary" className="w-full" disabled={busy} data-testid="find-id-submit">
            {busy ? T.auth.sending : T.authClassic.findIdSubmit}
          </TouchButton>
        </form>
      )}
      <a href="/auth/login" className="text-sm underline">
        {T.auth.toLogin}
      </a>
    </main>
  );
}

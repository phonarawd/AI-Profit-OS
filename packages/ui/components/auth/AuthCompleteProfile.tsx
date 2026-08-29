"use client";

import { useState } from "react";
import { T } from "../../copy/ko";
import { BrandMark } from "../brand/BrandMark";
import { TouchButton } from "../../primitives/Button";

export type AuthCompleteProfilePayload = {
  displayName: string;
  phone: string;
  birthDate: string;
  email?: string;
};

export type AuthCompleteProfileProps = {
  /** When OAuth already provided email, hide email field */
  emailMissing?: boolean;
  busy?: boolean;
  error?: string | null;
  onSave?: (payload: AuthCompleteProfilePayload) => void | Promise<void>;
};

/**
 * Canon auth-complete-profile — Stage B · withdraw/KYC gate
 * Fields: displayName · phone · birthDate · email? · forbidden fields 0
 */
export function AuthCompleteProfile({
  emailMissing = true,
  busy = false,
  error = null,
  onSave,
}: AuthCompleteProfileProps) {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: AuthCompleteProfilePayload = {
      displayName: displayName.trim(),
      phone: phone.trim(),
      birthDate,
      ...(emailMissing ? { email: email.trim() } : {}),
    };
    if (onSave) {
      await onSave(payload);
      return;
    }
    if (typeof window !== "undefined") {
      window.location.href = "/onboarding";
    }
  }

  return (
    <main
      data-testid="auth-complete-profile"
      data-canon="auth-complete-profile"
      data-stage="B"
      className="flex flex-1 flex-col gap-6"
    >
      <BrandMark size="compact" />
      <header className="space-y-2 text-center">
        <h1 className="text-xl font-semibold text-pd-text">
          {T.auth.completeHeadline}
        </h1>
        <p className="text-sm text-pd-text-muted">{T.auth.completeSub}</p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <label className="flex flex-col gap-1 text-sm" data-testid="field-displayName">
          <span className="text-pd-text-muted">{T.auth.displayName}</span>
          <input
            name="displayName"
            required
            minLength={2}
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="nickname"
            className="touch-target rounded-pd-md border border-pd-border bg-pd-surface px-3 text-pd-text"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm" data-testid="field-phone">
          <span className="text-pd-text-muted">{T.auth.phone}</span>
          <input
            name="phone"
            type="tel"
            required
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="+82"
            className="touch-target rounded-pd-md border border-pd-border bg-pd-surface px-3 text-pd-text"
          />
        </label>

        {emailMissing ? (
          <label className="flex flex-col gap-1 text-sm" data-testid="field-email">
            <span className="text-pd-text-muted">{T.auth.email}</span>
            <input
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder={T.auth.emailPlaceholder}
              className="touch-target rounded-pd-md border border-pd-border bg-pd-surface px-3 text-pd-text"
            />
          </label>
        ) : null}

        <label className="flex flex-col gap-1 text-sm" data-testid="field-birthDate">
          <span className="text-pd-text-muted">{T.auth.birthDate}</span>
          <input
            name="birthDate"
            type="date"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            autoComplete="bday"
            className="touch-target rounded-pd-md border border-pd-border bg-pd-surface px-3 text-pd-text"
          />
        </label>

        <p className="text-sm text-pd-text-muted" data-testid="complete-hint">
          {T.auth.completeHintWithdraw}
        </p>

        {error ? (
          <p role="alert" aria-live="assertive" className="text-sm text-pd-text">
            {error}
          </p>
        ) : null}

        <TouchButton
          type="submit"
          variant="primary"
          className="w-full"
          data-testid="auth-save-continue"
          data-action="patch_profile_stage_b"
          disabled={busy}
        >
          {busy ? T.auth.saveBusy : T.auth.saveContinue}
        </TouchButton>
      </form>
    </main>
  );
}

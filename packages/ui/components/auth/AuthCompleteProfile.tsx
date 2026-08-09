"use client";

import { useState } from "react";
import { T } from "../../copy/ko";
import { BrandMark } from "../brand/BrandMark";
import { TouchButton } from "../lux/TouchButton";

export type AuthCompleteProfileProps = {
  /** When OAuth already provided email, hide email field */
  emailMissing?: boolean;
  onSave?: (payload: {
    displayName: string;
    phone: string;
    birthDate: string;
    email?: string;
  }) => void;
};

/**
 * Canon auth-complete-profile — Stage B · withdraw/KYC gate
 * Fields: displayName · phone · birthDate · email? · forbidden fields 0
 */
export function AuthCompleteProfile({
  emailMissing = true,
  onSave,
}: AuthCompleteProfileProps) {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave?.({
      displayName: displayName.trim(),
      phone: phone.trim(),
      birthDate,
      ...(emailMissing ? { email: email.trim() } : {}),
    });
    // Phase0: local complete → onboarding (Nest PATCH = Infra/Engine later)
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
        <h1 className="text-xl font-semibold text-lux-text">
          {T.auth.completeHeadline}
        </h1>
        <p className="text-sm text-lux-text-muted">{T.auth.completeSub}</p>
      </header>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <label className="flex flex-col gap-1 text-sm" data-testid="field-displayName">
          <span className="text-lux-text-muted">{T.auth.displayName}</span>
          <input
            name="displayName"
            required
            minLength={2}
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="nickname"
            className="touch-target rounded-lux-md border border-lux-border bg-lux-surface px-3 text-lux-text"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm" data-testid="field-phone">
          <span className="text-lux-text-muted">{T.auth.phone}</span>
          <input
            name="phone"
            type="tel"
            required
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="+82"
            className="touch-target rounded-lux-md border border-lux-border bg-lux-surface px-3 text-lux-text"
          />
        </label>

        {emailMissing ? (
          <label className="flex flex-col gap-1 text-sm" data-testid="field-email">
            <span className="text-lux-text-muted">{T.auth.email}</span>
            <input
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder={T.auth.emailPlaceholder}
              className="touch-target rounded-lux-md border border-lux-border bg-lux-surface px-3 text-lux-text"
            />
          </label>
        ) : null}

        <label className="flex flex-col gap-1 text-sm" data-testid="field-birthDate">
          <span className="text-lux-text-muted">{T.auth.birthDate}</span>
          <input
            name="birthDate"
            type="date"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            autoComplete="bday"
            className="touch-target rounded-lux-md border border-lux-border bg-lux-surface px-3 text-lux-text"
          />
        </label>

        <p className="text-sm text-lux-text-muted" data-testid="complete-hint">
          {T.auth.completeHintWithdraw}
        </p>

        <TouchButton
          type="submit"
          variant="primary"
          className="w-full"
          data-testid="auth-save-continue"
          data-action="patch_profile_stage_b"
        >
          {T.auth.saveContinue}
        </TouchButton>
      </form>
    </main>
  );
}

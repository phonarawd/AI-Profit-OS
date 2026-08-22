"use client";

import { useState, type FormEvent } from "react";
import { T } from "../../copy/ko";
import { AuthShell } from "./AuthShell";

export type AuthCompleteProfilePayload = {
  displayName: string;
  phone: string;
  email?: string;
  birthDate: string;
};

export type AuthCompleteProfileProps = {
  busy?: boolean;
  error?: string | null;
  emailMissing?: boolean;
  sessionState?: "guest" | "unavailable" | "ready" | "loading";
  onSave?: (payload: AuthCompleteProfilePayload) => void | Promise<void>;
};

/**
 * Spark Dash complete profile — email 필드는 서버 emailMissing 만 따른다
 */
export function AuthCompleteProfile({
  busy = false,
  error = null,
  emailMissing = true,
  sessionState = "ready",
  onSave,
}: AuthCompleteProfileProps = {}) {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const payload: AuthCompleteProfilePayload = {
      displayName,
      phone,
      birthDate,
    };
    if (emailMissing) payload.email = email;
    if (onSave) void onSave(payload);
  }

  return (
    <AuthShell
      tone="complete"
      title={T.auth.completeHeadline}
      sub={T.auth.completeSub}
      lead={T.auth.completeLead}
      sessionState={sessionState}
    >
      <form
        data-testid="auth-complete-profile"
        data-canon="auth-complete-profile"
        data-stage="B"
        data-email-missing={emailMissing ? "true" : "false"}
        onSubmit={submit}
      >
        <label className="authSparkField">
          <span>{T.auth.displayName}</span>
          <input
            type="text"
            name="displayName"
            data-testid="field-displayName"
            autoComplete="name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label className="authSparkField">
          <span>{T.auth.phone}</span>
          <input
            type="tel"
            name="phone"
            data-testid="field-phone"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={T.auth.phonePlaceholder}
          />
        </label>
        {emailMissing ? (
          <label className="authSparkField">
            <span>{T.auth.email}</span>
            <input
              type="email"
              name="email"
              data-testid="field-email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={T.auth.emailPlaceholder}
            />
          </label>
        ) : null}
        <label className="authSparkField">
          <span>{T.auth.birthDate}</span>
          <input
            type="date"
            name="birthDate"
            data-testid="field-birthDate"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </label>
        <p className="authSparkHint" data-testid="complete-hint">
          {T.auth.completeHintWithdraw}
        </p>
        <button
          type="submit"
          className="authSparkBtn authSparkBtnPrimary"
          data-testid="auth-save-continue"
          data-action="patch_profile_stage_b"
          disabled={busy}
        >
          {busy ? T.auth.saveBusy : T.auth.saveContinue}
        </button>
        {error ? (
          <p role="alert" aria-live="assertive" className="authSparkAlert">
            {error}
          </p>
        ) : null}
      </form>
    </AuthShell>
  );
}

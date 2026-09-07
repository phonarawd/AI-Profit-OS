"use client";

import { FormEvent, useState } from "react";
import { T } from "@aipo/ui/copy/ko";
import { TurnstileField, isTurnstileReady } from "@aipo/ui/components/auth";
import { finishAdminLogin, startAdminLogin } from "../lib/admin-login";

const ADMIN_LOGIN_PATH = "/admin/login";

export function AdminLoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [backup, setBackup] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileReady = isTurnstileReady();

  async function onStart(event: FormEvent) {
    event.preventDefault();
    if (!turnstileReady || !turnstileToken) {
      setNote(T.authClassic.turnstileNeeded);
      return;
    }
    setBusy(true);
    setNote(null);
    const result = await startAdminLogin(identifier, secret, turnstileToken);
    setBusy(false);
    if (!result.ok) {
      setNote(
        result.reason === "protection"
          ? T.admin.login.description
          : T.admin.usersList.retry,
      );
      return;
    }
    setChallengeId(result.challengeId);
  }

  async function onFinish(event: FormEvent) {
    event.preventDefault();
    if (!challengeId) return;
    setBusy(true);
    setNote(null);
    const ok = await finishAdminLogin(challengeId, confirmCode, backup, turnstileToken);
    setBusy(false);
    if (!ok) {
      setNote(T.admin.usersList.retry);
      return;
    }
    window.location.assign("/admin");
  }

  return (
    <section
      className="admin-session-bar"
      data-testid="admin-login-form"
      data-path={ADMIN_LOGIN_PATH}
    >
      <div className="admin-session-copy">
        <strong>{T.admin.login.title}</strong>
        <span>{T.admin.login.description}</span>
      </div>

      {!challengeId ? (
        <form className="admin-session-form" onSubmit={onStart}>
          <label htmlFor="admin-login-id">{T.admin.usersList.identityUsername}</label>
          <input
            id="admin-login-id"
            name="identifier"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
          <label htmlFor="admin-login-secret">{T.authClassic.password}</label>
          <input
            id="admin-login-secret"
            name="password"
            type="password"
            autoComplete="current-password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
          />
          <TurnstileField
            action="admin-login"
            theme="dark"
            onToken={setTurnstileToken}
          />
          <button
            type="submit"
            disabled={busy || !turnstileReady || !turnstileToken}
          >
            {T.admin.session.login}
          </button>
        </form>
      ) : (
        <form className="admin-session-form" onSubmit={onFinish}>
          <label htmlFor="admin-login-code">{T.admin.login.description}</label>
          <input
            id="admin-login-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={confirmCode}
            onChange={(event) => setConfirmCode(event.target.value)}
          />
          <label htmlFor="admin-login-backup">{T.admin.usersList.retry}</label>
          <input
            id="admin-login-backup"
            name="backupCode"
            autoComplete="off"
            value={backup}
            onChange={(event) => setBackup(event.target.value)}
          />
          <button type="submit" disabled={busy}>
            {T.admin.session.login}
          </button>
        </form>
      )}

      {note ? (
        <p className="admin-session-note" role="status" aria-live="polite">
          {note}
        </p>
      ) : null}
    </section>
  );
}

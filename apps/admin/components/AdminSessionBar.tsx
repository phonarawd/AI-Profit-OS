"use client";

import { FormEvent, useState } from "react";
import { T } from "@aipo/ui/copy/ko";
import {
  connectAdminSession,
  disconnectAdminSession,
} from "../lib/admin-session";
import { useAdminConnected } from "../lib/use-admin-session";

export function AdminSessionBar() {
  const connected = useAdminConnected();
  const [draft, setDraft] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!draft.trim()) {
      setNote("관리자 연결 코드를 입력해 주세요.");
      return;
    }
    setBusy(true);
    const connectedNow = await connectAdminSession(draft);
    setBusy(false);
    if (!connectedNow) {
      setNote("관리자 연결 정보를 저장할 수 없습니다.");
      return;
    }
    setDraft("");
    setFormOpen(false);
    setNote("관리자 연결 정보를 안전하게 저장했습니다. 권한은 서버 요청에서 확인합니다.");
    window.location.reload();
  }

  async function onClear() {
    if (busy) return;
    setBusy(true);
    const cleared = await disconnectAdminSession();
    setBusy(false);
    if (!cleared) {
      setNote("관리자 연결을 해제할 수 없습니다.");
      return;
    }
    setDraft("");
    setFormOpen(false);
    setNote("관리자 연결을 끊었습니다.");
    window.location.reload();
  }

  return (
    <section
      className="admin-session-bar"
      data-testid="admin-session-bar"
      aria-label="관리자 연결 상태"
    >
      <div className="admin-session-summary">
        <span
          className="admin-status-dot"
          data-status={connected ? "connected" : "disconnected"}
          aria-hidden="true"
        />
        <div className="admin-session-copy">
          <strong>
            {connected ? T.admin.session.connected : T.admin.session.disconnected}
          </strong>
          <span>
            {connected
              ? T.admin.session.connectedHint
              : T.admin.session.disconnectedHint}
          </span>
        </div>
        <button
          type="button"
          className="admin-session-toggle"
          aria-expanded={formOpen}
          aria-controls="admin-connection-form"
          onClick={() => {
            setFormOpen((open) => !open);
            setNote(null);
          }}
        >
          {connected ? T.admin.session.change : T.admin.session.open}
        </button>
        {connected ? (
          <button
            type="button"
            onClick={onClear}
            className="admin-session-disconnect"
            disabled={busy}
          >
            {T.admin.session.disconnect}
          </button>
        ) : null}
      </div>

      {formOpen ? (
        <form
          id="admin-connection-form"
          className="admin-session-form"
          onSubmit={onSubmit}
        >
          <label htmlFor="admin-bearer">{T.admin.session.codeLabel}</label>
          <p id="admin-connection-hint">{T.admin.session.codeHint}</p>
          <div className="admin-session-field-row">
            <input
              id="admin-bearer"
              type="password"
              autoComplete="off"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setNote(null);
              }}
              aria-describedby="admin-connection-hint"
              placeholder={T.admin.session.codePlaceholder}
              disabled={busy}
            />
            <button type="submit" disabled={busy}>{busy ? "저장 중" : T.admin.session.connect}</button>
          </div>
        </form>
      ) : null}

      {note ? (
        <p className="admin-session-note" role="status" aria-live="polite">
          {note}
        </p>
      ) : null}
    </section>
  );
}

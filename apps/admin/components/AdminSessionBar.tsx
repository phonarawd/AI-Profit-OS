"use client";

import { FormEvent, useState } from "react";
import { T } from "@aipo/ui/copy/ko";
import { adminGet } from "../lib/admin-api";
import { clearAdminToken, setAdminToken } from "../lib/admin-session";
import { useAdminConnected } from "../lib/use-admin-session";

export function AdminSessionBar() {
  const connected = useAdminConnected();
  const [draft, setDraft] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const token = draft.trim();
    if (!token) {
      setNote("관리자 연결 코드를 입력해 주세요.");
      return;
    }

    setChecking(true);
    setNote("관리자 권한을 안전하게 확인하고 있습니다.");
    setAdminToken(token);
    const verified = await adminGet<{
      connected?: unknown;
      adminId?: unknown;
      role?: unknown;
    }>("/api/v1/admin/session");

    if (!verified.ok || verified.data.connected !== true) {
      clearAdminToken();
      setChecking(false);
      if (!verified.ok && verified.failure.kind === "forbidden") {
        setNote("이 관리자 계정에는 운영센터 접근 권한이 없습니다.");
      } else if (!verified.ok && verified.failure.kind === "unavailable") {
        setNote("관리자 서버에 연결할 수 없습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
      } else {
        setNote("관리자 연결 코드를 다시 확인해 주세요.");
      }
      return;
    }

    setDraft("");
    setFormOpen(false);
    setChecking(false);
    setNote("관리자 권한 확인을 완료했습니다. 최신 운영 정보를 불러옵니다.");
    window.location.reload();
  }

  function onClear() {
    clearAdminToken();
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
              ? "서버에서 관리자 권한 확인을 마쳤습니다."
              : "관리자 권한을 확인해야 운영 기능을 사용할 수 있습니다."}
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
          >
            {T.admin.session.disconnect}
          </button>
        ) : null}
      </div>

      {formOpen ? (
        <form
          id="admin-connection-form"
          className="admin-session-form"
          onSubmit={(event) => void onSubmit(event)}
        >
          <label htmlFor="admin-bearer">{T.admin.session.codeLabel}</label>
          <p id="admin-connection-hint">
            입력한 코드는 서버에서 실제 관리자 토큰과 권한을 확인한 뒤에만 연결됩니다.
          </p>
          <div className="admin-session-field-row">
            <input
              id="admin-bearer"
              type="password"
              autoComplete="off"
              value={draft}
              disabled={checking}
              onChange={(event) => {
                setDraft(event.target.value);
                setNote(null);
              }}
              aria-describedby="admin-connection-hint"
              placeholder={T.admin.session.codePlaceholder}
            />
            <button type="submit" disabled={checking}>
              {checking ? "권한 확인 중" : T.admin.session.connect}
            </button>
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

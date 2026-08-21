"use client";

import { FormEvent, useState } from "react";
import {
  clearAdminToken,
  hasAdminToken,
  setAdminToken,
} from "../lib/admin-session";

export function AdminSessionBar() {
  const [connected, setConnected] = useState(() => hasAdminToken());
  const [draft, setDraft] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setAdminToken(draft);
    setDraft("");
    setConnected(hasAdminToken());
  }

  function onClear() {
    clearAdminToken();
    setDraft("");
    setConnected(false);
  }

  return (
    <div
      className="border-b border-lux-border bg-lux-surface px-4 py-2"
      data-testid="admin-session-bar"
    >
      <form
        className="flex flex-wrap items-center gap-2 text-sm"
        onSubmit={onSubmit}
      >
        <span className="text-lux-text-muted">
          {connected ? "운영 연결됨" : "운영 연결 없음"}
        </span>
        <label className="sr-only" htmlFor="admin-bearer">
          운영 연결 값
        </label>
        <input
          id="admin-bearer"
          type="password"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-w-48 flex-1 rounded border border-lux-border bg-lux-bg px-2 py-1"
          placeholder={connected ? "다시 연결" : "운영 연결"}
        />
        <button
          type="submit"
          className="rounded bg-lux-elevated px-3 py-1 text-lux-text"
        >
          연결
        </button>
        {connected ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded px-3 py-1 text-lux-text-muted"
          >
            해제
          </button>
        ) : null}
      </form>
    </div>
  );
}

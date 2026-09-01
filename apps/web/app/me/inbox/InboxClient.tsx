"use client";

import {
  OpsInbox,
  classifyInboxHttp,
  parseInboxList,
  type InboxItemModel,
} from "@aipo/ui/components/inbox";
import { T } from "@aipo/ui/copy/ko";
import { useCallback, useEffect, useState } from "react";
import {
  AccountAuthActions,
  AccountFrame,
  type AccountView,
} from "../AccountFrame";
import styles from "../account.module.css";

function sessionToken(): string | null {
  return null;
}

export function InboxClient() {
  const [view, setView] = useState<AccountView>("loading");
  const [items, setItems] = useState<InboxItemModel[] | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      const token = sessionToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/v1/me/inbox", {
        credentials: "include",
        cache: "no-store",
        headers,
        signal,
      });
      if (signal?.aborted) return;
      if (!res.ok) {
        setItems(null);
        setView(classifyInboxHttp(res.status));
        return;
      }
      const json = await res.json().catch(() => null);
      if (signal?.aborted) return;
      const parsed = parseInboxList(json);
      if (!parsed) {
        setItems(null);
        setView("unavailable");
        return;
      }
      setItems(parsed.items);
      setView("ready");
    } catch (err) {
      if (signal?.aborted) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      setItems(null);
      setView("unavailable");
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  async function markRead(id: string) {
    try {
      const res = await fetch(`/api/v1/me/inbox/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return;
      setItems((prev) =>
        (prev ?? []).map((i) =>
          i.id === id ? { ...i, readAt: new Date().toISOString() } : i,
        ),
      );
    } catch {
      /* keep previous list */
    }
  }

  async function hide(id: string) {
    try {
      const res = await fetch(`/api/v1/me/inbox/${id}/hide`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return;
      setItems((prev) => (prev ?? []).filter((i) => i.id !== id));
    } catch {
      /* keep previous list */
    }
  }

  if (view === "loading") {
    return (
      <AccountFrame title={T.inbox.title} view="loading" testId="inbox-page">
        <p className={styles.lead}>불러오는 중…</p>
      </AccountFrame>
    );
  }

  if (view === "unauthorized") {
    return (
      <AccountFrame title={T.inbox.title} view="unauthorized" testId="inbox-page">
        <p className={styles.lead}>로그인하면 알림을 볼 수 있어요.</p>
        <AccountAuthActions />
      </AccountFrame>
    );
  }

  if (view === "unavailable" || items == null) {
    return (
      <AccountFrame title={T.inbox.title} view="unavailable" testId="inbox-page">
        <p className={styles.err}>알림을 확인할 수 없음</p>
      </AccountFrame>
    );
  }

  return (
    <AccountFrame title={T.inbox.title} view="ready" testId="inbox-page" hideTitle>
      <div className={styles.surface}>
        <OpsInbox items={items} onMarkRead={markRead} onHide={hide} />
      </div>
    </AccountFrame>
  );
}

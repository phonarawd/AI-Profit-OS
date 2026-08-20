"use client";

import {
  listInbox,
  markInboxRead,
  type InboxItem,
} from "@aipo/sdk/inbox";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGate } from "../AuthGate";
import { accountUserMessage } from "../account-messages";
import { useAccountSession } from "../useAccountSession";

function safeHref(href: string | null): string | null {
  if (!href || !href.startsWith("/")) return null;
  if (href.startsWith("//")) return null;
  return href;
}

export function InboxClient() {
  const session = useAccountSession();
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (session !== "auth") return;
    const ac = new AbortController();
    void listInbox({ apiBase: "", signal: ac.signal })
      .then((out) => setItems(out.items))
      .catch((caught) => setErr(accountUserMessage(caught)));
    return () => ac.abort();
  }, [session]);

  async function onRead(id: string) {
    setBusyId(id);
    setErr(null);
    try {
      await markInboxRead(id, { apiBase: "" });
      setItems((prev) =>
        prev
          ? prev.map((item) =>
              item.id === id
                ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
                : item,
            )
          : prev,
      );
    } catch (caught) {
      setErr(accountUserMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section data-account-hub="notifications">
      <AuthGate state={session}>
        {items && items.length === 0 ? (
          <p data-inbox="empty">지금은 알림이 없어요.</p>
        ) : null}
        {items && items.length > 0 ? (
          <ul data-inbox="message">
            {items.map((item) => {
              const href = safeHref(item.href);
              return (
                <li key={item.id}>
                  <p>{item.titleKo}</p>
                  {item.bodyKo ? <p>{item.bodyKo}</p> : null}
                  {href ? (
                    <p>
                      <Link href={href}>열기</Link>
                    </p>
                  ) : null}
                  {item.readAt ? null : (
                    <p>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void onRead(item.id)}
                      >
                        읽음
                      </button>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
        {err ? <p>{err}</p> : null}
      </AuthGate>
    </section>
  );
}

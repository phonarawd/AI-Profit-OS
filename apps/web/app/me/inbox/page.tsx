"use client";

import { useCallback, useEffect, useState } from "react";
import {
  OpsInbox,
  type InboxItemModel,
} from "@aipo/ui/components/inbox";

type InboxListResponse = {
  items?: InboxItemModel[];
};

/**
 * /me/inbox — Canon ops-inbox · UI §5.9.4
 * 1인 발송 Owns=Admin §9.8.8d · prefs=§50.1n · Push=PWA §23.5a
 */
export default function Page() {
  const [items, setItems] = useState<InboxItemModel[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/me/inbox", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        setItems([]);
        return;
      }
      const json = (await res.json()) as InboxListResponse;
      setItems(json.items ?? []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    try {
      await fetch(`/api/v1/me/inbox/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      setItems((prev) =>
        (prev ?? []).map((i) =>
          i.id === id ? { ...i, readAt: new Date().toISOString() } : i,
        ),
      );
    } catch {
      /* ignore */
    }
  }

  async function hide(id: string) {
    try {
      await fetch(`/api/v1/me/inbox/${id}/hide`, {
        method: "POST",
        credentials: "include",
      });
      setItems((prev) => (prev ?? []).filter((i) => i.id !== id));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="p-6">
      <OpsInbox items={items} onMarkRead={markRead} onHide={hide} />
    </div>
  );
}

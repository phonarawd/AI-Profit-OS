"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { T } from "../../copy/ko";
import { TouchButton } from "../lux/TouchButton";
import type { InboxChannel, InboxItemModel } from "./inbox-types";

export type OpsInboxProps = {
  items?: InboxItemModel[] | null;
  onMarkRead?: (id: string) => void;
  onHide?: (id: string) => void;
  className?: string;
};

const FILTERS: { id: InboxChannel; label: string }[] = [
  { id: "all", label: T.inbox.filterAll },
  { id: "ops", label: T.inbox.filterOps },
  { id: "notice", label: T.inbox.filterNotice },
  { id: "campaign", label: T.inbox.filterCampaign },
  { id: "opportunity", label: T.inbox.filterOpportunity },
  { id: "wallet", label: T.inbox.filterWallet },
];

function relativeKo(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return T.inbox.relativeJustNow;
  if (min < 60) return T.inbox.relativeMinutes.replace("{n}", String(min));
  const hr = Math.floor(min / 60);
  if (hr < 24) return T.inbox.relativeHours.replace("{n}", String(hr));
  const day = Math.floor(hr / 24);
  return T.inbox.relativeDays.replace("{n}", String(day));
}

/**
 * UI §5.9.4 — Canon ops-inbox · 하드삭제 0 · Admin §9.8.8d pointer
 */
export function OpsInbox({
  items = null,
  onMarkRead,
  onHide,
  className = "",
}: OpsInboxProps) {
  const [filter, setFilter] = useState<InboxChannel>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(() => {
    const src = items ?? [];
    if (filter === "all") return src;
    return src.filter((i) => i.channel === filter);
  }, [items, filter]);

  return (
    <main
      className={`text-lux-text ${className}`.trim()}
      data-testid="ops-inbox"
      data-canon="ops-inbox"
      data-hard-delete="false"
      data-admin-pointer={T.inbox.adminPointer}
      data-pwa-pointer={T.inbox.pwaPointer}
      data-prefs-pointer={T.inbox.prefsPointer}
    >
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold" data-canon-block="title">
          {T.inbox.title}
        </h1>
        <Link
          href="/me/settings#notify"
          className="text-sm text-lux-accent underline"
          data-canon-block="prefsLink"
        >
          {T.inbox.prefsLink}
        </Link>
      </div>

      <div
        className="mt-4 flex flex-wrap gap-2"
        data-canon-block="filters"
        role="tablist"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            data-inbox-filter={f.id}
            className={[
              "touch-target rounded-lux-md border px-3 py-2 text-sm",
              filter === f.id
                ? "border-lux-accent text-lux-accent"
                : "border-lux-border text-lux-text-muted",
            ].join(" ")}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="mt-6" data-canon-block="list">
        {list.length === 0 ? (
          <p className="text-sm text-lux-text-muted" role="status">
            {T.inbox.empty}
          </p>
        ) : (
          <ul className="space-y-3">
            {list.map((item) => {
              const unread = !item.readAt;
              const open = openId === item.id;
              return (
                <li
                  key={item.id}
                  className="rounded-lux-md border border-lux-border bg-lux-surface p-3"
                  data-canon-block="row"
                  data-testid="ops-inbox-row"
                  data-inbox-channel={item.channel}
                  data-unread={unread ? "true" : "false"}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 text-left"
                    onClick={() => {
                      setOpenId(open ? null : item.id);
                      if (unread) onMarkRead?.(item.id);
                    }}
                  >
                    <span className="text-lg" aria-hidden>
                      {item.channel === "ops"
                        ? "✉️"
                        : item.channel === "wallet"
                          ? "💰"
                          : item.channel === "opportunity"
                            ? "🔥"
                            : "📢"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {item.titleKo}
                        </span>
                        {unread ? (
                          <span
                            className="inline-block h-2 w-2 rounded-full bg-lux-accent"
                            aria-label={T.inbox.unreadDot}
                          />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-lux-text-muted">
                        {item.bodyKo}
                      </span>
                      <span className="mt-1 block text-xs text-lux-text-muted">
                        {relativeKo(item.createdAt)}
                      </span>
                    </span>
                  </button>
                  {open ? (
                    <div className="mt-3 border-t border-lux-border pt-3 text-sm">
                      <p className="whitespace-pre-wrap">{item.bodyKo}</p>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="mt-2 inline-block text-lux-accent underline"
                        >
                          {T.inbox.openBody}
                        </Link>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <TouchButton
                          variant="ghost"
                          data-canon-block="hide"
                          onClick={() => onHide?.(item.id)}
                        >
                          {T.inbox.hide}
                        </TouchButton>
                        <Link
                          href="/me/settings"
                          className="touch-target inline-flex items-center text-sm text-lux-text-muted underline"
                        >
                          {T.inbox.supportCta}
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        className="mt-8 space-y-1 text-xs text-lux-text-muted"
        data-canon-block="blockedToasts"
        data-toast-match-blocked="MATCH_BLOCKED"
        data-toast-withdraw-blocked="WITHDRAW_APPLY_BLOCKED"
      >
        <p>{T.inbox.matchBlockedHint}</p>
        <p>{T.inbox.withdrawBlockedHint}</p>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { T } from "../../copy/ko";
import { useHomeChrome } from "./HomeChromeContext";

export type AppHeaderProps = {
  /** AI 스캔 현황 — prop 우선 · 없으면 HomeChromeContext */
  scanStatus?: string | null;
  showNotification?: boolean;
  notificationHref?: string;
  notificationUnread?: boolean;
  avatarHref?: string;
  avatarSrc?: string;
  tierLabel?: string | null;
  tierHref?: string;
};

const DEFAULT_AVATAR = "/brand/assets/ai/avatar-512.png";

/**
 * AppHeader — Contract §2.4 · 64px · DayPulse Owns → scan chip
 */
export function AppHeader({
  scanStatus = null,
  showNotification = true,
  notificationHref = "/me/inbox",
  notificationUnread = false,
  avatarHref = "/me",
  avatarSrc = DEFAULT_AVATAR,
  tierLabel = null,
  tierHref = "/me/membership",
}: AppHeaderProps) {
  const chrome = useHomeChrome();
  const scan = (scanStatus ?? chrome.scanStatus ?? "").trim();
  const tier = typeof tierLabel === "string" ? tierLabel.trim() : "";

  return (
    <header
      data-testid="app-header"
      aria-label={T.home.header.aria}
      className="app-header sticky top-0 z-30 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-pd-border bg-pd-surface/95 backdrop-blur-sm"
    >
      <div className="min-w-0" />

      <div className="flex min-w-0 items-center justify-self-center gap-2">
        {scan ? (
          <span
            data-testid="app-header-scan"
            className="truncate rounded-pd-md bg-pd-accent/10 px-3 py-1.5 text-xs font-medium text-pd-accent"
          >
            {scan}
          </span>
        ) : (
          <span
            data-testid="app-header-scan-idle"
            className="truncate text-sm font-medium text-pd-text-muted"
          >
            {T.brand.consumer}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-self-end gap-2">
        {tier ? (
          <Link
            href={tierHref}
            data-testid="app-header-tier"
            aria-label={T.home.header.tierAria}
            className="touch-target rounded-pd-md border border-pd-border px-2.5 py-1 text-xs font-medium text-pd-text"
          >
            {tier}
          </Link>
        ) : null}

        {showNotification ? (
          <Link
            href={notificationHref}
            data-testid="app-header-notification"
            aria-label={T.home.header.notificationAria}
            className="touch-target relative inline-flex h-10 w-10 items-center justify-center rounded-pd-md text-pd-text-muted hover:bg-pd-bg hover:text-pd-text"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M6 9a6 6 0 1 1 12 0c0 3.5 1.2 4.8 1.8 5.5H4.2C4.8 13.8 6 12.5 6 9Z" />
              <path d="M10 18a2 2 0 0 0 4 0" />
            </svg>
            {notificationUnread ? (
              <span
                className="absolute right-2 top-2 h-2 w-2 rounded-full bg-pd-accent"
                aria-hidden
              />
            ) : null}
          </Link>
        ) : null}

        <Link
          href={avatarHref}
          data-testid="app-header-avatar"
          aria-label={T.home.header.avatarAria}
          className="touch-target inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-pd-border bg-pd-bg p-0.5"
        >
          <img
            src={avatarSrc}
            alt=""
            width={36}
            height={36}
            decoding="async"
            fetchPriority="low"
            className="h-9 w-9 object-contain"
          />
        </Link>
      </div>
    </header>
  );
}

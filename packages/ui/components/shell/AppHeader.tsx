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
      className="sticky top-0 z-30 grid h-[var(--layout-header)] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-lux-border bg-lux-surface/95 px-4 backdrop-blur-sm"
    >
      <div className="min-w-0" />

      <div className="flex min-w-0 items-center justify-self-center gap-2">
        {scan ? (
          <span
            data-testid="app-header-scan"
            className="truncate rounded-lux-md bg-lux-accent/10 px-3 py-1.5 text-xs font-medium text-lux-accent"
          >
            {scan}
          </span>
        ) : (
          <span
            data-testid="app-header-scan-idle"
            className="truncate text-sm font-medium text-lux-text-muted"
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
            className="touch-target rounded-lux-md border border-lux-border px-2.5 py-1 text-xs font-medium text-lux-text"
          >
            {tier}
          </Link>
        ) : null}

        {showNotification ? (
          <Link
            href={notificationHref}
            data-testid="app-header-notification"
            aria-label={T.home.header.notificationAria}
            className="touch-target relative inline-flex h-10 w-10 items-center justify-center rounded-lux-md text-lux-text-muted hover:bg-lux-bg hover:text-lux-text"
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
                className="absolute right-2 top-2 h-2 w-2 rounded-full bg-lux-accent"
                aria-hidden
              />
            ) : null}
          </Link>
        ) : null}

        <Link
          href={avatarHref}
          data-testid="app-header-avatar"
          aria-label={T.home.header.avatarAria}
          className="touch-target inline-flex h-10 w-10 overflow-hidden rounded-full border border-lux-border bg-lux-bg"
        >
          <img
            src={avatarSrc}
            alt=""
            width={40}
            height={40}
            className="h-full w-full object-cover"
          />
        </Link>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { T } from "../../copy/ko";

export type BottomNavTab = {
  order: number;
  icon: string;
  label: string;
  href: string;
};

function NavGlyph({ label }: { label: string }) {
  const common = "h-5 w-5";
  switch (label) {
    case "홈":
      return (
        <svg aria-hidden viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "기회":
      return (
        <svg aria-hidden viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3.5 13.8 9H19l-4 3.2L16.6 18 12 14.8 7.4 18l1.6-5.8L5 9h5.2L12 3.5Z" />
        </svg>
      );
    case "수익":
      return (
        <svg aria-hidden viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 16.5 9 11l3.5 3.5L20 7" />
          <path d="M14 7h6v6" />
        </svg>
      );
    case "지갑":
      return (
        <svg aria-hidden viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3.5 7.5h17v11a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 18.5v-11Z" />
          <path d="M3.5 7.5 5.2 4.8A1.5 1.5 0 0 1 6.5 4h11a1.5 1.5 0 0 1 1.3.8L20.5 7.5" />
          <path d="M16 13.5h3" />
        </svg>
      );
    default:
      return (
        <svg aria-hidden viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="9" r="3.5" />
          <path d="M5 19.5c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" />
        </svg>
      );
  }
}

/**
 * BottomNav5 — ADR-017 IA · mobile bottom / desktop sidebar 240px
 */
export function BottomNav5({ tabs }: { tabs: readonly BottomNavTab[] }) {
  const pathname = usePathname() || "/";

  return (
    <aside
      data-testid="app-sidebar"
      className="md:sticky md:top-0 md:flex md:h-dvh md:w-[var(--layout-sidebar)] md:shrink-0 md:flex-col md:border-r md:border-lux-border md:bg-lux-surface"
    >
      <div className="hidden px-4 pb-3 pt-5 md:block">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-lux-text"
          data-testid="sidebar-brand"
        >
          <span
            aria-hidden
            className="inline-flex h-9 w-9 items-center justify-center rounded-lux-md bg-lux-accent text-lux-surface"
          >
            ✦
          </span>
          {T.brand.consumer}
        </Link>
      </div>

      <nav
        aria-label={T.home.sidebar.navAria}
        data-testid="bottom-nav-5"
        data-tab-count={tabs.length}
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-lux-border bg-lux-surface md:static md:flex-1 md:flex-col md:gap-1 md:border-t-0 md:px-3 md:py-2"
      >
        {tabs.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              data-tab-href={tab.href}
              data-active={active ? "true" : "false"}
              className={[
                "touch-target flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-xs md:flex-row md:gap-3 md:rounded-lux-md md:px-3 md:py-3 md:text-sm",
                active
                  ? "text-lux-accent md:bg-lux-accent md:text-lux-surface"
                  : "text-lux-text-muted md:hover:bg-lux-bg md:hover:text-lux-text",
              ].join(" ")}
            >
              <NavGlyph label={tab.label} />
              <span className="touch-target__label">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden p-3 md:block" data-testid="sidebar-invite">
        <Link
          href="/me/invite"
          className="block rounded-lux-lg border border-lux-border bg-lux-bg p-3 shadow-[var(--shadow-lux-soft)] transition-colors hover:border-lux-accent/40"
        >
          <p className="text-sm font-semibold text-lux-text">
            {T.home.sidebar.inviteCta}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-lux-text-muted">
            {T.invite.oneLiner}
          </p>
        </Link>
      </div>
    </aside>
  );
}

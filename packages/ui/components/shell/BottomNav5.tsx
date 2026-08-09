"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type BottomNavTab = {
  order: number;
  icon: string;
  label: string;
  href: string;
};

/**
 * BottomNav5 — UI §5.1 · exactly 5 tabs · mobile bottom / desktop sidebar.
 * Labels must match apps/web/routes.ts USER_TABS (verify:ia-tabs).
 */
export function BottomNav5({ tabs }: { tabs: readonly BottomNavTab[] }) {
  const pathname = usePathname() || "/";

  return (
    <nav
      aria-label="주요 메뉴"
      data-testid="bottom-nav-5"
      data-tab-count={tabs.length}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-lux-border bg-lux-surface md:static md:w-52 md:flex-col md:border-r md:border-t-0"
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
              "touch-target flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-xs md:flex-row md:gap-2 md:px-4 md:py-3 md:text-sm",
              active ? "text-lux-accent" : "text-lux-text-muted",
            ].join(" ")}
          >
            <span aria-hidden>{tab.icon}</span>
            <span className="touch-target__label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

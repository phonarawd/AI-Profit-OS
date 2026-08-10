"use client";

import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { BottomNav5, type BottomNavTab } from "./BottomNav5";
import { HomeChromeProvider } from "./HomeChromeContext";
import { SiteFooter } from "./SiteFooter";

export function AppShellRoot({
  tabs,
  children,
}: {
  tabs: readonly BottomNavTab[];
  children: ReactNode;
}) {
  return (
    <HomeChromeProvider>
      <div
        className="flex min-h-dvh w-full flex-col bg-lux-bg md:flex-row"
        data-testid="app-shell"
        data-shell-geometry="sidebar-240|header-64|rail-352"
      >
        <BottomNav5 tabs={tabs} />
        <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-20 md:pb-0">
          <AppHeader />
          <div className="lux-app-main min-w-0 flex-1">{children}</div>
          <SiteFooter />
        </div>
      </div>
    </HomeChromeProvider>
  );
}

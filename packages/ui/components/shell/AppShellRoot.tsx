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
        className="flex min-h-dvh w-full flex-col md:flex-row"
        data-testid="app-shell"
      >
        <BottomNav5 tabs={tabs} />
        <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-20 md:pb-0">
          <AppHeader />
          <div className="lux-app-main flex-1">{children}</div>
          <SiteFooter />
        </div>
      </div>
    </HomeChromeProvider>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { USER_TABS } from "../routes";
import { BottomNav5 } from "@aipo/ui/components/shell";
import { SiteFooter } from "@aipo/ui/components/shell";
import { ToastHost } from "@aipo/ui/components/toast";
import { DeviceTierApply } from "../components/DeviceTierApply";

export const metadata: Metadata = {
  title: "퍼뜩",
  description: "퍼뜩 — AI Profit OS consumer",
  applicationName: "퍼뜩",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="theme-lux-dark" data-font-scale="md">
      <body className="min-h-dvh bg-lux-bg text-lux-text">
        <DeviceTierApply />
        <ToastHost>
          <div className="mx-auto flex min-h-dvh max-w-5xl flex-col pb-20 md:flex-row md:pb-0">
            <BottomNav5 tabs={USER_TABS} />
            <div className="flex min-h-dvh flex-1 flex-col">
              <div className="lux-app-main flex-1">{children}</div>
              <SiteFooter />
            </div>
          </div>
        </ToastHost>
      </body>
    </html>
  );
}

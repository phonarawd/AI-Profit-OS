import type { Metadata } from "next";
import "./globals.css";
import { USER_TABS } from "../routes";

export const metadata: Metadata = {
  title: "퍼뜩",
  description: "퍼뜩 — AI Profit OS consumer",
  applicationName: "퍼뜩",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh bg-[var(--color-lux-bg)] text-[var(--color-lux-text)]">
        <div className="mx-auto flex min-h-dvh max-w-5xl flex-col pb-20 md:flex-row md:pb-0">
          <nav
            aria-label="주요 메뉴"
            className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-lux-border)] bg-[var(--color-lux-surface)] md:static md:w-52 md:flex-col md:border-r md:border-t-0"
          >
            {USER_TABS.map((tab) => (
              <a
                key={tab.href}
                href={tab.href}
                className="flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-xs text-[var(--color-lux-text-muted)] md:flex-row md:gap-2 md:px-4 md:py-3 md:text-sm"
              >
                <span aria-hidden>{tab.icon}</span>
                <span>{tab.label}</span>
              </a>
            ))}
          </nav>
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}

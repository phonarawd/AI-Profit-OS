import type { Metadata } from "next";
import "./globals.css";
import { ADMIN_MODULES } from "../routes";

export const metadata: Metadata = {
  title: "AI Profit OS Ops",
  robots: { index: false, follow: false },
};

const sidebar = ADMIN_MODULES.filter((m) => !("sidebarChild" in m && m.sidebarChild));
const child2b = ADMIN_MODULES.find((m) => m.id === "2b");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh bg-lux-bg text-lux-text">
        <div className="mx-auto flex min-h-dvh max-w-7xl">
          <aside className="hidden w-60 shrink-0 border-r border-lux-border bg-lux-surface p-3 md:block">
            <p className="mb-4 px-2 text-sm font-semibold">운영</p>
            <nav aria-label="운영 메뉴" className="flex flex-col gap-1 text-sm">
              {sidebar.map((m) => (
                <div key={String(m.id)}>
                  <a
                    href={m.href}
                    className="block rounded-md px-2 py-2 text-lux-text-muted hover:bg-lux-elevated hover:text-lux-text"
                  >
                    {m.label}
                  </a>
                  {m.id === 2 && child2b ? (
                    <a
                      href={child2b.href}
                      className="ml-3 block rounded-md px-2 py-1.5 text-xs text-lux-text-muted hover:bg-lux-elevated"
                    >
                      {child2b.label}
                    </a>
                  ) : null}
                </div>
              ))}
            </nav>
          </aside>
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}

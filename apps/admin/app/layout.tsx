import type { Metadata } from "next";
import { T } from "@aipo/ui/copy/ko";
import "./globals.css";
import "./spark-admin.css";
import { AdminShell } from "../components/AdminShell";

const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

export const metadata: Metadata = {
  title: {
    default: T.admin.productName,
    template: `%s | ${T.admin.productName}`,
  },
  description: T.admin.productDescription,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="preload" href={PRETENDARD_CSS} as="style" />
      </head>
      <body className="min-h-dvh bg-lux-bg text-lux-text">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}

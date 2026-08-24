import type { Metadata } from "next";
import { T } from "@aipo/ui/copy/ko";
import "./globals.css";
import "./spark-admin.css";
import { AdminShell } from "../components/AdminShell";

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
      <body className="min-h-dvh bg-lux-bg text-lux-text">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}

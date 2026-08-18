import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "퍼뜩",
  description: "퍼뜩",
  applicationName: "퍼뜩",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

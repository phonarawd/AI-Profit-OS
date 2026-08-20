import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./pwa-shell.css";
import { USER_TABS } from "../routes";
import { AppShellRoot } from "@aipo/ui/components/shell";
import { ToastHost } from "@aipo/ui/components/toast";
import { DeviceTierApply } from "../components/DeviceTierApply";
import { PwaRuntime } from "../components/pwa/PwaRuntime";

export const viewport: Viewport = {
  themeColor: "#6B3CFF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "퍼뜩",
  description: "퍼뜩 — AI Profit OS consumer",
  applicationName: "퍼뜩",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "퍼뜩",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="theme-peotteok-light" data-font-scale="md">
      <body className="min-h-dvh bg-lux-bg text-lux-text">
        <DeviceTierApply />
        <ToastHost>
          <AppShellRoot tabs={USER_TABS}>{children}</AppShellRoot>
        </ToastHost>
        <PwaRuntime />
      </body>
    </html>
  );
}

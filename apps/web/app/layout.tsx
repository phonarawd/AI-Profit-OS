import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./pwa-shell.css";
import { ToastHost } from "@aipo/ui/components/toast";
import { DeviceTierApply } from "../components/DeviceTierApply";
import { ConsumerSparkRoot } from "../components/spark-shell/ConsumerSparkRoot";
import { PwaRuntime } from "../components/pwa/PwaRuntime";
import { ObsRuntime } from "../components/observability/ObsRuntime";

const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

export const viewport: Viewport = {
  themeColor: "#08111F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "퍼뜩",
  description: "퍼뜩 — Global Opportunity Platform",
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
    <html lang="ko" className="theme-putduk-spark" data-font-scale="md">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="preload" href={PRETENDARD_CSS} as="style" />
      </head>
      <body className="min-h-dvh">
        <DeviceTierApply />
        <ConsumerSparkRoot>
          <ToastHost>{children}</ToastHost>
        </ConsumerSparkRoot>
        <PwaRuntime />
        <ObsRuntime />
      </body>
    </html>
  );
}

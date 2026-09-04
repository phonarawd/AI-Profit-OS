import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./pwa-shell.css";
import { ToastHost } from "@aipo/ui/components/toast";
import { DeviceTierApply } from "../components/DeviceTierApply";
import { FontScaleApply } from "../components/FontScaleApply";
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
  metadataBase: new URL("https://hiptk.app"),
  title: "퍼뜩",
  description: "AI 기반 글로벌 시세·가격 비교 및 동일상품 매칭 플랫폼",
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
    <html lang="ko" className="theme-peotteok-light" data-font-scale="md" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="preload" href={PRETENDARD_CSS} as="style" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var s=localStorage.getItem("peotteok_ux_font_scale");if(s==="md"||s==="lg"||s==="xl"){document.documentElement.setAttribute("data-font-scale",s);}}catch(e){}})();',
          }}
        />
      </head>
      <body className="min-h-dvh bg-lux-bg text-lux-text">
        <DeviceTierApply />
        <FontScaleApply />
        <ConsumerSparkRoot>
          <ToastHost>{children}</ToastHost>
        </ConsumerSparkRoot>
        <PwaRuntime />
        <ObsRuntime />
      </body>
    </html>
  );
}

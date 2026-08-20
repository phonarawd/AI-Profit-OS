"use client";

import { useEffect } from "react";
import { InstallPrompt } from "./InstallPrompt";
import { OfflineBanner } from "./OfflineBanner";
import { SwUpdateToast } from "./SwUpdateToast";

export function PwaRuntime() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }, []);

  return (
    <div className="pwa-runtime">
      <OfflineBanner />
      <SwUpdateToast />
      <InstallPrompt />
    </div>
  );
}

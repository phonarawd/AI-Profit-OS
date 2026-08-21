"use client";

import { useEffect, useState } from "react";
import { InstallPrompt } from "./InstallPrompt";
import { OfflineBanner } from "./OfflineBanner";
import { PushOptIn } from "./PushOptIn";
import { SwUpdateToast } from "./SwUpdateToast";

export function PwaRuntime() {
  const [suppressPrompts, setSuppressPrompts] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }
    setSuppressPrompts(window.location.pathname.startsWith("/onboarding"));
  }, []);

  return (
    <div className="pwa-runtime">
      <OfflineBanner />
      <SwUpdateToast />
      {suppressPrompts ? null : (
        <>
          <InstallPrompt />
          <PushOptIn />
        </>
      )}
    </div>
  );
}

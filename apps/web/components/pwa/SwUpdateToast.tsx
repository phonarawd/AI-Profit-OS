"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { pwaCopy } from "./copy";
import { shouldSuppressPwaChrome } from "./suppress-pwa-chrome";

const RELOAD_GUARD = "putduk.sw.reload";

export function SwUpdateToast() {
  const pathname = usePathname() || "";
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let activeReg: ServiceWorkerRegistration | null = null;

    const track = (reg: ServiceWorkerRegistration) => {
      activeReg = reg;
      setRegistration(reg);
      if (reg.waiting) setWaiting(true);
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setWaiting(true);
          }
        });
      });
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) track(reg);
    });

    const onControllerChange = () => {
      if (shouldSuppressPwaChrome(window.location.pathname)) return;
      try {
        if (sessionStorage.getItem(RELOAD_GUARD) === "1") return;
        sessionStorage.setItem(RELOAD_GUARD, "1");
      } catch {
        /* ignore */
      }
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      void activeReg;
    };
  }, []);

  if (!waiting || !registration) return null;

  const refresh = () => {
    if (shouldSuppressPwaChrome(pathname)) return;
    registration.waiting?.postMessage("SKIP_WAITING");
  };

  return (
    <aside className="pwa-overlay" aria-live="polite">
      <p className="pwa-overlay-title">{pwaCopy.updateTitle}</p>
      <div className="pwa-overlay-actions">
        <button
          type="button"
          className="pwa-overlay-secondary"
          onClick={() => setWaiting(false)}
        >
          {pwaCopy.updateLater}
        </button>
        <button
          type="button"
          className="pwa-overlay-primary"
          onClick={refresh}
        >
          {pwaCopy.updateCta}
        </button>
      </div>
    </aside>
  );
}

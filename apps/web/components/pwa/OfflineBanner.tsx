"use client";

import { RecoveryRetry } from "@aipo/ui/components/primitives";
import { useEffect, useState } from "react";
import { pwaCopy } from "./copy";

const LAST_SEEN_KEY = "putduk.lastOnlineAt";

function readLastSeen(): string | null {
  try {
    const raw = sessionStorage.getItem(LAST_SEEN_KEY);
    return raw && raw.length ? raw : null;
  } catch {
    return null;
  }
}

function writeLastSeen() {
  try {
    sessionStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
  } catch {
    /* ignore */
  }
}

async function probeReachable(): Promise<boolean> {
  try {
    const res = await fetch("/manifest.webmanifest", {
      method: "HEAD",
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let delay = 5000;

    const markOnline = () => {
      writeLastSeen();
      setLastSeen(readLastSeen());
      setOffline(false);
      delay = 5000;
    };

    const markOffline = () => {
      setLastSeen(readLastSeen());
      setOffline(true);
    };

    const tick = async () => {
      if (cancelled) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        markOffline();
        return;
      }
      const ok = await probeReachable();
      if (cancelled) return;
      if (ok) markOnline();
      else {
        markOffline();
        delay = Math.min(delay * 2, 30000);
      }
    };

    const syncNav = () => {
      if (navigator.onLine === false) markOffline();
      else void tick();
    };

    setLastSeen(readLastSeen());
    syncNav();
    window.addEventListener("online", syncNav);
    window.addEventListener("offline", syncNav);
    const timer = window.setInterval(() => {
      void tick();
    }, delay);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("online", syncNav);
      window.removeEventListener("offline", syncNav);
    };
  }, []);

  if (!offline) return null;

  return (
    <aside className="pwa-overlay" role="status" data-canon="offline">
      <p className="pwa-overlay-title">{pwaCopy.offlineTitle}</p>
      <p className="pwa-overlay-body">{pwaCopy.offlineMoneyOff}</p>
      {lastSeen ? (
        <p className="pwa-overlay-body">
          {pwaCopy.offlineLastSeen}: {lastSeen}
        </p>
      ) : null}
      <div className="pwa-overlay-actions">
        <RecoveryRetry
          className="pwa-overlay-primary"
          testId="offline-retry"
          onRetry={() => window.location.reload()}
        />
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import { pwaCopy } from "./copy";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <aside className="pwa-overlay" role="status">
      <p className="pwa-overlay-title">{pwaCopy.offlineTitle}</p>
      <div className="pwa-overlay-actions">
        <button
          type="button"
          className="pwa-overlay-primary"
          onClick={() => window.location.reload()}
        >
          {pwaCopy.offlineRetry}
        </button>
      </div>
    </aside>
  );
}

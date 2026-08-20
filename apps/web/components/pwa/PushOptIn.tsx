"use client";

import { useEffect, useState } from "react";
import {
  canRequestPush,
  registerPushSubscription,
} from "@aipo/sdk/push";
import { pwaCopy } from "./copy";

const DISMISS_KEY = "putduk.push.dismissedAt";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function dismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore quota */
  }
}

export function PushOptIn() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const gate = canRequestPush();
    if (!gate.ok) return;
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      void registerPushSubscription();
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      return;
    }
    if (dismissedRecently()) return;
    const timer = window.setTimeout(() => setVisible(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const hide = () => {
    markDismissed();
    setVisible(false);
  };

  const allow = async () => {
    await registerPushSubscription();
    hide();
  };

  return (
    <aside className="pwa-overlay" aria-live="polite">
      <p className="pwa-overlay-title">{pwaCopy.pushTitle}</p>
      <p className="pwa-overlay-body">{pwaCopy.pushBody}</p>
      <div className="pwa-overlay-actions">
        <button type="button" className="pwa-overlay-secondary" onClick={hide}>
          {pwaCopy.pushLater}
        </button>
        <button
          type="button"
          className="pwa-overlay-primary"
          onClick={() => {
            void allow();
          }}
        >
          {pwaCopy.pushAllow}
        </button>
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import { pwaCopy } from "./copy";

const DISMISS_KEY = "putduk.install.dismissedAt";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const FIRST_SHOW_MS = 5000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const crios = /CriOS|FxiOS|EdgiOS/.test(ua);
  return ios && webkit && !crios;
}

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

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || dismissedRecently()) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const timer = window.setTimeout(() => {
      if (isStandalone() || dismissedRecently()) return;
      setIos(isIosSafari());
      setVisible(true);
    }, FIRST_SHOW_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible || isStandalone()) return null;

  const hide = () => {
    markDismissed();
    setVisible(false);
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
    }
    hide();
  };

  return (
    <aside className="pwa-overlay" aria-live="polite">
      <p className="pwa-overlay-title">{pwaCopy.installTitle}</p>
      <p className="pwa-overlay-body">
        {ios ? pwaCopy.iosHint : pwaCopy.installBody}
      </p>
      <div className="pwa-overlay-actions">
        <button type="button" className="pwa-overlay-secondary" onClick={hide}>
          {pwaCopy.installLater}
        </button>
        {deferred ? (
          <button
            type="button"
            className="pwa-overlay-primary"
            onClick={() => {
              void install();
            }}
          >
            {pwaCopy.installCta}
          </button>
        ) : null}
      </div>
    </aside>
  );
}

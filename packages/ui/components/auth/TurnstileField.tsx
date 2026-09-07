"use client";

import { useEffect, useRef } from "react";
import { T } from "../../copy/ko";
import { isTurnstileReady, turnstileSiteKey } from "./turnstile-ready";

type Props = {
  action: string;
  onToken: (token: string) => void;
  theme?: "light" | "dark" | "auto";
};

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      action?: string;
      theme?: "light" | "dark" | "auto";
      appearance?: "always" | "execute" | "interaction-only";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  remove: (id: string) => void;
};

function getApi(): TurnstileApi | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { turnstile?: TurnstileApi };
  return w.turnstile ?? null;
}

export function TurnstileField({ action, onToken, theme = "auto" }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const ready = isTurnstileReady();

  useEffect(() => {
    if (!ready) return;
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;

    function mount() {
      const api = getApi();
      if (!api || cancelled || !host) return;
      if (widgetId.current) {
        try {
          api.remove(widgetId.current);
        } catch {
          /* ignore */
        }
      }
      widgetId.current = api.render(host, {
        sitekey: turnstileSiteKey(),
        action,
        theme,
        appearance: "always",
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    }

    if (getApi()) {
      mount();
    } else {
      const existing = document.querySelector("script[data-turnstile-script]");
      if (!existing) {
        const s = document.createElement("script");
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        s.async = true;
        s.dataset.turnstileScript = "1";
        s.onload = () => mount();
        document.head.appendChild(s);
      } else {
        existing.addEventListener("load", mount);
      }
    }

    return () => {
      cancelled = true;
      const api = getApi();
      if (api && widgetId.current) {
        try {
          api.remove(widgetId.current);
        } catch {
          /* ignore */
        }
      }
    };
  }, [action, onToken, ready, theme]);

  if (!ready) {
    return (
      <p
        className="admin-session-note"
        data-testid="turnstile-unavailable"
        data-turnstile="not-configured"
        role="status"
      >
        {T.authClassic.turnstileNeeded}
      </p>
    );
  }

  return (
    <div className="turnstile-block" data-turnstile-block="ready">
      <p className="turnstile-block-help">{T.authClassic.turnstileHelp}</p>
      <div
        ref={hostRef}
        data-testid="turnstile-field"
        data-turnstile-action={action}
        className="min-h-16"
      />
    </div>
  );
}

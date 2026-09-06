"use client";

import { useEffect, useId, useRef } from "react";
import { T } from "../../copy/ko";
import { isTurnstileReady, turnstileSiteKey } from "./turnstile-ready";

type Props = {
  action: string;
  onToken: (token: string) => void;
};

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      action?: string;
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

export function TurnstileField({ action, onToken }: Props) {
  const hostId = useId();
  const widgetId = useRef<string | null>(null);
  const ready = isTurnstileReady();

  useEffect(() => {
    if (!ready) return;
    const host = document.getElementById(hostId);
    if (!host) return;
    let cancelled = false;

    function mount() {
      const api = getApi();
      if (!api || cancelled) return;
      if (widgetId.current) {
        try {
          api.remove(widgetId.current);
        } catch {
          /* ignore */
        }
      }
      widgetId.current = api.render(host!, {
        sitekey: turnstileSiteKey(),
        action,
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
  }, [action, hostId, onToken, ready]);

  if (!ready) {
    return (
      <p
        className="text-xs text-lux-text-muted"
        data-testid="turnstile-unavailable"
        data-turnstile="not-configured"
      >
        {T.authClassic.turnstileNeeded}
      </p>
    );
  }

  return (
    <div
      id={hostId}
      data-testid="turnstile-field"
      data-turnstile-action={action}
      className="min-h-16"
    />
  );
}

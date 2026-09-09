"use client";

import { useCallback, useState } from "react";
import { TurnstileField } from "@aipo/ui/components/auth";
import { T } from "@aipo/ui/copy/ko";

declare global {
  interface Window {
    __aipoJ0Ts?: string;
  }
}

function writeHandoffFile(token: string) {
  if (typeof window === "undefined" || token.length < 20) return;
  if (new URLSearchParams(window.location.search).get("handoff") !== "file") return;
  const blob = new Blob([token], { type: "application/octet-stream" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "j0-turnstile.token";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

export function AdminLoginMintClient() {
  const [token, setToken] = useState("");

  const onToken = useCallback((value: string) => {
    setToken(value);
    if (typeof window !== "undefined") window.__aipoJ0Ts = value;
    writeHandoffFile(value);
  }, []);

  return (
    <main data-testid="admin-login-mint">
      <p>{T.authClassic.turnstileHelp}</p>
      <TurnstileField action="admin-login" onToken={onToken} />
      <input
        type="hidden"
        name="cf-turnstile-response"
        value={token}
        readOnly
        aria-hidden="true"
      />
    </main>
  );
}

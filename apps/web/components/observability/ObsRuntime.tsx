"use client";

import { useEffect } from "react";

function emitClient(event: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    service: "apps-web",
    sink: "cloudflare-workers-console",
    ...event,
  };
  // Workers tail이 console을 수집. Vercel 금지. 머니/KYC raw 0.
  console.error(JSON.stringify(payload));
}

export function ObsRuntime() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      emitClient({
        event: "client_error",
        message: event.message,
        path: typeof location !== "undefined" ? location.pathname : "",
      });
    };
    const onRejected = (event: PromiseRejectionEvent) => {
      emitClient({
        event: "client_error",
        message: String(event.reason ?? "unhandled"),
        path: typeof location !== "undefined" ? location.pathname : "",
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejected);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejected);
    };
  }, []);
  return null;
}

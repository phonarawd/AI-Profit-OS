"use client";

import { useEffect } from "react";

function safeClientPath(): string {
  if (typeof location === "undefined") return "";
  return location.pathname
    .split("/")
    .map((segment) => {
      if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return ":id";
      if (/^[A-Za-z0-9_-]{20,}$/.test(segment)) return ":id";
      return segment;
    })
    .join("/");
}
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
    const onError = () => {
      emitClient({
        event: "client_error",
        source: "window_error",
        path: safeClientPath(),
      });
    };
    const onRejected = () => {
      emitClient({
        event: "client_error",
        source: "unhandled_rejection",
        path: safeClientPath(),
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

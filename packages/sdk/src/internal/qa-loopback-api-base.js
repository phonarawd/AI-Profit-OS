/**
 * Loopback QA only. Production never sets window.__AIPO_QA_API_BASE.
 * Non-loopback page origins ignore the hook so production fetch stays same-origin.
 */
const LOOPBACK = new Set(["127.0.0.1", "localhost"]);

export function resolveSdkApiBase(explicit) {
  if (typeof explicit === "string" && explicit.trim()) {
    return explicit.replace(/\/$/, "");
  }
  if (typeof window === "undefined") return "";
  const pageHost = String(window.location.hostname || "").toLowerCase();
  if (!LOOPBACK.has(pageHost)) return "";
  const raw = window.__AIPO_QA_API_BASE;
  if (typeof raw !== "string" || !raw.trim()) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:") return "";
    if (!LOOPBACK.has(url.hostname.toLowerCase())) return "";
    return url.origin;
  } catch {
    return "";
  }
}

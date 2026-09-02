/**
 * Admin CSRF signed double-submit · query bearer rejection.
 * The JS-readable CSRF token is bound to the HttpOnly admin session token.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE_NAME = "aipo_admin_session" as const;
export const ADMIN_CSRF_COOKIE_NAME = "aipo_admin_csrf" as const;
export const ADMIN_CSRF_HEADER = "x-admin-csrf" as const;

const ADMIN_CSRF_VERSION = "v1";
const ADMIN_CSRF_NONCE_RE = /^[0-9a-f]{64}$/;
const ADMIN_CSRF_MAC_RE = /^[A-Za-z0-9_-]{43}$/;
const ADMIN_CSRF_TOKEN_MAX = 160;

export function mintAdminCsrfSecret(): string {
  return randomBytes(32).toString("hex");
}

function csrfMac(sessionToken: string, nonce: string): string {
  return createHmac("sha256", sessionToken)
    .update(`${ADMIN_CSRF_VERSION}|${nonce}`, "utf8")
    .digest("base64url");
}

/**
 * Signed double-submit token. The browser may read this token, but it cannot mint
 * a valid token for another admin session without that session's HttpOnly bearer.
 */
export function mintAdminCsrfToken(
  sessionToken: string,
  nonce = mintAdminCsrfSecret(),
): string {
  const session = String(sessionToken || "").trim();
  if (session.length < 32) throw new Error("ADMIN_CSRF_SESSION_INVALID");
  if (!ADMIN_CSRF_NONCE_RE.test(nonce)) throw new Error("ADMIN_CSRF_NONCE_INVALID");
  return `${ADMIN_CSRF_VERSION}.${nonce}.${csrfMac(session, nonce)}`;
}

function safeEqual(aValue: string, bValue: string): boolean {
  const a = Buffer.from(aValue);
  const b = Buffer.from(bValue);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyAdminCsrfToken(
  csrfToken: string,
  sessionToken: string,
): boolean {
  const token = String(csrfToken || "").trim();
  const session = String(sessionToken || "").trim();
  if (!session || !token || token.length > ADMIN_CSRF_TOKEN_MAX) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== ADMIN_CSRF_VERSION) return false;
  const nonce = parts[1] || "";
  const mac = parts[2] || "";
  if (!ADMIN_CSRF_NONCE_RE.test(nonce) || !ADMIN_CSRF_MAC_RE.test(mac)) return false;
  return safeEqual(mac, csrfMac(session, nonce));
}

export function readHeader(
  headers: Record<string, unknown> | undefined,
  name: string,
): string {
  const raw = headers?.[name] ?? headers?.[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
}

function assertCsrfEcho(input: {
  cookies?: Record<string, string | undefined>;
  headers?: Record<string, unknown>;
}): string {
  const cookie = String(input.cookies?.[ADMIN_CSRF_COOKIE_NAME] ?? "").trim();
  const header = readHeader(input.headers, ADMIN_CSRF_HEADER);
  if (cookie.length < 32 || header.length < 32 || !safeEqual(cookie, header)) {
    throw new Error("ADMIN_CSRF_INVALID");
  }
  return cookie;
}

export function assertAdminCsrf(input: {
  cookies?: Record<string, string | undefined>;
  headers?: Record<string, unknown>;
}): void {
  const cookie = assertCsrfEcho(input);
  const session = String(
    input.cookies?.[ADMIN_SESSION_COOKIE_NAME] ?? "",
  ).trim();
  if (!verifyAdminCsrfToken(cookie, session)) {
    throw new Error("ADMIN_CSRF_INVALID");
  }
}

export type AdminLogoutPlan =
  | { action: "reject_csrf" }
  | { action: "revoke_and_clear"; token: string }
  | { action: "clear_only" }
  | { action: "noop" };

/** Session/CSRF cookies are not cleared before the appropriate CSRF proof. */
export function planAdminLogout(input: {
  cookies?: Record<string, string | undefined>;
  headers?: Record<string, unknown>;
}): AdminLogoutPlan {
  const token = String(input.cookies?.[ADMIN_SESSION_COOKIE_NAME] ?? "").trim();
  const csrfCookie = String(input.cookies?.[ADMIN_CSRF_COOKIE_NAME] ?? "").trim();
  if (!token && !csrfCookie) return { action: "noop" };

  if (!token) {
    try {
      assertCsrfEcho(input);
      return { action: "clear_only" };
    } catch {
      return { action: "reject_csrf" };
    }
  }

  try {
    assertAdminCsrf(input);
  } catch {
    return { action: "reject_csrf" };
  }
  return { action: "revoke_and_clear", token };
}

export function requestHasQueryBearer(url: string | undefined): boolean {
  if (!url) return false;
  return /[?&](access_token|token|bearer)=/i.test(url);
}

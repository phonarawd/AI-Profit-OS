/**
 * Admin CSRF 더블서브밋 · 쿼리 bearer 거부. phase0 env 의존 0.
 */

import { randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE_NAME = "aipo_admin_session" as const;
export const ADMIN_CSRF_COOKIE_NAME = "aipo_admin_csrf" as const;
export const ADMIN_CSRF_HEADER = "x-admin-csrf" as const;

export function mintAdminCsrfSecret(): string {
  return randomBytes(32).toString("hex");
}

export function readHeader(
  headers: Record<string, unknown> | undefined,
  name: string,
): string {
  const raw = headers?.[name] ?? headers?.[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
}

export function assertAdminCsrf(input: {
  cookies?: Record<string, string | undefined>;
  headers?: Record<string, unknown>;
}): void {
  const cookie = String(input.cookies?.[ADMIN_CSRF_COOKIE_NAME] ?? "").trim();
  const header = readHeader(input.headers, ADMIN_CSRF_HEADER);
  if (cookie.length < 32 || header.length < 32) {
    throw new Error("ADMIN_CSRF_INVALID");
  }
  const a = Buffer.from(cookie);
  const b = Buffer.from(header);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("ADMIN_CSRF_INVALID");
  }
}

export function requestHasQueryBearer(url: string | undefined): boolean {
  if (!url) return false;
  return /[?&](access_token|token|bearer)=/i.test(url);
}

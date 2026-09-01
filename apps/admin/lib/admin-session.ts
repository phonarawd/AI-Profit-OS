/** Admin 세션은 HttpOnly 쿠키. 브라우저 JS는 privileged bearer를 저장하지 않는다. */

export const ADMIN_SESSION_CHANGE_EVENT = "aipo.admin.session.change";
export const ADMIN_CSRF_COOKIE_NAME = "aipo_admin_csrf";
export const ADMIN_CSRF_HEADER = "X-Admin-CSRF";

let adminCsrfToken: string | null = null;

function readCsrfToken(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as { csrfToken?: unknown }).csrfToken;
  if (typeof value !== "string") return null;
  const token = value.trim();
  return token.length >= 32 ? token : null;
}

function notifyAdminSessionChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_SESSION_CHANGE_EVENT));
}

export function getAdminCsrf(): string | null {
  return adminCsrfToken;
}

export async function ensureAdminCsrf(): Promise<string | null> {
  if (adminCsrfToken) return adminCsrfToken;
  await fetchAdminSessionConnected();
  return adminCsrfToken;
}

export async function connectAdminSession(token: string): Promise<boolean> {
  const next = token.trim();
  if (!next) return false;
  const res = await fetch("/api/v1/admin-session", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token: next }),
  });
  if (!res.ok) return false;
  const body = (await res.json().catch(() => null)) as
    | { connected?: unknown; csrfToken?: unknown }
    | null;
  const ok = body?.connected === true;
  adminCsrfToken = ok ? readCsrfToken(body) : null;
  if (ok) notifyAdminSessionChange();
  return ok;
}

export async function disconnectAdminSession(): Promise<void> {
  const csrf = await ensureAdminCsrf();
  await fetch("/api/v1/admin-session/logout", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(csrf ? { [ADMIN_CSRF_HEADER]: csrf } : {}),
    },
  }).catch(() => undefined);
  adminCsrfToken = null;
  notifyAdminSessionChange();
}

export async function fetchAdminSessionConnected(): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/admin-session", {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return false;
    const body = (await res.json().catch(() => null)) as
      | { connected?: unknown; csrfToken?: unknown }
      | null;
    const connected = body?.connected === true;
    adminCsrfToken = connected ? readCsrfToken(body) : null;
    return connected;
  } catch {
    adminCsrfToken = null;
    return false;
  }
}

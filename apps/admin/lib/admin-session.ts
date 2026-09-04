/** Admin 세션은 HttpOnly 쿠키. 브라우저 JS는 privileged bearer를 저장하지 않는다. */

export const ADMIN_SESSION_CHANGE_EVENT = "aipo.admin.session.change";
export const ADMIN_CSRF_COOKIE_NAME = "aipo_admin_csrf";
export const ADMIN_CSRF_HEADER = "X-Admin-CSRF";

function notifyAdminSessionChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_SESSION_CHANGE_EVENT));
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(name + "=")) continue;
    const value = decodeURIComponent(trimmed.slice(name.length + 1));
    return value.trim() || null;
  }
  return null;
}

export function getAdminCsrf(): string | null {
  return readCookie(ADMIN_CSRF_COOKIE_NAME);
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
  const body = (await res.json().catch(() => null)) as { connected?: unknown } | null;
  const ok = body?.connected === true;
  if (ok) notifyAdminSessionChange();
  return ok;
}

export async function disconnectAdminSession(): Promise<void> {
  const csrf = getAdminCsrf();
  await fetch("/api/v1/admin-session/logout", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(csrf ? { [ADMIN_CSRF_HEADER]: csrf } : {}),
    },
  }).catch(() => undefined);
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
    const body = (await res.json().catch(() => null)) as { connected?: unknown } | null;
    return body?.connected === true;
  } catch {
    return false;
  }
}

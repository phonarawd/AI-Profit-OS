const STORAGE_KEY = "aipo.admin.bearer";

/** 연결/해제 시 페이지가 다시 불러오도록 알림 */
export const ADMIN_SESSION_CHANGE_EVENT = "aipo.admin.session.change";

function notifyAdminSessionChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_SESSION_CHANGE_EVENT));
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const token = typeof raw === "string" ? raw.trim() : "";
    return token || null;
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  const next = token.trim();
  if (!next) {
    clearAdminToken();
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY, next);
  notifyAdminSessionChange();
}

export function clearAdminToken(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
  notifyAdminSessionChange();
}

export function hasAdminToken(): boolean {
  return getAdminToken() != null;
}

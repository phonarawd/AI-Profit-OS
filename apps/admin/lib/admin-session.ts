const STORAGE_KEY = "aipo.admin.bearer";

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
}

export function clearAdminToken(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function hasAdminToken(): boolean {
  return getAdminToken() != null;
}

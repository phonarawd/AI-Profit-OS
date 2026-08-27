/** Browser JS never receives a persisted admin bearer. */
export const ADMIN_SESSION_CHANGE_EVENT = "aipo.admin.session.change";

function notifyAdminSessionChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_SESSION_CHANGE_EVENT));
}

async function readConnected(res: Response): Promise<boolean> {
  if (!res.ok) return false;
  try {
    const body = (await res.json()) as { connected?: unknown };
    return body.connected === true;
  } catch {
    return false;
  }
}

export async function connectAdminSession(token: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const next = token.trim();
  if (!next) return false;
  try {
    const res = await fetch("/api/admin-bff/session", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: next }),
    });
    const connected = await readConnected(res);
    if (connected) notifyAdminSessionChange();
    return connected;
  } catch {
    return false;
  }
}

export async function disconnectAdminSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/admin-bff/session", {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return false;
    notifyAdminSessionChange();
    return true;
  } catch {
    return false;
  }
}

export async function hasAdminSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/admin-bff/session", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    return readConnected(res);
  } catch {
    return false;
  }
}

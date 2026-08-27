const ADMIN_API_PREFIX = "/api/v1/admin";
export const ADMIN_SESSION_COOKIE = "aipo_admin_session";
export const ADMIN_SESSION_TOKEN_MAX_CHARS = 3800;

export function isStorableAdminToken(token: string): boolean {
  return token.length > 0 && token.length <= ADMIN_SESSION_TOKEN_MAX_CHARS && token.split(".").length === 3;
}

export function adminApiBase(): string {
  const apiHost = process.env.API_HOST ?? "localhost:4000";
  if (apiHost.startsWith("http://") || apiHost.startsWith("https://")) {
    return apiHost.replace(/\/$/, "");
  }
  if (
    apiHost.includes("localhost") ||
    apiHost.startsWith("127.") ||
    apiHost.startsWith("0.0.0.0")
  ) {
    return `http://${apiHost}`;
  }
  return `https://${apiHost}`;
}

export function safeAdminTarget(raw: string | null): string | null {
  if (!raw || /[\\\u0000-\u001f\u007f]/.test(raw)) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw, "https://admin-bff.invalid");
  } catch {
    return null;
  }
  if (parsed.origin !== "https://admin-bff.invalid") return null;
  if (
    parsed.pathname !== ADMIN_API_PREFIX &&
    !parsed.pathname.startsWith(`${ADMIN_API_PREFIX}/`)
  ) {
    return null;
  }
  return `${parsed.pathname}${parsed.search}`;
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function adminSessionCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "strict";
  path: string;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/admin-bff",
  };
}

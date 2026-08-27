export type AdminFailureKind =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "unavailable"
  | "error";

export type AdminFailure = {
  kind: AdminFailureKind;
  status: number | null;
  code: string | null;
};

export type AdminResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: AdminFailure };

function adminUrl(path: string): string | null {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p !== "/api/v1/admin" && !p.startsWith("/api/v1/admin/")) return null;
  return `/api/admin-bff/proxy?target=${encodeURIComponent(p)}`;
}

function classify(status: number | null): AdminFailureKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status == null || status >= 500) return "unavailable";
  return "error";
}

function readCode(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as Record<string, unknown>;
  if (typeof rec.code === "string" && rec.code.trim()) return rec.code;
  if (typeof rec.message === "string" && rec.message.trim()) return rec.message;
  return null;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function adminRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<AdminResult<T>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const extra = init.headers;
  if (extra && typeof extra === "object" && !Array.isArray(extra)) {
    for (const [k, v] of Object.entries(extra as Record<string, string>)) {
      headers[k] = v;
    }
  }
  delete headers.Authorization;
  delete headers.authorization;
  const url = adminUrl(path);
  if (!url) {
    return {
      ok: false,
      failure: { kind: "error", status: 400, code: "ADMIN_BFF_TARGET_INVALID" },
    };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
      credentials: "include",
    });
  } catch {
    return {
      ok: false,
      failure: { kind: "unavailable", status: null, code: null },
    };
  }

  const body = await parseBody(res);
  if (!res.ok) {
    return {
      ok: false,
      failure: {
        kind: classify(res.status),
        status: res.status,
        code: readCode(body),
      },
    };
  }
  return { ok: true, data: body as T };
}

export function adminGet<T>(path: string): Promise<AdminResult<T>> {
  return adminRequest<T>(path, { method: "GET" });
}

export function adminSend<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: Record<string, unknown>,
): Promise<AdminResult<T>> {
  return adminRequest<T>(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `admin-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

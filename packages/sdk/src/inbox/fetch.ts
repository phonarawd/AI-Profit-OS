/**
 * Inbox + prefs HTTP client — C-ACC-002
 * 기존 Nest 경로만. 빈 목록을 합성 카드로 채우지 않음.
 */

import type {
  InboxItem,
  InboxList,
  InboxRequestOpts,
  NotificationPrefs,
  NotificationPrefsPatch,
} from "./types";

export class InboxError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, code: string | null, message?: string) {
    super(message ?? code ?? `inbox_${status}`);
    this.name = "InboxError";
    this.status = status;
    this.code = code;
  }
}

export function isInboxError(err: unknown): err is InboxError {
  return err instanceof InboxError;
}

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function authHeaders(
  opts: InboxRequestOpts,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (opts.getAccessToken) {
    const token = await opts.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

function asText(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function readInboxErrorCode(status: number, raw: unknown): string | null {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (asText(o.code)) return asText(o.code);
    const message = typeof o.message === "string" ? o.message : "";
    if (message.includes("INBOX_NOT_FOUND")) return "INBOX_NOT_FOUND";
  }
  if (status === 401) return "AUTH_REQUIRED";
  if (status === 404) return "INBOX_NOT_FOUND";
  if (status === 0) return "NETWORK_ERROR";
  return null;
}

function throwHttp(status: number, raw: unknown): never {
  throw new InboxError(status, readInboxErrorCode(status, raw));
}

export function normalizeInboxItem(raw: unknown): InboxItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = asText(o.id);
  const titleKo = asText(o.titleKo);
  const createdAt = asText(o.createdAt);
  if (!id || !titleKo || !createdAt) return null;
  return {
    id,
    titleKo,
    bodyKo: typeof o.bodyKo === "string" ? o.bodyKo : "",
    href: asText(o.href),
    createdAt,
    readAt: asText(o.readAt),
  };
}

export function normalizeInboxList(raw: unknown): InboxList {
  const obj = raw && typeof raw === "object" ? (raw as { items?: unknown }) : {};
  const items = Array.isArray(obj.items) ? obj.items : [];
  return {
    items: items
      .map((item) => normalizeInboxItem(item))
      .filter((item): item is InboxItem => item != null),
  };
}

export function normalizeNotificationPrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== "object") {
    throw new InboxError(0, "PREFS_UNAVAILABLE");
  }
  const o = raw as Record<string, unknown>;
  const userId = asText(o.userId);
  const keys = [
    "master",
    "opportunity",
    "wallet",
    "notice",
    "campaign",
    "opsMessage",
    "strategyMatch",
  ] as const;
  if (!userId) throw new InboxError(0, "PREFS_UNAVAILABLE");
  for (const key of keys) {
    if (typeof o[key] !== "boolean") {
      throw new InboxError(0, "PREFS_UNAVAILABLE");
    }
  }
  return {
    userId,
    master: o.master as boolean,
    opportunity: o.opportunity as boolean,
    wallet: o.wallet as boolean,
    notice: o.notice as boolean,
    campaign: o.campaign as boolean,
    opsMessage: o.opsMessage as boolean,
    strategyMatch: o.strategyMatch as boolean,
  };
}

export async function listInbox(
  opts: InboxRequestOpts = {},
): Promise<InboxList> {
  let res: Response;
  try {
    res = await fetch(apiUrl(opts.apiBase ?? "", "/api/v1/me/inbox"), {
      method: "GET",
      headers: await authHeaders(opts),
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new InboxError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  return normalizeInboxList(raw);
}

export async function markInboxRead(
  id: string,
  opts: InboxRequestOpts = {},
): Promise<{ ok: true }> {
  const trimmed = id.trim();
  if (!trimmed) throw new InboxError(400, "INBOX_NOT_FOUND");
  let res: Response;
  try {
    res = await fetch(
      apiUrl(
        opts.apiBase ?? "",
        `/api/v1/me/inbox/${encodeURIComponent(trimmed)}/read`,
      ),
      {
        method: "POST",
        headers: await authHeaders(opts),
        credentials: "include",
        cache: "no-store",
        signal: opts.signal,
      },
    );
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new InboxError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  return { ok: true };
}

export async function hideInboxItem(
  id: string,
  opts: InboxRequestOpts = {},
): Promise<{ ok: true }> {
  const trimmed = id.trim();
  if (!trimmed) throw new InboxError(400, "INBOX_NOT_FOUND");
  let res: Response;
  try {
    res = await fetch(
      apiUrl(
        opts.apiBase ?? "",
        `/api/v1/me/inbox/${encodeURIComponent(trimmed)}/hide`,
      ),
      {
        method: "POST",
        headers: await authHeaders(opts),
        credentials: "include",
        cache: "no-store",
        signal: opts.signal,
      },
    );
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new InboxError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  return { ok: true };
}

export async function fetchNotificationPrefs(
  opts: InboxRequestOpts = {},
): Promise<NotificationPrefs> {
  let res: Response;
  try {
    res = await fetch(
      apiUrl(opts.apiBase ?? "", "/api/v1/me/notification-prefs"),
      {
        method: "GET",
        headers: await authHeaders(opts),
        credentials: "include",
        cache: "no-store",
        signal: opts.signal,
      },
    );
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new InboxError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  return normalizeNotificationPrefs(raw);
}

export async function putNotificationPrefs(
  patch: NotificationPrefsPatch,
  opts: InboxRequestOpts = {},
): Promise<NotificationPrefs> {
  const headers = await authHeaders(opts);
  headers["Content-Type"] = "application/json";
  const body: Record<string, boolean> = {};
  for (const key of [
    "master",
    "opportunity",
    "wallet",
    "notice",
    "campaign",
    "opsMessage",
    "strategyMatch",
  ] as const) {
    if (typeof patch[key] === "boolean") body[key] = patch[key];
  }
  let res: Response;
  try {
    res = await fetch(
      apiUrl(opts.apiBase ?? "", "/api/v1/me/notification-prefs"),
      {
        method: "PUT",
        headers,
        credentials: "include",
        cache: "no-store",
        signal: opts.signal,
        body: JSON.stringify(body),
      },
    );
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new InboxError(0, "NETWORK_ERROR");
  }
  const raw = await readJson(res);
  if (!res.ok) throwHttp(res.status, raw);
  return normalizeNotificationPrefs(raw);
}

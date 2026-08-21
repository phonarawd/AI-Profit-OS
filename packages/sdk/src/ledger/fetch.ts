/**
 * GET /api/v1/me/ledger/journals — REL-015 본인 전표만.
 * 결측 금액을 0으로 채우지 않는다. 합산/재계산 0.
 */

import { LedgerRequestError } from "./errors";
import type {
  LedgerRequestOpts,
  UserJournal,
  UserJournalEntry,
  UserJournalList,
} from "./types";

const MONEY_RE = /^-?[0-9]+(\.[0-9]+)?$/;

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

async function authHeaders(
  opts: LedgerRequestOpts,
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

function asMoney(v: unknown): string | null {
  return typeof v === "string" && MONEY_RE.test(v) ? v : null;
}

function readEntry(raw: unknown): UserJournalEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const amountUsdt = asMoney(o.amountUsdt);
  if (!id || !amountUsdt) return null;
  return {
    id,
    direction: o.direction === "debit" ? "debit" : "credit",
    amountUsdt,
    bucket: typeof o.bucket === "string" ? o.bucket : null,
    accountKind: typeof o.accountKind === "string" ? o.accountKind : "",
  };
}

export function readUserJournal(raw: unknown): UserJournal | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const journalType = typeof o.journalType === "string" ? o.journalType : "";
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : "";
  if (!id || !journalType || !createdAt) return null;
  const entriesRaw = Array.isArray(o.entries) ? o.entries : [];
  const entries: UserJournalEntry[] = [];
  for (const row of entriesRaw) {
    const entry = readEntry(row);
    if (entry) entries.push(entry);
  }
  return {
    id,
    journalType,
    createdAt,
    referenceType: typeof o.referenceType === "string" ? o.referenceType : null,
    referenceId: typeof o.referenceId === "string" ? o.referenceId : null,
    entries,
  };
}

async function requestJson(
  path: string,
  opts: LedgerRequestOpts,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(apiUrl(opts.apiBase ?? "", path), {
      method: "GET",
      headers: await authHeaders(opts),
      credentials: "include",
      cache: "no-store",
      signal: opts.signal,
    });
  } catch (err) {
    if (
      (err instanceof DOMException && err.name === "AbortError") ||
      (err instanceof Error && err.name === "AbortError")
    ) {
      throw err;
    }
    throw new LedgerRequestError(0);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new LedgerRequestError(res.status, body);
  }
  try {
    return await res.json();
  } catch {
    throw new LedgerRequestError(502, "ledger body");
  }
}

export async function fetchUserJournalList(
  opts: LedgerRequestOpts & { limit?: number; offset?: number } = {},
): Promise<UserJournalList> {
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  const q = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const raw = await requestJson(
    `/api/v1/me/ledger/journals?${q.toString()}`,
    opts,
  );
  if (!raw || typeof raw !== "object") {
    throw new LedgerRequestError(502, "ledger list");
  }
  const o = raw as Record<string, unknown>;
  const itemsRaw = Array.isArray(o.items) ? o.items : null;
  if (!itemsRaw) {
    throw new LedgerRequestError(502, "ledger items");
  }
  const items: UserJournal[] = [];
  for (const row of itemsRaw) {
    const item = readUserJournal(row);
    if (item) items.push(item);
  }
  const total = typeof o.total === "number" && Number.isFinite(o.total) ? o.total : items.length;
  return {
    items,
    total,
    limit: typeof o.limit === "number" ? o.limit : limit,
    offset: typeof o.offset === "number" ? o.offset : offset,
  };
}

export async function fetchUserJournal(
  journalId: string,
  opts: LedgerRequestOpts = {},
): Promise<UserJournal> {
  const id = journalId.trim();
  if (!id) throw new LedgerRequestError(404, "journal id");
  const raw = await requestJson(
    `/api/v1/me/ledger/journals/${encodeURIComponent(id)}`,
    opts,
  );
  const journal =
    raw && typeof raw === "object" && "journal" in raw
      ? readUserJournal((raw as { journal: unknown }).journal)
      : readUserJournal(raw);
  if (!journal) {
    throw new LedgerRequestError(502, "journal shape");
  }
  return journal;
}

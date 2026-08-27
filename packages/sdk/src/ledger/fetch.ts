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

const MONEY_RE = /^[0-9]+(\\.[0-9]+)?$/;
const JOURNAL_TYPES = new Set([
  "deposit_usdt",
  "deposit_krw",
  "withdraw",
  "withdraw_refund",
  "participate_lock",
  "participate_unlock",
  "settlement",
  "merge_profit_to_principal",
  "admin_adjust",
  "referral_reward",
  "referral_clawback",
  "practice_grant",
  "practice_expire",
  "mission_reward",
  "mission_clawback",
  "fee",
  "other",
]);
const JOURNAL_KEYS = [
  "id",
  "journalType",
  "createdAt",
  "referenceType",
  "referenceId",
  "entries",
] as const;
const ENTRY_KEYS = [
  "id",
  "direction",
  "amountUsdt",
  "bucket",
  "accountKind",
] as const;

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return Boolean(raw && typeof raw === "object" && !Array.isArray(raw));
}

function exactKeys(
  raw: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  const keys = Object.keys(raw);
  return (
    keys.length === allowed.length &&
    keys.every((key) => allowed.includes(key))
  );
}

function nonEmptyText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function nullableText(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function validIso(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value))
  );
}

function readEntry(raw: unknown): UserJournalEntry | null {
  if (!isRecord(raw) || !exactKeys(raw, ENTRY_KEYS)) return null;
  const id = nonEmptyText(raw.id);
  const amountUsdt =
    typeof raw.amountUsdt === "string" && MONEY_RE.test(raw.amountUsdt)
      ? raw.amountUsdt
      : null;
  const direction =
    raw.direction === "debit" || raw.direction === "credit"
      ? raw.direction
      : null;
  const bucket =
    raw.bucket === null
      ? null
      : typeof raw.bucket === "string" && raw.bucket.trim()
        ? raw.bucket
        : undefined;
  const accountKind = nonEmptyText(raw.accountKind);
  if (!id || !amountUsdt || !direction || bucket === undefined || !accountKind) {
    return null;
  }
  return { id, direction, amountUsdt, bucket, accountKind };
}

export function readUserJournal(raw: unknown): UserJournal | null {
  if (!isRecord(raw) || !exactKeys(raw, JOURNAL_KEYS)) return null;
  const id = nonEmptyText(raw.id);
  const journalType = nonEmptyText(raw.journalType);
  const referenceType = nullableText(raw.referenceType);
  const referenceId = nullableText(raw.referenceId);
  if (
    !id ||
    !journalType ||
    !JOURNAL_TYPES.has(journalType) ||
    !validIso(raw.createdAt) ||
    referenceType === undefined ||
    referenceId === undefined ||
    !Array.isArray(raw.entries) ||
    raw.entries.length < 1
  ) {
    return null;
  }

  const entries: UserJournalEntry[] = [];
  for (const row of raw.entries) {
    const entry = readEntry(row);
    if (!entry) return null;
    entries.push(entry);
  }

  return {
    id,
    journalType,
    createdAt: raw.createdAt,
    referenceType,
    referenceId,
    entries,
  };
}

function exactListShape(raw: unknown): raw is {
  items: unknown[];
  total: number;
  limit: number;
  offset: number;
} {
  if (!isRecord(raw) || !exactKeys(raw, ["items", "total", "limit", "offset"])) {
    return false;
  }
  return (
    Array.isArray(raw.items) &&
    Number.isInteger(raw.total) &&
    (raw.total as number) >= 0 &&
    Number.isInteger(raw.limit) &&
    (raw.limit as number) >= 1 &&
    (raw.limit as number) <= 100 &&
    Number.isInteger(raw.offset) &&
    (raw.offset as number) >= 0 &&
    raw.items.length <= (raw.limit as number) &&
    (raw.total as number) >= raw.items.length
  );
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
  if (!exactListShape(raw)) {
    throw new LedgerRequestError(502, "ledger list shape");
  }
  const items: UserJournal[] = [];
  for (const row of raw.items) {
    const item = readUserJournal(row);
    if (!item) throw new LedgerRequestError(502, "ledger item shape");
    items.push(item);
  }
  return {
    items,
    total: raw.total,
    limit: raw.limit,
    offset: raw.offset,
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
    isRecord(raw) && exactKeys(raw, ["journal"])
      ? readUserJournal(raw.journal)
      : readUserJournal(raw);
  if (!journal) {
    throw new LedgerRequestError(502, "journal shape");
  }
  return journal;
}

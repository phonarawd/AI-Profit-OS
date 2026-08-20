/**
 * Consumer wallet history projection — ledger rows → session-user lines only.
 * No new money/FX formula. Invalid amounts are omitted, never coerced to 0.
 */

import { formatAmount, parseAmount } from "./ledger.money";
import {
  JOURNAL_TYPES,
  USER_BUCKETS,
  type JournalType,
  type UserBucket,
} from "./ledger.types";

export type UserJournalLineRow = {
  id: string;
  journal_type: string;
  reference_type: string | null;
  reference_id: string | null;
  created_at: Date | string;
  owner_user_id: string;
  bucket: string | null;
  direction: string;
  amount_usdt: string;
};

export type WalletUserJournalLineV1 = {
  bucket: UserBucket;
  direction: "debit" | "credit";
  amountUsdt: string;
};

export type WalletUserJournalItemV1 = {
  id: string;
  journalType: JournalType;
  createdAt: string;
  referenceType: string | null;
  referenceId: string | null;
  userLines: WalletUserJournalLineV1[];
};

function isJournalType(v: string): v is JournalType {
  return (JOURNAL_TYPES as readonly string[]).includes(v);
}

function isBucket(v: string | null): v is UserBucket {
  return !!v && (USER_BUCKETS as readonly string[]).includes(v);
}

function asIso(v: Date | string): string {
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function asLedgerAmount(raw: string): string | undefined {
  try {
    return formatAmount(parseAmount(raw));
  } catch {
    return undefined;
  }
}

/**
 * Defense-in-depth: even if SQL already scoped the session user,
 * drop any row whose owner_user_id does not match.
 */
export function projectUserJournalItems(
  rows: UserJournalLineRow[],
  sessionUserId: string,
): WalletUserJournalItemV1[] {
  if (!sessionUserId) return [];
  const order: string[] = [];
  const map = new Map<string, WalletUserJournalItemV1>();
  for (const row of rows) {
    if (row.owner_user_id !== sessionUserId) continue;
    if (!isJournalType(row.journal_type)) continue;
    if (row.direction !== "debit" && row.direction !== "credit") continue;
    if (!isBucket(row.bucket)) continue;
    const amountUsdt = asLedgerAmount(row.amount_usdt);
    if (!amountUsdt) continue;
    const createdAt = asIso(row.created_at);
    if (!createdAt) continue;
    let item = map.get(row.id);
    if (!item) {
      item = {
        id: row.id,
        journalType: row.journal_type,
        createdAt,
        referenceType: row.reference_type,
        referenceId: row.reference_id,
        userLines: [],
      };
      map.set(row.id, item);
      order.push(row.id);
    }
    item.userLines.push({
      bucket: row.bucket,
      direction: row.direction,
      amountUsdt,
    });
  }
  return order.map((id) => map.get(id)!).filter((item) => item.userLines.length > 0);
}

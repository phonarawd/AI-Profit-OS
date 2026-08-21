/** REL-015 유저 원장 조회 투영. 금액은 decimal string. */

export type LedgerRequestOpts = {
  apiBase?: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  signal?: AbortSignal;
};

export type UserJournalEntry = {
  id: string;
  direction: "debit" | "credit";
  amountUsdt: string;
  bucket: string | null;
  accountKind: string;
};

export type UserJournal = {
  id: string;
  journalType: string;
  createdAt: string;
  referenceType: string | null;
  referenceId: string | null;
  entries: UserJournalEntry[];
};

export type UserJournalList = {
  items: UserJournal[];
  total: number;
  limit: number;
  offset: number;
};

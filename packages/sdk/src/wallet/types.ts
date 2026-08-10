/**
 * Wallet buckets DTO — GET /api/v1/wallet/buckets
 * Money §49 · schemas/wallet-buckets.v1.json
 */

export type WalletBucketsResponse = {
  userId: string;
  principalUsdt: string;
  profitUsdt: string;
  lockedUsdt: string;
  practiceUsdt: string;
  liabilityUsdt: string;
  asOfLedgerEntryId: string;
};

export type WalletRequestOpts = {
  apiBase?: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  signal?: AbortSignal;
};

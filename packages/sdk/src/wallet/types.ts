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

export type WithdrawStepUpMethod =
  | "webauthn"
  | "email_otp"
  | "pin"
  | "recovery";

export type WithdrawStepUpChallengeResponse = {
  challengeId: string;
  method: WithdrawStepUpMethod;
  expiresAt?: string;
  origin?: string;
};

export type WithdrawStepUpVerifyResponse = {
  ok: true;
  stepUpToken: string;
  method: WithdrawStepUpMethod;
  expiresAt?: string;
};

export type CreateWithdrawInput = {
  mode?: "profit" | "principal" | "combined";
  amountUsdt: string;
  asset?: "USDT" | "KRW";
  destination?: string;
  idempotencyKey: string;
  stepUpToken: string;
  principalConfirmToken?: string;
};

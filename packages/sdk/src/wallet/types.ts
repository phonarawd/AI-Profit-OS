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

export type PayableSuffixRole = "bank_transfer_identification";

export type KrwDepositQuote = {
  fxSnapshotId: string;
  usdtKrw: string;
  estimatedUsdt: string;
  formulaId?: string;
  capturedAt?: string;
};

export type KrwDepositFinal = {
  appliedFxSnapshotId: string;
  appliedUsdtKrw: string;
  creditedUsdt: string;
  appliedFormulaId?: string;
  appliedFxCapturedAt?: string;
  decidedAt?: string;
  ledgerJournalId?: string;
};

export type KrwDepositRequest = {
  id: string;
  userId: string;
  requestedAmountKrw: number;
  payableAmountKrw: number;
  uniqueSuffixKrw: number;
  payableSuffixRole: PayableSuffixRole;
  depositCode: string;
  depositorName: string;
  status: string;
  expiresAt: string;
  estimatedUsdt?: string;
  quote: KrwDepositQuote | null;
  final: KrwDepositFinal | null;
  ledgerJournalId?: string;
  createdAt: string;
  decidedAt?: string;
};

export type CreateKrwDepositInput = {
  requestedAmountKrw: number;
  depositorName: string;
  idempotencyKey: string;
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

/** D-06 — API KEEP, consumer CTA HIDE */
export const CONSUMER_PROFIT_MERGE_CTA_EXPOSED = false as const;

export type UserDepositAddress = {
  userId: string;
  trc20Address: string;
  derivationIndex: number;
  qrPayload: string;
  createdAt: string;
  lastSeenTxAt?: string;
};

export type KycStatus = "none" | "pending" | "approved" | "rejected";

export type KycStatusResponse = {
  userId: string;
  kycStatus: KycStatus;
  submissionId?: string;
  decidedAt?: string;
  rejectReason?: string;
};

export type SubmitKycInput = {
  legalName: string;
  phoneE164: string;
  birthDate: string;
  idDocType: string;
  idDocBase64: string;
  selfieBase64?: string;
};

export type WalletJournalLine = {
  bucket: "principal" | "profit" | "locked" | "practice";
  direction: "debit" | "credit";
  amountUsdt: string;
};

export type WalletJournalItem = {
  id: string;
  journalType: string;
  createdAt: string;
  referenceType: string | null;
  referenceId: string | null;
  userLines: WalletJournalLine[];
};

export type WalletJournalsResponse = {
  items: WalletJournalItem[];
};

export type DepositDisputeKind = "wrong_chain" | "mis_deposit";

export type DepositDisputeStatus = "open" | "credited" | "rejected";

export type CreateDepositDisputeInput = {
  kind?: DepositDisputeKind;
  linkedTxHash: string;
  networkClaimedKo?: string;
  idempotencyKey: string;
};

export type DepositDispute = {
  id: string;
  kind: DepositDisputeKind;
  status: DepositDisputeStatus;
  linkedTxHash: string;
};

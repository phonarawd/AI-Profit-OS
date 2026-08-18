/** Money §11 · §43.5 · §49 — ledger posting contracts */

export const USER_BUCKETS = ["principal", "profit", "locked", "practice"] as const;
export type UserBucket = (typeof USER_BUCKETS)[number];

export const JOURNAL_TYPES = [
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
] as const;
export type JournalType = (typeof JOURNAL_TYPES)[number];

export const SYSTEM_ACCOUNT_CODES = {
  OPPORTUNITY_POOL: "SYS:OPPORTUNITY_POOL",
  OPS_POOL: "SYS:OPS_POOL",
  /** Engine §0.0.4.3 · S2 input · ops.platform_reserve_usdt */
  PLATFORM_RESERVE: "ops.platform_reserve_usdt",
  PROMO_POOL: "SYS:PROMO_POOL",
  TREASURY: "SYS:TREASURY",
  FEE_REVENUE: "SYS:FEE_REVENUE",
  FX_CLEARING: "SYS:FX_CLEARING",
  SUSPENSE: "SYS:SUSPENSE",
} as const;

/** Account kinds where debit increases balance_usdt (asset/clearing). */
export const DEBIT_NORMAL_KINDS = new Set([
  "ops_pool",
  "treasury",
  "fx_clearing",
  "suspense",
]);

/** Account kinds where credit increases balance_usdt (liability/revenue). */
export const CREDIT_NORMAL_KINDS = new Set([
  "user_bucket",
  "opportunity_pool",
  "promo_pool",
  "fee_revenue",
]);

/** Journal types that must never touch practice bucket (§49). */
export const PRACTICE_FORBIDDEN_JOURNAL_TYPES = new Set<JournalType>([
  "deposit_usdt",
  "deposit_krw",
  "withdraw",
  "withdraw_refund",
  "participate_lock",
  "participate_unlock",
  "settlement",
  "merge_profit_to_principal",
  "fee",
  "referral_reward",
  "referral_clawback",
]);

export type AccountRef =
  | { accountId: string }
  | { systemCode: string }
  | { userId: string; bucket: UserBucket };

export type PostingLineInput = {
  account: AccountRef;
  direction: "debit" | "credit";
  amountUsdt: string;
};

export type PostJournalInput = {
  idempotencyKey: string;
  journalType: JournalType;
  lines: PostingLineInput[];
  referenceType?: string | null;
  referenceId?: string | null;
  memo?: string | null;
  fxSnapshotId?: string | null;
  createdBy?: string | null;
};

export type LedgerEntryRow = {
  id: string;
  journalId: string;
  accountId: string;
  direction: "debit" | "credit";
  amountUsdt: string;
  createdAt: string;
};

export type LedgerJournalRow = {
  id: string;
  idempotencyKey: string;
  journalType: JournalType;
  referenceType: string | null;
  referenceId: string | null;
  memo: string | null;
  fxSnapshotId: string | null;
  createdBy: string | null;
  createdAt: string;
  entries: LedgerEntryRow[];
  reused: boolean;
};

export type WalletBucketsView = {
  userId: string;
  principalUsdt: string;
  profitUsdt: string;
  lockedUsdt: string;
  practiceUsdt: string;
  liabilityUsdt: string;
  asOfLedgerEntryId: string;
};

export type AdminAdjustKind = "credit" | "debit" | "correct";

export type AdminAdjustInput = {
  userId: string;
  bucket: UserBucket;
  kind: AdminAdjustKind;
  amountUsdt: string;
  reason: string;
  idempotencyKey: string;
  createdBy: string;
  /** Required when amountUsdt > 1000 — must differ from createdBy (§9.8.3) */
  secondApproverId?: string;
  /** For kind=correct — journal to reverse first */
  reverseJournalId?: string;
  /** For kind=correct — direction of the replacement entry (default credit) */
  applyKind?: "credit" | "debit";
  fxSnapshotId?: string | null;
};

export type ReconMismatch = {
  code: string;
  detail: string;
  accountId?: string;
  journalId?: string;
  userId?: string;
};

export type ReconReport = {
  ok: boolean;
  checkedAt: string;
  journalsChecked: number;
  accountsChecked: number;
  usersChecked: number;
  mismatches: ReconMismatch[];
};

export type FinancialReportBucket = {
  period: string;
  depositUsdt: string;
  withdrawUsdt: string;
  adminCreditUsdt: string;
  adminDebitUsdt: string;
  settlementUserProfitUsdt: string;
  feeUsdt: string;
  journalCount: number;
};

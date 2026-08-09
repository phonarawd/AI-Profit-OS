/** Money §11.1 · §11.2 · §37 · §41 deposit-config / USDT+KRW contracts */

export type WithdrawMode = "profit" | "principal" | "combined";
export type WithdrawAsset = "USDT" | "KRW";

/** §43.3 Day-1 TTL for KRW unique payable amount */
export const KRW_DEPOSIT_TTL_MIN = 120;
/** §41.3 reject reason min length */
export const KRW_REJECT_REASON_MIN = 10;

export type KrwDepositStatus =
  | "pending"
  | "matched"
  | "approved"
  | "expired"
  | "rejected"
  | "manual_review";

export type UserDepositAddressV1 = {
  userId: string;
  trc20Address: string;
  derivationIndex: number;
  qrPayload: string;
  createdAt: string;
  lastSeenTxAt?: string;
};

/** §43.1 usdt_deposit_events row */
export type UsdtDepositEventStatus =
  | "seen"
  | "ui_confirmed"
  | "ledger_credited"
  | "swept"
  | "ignored";

export type UsdtDepositEventV1 = {
  id: string;
  userId: string;
  txHash: string;
  toAddress: string;
  amountUsdt: string;
  confirmations: number;
  status: UsdtDepositEventStatus;
  ledgerJournalId?: string;
  idempotencyKey: string;
  observedAt: string;
  creditedAt?: string;
  /** §43.2 · set when Energy+Treasury sweep completes · user balance unchanged */
  sweptAt?: string;
  sweepTxHash?: string;
  createdAt: string;
};

export type UsdtDepositObserveResult = {
  ok: true;
  action:
    | "seen"
    | "detected"
    | "confirmed"
    | "reuse_credited"
    | "ignored_dust"
    | "unmatched_address"
    | "reorg_voided"
    | "reorg_ignored_after_credit";
  event: UsdtDepositEventV1 | null;
  ledgerJournalId?: string;
  toastCode?: "DEPOSIT_DETECTED" | "DEPOSIT_CONFIRMED";
  /** Always false at 1conf · true only when 19conf credit path ran */
  creditLedger: boolean;
  reused?: boolean;
};

export type KrwDepositRequestV1 = {
  id: string;
  userId: string;
  requestedAmountKrw: number;
  payableAmountKrw: number;
  uniqueSuffixKrw: number;
  depositCode: string;
  depositorName: string;
  status: KrwDepositStatus;
  expiresAt: string;
  adminNote?: string;
  ledgerEntryId?: string;
  idempotencyKey: string;
  createdAt: string;
  decidedAt?: string;
  decidedByAdminId?: string;
};

export type KrwDepositDecideResult = {
  ok: true;
  decision: "approved" | "rejected";
  request: KrwDepositRequestV1;
  journalId?: string;
  ledgerEntryId?: string;
  amountUsdt?: string;
  reused: boolean;
  toastCode: "KRW_DEPOSIT_APPROVED" | "KRW_DEPOSIT_REJECTED";
  auditAction: "admin.krw_deposit.approved" | "admin.krw_deposit.rejected";
};

export type DepositConfigKrw = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  noticeKo: string;
  krwWithdrawFeeKrw: number;
};

export type DepositConfigUsdtOnchain = {
  network: "TRC20";
  tronGridBaseUrl: string;
  tronGridApiKey?: string;
  chainWatcherMode: "event_stream";
  usdtUiConfirmations: 1;
  usdtLedgerConfirmations: 19;
  usdtContract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
  hotWalletXpubRef: string;
  treasuryHotAddressRef: string;
  energyDelegateEnabled: boolean;
  usdtWithdrawNetworkFeeUsdt: string;
  minTrxStakeForSweeper: string;
  sweeperPaused?: boolean;
};

export type DepositConfigWithdrawGuards = {
  minHoldingHours: number;
};

export type DepositConfigPricingGuards = {
  priceStaleMaxSec: number;
  requireMinProfitUsdt: true;
};

export type DepositConfigV1 = {
  configVersion: number;
  krw: DepositConfigKrw;
  usdtOnchain: DepositConfigUsdtOnchain;
  withdrawGuards: DepositConfigWithdrawGuards;
  pricingGuards: DepositConfigPricingGuards;
  updatedAt: string;
  updatedByAdminId: string;
};

export type DepositConfigPatchInput = {
  updatedByAdminId: string;
  changeReason: string;
  krw?: Partial<DepositConfigKrw>;
  usdtOnchain?: Partial<
    Omit<
      DepositConfigUsdtOnchain,
      | "network"
      | "chainWatcherMode"
      | "usdtUiConfirmations"
      | "usdtLedgerConfirmations"
      | "usdtContract"
    >
  >;
  withdrawGuards?: Partial<DepositConfigWithdrawGuards>;
  pricingGuards?: Partial<Omit<DepositConfigPricingGuards, "requireMinProfitUsdt">>;
};

/** Day-1 defaults (Money §11.1 · §11.2 · §43.2) */
export const DAY1_DEPOSIT_CONFIG_DEFAULTS: Omit<
  DepositConfigV1,
  "updatedAt" | "updatedByAdminId"
> = {
  configVersion: 1,
  krw: {
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    noticeKo: "",
    krwWithdrawFeeKrw: 0,
  },
  usdtOnchain: {
    network: "TRC20",
    tronGridBaseUrl: "https://api.trongrid.io",
    chainWatcherMode: "event_stream",
    usdtUiConfirmations: 1,
    usdtLedgerConfirmations: 19,
    usdtContract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    hotWalletXpubRef: "secret:hot-wallet-xpub",
    treasuryHotAddressRef: "secret:treasury-hot",
    energyDelegateEnabled: true,
    usdtWithdrawNetworkFeeUsdt: "1",
    minTrxStakeForSweeper: "5000",
    sweeperPaused: false,
  },
  withdrawGuards: {
    minHoldingHours: 24,
  },
  pricingGuards: {
    priceStaleMaxSec: 3,
    requireMinProfitUsdt: true,
  },
};

export type WithdrawFeeQuote = {
  asset: WithdrawAsset;
  mode: WithdrawMode;
  /** USDT fee charged via ledger (0 when asset=KRW) */
  withdrawFeeUsdt: string;
  /** KRW fee from config (informational · KRW path) */
  krwWithdrawFeeKrw: number;
  /** Fee debit split matching mode (§11.1 명세 분리) */
  feeDebitProfitUsdt: string;
  feeDebitPrincipalUsdt: string;
  /** Toast code — must surface before confirm (숨김 금지) */
  feeHintToastCode: "WITHDRAW_FEE_HINT";
  feeHintToastKo: string;
};

export type MinHoldingCheckInput = {
  userId: string;
  mode: WithdrawMode;
  debitPrincipalUsdt: string;
  now?: Date;
};

export type MinHoldingCheckResult =
  | { allowed: true; applied: false }
  | {
      allowed: true;
      applied: true;
      minHoldingHours: number;
      oldestLotConfirmedAt: string;
    }
  | {
      allowed: false;
      applied: true;
      code: "MIN_HOLDING";
      minHoldingHours: number;
      remainingHours: number;
      oldestLotConfirmedAt: string;
      toastKo: string;
    };

/** Money §41.6 · §51.11 wrong-chain / 오입금 */
export const DEPOSIT_DISPUTE_REASON_MIN = 10;

export type DepositDisputeKind = "wrong_chain" | "mis_deposit";
export type DepositDisputeStatus = "open" | "credited" | "rejected";

export type DepositDisputeV1 = {
  id: string;
  userId: string;
  kind: DepositDisputeKind;
  status: DepositDisputeStatus;
  linkedTxHash: string;
  supportCategory: "deposit";
  supportTicketId?: string;
  networkClaimedKo?: string;
  amountUsdt?: string;
  ledgerJournalId?: string;
  decidedAt?: string;
  decidedByAdminId?: string;
  decisionReason?: string;
  createdAt: string;
  updatedAt?: string;
};

export type DepositDisputeDecideResult = {
  ok: true;
  decision: "credited" | "rejected";
  dispute: DepositDisputeV1;
  journalId?: string;
  amountUsdt?: string;
  reused: boolean;
  toastCode: "DEPOSIT_DISPUTE_CREDITED" | "DEPOSIT_DISPUTE_REJECTED";
  auditAction:
    | "admin.deposit_dispute.credited"
    | "admin.deposit_dispute.rejected";
};

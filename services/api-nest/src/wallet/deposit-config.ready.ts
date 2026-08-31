/**
 * Persist-ready check for deposit_config (Money fail-closed).
 * Missing / partial / malformed row => CONFIG_NOT_READY.
 * Day-1 defaults must not keep money paths running.
 */

export const CONFIG_NOT_READY = "CONFIG_NOT_READY" as const;
export const CONFIG_NOT_READY_HTTP = 503 as const;

export const CONFIG_NOT_READY_TOAST_KO =
  "⏸️ 지금은 입금과 출금을 받을 수 없어요. 잠시 후 다시 시도해 주세요";

export const DEPOSIT_CONFIG_REQUIRED_PATHS = [
  "config_version",
  "krw.bankName",
  "krw.accountNumber",
  "krw.accountHolder",
  "krw.noticeKo",
  "krw.krwWithdrawFeeKrw",
  "usdt_onchain.network",
  "usdt_onchain.tronGridBaseUrl",
  "usdt_onchain.chainWatcherMode",
  "usdt_onchain.usdtUiConfirmations",
  "usdt_onchain.usdtLedgerConfirmations",
  "usdt_onchain.usdtContract",
  "usdt_onchain.hotWalletXpubRef",
  "usdt_onchain.treasuryHotAddressRef",
  "usdt_onchain.energyDelegateEnabled",
  "usdt_onchain.usdtWithdrawNetworkFeeUsdt",
  "usdt_onchain.minTrxStakeForSweeper",
  "usdt_onchain.sweeperPaused",
  "withdraw_guards.minHoldingHours",
  "pricing_guards.priceStaleMaxSec",
  "pricing_guards.requireMinProfitUsdt",
  "updated_at",
  "updated_by_admin_id",
] as const;

export const USDT_CONTRACT_TRC20 = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

export type DepositConfigNotReadyReason =
  | "missing_row"
  | "partial"
  | "malformed";

export class DepositConfigNotReadyError extends Error {
  readonly code = CONFIG_NOT_READY;
  readonly reason: string;

  constructor(reason: string) {
    super(CONFIG_NOT_READY);
    this.name = "DepositConfigNotReadyError";
    this.reason = reason;
  }
}

export type PersistedDepositConfigV1 = {
  configVersion: number;
  krw: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    noticeKo: string;
    krwWithdrawFeeKrw: number;
  };
  usdtOnchain: {
    network: "TRC20";
    tronGridBaseUrl: string;
    tronGridApiKey?: string;
    chainWatcherMode: "event_stream";
    usdtUiConfirmations: 1;
    usdtLedgerConfirmations: 19;
    usdtContract: typeof USDT_CONTRACT_TRC20;
    hotWalletXpubRef: string;
    treasuryHotAddressRef: string;
    energyDelegateEnabled: boolean;
    usdtWithdrawNetworkFeeUsdt: string;
    minTrxStakeForSweeper: string;
    sweeperPaused: boolean;
  };
  withdrawGuards: { minHoldingHours: number };
  pricingGuards: { priceStaleMaxSec: number; requireMinProfitUsdt: true };
  updatedAt: string;
  updatedByAdminId: string;
};

export function configNotReadyBody(reason: string): {
  code: typeof CONFIG_NOT_READY;
  toastCode: typeof CONFIG_NOT_READY;
  toastKo: string;
  statusCode: 503;
  reason: string;
} {
  return {
    code: CONFIG_NOT_READY,
    toastCode: CONFIG_NOT_READY,
    toastKo: CONFIG_NOT_READY_TOAST_KO,
    statusCode: 503,
    reason,
  };
}

function notReady(kind: "partial" | "malformed", path: string): never {
  throw new DepositConfigNotReadyError(kind + ":" + path);
}

/** Persisted row only. Missing or invalid fields are not filled from defaults. */
export function parsePersistedDepositConfig(
  row: unknown,
): PersistedDepositConfigV1 {
  if (row == null) {
    throw new DepositConfigNotReadyError("missing_row");
  }
  const root = requireObject(row, "row");
  const krw = requireObject(root.krw, "krw");
  const onchain = requireObject(root.usdt_onchain, "usdt_onchain");
  const withdrawGuards = requireObject(root.withdraw_guards, "withdraw_guards");
  const pricingGuards = requireObject(root.pricing_guards, "pricing_guards");

  const configVersion = requireInt(root.config_version, "config_version", 1);
  const krwWithdrawFeeKrw = requireInt(
    krw.krwWithdrawFeeKrw,
    "krw.krwWithdrawFeeKrw",
    0,
  );
  const minHoldingHours = requireInt(
    withdrawGuards.minHoldingHours,
    "withdraw_guards.minHoldingHours",
    0,
  );
  const priceStaleMaxSec = requireInt(
    pricingGuards.priceStaleMaxSec,
    "pricing_guards.priceStaleMaxSec",
    1,
  );

  if (onchain.network !== "TRC20") {
    notReady("malformed", "usdt_onchain.network");
  }
  if (onchain.chainWatcherMode !== "event_stream") {
    notReady("malformed", "usdt_onchain.chainWatcherMode");
  }
  if (
    requireInt(onchain.usdtUiConfirmations, "usdt_onchain.usdtUiConfirmations", 1) !==
    1
  ) {
    notReady("malformed", "usdt_onchain.usdtUiConfirmations");
  }
  if (
    requireInt(
      onchain.usdtLedgerConfirmations,
      "usdt_onchain.usdtLedgerConfirmations",
      1,
    ) !== 19
  ) {
    notReady("malformed", "usdt_onchain.usdtLedgerConfirmations");
  }
  if (onchain.usdtContract !== USDT_CONTRACT_TRC20) {
    notReady("malformed", "usdt_onchain.usdtContract");
  }
  if (pricingGuards.requireMinProfitUsdt !== true) {
    notReady("malformed", "pricing_guards.requireMinProfitUsdt");
  }

  const tronGridBaseUrl = requireNonEmptyString(
    onchain.tronGridBaseUrl,
    "usdt_onchain.tronGridBaseUrl",
  );
  if (!/^https?:\/\//.test(tronGridBaseUrl)) {
    notReady("malformed", "usdt_onchain.tronGridBaseUrl");
  }

  const fee = requireDecimalString(
    onchain.usdtWithdrawNetworkFeeUsdt,
    "usdt_onchain.usdtWithdrawNetworkFeeUsdt",
  );
  const minTrx = requireDecimalString(
    onchain.minTrxStakeForSweeper,
    "usdt_onchain.minTrxStakeForSweeper",
  );

  const parsed: PersistedDepositConfigV1 = {
    configVersion,
    krw: {
      bankName: requireString(krw.bankName, "krw.bankName"),
      accountNumber: requireString(krw.accountNumber, "krw.accountNumber"),
      accountHolder: requireString(krw.accountHolder, "krw.accountHolder"),
      noticeKo: requireString(krw.noticeKo, "krw.noticeKo"),
      krwWithdrawFeeKrw,
    },
    usdtOnchain: {
      network: "TRC20",
      tronGridBaseUrl,
      chainWatcherMode: "event_stream",
      usdtUiConfirmations: 1,
      usdtLedgerConfirmations: 19,
      usdtContract: USDT_CONTRACT_TRC20,
      hotWalletXpubRef: requireNonEmptyString(
        onchain.hotWalletXpubRef,
        "usdt_onchain.hotWalletXpubRef",
      ),
      treasuryHotAddressRef: requireNonEmptyString(
        onchain.treasuryHotAddressRef,
        "usdt_onchain.treasuryHotAddressRef",
      ),
      energyDelegateEnabled: requireBoolean(
        onchain.energyDelegateEnabled,
        "usdt_onchain.energyDelegateEnabled",
      ),
      usdtWithdrawNetworkFeeUsdt: fee,
      minTrxStakeForSweeper: minTrx,
      sweeperPaused: requireBoolean(
        onchain.sweeperPaused,
        "usdt_onchain.sweeperPaused",
      ),
    },
    withdrawGuards: { minHoldingHours },
    pricingGuards: { priceStaleMaxSec, requireMinProfitUsdt: true },
    updatedAt: toIso(root.updated_at, "updated_at"),
    updatedByAdminId: requireNonEmptyString(
      root.updated_by_admin_id,
      "updated_by_admin_id",
    ),
  };

  if (onchain.tronGridApiKey !== undefined) {
    parsed.usdtOnchain.tronGridApiKey = requireString(
      onchain.tronGridApiKey,
      "usdt_onchain.tronGridApiKey",
    );
  }
  return parsed;
}

function requireObject(value: unknown, path: string): Record<string, unknown> {
  if (value == null) notReady("partial", path);
  if (typeof value !== "object" || Array.isArray(value)) {
    notReady("malformed", path);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    if (value == null) notReady("partial", path);
    notReady("malformed", path);
  }
  return value;
}

function requireNonEmptyString(value: unknown, path: string): string {
  const s = requireString(value, path);
  if (s.length < 1) notReady("partial", path);
  return s;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    if (value == null) notReady("partial", path);
    notReady("malformed", path);
  }
  return value;
}

function requireInt(value: unknown, path: string, min: number): number {
  if (value == null) notReady("partial", path);
  const n =
    typeof value === "string" && /^-?\d+$/.test(value) ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min) {
    notReady("malformed", path);
  }
  return n;
}

function requireDecimalString(value: unknown, path: string): string {
  if (value == null) notReady("partial", path);
  if (typeof value !== "string" || !/^[0-9]+(\.[0-9]+)?$/.test(value)) {
    notReady("malformed", path);
  }
  return value;
}

function toIso(value: unknown, path: string): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) notReady("malformed", path);
    return value.toISOString();
  }
  if (typeof value === "string" && value.length > 0) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) notReady("malformed", path);
    return d.toISOString();
  }
  if (value == null) notReady("partial", path);
  notReady("malformed", path);
}

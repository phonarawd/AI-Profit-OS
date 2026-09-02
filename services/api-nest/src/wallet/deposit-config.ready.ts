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
      bankName: requireNonEmptyTrimmedString(krw.bankName, "krw.bankName"),
      accountNumber: requireNonEmptyTrimmedString(
        krw.accountNumber,
        "krw.accountNumber",
      ),
      accountHolder: requireNonEmptyTrimmedString(
        krw.accountHolder,
        "krw.accountHolder",
      ),
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

  if (
    onchain.tronGridApiKey !== undefined &&
    onchain.tronGridApiKey !== null &&
    String(onchain.tronGridApiKey).trim() !== ""
  ) {
    notReady("malformed", "usdt_onchain.tronGridApiKey_forbidden");
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

function requireNonEmptyTrimmedString(value: unknown, path: string): string {
  const s = requireString(value, path).trim();
  if (s.length < 1) notReady("partial", path);
  return s;
}

export function toDepositConfigRow(cfg: PersistedDepositConfigV1): {
  config_version: number;
  krw: PersistedDepositConfigV1["krw"];
  usdt_onchain: PersistedDepositConfigV1["usdtOnchain"];
  withdraw_guards: PersistedDepositConfigV1["withdrawGuards"];
  pricing_guards: PersistedDepositConfigV1["pricingGuards"];
  updated_at: Date;
  updated_by_admin_id: string;
} {
  return {
    config_version: cfg.configVersion,
    krw: cfg.krw,
    usdt_onchain: cfg.usdtOnchain,
    withdraw_guards: cfg.withdrawGuards,
    pricing_guards: cfg.pricingGuards,
    updated_at: new Date(cfg.updatedAt),
    updated_by_admin_id: cfg.updatedByAdminId,
  };
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

export type DepositConfigRow = {
  config_version: number;
  krw: PersistedDepositConfigV1["krw"];
  usdt_onchain: PersistedDepositConfigV1["usdtOnchain"];
  withdraw_guards: PersistedDepositConfigV1["withdrawGuards"];
  pricing_guards: PersistedDepositConfigV1["pricingGuards"];
  updated_at: Date;
  updated_by_admin_id: string;
};

export type DepositConfigAuthoritativePatch = {
  updatedByAdminId: string;
  changeReason: string;
  krw?: Partial<PersistedDepositConfigV1["krw"]>;
  usdtOnchain?: Partial<
    Omit<
      PersistedDepositConfigV1["usdtOnchain"],
      | "network"
      | "chainWatcherMode"
      | "usdtUiConfirmations"
      | "usdtLedgerConfirmations"
      | "usdtContract"
    >
  >;
  withdrawGuards?: Partial<PersistedDepositConfigV1["withdrawGuards"]>;
  pricingGuards?: Partial<
    Omit<PersistedDepositConfigV1["pricingGuards"], "requireMinProfitUsdt">
  >;
};

export type DepositConfigQuerier = {
  query: (
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount?: number | null }>;
};

export type DepositConfigDb = {
  query: DepositConfigQuerier["query"];
  withTransaction: <T>(
    fn: (client: DepositConfigQuerier) => Promise<T>,
  ) => Promise<T>;
};

export class DepositConfigWriteError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "DepositConfigWriteError";
  }
}

export class DepositConfigWriteCore {
  private readonly db: DepositConfigDb;
  constructor(db: DepositConfigDb) {
    this.db = db;
  }

  async requirePersisted(): Promise<PersistedDepositConfigV1> {
    const row = await this.fetchRow();
    if (!row) throw new DepositConfigNotReadyError("missing_row");
    return parsePersistedDepositConfig(row);
  }

  async patch(
    input: DepositConfigAuthoritativePatch,
  ): Promise<PersistedDepositConfigV1> {
    if (!input.updatedByAdminId || input.updatedByAdminId.length < 1) {
      throw new DepositConfigWriteError("updatedByAdminId required");
    }
    if (!input.changeReason || input.changeReason.trim().length < 4) {
      throw new DepositConfigWriteError("changeReason minLength 4");
    }

    const existingRow = await this.fetchRow();
    const inspected = inspectPersistedRow(existingRow);
    const next =
      inspected.kind === "valid"
        ? mergePatch(inspected.parsed, input)
        : buildExplicitAuthoritativeConfig(
            input,
            nextAuthoritativeVersion(existingRow),
          );
    assertConfig(next);
    assertAuthoritativePersist(next);

    const saved = await this.db.withTransaction(async (client) => {
      const existing = await client.query(
        `SELECT id FROM public.deposit_config WHERE id = 1 FOR UPDATE`,
      );
      const params = [
        next.configVersion,
        JSON.stringify(next.krw),
        JSON.stringify(next.usdtOnchain),
        JSON.stringify(next.withdrawGuards),
        JSON.stringify(next.pricingGuards),
        input.updatedByAdminId,
      ];

      let row: DepositConfigRow;
      if (existing.rows[0]) {
        const upd = await client.query(
          `UPDATE public.deposit_config SET
             config_version = $1,
             krw = $2::jsonb,
             usdt_onchain = $3::jsonb,
             withdraw_guards = $4::jsonb,
             pricing_guards = $5::jsonb,
             updated_at = now(),
             updated_by_admin_id = $6::uuid
           WHERE id = 1
           RETURNING config_version, krw, usdt_onchain, withdraw_guards,
                     pricing_guards, updated_at, updated_by_admin_id::text`,
          params,
        );
        row = upd.rows[0] as DepositConfigRow;
      } else {
        const ins = await client.query(
          `INSERT INTO public.deposit_config (
             id, config_version, krw, usdt_onchain, withdraw_guards,
             pricing_guards, updated_by_admin_id
           ) VALUES (
             1, $1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6::uuid
           )
           RETURNING config_version, krw, usdt_onchain, withdraw_guards,
                     pricing_guards, updated_at, updated_by_admin_id::text`,
          params,
        );
        row = ins.rows[0] as DepositConfigRow;
      }

      await client.query(
        `INSERT INTO public.deposit_config_audit (
           config_version, previous_payload, next_payload,
           changed_by_admin_id, change_reason
         ) VALUES ($1, $2::jsonb, $3::jsonb, $4::uuid, $5)`,
        [
          row.config_version,
          JSON.stringify(inspected.kind === "valid" ? inspected.parsed : null),
          JSON.stringify(next),
          input.updatedByAdminId,
          input.changeReason.trim(),
        ],
      );
      return row;
    });

    return parsePersistedDepositConfig(saved);
  }

  async fetchRow(): Promise<DepositConfigRow | null> {
    const r = await this.db.query(
      `SELECT config_version, krw, usdt_onchain, withdraw_guards,
              pricing_guards, updated_at, updated_by_admin_id::text
         FROM public.deposit_config WHERE id = 1`,
    );
    return (r.rows[0] as DepositConfigRow | undefined) ?? null;
  }
}

export function inspectPersistedRow(
  row: DepositConfigRow | null,
):
  | { kind: "missing" }
  | { kind: "unusable" }
  | { kind: "valid"; parsed: PersistedDepositConfigV1 } {
  if (!row) return { kind: "missing" };
  try {
    return { kind: "valid", parsed: parsePersistedDepositConfig(row) };
  } catch (err) {
    if (err instanceof DepositConfigNotReadyError) {
      return { kind: "unusable" };
    }
    throw err;
  }
}

export function nextAuthoritativeVersion(row: DepositConfigRow | null): number {
  const n = Number(row?.config_version);
  if (!Number.isInteger(n) || n < 1) return 1;
  return n + 1;
}

export function requireExplicit<T>(value: T | undefined, path: string): T {
  if (value === undefined) {
    throw new DepositConfigWriteError(
      "explicit " + path + " required to persist authoritative deposit_config",
    );
  }
  return value;
}

export function buildExplicitAuthoritativeConfig(
  input: DepositConfigAuthoritativePatch,
  configVersion: number,
): PersistedDepositConfigV1 {
  const krwIn = requireExplicit(input.krw, "krw");
  const usdtIn = requireExplicit(input.usdtOnchain, "usdtOnchain");
  const wgIn = requireExplicit(input.withdrawGuards, "withdrawGuards");
  const pgIn = requireExplicit(input.pricingGuards, "pricingGuards");
  const next: PersistedDepositConfigV1 = {
    configVersion,
    krw: {
      bankName: requireExplicit(krwIn.bankName, "krw.bankName"),
      accountNumber: requireExplicit(krwIn.accountNumber, "krw.accountNumber"),
      accountHolder: requireExplicit(krwIn.accountHolder, "krw.accountHolder"),
      noticeKo: requireExplicit(krwIn.noticeKo, "krw.noticeKo"),
      krwWithdrawFeeKrw: requireExplicit(
        krwIn.krwWithdrawFeeKrw,
        "krw.krwWithdrawFeeKrw",
      ),
    },
    usdtOnchain: {
      network: "TRC20",
      tronGridBaseUrl: requireExplicit(
        usdtIn.tronGridBaseUrl,
        "usdtOnchain.tronGridBaseUrl",
      ),
      chainWatcherMode: "event_stream",
      usdtUiConfirmations: 1,
      usdtLedgerConfirmations: 19,
      usdtContract: USDT_CONTRACT_TRC20,
      hotWalletXpubRef: requireExplicit(
        usdtIn.hotWalletXpubRef,
        "usdtOnchain.hotWalletXpubRef",
      ),
      treasuryHotAddressRef: requireExplicit(
        usdtIn.treasuryHotAddressRef,
        "usdtOnchain.treasuryHotAddressRef",
      ),
      energyDelegateEnabled: requireExplicit(
        usdtIn.energyDelegateEnabled,
        "usdtOnchain.energyDelegateEnabled",
      ),
      usdtWithdrawNetworkFeeUsdt: requireExplicit(
        usdtIn.usdtWithdrawNetworkFeeUsdt,
        "usdtOnchain.usdtWithdrawNetworkFeeUsdt",
      ),
      minTrxStakeForSweeper: requireExplicit(
        usdtIn.minTrxStakeForSweeper,
        "usdtOnchain.minTrxStakeForSweeper",
      ),
      sweeperPaused: requireExplicit(
        usdtIn.sweeperPaused,
        "usdtOnchain.sweeperPaused",
      ),
    },
    withdrawGuards: {
      minHoldingHours: requireExplicit(
        wgIn.minHoldingHours,
        "withdrawGuards.minHoldingHours",
      ),
    },
    pricingGuards: {
      priceStaleMaxSec: requireExplicit(
        pgIn.priceStaleMaxSec,
        "pricingGuards.priceStaleMaxSec",
      ),
      requireMinProfitUsdt: true,
    },
    updatedAt: new Date().toISOString(),
    updatedByAdminId: input.updatedByAdminId,
  };
  if (
    usdtIn.tronGridApiKey !== undefined &&
    usdtIn.tronGridApiKey !== null &&
    String(usdtIn.tronGridApiKey).trim() !== ""
  ) {
    throw new Error("usdt_onchain.tronGridApiKey_forbidden");
  }
  return next;
}

export function assertAuthoritativePersist(cfg: PersistedDepositConfigV1): void {
  try {
    parsePersistedDepositConfig(toDepositConfigRow(cfg));
  } catch (err) {
    if (err instanceof DepositConfigNotReadyError) {
      throw new DepositConfigWriteError(
        "deposit_config not authoritative: " + err.reason,
      );
    }
    throw err;
  }
}

export function mergePatch(
  current: PersistedDepositConfigV1,
  input: DepositConfigAuthoritativePatch,
): PersistedDepositConfigV1 {
  return {
    configVersion: current.configVersion + 1,
    krw: { ...current.krw, ...(input.krw ?? {}) },
    usdtOnchain: {
      ...current.usdtOnchain,
      ...(input.usdtOnchain ?? {}),
      network: "TRC20",
      chainWatcherMode: "event_stream",
      usdtUiConfirmations: 1,
      usdtLedgerConfirmations: 19,
      usdtContract: USDT_CONTRACT_TRC20,
    },
    withdrawGuards: {
      ...current.withdrawGuards,
      ...(input.withdrawGuards ?? {}),
    },
    pricingGuards: {
      priceStaleMaxSec:
        input.pricingGuards?.priceStaleMaxSec ??
        current.pricingGuards.priceStaleMaxSec,
      requireMinProfitUsdt: true,
    },
    updatedAt: new Date().toISOString(),
    updatedByAdminId: input.updatedByAdminId,
  };
}

export function assertConfig(cfg: PersistedDepositConfigV1): void {
  if (!cfg.krw.bankName || cfg.krw.bankName.trim().length < 1) {
    throw new DepositConfigWriteError("krw.bankName required");
  }
  if (!cfg.krw.accountNumber || cfg.krw.accountNumber.trim().length < 1) {
    throw new DepositConfigWriteError("krw.accountNumber required");
  }
  if (!cfg.krw.accountHolder || cfg.krw.accountHolder.trim().length < 1) {
    throw new DepositConfigWriteError("krw.accountHolder required");
  }
  if (typeof cfg.krw.noticeKo !== "string") {
    throw new DepositConfigWriteError("krw.noticeKo required");
  }
  cfg.krw.bankName = cfg.krw.bankName.trim();
  cfg.krw.accountNumber = cfg.krw.accountNumber.trim();
  cfg.krw.accountHolder = cfg.krw.accountHolder.trim();
  if (
    !Number.isInteger(cfg.krw.krwWithdrawFeeKrw) ||
    cfg.krw.krwWithdrawFeeKrw < 0
  ) {
    throw new DepositConfigWriteError("krw.krwWithdrawFeeKrw must be integer >=0");
  }
  if (!/^[0-9]+(\.[0-9]+)?$/.test(cfg.usdtOnchain.usdtWithdrawNetworkFeeUsdt)) {
    throw new DepositConfigWriteError(
      "usdtOnchain.usdtWithdrawNetworkFeeUsdt must be decimal string",
    );
  }
  if (!/^[0-9]+(\.[0-9]+)?$/.test(cfg.usdtOnchain.minTrxStakeForSweeper)) {
    throw new DepositConfigWriteError(
      "usdtOnchain.minTrxStakeForSweeper must be decimal string",
    );
  }
  if (
    !Number.isInteger(cfg.withdrawGuards.minHoldingHours) ||
    cfg.withdrawGuards.minHoldingHours < 0
  ) {
    throw new DepositConfigWriteError(
      "withdrawGuards.minHoldingHours must be integer >=0",
    );
  }
  if (
    !Number.isInteger(cfg.pricingGuards.priceStaleMaxSec) ||
    cfg.pricingGuards.priceStaleMaxSec < 1
  ) {
    throw new DepositConfigWriteError(
      "pricingGuards.priceStaleMaxSec must be integer >=1",
    );
  }
  if (cfg.usdtOnchain.chainWatcherMode !== "event_stream") {
    throw new DepositConfigWriteError("chainWatcherMode must be event_stream");
  }
  if (!cfg.usdtOnchain.hotWalletXpubRef || !cfg.usdtOnchain.treasuryHotAddressRef) {
    throw new DepositConfigWriteError(
      "hotWalletXpubRef and treasuryHotAddressRef required",
    );
  }
  if (typeof cfg.usdtOnchain.sweeperPaused !== "boolean") {
    throw new DepositConfigWriteError("usdtOnchain.sweeperPaused must be boolean");
  }
}

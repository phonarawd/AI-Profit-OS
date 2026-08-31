/**
 * Admin deposit-config singleton (Money Owns).
 * Keys: usdtWithdrawNetworkFeeUsdt / krwWithdrawFeeKrw / minHoldingHours / sweeper pause.
 * Alias compliance.minHoldingHours FORBIDDEN — only withdrawGuards.minHoldingHours.
 * Money runtime: requirePersisted only. Silent DAY1 defaults are forbidden.
 */

import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { WALLET_EVENTS } from "./wallet.events";
import {
  DAY1_DEPOSIT_CONFIG_DEFAULTS,
  type DepositConfigPatchInput,
  type DepositConfigV1,
} from "./wallet.types";
import {
  CONFIG_NOT_READY,
  DepositConfigNotReadyError,
  configNotReadyBody,
  parsePersistedDepositConfig,
} from "./deposit-config.ready";

type DepositConfigRow = {
  config_version: number;
  krw: DepositConfigV1["krw"];
  usdt_onchain: DepositConfigV1["usdtOnchain"];
  withdraw_guards: DepositConfigV1["withdrawGuards"];
  pricing_guards: DepositConfigV1["pricingGuards"];
  updated_at: Date;
  updated_by_admin_id: string;
};

@Injectable()
export class DepositConfigService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
  ) {}

  /**
   * Explicit fixture / Admin first-PATCH template only.
   * Money runtime must not call this.
   */
  day1Defaults(updatedByAdminId = "system:bootstrap"): DepositConfigV1 {
    return {
      ...structuredClone(DAY1_DEPOSIT_CONFIG_DEFAULTS),
      updatedAt: new Date(0).toISOString(),
      updatedByAdminId,
    };
  }

  /** Production-safe alias — same as requirePersisted. */
  async get(): Promise<DepositConfigV1> {
    return this.requirePersisted();
  }

  async requirePersisted(): Promise<DepositConfigV1> {
    const row = await this.fetchRow();
    if (!row) this.throwNotReady("missing_row");
    try {
      return parsePersistedDepositConfig(row);
    } catch (err) {
      if (err instanceof DepositConfigNotReadyError) {
        this.throwNotReady(err.reason);
      }
      throw err;
    }
  }

  async patch(input: DepositConfigPatchInput): Promise<DepositConfigV1> {
    if (!input.updatedByAdminId || input.updatedByAdminId.length < 1) {
      throw new BadRequestException("updatedByAdminId required");
    }
    if (!input.changeReason || input.changeReason.trim().length < 4) {
      throw new BadRequestException("changeReason minLength 4");
    }

    const current = await this.loadForAdminWrite();
    const next = this.mergePatch(current, input);
    this.assertConfig(next);

    const saved = await this.db.withTransaction(async (client) => {
      const existing = await client.query<{ id: number }>(
        `SELECT id FROM public.deposit_config WHERE id = 1 FOR UPDATE`,
      );

      const payload = {
        config_version: next.configVersion,
        krw: next.krw,
        usdt_onchain: next.usdtOnchain,
        withdraw_guards: next.withdrawGuards,
        pricing_guards: next.pricingGuards,
        updated_by_admin_id: input.updatedByAdminId,
      };

      let row: DepositConfigRow;
      if (existing.rows[0]) {
        const upd = await client.query<DepositConfigRow>(
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
          [
            payload.config_version,
            JSON.stringify(payload.krw),
            JSON.stringify(payload.usdt_onchain),
            JSON.stringify(payload.withdraw_guards),
            JSON.stringify(payload.pricing_guards),
            payload.updated_by_admin_id,
          ],
        );
        row = upd.rows[0];
      } else {
        const ins = await client.query<DepositConfigRow>(
          `INSERT INTO public.deposit_config (
             id, config_version, krw, usdt_onchain, withdraw_guards,
             pricing_guards, updated_by_admin_id
           ) VALUES (
             1, $1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6::uuid
           )
           RETURNING config_version, krw, usdt_onchain, withdraw_guards,
                     pricing_guards, updated_at, updated_by_admin_id::text`,
          [
            payload.config_version,
            JSON.stringify(payload.krw),
            JSON.stringify(payload.usdt_onchain),
            JSON.stringify(payload.withdraw_guards),
            JSON.stringify(payload.pricing_guards),
            payload.updated_by_admin_id,
          ],
        );
        row = ins.rows[0];
      }

      await client.query(
        `INSERT INTO public.deposit_config_audit (
           config_version, previous_payload, next_payload,
           changed_by_admin_id, change_reason
         ) VALUES ($1, $2::jsonb, $3::jsonb, $4::uuid, $5)`,
        [
          row.config_version,
          JSON.stringify(current),
          JSON.stringify(this.toV1Lenient(row)),
          input.updatedByAdminId,
          input.changeReason.trim(),
        ],
      );

      return row;
    });

    const v1 = parsePersistedDepositConfig(saved);
    this.bus.emit(WALLET_EVENTS.depositConfigUpdated, {
      configVersion: v1.configVersion,
      updatedByAdminId: v1.updatedByAdminId,
      toastCode: "DEPOSIT_CONFIG_UPDATED",
    });
    return v1;
  }

  async listAudit(opts?: {
    limit?: number;
  }): Promise<
    Array<{
      id: string;
      configVersion: number;
      previousPayload: DepositConfigV1 | null;
      nextPayload: DepositConfigV1;
      changedByAdminId: string;
      changeReason: string;
      createdAt: string;
    }>
  > {
    const limit = Math.min(opts?.limit ?? 50, 200);
    const r = await this.db.query<{
      id: string;
      config_version: number;
      previous_payload: DepositConfigV1 | null;
      next_payload: DepositConfigV1;
      changed_by_admin_id: string;
      change_reason: string;
      created_at: Date;
    }>(
      `SELECT id, config_version, previous_payload, next_payload,
              changed_by_admin_id::text, change_reason, created_at
         FROM public.deposit_config_audit
        ORDER BY created_at DESC
        LIMIT $1`,
      [limit],
    );
    return r.rows.map((row) => ({
      id: row.id,
      configVersion: row.config_version,
      previousPayload: row.previous_payload,
      nextPayload: row.next_payload,
      changedByAdminId: row.changed_by_admin_id,
      changeReason: row.change_reason,
      createdAt: row.created_at.toISOString(),
    }));
  }

  private async fetchRow(): Promise<DepositConfigRow | null> {
    const r = await this.db.query<DepositConfigRow>(
      `SELECT config_version, krw, usdt_onchain, withdraw_guards,
              pricing_guards, updated_at, updated_by_admin_id::text
         FROM public.deposit_config WHERE id = 1`,
    );
    return r.rows[0] ?? null;
  }

  /**
   * Admin write merge only. Missing row uses explicit day1Defaults template.
   * Does not keep money runtime running.
   */
  private async loadForAdminWrite(): Promise<DepositConfigV1> {
    const row = await this.fetchRow();
    if (!row) return this.day1Defaults();
    try {
      return parsePersistedDepositConfig(row);
    } catch {
      return this.toV1Lenient(row);
    }
  }

  /** Lenient fill for Admin repair merge only. */
  private toV1Lenient(row: DepositConfigRow): DepositConfigV1 {
    const defaults = DAY1_DEPOSIT_CONFIG_DEFAULTS;
    const krw = {
      ...defaults.krw,
      ...(row.krw ?? {}),
      krwWithdrawFeeKrw: Number(
        row.krw?.krwWithdrawFeeKrw ?? defaults.krw.krwWithdrawFeeKrw,
      ),
    };
    const usdtOnchain = {
      ...defaults.usdtOnchain,
      ...(row.usdt_onchain ?? {}),
      network: "TRC20" as const,
      chainWatcherMode: "event_stream" as const,
      usdtUiConfirmations: 1 as const,
      usdtLedgerConfirmations: 19 as const,
      usdtContract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" as const,
      usdtWithdrawNetworkFeeUsdt: String(
        row.usdt_onchain?.usdtWithdrawNetworkFeeUsdt ??
          defaults.usdtOnchain.usdtWithdrawNetworkFeeUsdt,
      ),
      minTrxStakeForSweeper: String(
        row.usdt_onchain?.minTrxStakeForSweeper ??
          defaults.usdtOnchain.minTrxStakeForSweeper,
      ),
      energyDelegateEnabled:
        row.usdt_onchain?.energyDelegateEnabled ??
        defaults.usdtOnchain.energyDelegateEnabled,
      sweeperPaused:
        row.usdt_onchain?.sweeperPaused ??
        defaults.usdtOnchain.sweeperPaused ??
        false,
    };
    const withdrawGuards = {
      minHoldingHours: Number(
        row.withdraw_guards?.minHoldingHours ??
          defaults.withdrawGuards.minHoldingHours,
      ),
    };
    const pricingGuards = {
      priceStaleMaxSec: Number(
        row.pricing_guards?.priceStaleMaxSec ??
          defaults.pricingGuards.priceStaleMaxSec,
      ),
      requireMinProfitUsdt: true as const,
    };
    return {
      configVersion: row.config_version,
      krw,
      usdtOnchain,
      withdrawGuards,
      pricingGuards,
      updatedAt: row.updated_at.toISOString(),
      updatedByAdminId: row.updated_by_admin_id,
    };
  }

  private mergePatch(
    current: DepositConfigV1,
    input: DepositConfigPatchInput,
  ): DepositConfigV1 {
    const isBootstrap = current.updatedByAdminId === "system:bootstrap";
    return {
      configVersion: isBootstrap ? 1 : current.configVersion + 1,
      krw: { ...current.krw, ...(input.krw ?? {}) },
      usdtOnchain: {
        ...current.usdtOnchain,
        ...(input.usdtOnchain ?? {}),
        network: "TRC20",
        chainWatcherMode: "event_stream",
        usdtUiConfirmations: 1,
        usdtLedgerConfirmations: 19,
        usdtContract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
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

  private assertConfig(cfg: DepositConfigV1): void {
    if (
      !Number.isInteger(cfg.krw.krwWithdrawFeeKrw) ||
      cfg.krw.krwWithdrawFeeKrw < 0
    ) {
      throw new BadRequestException("krw.krwWithdrawFeeKrw must be integer >=0");
    }
    if (!/^[0-9]+(\.[0-9]+)?$/.test(cfg.usdtOnchain.usdtWithdrawNetworkFeeUsdt)) {
      throw new BadRequestException(
        "usdtOnchain.usdtWithdrawNetworkFeeUsdt must be decimal string",
      );
    }
    if (!/^[0-9]+(\.[0-9]+)?$/.test(cfg.usdtOnchain.minTrxStakeForSweeper)) {
      throw new BadRequestException(
        "usdtOnchain.minTrxStakeForSweeper must be decimal string",
      );
    }
    if (
      !Number.isInteger(cfg.withdrawGuards.minHoldingHours) ||
      cfg.withdrawGuards.minHoldingHours < 0
    ) {
      throw new BadRequestException(
        "withdrawGuards.minHoldingHours must be integer >=0",
      );
    }
    if (
      !Number.isInteger(cfg.pricingGuards.priceStaleMaxSec) ||
      cfg.pricingGuards.priceStaleMaxSec < 1
    ) {
      throw new BadRequestException(
        "pricingGuards.priceStaleMaxSec must be integer >=1",
      );
    }
    if (cfg.usdtOnchain.chainWatcherMode !== "event_stream") {
      throw new BadRequestException("chainWatcherMode must be event_stream");
    }
    if (!cfg.usdtOnchain.hotWalletXpubRef || !cfg.usdtOnchain.treasuryHotAddressRef) {
      throw new BadRequestException("hotWalletXpubRef and treasuryHotAddressRef required");
    }
    if (typeof cfg.usdtOnchain.sweeperPaused !== "boolean") {
      throw new BadRequestException("usdtOnchain.sweeperPaused must be boolean");
    }
  }

  /**
   * System auto-pause when Treasury TRX < min.
   * Admin resume = PATCH sweeperPaused:false + changeReason (audit).
   * Missing config => CONFIG_NOT_READY (no insert).
   */
  async systemPauseSweeper(input: { reason: string }): Promise<DepositConfigV1> {
    const current = await this.requirePersisted();
    if (current.usdtOnchain.sweeperPaused === true) {
      return current;
    }
    return this.patch({
      updatedByAdminId: "00000000-0000-4000-8000-000000000043",
      changeReason: `system:sweeper-trx-guard ${input.reason}`.slice(0, 500),
      usdtOnchain: { sweeperPaused: true },
    });
  }

  private throwNotReady(reason: string): never {
    throw new ServiceUnavailableException(configNotReadyBody(reason));
  }
}

export { CONFIG_NOT_READY };

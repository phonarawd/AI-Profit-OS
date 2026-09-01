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
  DepositConfigWriteCore,
  DepositConfigWriteError,
  configNotReadyBody,
} from "./deposit-config.ready";
import {
  projectSafeKrwDepositInstructions,
  type SafeKrwDepositInstructions,
} from "./deposit-config.safe-krw";

@Injectable()
export class DepositConfigService {
  private readonly write: DepositConfigWriteCore;

  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
  ) {
    this.write = new DepositConfigWriteCore(db);
  }

  /**
   * Explicit fixture / non-authoritative template only.
   * Money runtime and Admin persist must not call this.
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
    try {
      return await this.write.requirePersisted();
    } catch (err) {
      if (err instanceof DepositConfigNotReadyError) {
        this.throwNotReady(err.reason);
      }
      throw err;
    }
  }

  /** 세션 유저 전용. Production insert/backfill 0. 행 없으면 CONFIG_NOT_READY. */
  async getSafeKrwDepositInstructions(): Promise<SafeKrwDepositInstructions> {
    const cfg = await this.requirePersisted();
    try {
      return projectSafeKrwDepositInstructions(cfg);
    } catch {
      this.throwNotReady("partial:krw.safe_instructions");
    }
  }

  async patch(input: DepositConfigPatchInput): Promise<DepositConfigV1> {
    try {
      const v1 = await this.write.patch(input);
      this.bus.emit(WALLET_EVENTS.depositConfigUpdated, {
        configVersion: v1.configVersion,
        updatedByAdminId: v1.updatedByAdminId,
        toastCode: "DEPOSIT_CONFIG_UPDATED",
      });
      return v1;
    } catch (err) {
      if (err instanceof DepositConfigWriteError) {
        throw new BadRequestException(err.message);
      }
      if (err instanceof DepositConfigNotReadyError) {
        this.throwNotReady(err.reason);
      }
      throw err;
    }
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

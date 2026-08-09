/**
 * Engine §0.0.4.3 — platform_reserve target · audit · S2 input
 * Admin UI = /admin/system-control?tab=reserve
 */

import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { InProcessEventBus } from "../events/in-process.bus";
import { PLATFORM_RESERVE_EVENTS } from "./simulation.events";
import { PLATFORM_RESERVE_ACCOUNT_CODE } from "./simulation.types";
import type { PlatformReservePutInput } from "./simulation.types";

type ConfigRow = {
  target_usdt: string;
  is_set: boolean;
  updated_by_admin_id: string | null;
  change_reason: string | null;
  updated_at: Date;
};

@Injectable()
export class PlatformReserveAdminService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
  ) {}

  async get(): Promise<{
    accountCode: typeof PLATFORM_RESERVE_ACCOUNT_CODE;
    targetUsdt: string;
    isSet: boolean;
    balanceUsdt: string;
    updatedByAdminId: string | null;
    changeReason: string | null;
    updatedAt: string | null;
    s2Input: true;
  }> {
    const cfg = await this.fetchConfig();
    const balanceUsdt = await this.fetchBalance();
    return {
      accountCode: PLATFORM_RESERVE_ACCOUNT_CODE,
      targetUsdt: cfg?.target_usdt ?? "0",
      isSet: cfg?.is_set === true,
      balanceUsdt,
      updatedByAdminId: cfg?.updated_by_admin_id ?? null,
      changeReason: cfg?.change_reason ?? null,
      updatedAt: cfg?.updated_at ? cfg.updated_at.toISOString() : null,
      s2Input: true,
    };
  }

  /** Shape consumed by simulation S2 */
  async asS2Input(): Promise<{
    isSet: boolean;
    targetUsdt: string | null;
    balanceUsdt: string;
  }> {
    const g = await this.get();
    return {
      isSet: g.isSet,
      targetUsdt: g.isSet ? g.targetUsdt : null,
      balanceUsdt: g.balanceUsdt,
    };
  }

  async put(input: PlatformReservePutInput) {
    if (!input.updatedByAdminId || input.updatedByAdminId.length < 1) {
      throw new BadRequestException("updatedByAdminId required");
    }
    if (!input.changeReason || input.changeReason.trim().length < 4) {
      throw new BadRequestException("changeReason minLength 4");
    }
    const target = String(input.targetUsdt ?? "").trim();
    if (!/^[0-9]+(\.[0-9]+)?$/.test(target)) {
      throw new BadRequestException("targetUsdt must be non-negative decimal");
    }
    if (Number(target) < 0) {
      throw new BadRequestException("targetUsdt must be >= 0");
    }

    const previous = await this.get();
    await this.db.withTransaction(async (client) => {
      await client.query(
        `INSERT INTO public.platform_reserve_config (id, target_usdt, is_set, updated_by_admin_id, change_reason, updated_at)
         VALUES (1, $1::numeric, true, $2::uuid, $3, now())
         ON CONFLICT (id) DO UPDATE SET
           target_usdt = EXCLUDED.target_usdt,
           is_set = true,
           updated_by_admin_id = EXCLUDED.updated_by_admin_id,
           change_reason = EXCLUDED.change_reason,
           updated_at = now()`,
        [target, input.updatedByAdminId, input.changeReason.trim()],
      );

      const nextPayload = {
        targetUsdt: target,
        isSet: true,
        accountCode: PLATFORM_RESERVE_ACCOUNT_CODE,
      };
      const prevPayload = {
        targetUsdt: previous.targetUsdt,
        isSet: previous.isSet,
        accountCode: PLATFORM_RESERVE_ACCOUNT_CODE,
      };

      await client.query(
        `INSERT INTO public.platform_reserve_audit
           (previous_payload, next_payload, changed_by_admin_id, change_reason)
         VALUES ($1::jsonb, $2::jsonb, $3::uuid, $4)`,
        [
          JSON.stringify(prevPayload),
          JSON.stringify(nextPayload),
          input.updatedByAdminId,
          input.changeReason.trim(),
        ],
      );
    });

    const next = await this.get();
    this.bus.emit(PLATFORM_RESERVE_EVENTS.updated, {
      previous,
      next,
      changedByAdminId: input.updatedByAdminId,
    });
    return next;
  }

  async audit(limit = 20) {
    const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const r = await this.db.query<{
      id: string;
      previous_payload: unknown;
      next_payload: unknown;
      changed_by_admin_id: string;
      change_reason: string;
      created_at: Date;
    }>(
      `SELECT id::text, previous_payload, next_payload,
              changed_by_admin_id::text, change_reason, created_at
         FROM public.platform_reserve_audit
        ORDER BY created_at DESC
        LIMIT $1`,
      [lim],
    );
    return {
      items: r.rows.map((row) => ({
        id: row.id,
        previous: row.previous_payload,
        next: row.next_payload,
        changedByAdminId: row.changed_by_admin_id,
        changeReason: row.change_reason,
        createdAt: row.created_at.toISOString(),
      })),
    };
  }

  private async fetchConfig(): Promise<ConfigRow | null> {
    const r = await this.db.query<ConfigRow>(
      `SELECT target_usdt::text, is_set, updated_by_admin_id::text,
              change_reason, updated_at
         FROM public.platform_reserve_config
        WHERE id = 1`,
    );
    return r.rows[0] ?? null;
  }

  private async fetchBalance(): Promise<string> {
    const r = await this.db.query<{ balance_usdt: string }>(
      `SELECT balance_usdt::text
         FROM public.ledger_accounts
        WHERE code = $1`,
      [PLATFORM_RESERVE_ACCOUNT_CODE],
    );
    return r.rows[0]?.balance_usdt ?? "0";
  }
}

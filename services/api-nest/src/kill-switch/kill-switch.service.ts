/**
 * REL-406 9종 서버 강제. UI 우회 불가.
 * wrap: money_circuit · push_control · referral_program_config.
 * GROWTH_PAUSE ON 만 growth_control 을 끈다. OFF 가 Growth ON 을 우회하지 않는다.
 */

import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import { PostgresService } from "../db/postgres";

const requireCjs = createRequire(__filename);
const killCore = requireCjs(
  join(__dirname, "..", "..", "admin-kill-switch.core.cjs"),
) as {
  KILL_SWITCH_IDS: readonly string[];
  BLOCK_CODE: string;
  defaultEngagedById: () => Record<string, boolean>;
  mergeEngaged: (
    base: Record<string, boolean> | null,
    overlay: Record<string, boolean> | null,
  ) => Record<string, boolean>;
  normalizeId: (
    raw: unknown,
  ) => { ok: true; id: string } | { ok: false; error: string };
  setMemory: (
    id: string,
    engaged: boolean,
  ) => { ok: true; id: string; engaged: boolean } | { ok: false; error: string };
  getMemory: () => Record<string, boolean>;
  evaluatePath: (
    path: string,
    engagedById: Record<string, boolean>,
  ) => { blocked: boolean; switchId: string | null; code: string | null };
  requireReason: (
    reason: unknown,
  ) => { ok: true; reason: string } | { ok: false; error: string };
};

const auditCore = requireCjs(
  join(__dirname, "..", "..", "admin-audit.core.cjs"),
) as {
  writeAuditEvent: (
    raw: unknown,
  ) => Promise<{ ok: boolean; error?: string; event?: object }>;
};

function isUndefinedTable(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      (err as { code?: string }).code === "42P01",
  );
}

@Injectable()
export class KillSwitchService {
  constructor(private readonly db: PostgresService) {}

  async snapshot(): Promise<Record<string, boolean>> {
    let state = killCore.mergeEngaged(null, killCore.getMemory());
    if (this.db.configured()) {
      try {
        const rows = await this.db.query<{ id: string; engaged: boolean }>(
          `SELECT id, engaged FROM public.admin_kill_switches`,
        );
        const fromTable: Record<string, boolean> = {};
        for (const row of rows.rows) fromTable[row.id] = row.engaged === true;
        state = killCore.mergeEngaged(state, fromTable);
      } catch (err) {
        if (!isUndefinedTable(err)) throw err;
      }
      state = killCore.mergeEngaged(state, await this.wrapOverlays());
    }
    return state;
  }

  async list() {
    const engagedById = await this.snapshot();
    return {
      version: 1 as const,
      items: killCore.KILL_SWITCH_IDS.map((id) => ({
        id,
        engaged: engagedById[id] === true,
      })),
    };
  }

  async isBlocked(path: string): Promise<boolean> {
    const decision = killCore.evaluatePath(path, await this.snapshot());
    return decision.blocked === true;
  }

  async assertPath(path: string): Promise<void> {
    const decision = killCore.evaluatePath(path, await this.snapshot());
    if (!decision.blocked) return;
    throw new ServiceUnavailableException({
      code: killCore.BLOCK_CODE,
      toastCode: killCore.BLOCK_CODE,
      statusCode: 503,
    });
  }

  async set(input: {
    id: string;
    engaged: boolean;
    reason: string;
    adminId: string;
    role: string;
  }) {
    const normalized = killCore.normalizeId(input.id);
    if (!normalized.ok) {
      throw new BadRequestException(normalized.error);
    }
    const reason = killCore.requireReason(input.reason);
    if (!reason.ok) {
      throw new BadRequestException(reason.error);
    }
    if (!input.adminId) {
      throw new BadRequestException("adminId required");
    }

    const engaged = input.engaged === true;
    killCore.setMemory(normalized.id, engaged);
    await this.persistRow(normalized.id, engaged, reason.reason, input.adminId);
    await this.syncWrap(normalized.id, engaged, reason.reason, input.adminId);

    await auditCore.writeAuditEvent({
      actorKey: input.adminId,
      actorId: input.adminId,
      role: input.role || "unknown",
      action: "KillSwitchAdminController.put",
      targetType: "kill_switch",
      targetId: normalized.id,
      mode: "LIVE",
      result: "applied",
      reason: reason.reason,
      payload: { engaged },
    });

    return {
      id: normalized.id,
      engaged,
      items: (await this.list()).items,
    };
  }

  private async persistRow(
    id: string,
    engaged: boolean,
    reason: string,
    adminId: string,
  ): Promise<void> {
    if (!this.db.configured()) return;
    try {
      await this.db.query(
        `INSERT INTO public.admin_kill_switches (
           id, engaged, reason, updated_by_admin_id, updated_at
         ) VALUES ($1, $2, $3, $4::uuid, now())
         ON CONFLICT (id) DO UPDATE SET
           engaged = EXCLUDED.engaged,
           reason = EXCLUDED.reason,
           updated_by_admin_id = EXCLUDED.updated_by_admin_id,
           updated_at = now()`,
        [id, engaged, reason, adminId],
      );
    } catch (err) {
      if (!isUndefinedTable(err)) throw err;
    }
  }

  private async wrapOverlays(): Promise<Record<string, boolean>> {
    const overlay: Record<string, boolean> = {};
    try {
      const circuit = await this.db.query<{ open: boolean }>(
        `SELECT open FROM public.money_circuit WHERE id = 1`,
      );
      if (circuit.rows[0]) overlay.MONEY_CIRCUIT = circuit.rows[0].open === true;
    } catch (err) {
      if (!isUndefinedTable(err)) throw err;
    }
    if (process.env.PUSH_ENABLED === "false") overlay.PUSH_KILL = true;
    try {
      const push = await this.db.query<{ push_enabled: boolean }>(
        `SELECT push_enabled FROM public.push_control WHERE id = 1`,
      );
      if (push.rows[0]) overlay.PUSH_KILL = push.rows[0].push_enabled !== true;
    } catch (err) {
      if (!isUndefinedTable(err)) throw err;
    }
    try {
      const referral = await this.db.query<{ accrual_halted: boolean }>(
        `SELECT accrual_halted FROM public.referral_program_config WHERE id = 1`,
      );
      if (referral.rows[0]) {
        overlay.REFERRAL_ACCRUAL_HALT = referral.rows[0].accrual_halted === true;
      }
    } catch (err) {
      if (!isUndefinedTable(err)) throw err;
    }
    return overlay;
  }

  private async syncWrap(
    id: string,
    engaged: boolean,
    reason: string,
    adminId: string,
  ): Promise<void> {
    if (!this.db.configured()) return;
    try {
      if (id === "MONEY_CIRCUIT") {
        if (engaged) {
          await this.db.query(
            `UPDATE public.money_circuit
                SET open = true,
                    reason_code = 'KILL_SWITCH',
                    detail = $1,
                    opened_at = COALESCE(opened_at, now()),
                    updated_at = now()
              WHERE id = 1`,
            [reason],
          );
        } else {
          await this.db.query(
            `UPDATE public.money_circuit
                SET open = false,
                    reason_code = NULL,
                    detail = NULL,
                    opened_at = NULL,
                    updated_at = now()
              WHERE id = 1`,
          );
        }
      }
      if (id === "PUSH_KILL") {
        await this.db.query(
          `UPDATE public.push_control
              SET push_enabled = $1,
                  reason = $2,
                  updated_by_admin_id = $3::uuid,
                  updated_at = now()
            WHERE id = 1`,
          [engaged !== true, reason, adminId],
        );
      }
      if (id === "GROWTH_PAUSE" && engaged) {
        await this.db.query(
          `UPDATE public.growth_control
              SET enabled = false,
                  change_reason = $1,
                  updated_by_admin_id = $2::uuid,
                  updated_at = now()
            WHERE id = 1`,
          [reason, adminId],
        );
      }
      if (id === "REFERRAL_ACCRUAL_HALT") {
        await this.db.query(
          `UPDATE public.referral_program_config
              SET accrual_halted = $1,
                  updated_by_admin_id = $2::uuid,
                  updated_at = now()
            WHERE id = 1`,
          [engaged, adminId],
        );
      }
    } catch (err) {
      if (!isUndefinedTable(err)) throw err;
    }
  }
}

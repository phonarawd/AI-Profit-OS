/**
 * Referral program config singleton · Money §51.5
 * Day-1 rewardsEnabled=false (0원 런칭) · invite ∞ · capPerReferrerMonth FORBIDDEN
 */

import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { KillSwitchService } from "../kill-switch/kill-switch.service";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { REFERRAL_EVENTS } from "./referral.events";
import {
  DAY1_REFERRAL_PROGRAM_DEFAULTS,
  REFERRAL_FORBIDDEN_CONFIG_KEYS,
  type ReferralProgramConfig,
  type ReferralProgramPatchInput,
} from "./referral.types";

type ConfigRow = {
  enabled: boolean;
  rewards_enabled: boolean;
  accrual_halted: boolean;
  config: ReferralProgramConfig;
  updated_at: Date;
  updated_by_admin_id: string | null;
};

@Injectable()
export class ReferralProgramService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
    private readonly killSwitch: KillSwitchService,
  ) {}

  day1Defaults(
    updatedByAdminId = "system:bootstrap",
  ): ReferralProgramConfig {
    return {
      ...structuredClone(DAY1_REFERRAL_PROGRAM_DEFAULTS),
      updatedAt: new Date(0).toISOString(),
      updatedByAdminId,
    };
  }

  async get(): Promise<ReferralProgramConfig> {
    const row = await this.fetchRow();
    if (!row) return this.day1Defaults();
    return this.toV1(row);
  }

  async patch(input: ReferralProgramPatchInput): Promise<ReferralProgramConfig> {
    if (!input.updatedByAdminId || input.updatedByAdminId.length < 1) {
      throw new BadRequestException("updatedByAdminId required");
    }
    if (!input.changeReason || input.changeReason.trim().length < 10) {
      throw new BadRequestException("changeReason minLength 10");
    }

    this.rejectForbiddenKeys(input as unknown as Record<string, unknown>);

    const current = await this.get();
    const next = this.mergePatch(current, input);
    this.assertConfig(next);

    const saved = await this.db.withTransaction(async (client) => {
      const existing = await client.query<{ id: number }>(
        `SELECT id FROM public.referral_program_config WHERE id = 1 FOR UPDATE`,
      );

      const configJson = this.toPersistedConfig(next);

      let row: ConfigRow;
      if (existing.rows[0]) {
        const upd = await client.query<ConfigRow>(
          `UPDATE public.referral_program_config SET
             enabled = $1,
             rewards_enabled = $2,
             accrual_halted = $3,
             config = $4::jsonb,
             updated_at = now(),
             updated_by_admin_id = $5::uuid
           WHERE id = 1
           RETURNING enabled, rewards_enabled, accrual_halted, config,
                     updated_at, updated_by_admin_id::text`,
          [
            next.enabled,
            next.rewardsEnabled,
            Boolean(next.accrualHalted),
            JSON.stringify(configJson),
            input.updatedByAdminId,
          ],
        );
        row = upd.rows[0];
      } else {
        const ins = await client.query<ConfigRow>(
          `INSERT INTO public.referral_program_config (
             id, enabled, rewards_enabled, accrual_halted, config, updated_by_admin_id
           ) VALUES (1, $1, $2, $3, $4::jsonb, $5::uuid)
           RETURNING enabled, rewards_enabled, accrual_halted, config,
                     updated_at, updated_by_admin_id::text`,
          [
            next.enabled,
            next.rewardsEnabled,
            Boolean(next.accrualHalted),
            JSON.stringify(configJson),
            input.updatedByAdminId,
          ],
        );
        row = ins.rows[0];
      }

      await client.query(
        `INSERT INTO public.referral_program_audit (
           action, previous_payload, next_payload, changed_by_admin_id, change_reason
         ) VALUES ('program_patch', $1::jsonb, $2::jsonb, $3::uuid, $4)`,
        [
          JSON.stringify(current),
          JSON.stringify(this.toV1(row)),
          input.updatedByAdminId,
          input.changeReason.trim(),
        ],
      );

      return row;
    });

    const v1 = this.toV1(saved);
    this.bus.emit(REFERRAL_EVENTS.programUpdated, {
      rewardsEnabled: v1.rewardsEnabled,
      accrualHalted: v1.accrualHalted,
      toastCode: "DEPOSIT_CONFIG_UPDATED",
    });
    if (v1.accrualHalted) {
      this.bus.emit(REFERRAL_EVENTS.accrualHalted, {
        adminId: input.updatedByAdminId,
      });
    }
    return v1;
  }

  async setAccrualHalt(input: {
    halted: boolean;
    updatedByAdminId: string;
    changeReason: string;
  }): Promise<ReferralProgramConfig> {
    return this.patch({
      updatedByAdminId: input.updatedByAdminId,
      changeReason: input.changeReason,
      accrualHalted: input.halted,
    });
  }

  async listAudit(opts?: { limit?: number }) {
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
    const r = await this.db.query<{
      id: string;
      action: string;
      previous_payload: unknown;
      next_payload: unknown;
      changed_by_admin_id: string;
      change_reason: string;
      created_at: Date;
    }>(
      `SELECT id, action, previous_payload, next_payload,
              changed_by_admin_id::text, change_reason, created_at
         FROM public.referral_program_audit
        ORDER BY created_at DESC
        LIMIT $1`,
      [limit],
    );
    return r.rows.map((row) => ({
      id: row.id,
      action: row.action,
      previousPayload: row.previous_payload,
      nextPayload: row.next_payload,
      changedByAdminId: row.changed_by_admin_id,
      changeReason: row.change_reason,
      createdAt: row.created_at.toISOString(),
    }));
  }

  /** Cash accrual allowed only when rewards ON and not halted */
  async canAccrueCash(): Promise<boolean> {
    if (await this.killSwitch.isBlocked("referral_accrual")) return false;
    const cfg = await this.get();
    return cfg.rewardsEnabled === true && cfg.accrualHalted !== true;
  }

  private async fetchRow(): Promise<ConfigRow | null> {
    const r = await this.db.query<ConfigRow>(
      `SELECT enabled, rewards_enabled, accrual_halted, config,
              updated_at, updated_by_admin_id::text
         FROM public.referral_program_config WHERE id = 1`,
    );
    return r.rows[0] ?? null;
  }

  private toV1(row: ConfigRow): ReferralProgramConfig {
    const cfg = row.config ?? {};
    const base = {
      ...DAY1_REFERRAL_PROGRAM_DEFAULTS,
      ...cfg,
      enabled: row.enabled,
      rewardsEnabled: row.rewards_enabled,
      accrualHalted: row.accrual_halted,
      updatedAt: row.updated_at.toISOString(),
      updatedByAdminId: row.updated_by_admin_id ?? undefined,
    };
    // Legacy ignore: strip forbidden keys if somehow present
    for (const k of REFERRAL_FORBIDDEN_CONFIG_KEYS) {
      delete (base as Record<string, unknown>)[k];
    }
    return base;
  }

  private toPersistedConfig(cfg: ReferralProgramConfig): Record<string, unknown> {
    const {
      accrualHalted: _a,
      updatedAt: _u,
      updatedByAdminId: _b,
      enabled: _e,
      rewardsEnabled: _r,
      ...rest
    } = cfg;
    for (const k of REFERRAL_FORBIDDEN_CONFIG_KEYS) {
      delete (rest as Record<string, unknown>)[k];
    }
    if ("capPerReferrerMonth" in (rest as object)) {
      throw new BadRequestException(
        "FORBIDDEN: capPerReferrerMonth — invite count unlimited (§51.5)",
      );
    }
    return rest;
  }

  private mergePatch(
    current: ReferralProgramConfig,
    input: ReferralProgramPatchInput,
  ): ReferralProgramConfig {
    return {
      ...current,
      enabled: input.enabled ?? current.enabled,
      rewardsEnabled: input.rewardsEnabled ?? current.rewardsEnabled,
      accrualHalted: input.accrualHalted ?? current.accrualHalted,
      l1RefereeExtraPracticeUsdt:
        input.l1RefereeExtraPracticeUsdt ?? current.l1RefereeExtraPracticeUsdt,
      l2ReferrerPct: input.l2ReferrerPct ?? current.l2ReferrerPct,
      l2ReferrerHardCapUsdt:
        input.l2ReferrerHardCapUsdt ?? current.l2ReferrerHardCapUsdt,
      l2RefereePracticeCapUsdt:
        input.l2RefereePracticeCapUsdt ?? current.l2RefereePracticeCapUsdt,
      l3ReferrerFlatUsdt:
        input.l3ReferrerFlatUsdt ?? current.l3ReferrerFlatUsdt,
      l3ReferrerHardCapUsdt:
        input.l3ReferrerHardCapUsdt ?? current.l3ReferrerHardCapUsdt,
      l3RefereeRewardKind:
        input.l3RefereeRewardKind ?? current.l3RefereeRewardKind,
      clawbackHoursL2: input.clawbackHoursL2 ?? current.clawbackHoursL2,
      minRefereeDepositUsdt:
        input.minRefereeDepositUsdt ?? current.minRefereeDepositUsdt,
      sharePerUserPerDay:
        input.sharePerUserPerDay ?? current.sharePerUserPerDay,
      systemPayoutCapPerDayUsdt:
        input.systemPayoutCapPerDayUsdt === null
          ? undefined
          : (input.systemPayoutCapPerDayUsdt ??
            current.systemPayoutCapPerDayUsdt),
      promoPoolTopUpPolicy:
        input.promoPoolTopUpPolicy ?? current.promoPoolTopUpPolicy,
      promoPoolTopUpPct:
        input.promoPoolTopUpPct === null
          ? undefined
          : (input.promoPoolTopUpPct ?? current.promoPoolTopUpPct),
      tiers: input.tiers ?? current.tiers,
    };
  }

  private assertConfig(cfg: ReferralProgramConfig): void {
    if (cfg.clawbackHoursL2 < 0) {
      throw new BadRequestException("clawbackHoursL2 >= 0");
    }
    if (cfg.sharePerUserPerDay < 1) {
      throw new BadRequestException("sharePerUserPerDay >= 1");
    }
    if (!cfg.tiers?.length) {
      throw new BadRequestException("tiers required");
    }
  }

  private rejectForbiddenKeys(obj: Record<string, unknown>): void {
    for (const k of REFERRAL_FORBIDDEN_CONFIG_KEYS) {
      if (k in obj && obj[k] !== undefined) {
        throw new BadRequestException(
          `FORBIDDEN config key ${k} — invite count unlimited (§51.5 R14)`,
        );
      }
    }
  }
}

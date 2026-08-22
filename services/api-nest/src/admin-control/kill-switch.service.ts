/**
 * REL-406 kill-switch catalog + enforce.
 * Reuses MoneyCircuitService / PushKillService / growth_control.
 * Does not become a second money owner.
 */

import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import { PostgresService } from "../db/postgres";
import { MoneyCircuitService } from "../risk/money-circuit.service";
import { PushKillService } from "../push/push-kill.service";
import { AdminAuditService } from "./admin-audit.service";

const req = createRequire(__filename);
const catalog = req(join(__dirname, "kill-switch.catalog.cjs")) as {
  KILL_SWITCH_IDS: readonly string[];
  EXISTING_OWNER_SWITCHES: Record<string, string>;
  evaluateKillSwitch: (
    id: string,
    engaged: boolean | null,
  ) => { allowed: boolean; reason: string | null; failClosed: boolean };
  isKillSwitchId: (id: string) => boolean;
};

export const KILL_SWITCH_IDS = catalog.KILL_SWITCH_IDS;

export type KillSwitchRow = {
  id: string;
  engaged: boolean | null;
  source: "owner" | "memory" | "db" | "unavailable";
  owner: string | null;
  reason: string | null;
  updatedAt: string | null;
};

@Injectable()
export class KillSwitchService {
  private readonly memory = new Map<
    string,
    { engaged: boolean; reason: string; updatedAt: string; adminId: string }
  >();

  constructor(
    private readonly db: PostgresService,
    private readonly circuit: MoneyCircuitService,
    private readonly push: PushKillService,
    private readonly audit: AdminAuditService,
  ) {}

  async catalog(): Promise<{ items: KillSwitchRow[] }> {
    const items: KillSwitchRow[] = [];
    for (const id of KILL_SWITCH_IDS) {
      items.push(await this.readOne(id));
    }
    return { items };
  }

  async assertAllowed(id: string): Promise<void> {
    const row = await this.readOne(id);
    const decision = catalog.evaluateKillSwitch(id, row.engaged);
    if (!decision.allowed) {
      throw new ServiceUnavailableException({
        code: decision.reason ?? id,
        toastCode: decision.reason ?? id,
        statusCode: 503,
        message: "KILL_SWITCH_ON",
      });
    }
  }

  async put(input: {
    id: string;
    engaged: boolean;
    reason: string;
    adminId: string;
    adminRole?: string | null;
  }): Promise<KillSwitchRow> {
    if (!catalog.isKillSwitchId(input.id)) {
      throw new BadRequestException("UNKNOWN_SWITCH");
    }
    if (!input.adminId) throw new BadRequestException("adminId required");
    if (!input.reason || input.reason.trim().length < 10) {
      throw new BadRequestException("reason must be ≥10 characters");
    }

    const previous = await this.readOne(input.id);

    if (input.id === "GLOBAL_MONEY_CIRCUIT") {
      throw new BadRequestException({
        code: "OWNER_REQUIRED",
        message: "money circuit write owner is /admin/risk",
      });
    }
    if (input.id === "GLOBAL_PUSH_PAUSE") {
      await this.push.putEnabled({
        pushEnabled: input.engaged !== true,
        reason: input.reason.trim(),
        adminId: input.adminId,
      });
    } else if (input.id === "GLOBAL_GROWTH_PAUSE") {
      if (input.engaged !== true) {
        throw new BadRequestException({
          code: "OWNER_REQUIRED",
          message: "Growth ON owner is /admin/growth simulation gate",
        });
      }
      await this.pauseGrowth(input.adminId, input.reason.trim());
    } else {
      const next = {
        engaged: input.engaged === true,
        reason: input.reason.trim(),
        updatedAt: new Date().toISOString(),
        adminId: input.adminId,
      };
      this.memory.set(input.id, next);
      if (this.db.configured()) {
        try {
          await this.db.query(
            `INSERT INTO public.admin_kill_switches (id, engaged, reason, updated_by_admin_id, updated_at)
             VALUES ($1, $2, $3, $4::uuid, now())
             ON CONFLICT (id) DO UPDATE SET
               engaged = EXCLUDED.engaged,
               reason = EXCLUDED.reason,
               updated_by_admin_id = EXCLUDED.updated_by_admin_id,
               updated_at = now()`,
            [input.id, next.engaged, next.reason, input.adminId],
          );
        } catch {
          /* unapplied — memory still enforces this process */
        }
      }
    }

    await this.audit.record({
      action: "kill_switch.put",
      outcome: "applied",
      actorAdminId: input.adminId,
      actorRole: input.adminRole ?? null,
      capability: "circuit",
      reason: input.reason.trim(),
      targetType: "kill_switch",
      targetId: input.id,
      before: { engaged: previous.engaged },
      after: { engaged: input.engaged === true },
    });
    return this.readOne(input.id);
  }

  private async readOne(id: string): Promise<KillSwitchRow> {
    if (id === "GLOBAL_MONEY_CIRCUIT") {
      try {
        const st = await this.circuit.getState();
        return {
          id,
          engaged: st.open === true,
          source: "owner",
          owner: "MoneyCircuitService",
          reason: st.reasonCode ?? null,
          updatedAt: st.openedAt ?? null,
        };
      } catch {
        return {
          id,
          engaged: null,
          source: "unavailable",
          owner: "MoneyCircuitService",
          reason: null,
          updatedAt: null,
        };
      }
    }
    if (id === "GLOBAL_PUSH_PAUSE") {
      try {
        const st = await this.push.getState();
        return {
          id,
          engaged: st.pushEnabled === false,
          source: "owner",
          owner: "PushKillService",
          reason: null,
          updatedAt: null,
        };
      } catch {
        return {
          id,
          engaged: null,
          source: "unavailable",
          owner: "PushKillService",
          reason: null,
          updatedAt: null,
        };
      }
    }
    if (id === "GLOBAL_GROWTH_PAUSE") {
      return this.readGrowthPause();
    }

    const mem = this.memory.get(id);
    if (mem) {
      return {
        id,
        engaged: mem.engaged,
        source: "memory",
        owner: null,
        reason: mem.reason,
        updatedAt: mem.updatedAt,
      };
    }
    if (this.db.configured()) {
      try {
        const r = await this.db.query<{
          engaged: boolean;
          reason: string | null;
          updated_at: Date;
        }>(
          `SELECT engaged, reason, updated_at
             FROM public.admin_kill_switches WHERE id = $1`,
          [id],
        );
        if (r.rows[0]) {
          return {
            id,
            engaged: r.rows[0].engaged === true,
            source: "db",
            owner: null,
            reason: r.rows[0].reason,
            updatedAt: r.rows[0].updated_at.toISOString(),
          };
        }
      } catch {
        /* unapplied */
      }
    }
    return {
      id,
      engaged: false,
      source: "memory",
      owner: null,
      reason: null,
      updatedAt: null,
    };
  }

  private async readGrowthPause(): Promise<KillSwitchRow> {
    if (!this.db.configured()) {
      return {
        id: "GLOBAL_GROWTH_PAUSE",
        engaged: null,
        source: "unavailable",
        owner: "growth_control",
        reason: null,
        updatedAt: null,
      };
    }
    try {
      const r = await this.db.query<{
        enabled: boolean;
        change_reason: string | null;
        updated_at: Date | null;
      }>(
        `SELECT enabled, change_reason, updated_at
           FROM public.growth_control WHERE id = 1`,
      );
      const row = r.rows[0];
      if (!row) {
        return {
          id: "GLOBAL_GROWTH_PAUSE",
          engaged: null,
          source: "unavailable",
          owner: "growth_control",
          reason: null,
          updatedAt: null,
        };
      }
      return {
        id: "GLOBAL_GROWTH_PAUSE",
        engaged: row.enabled !== true,
        source: "owner",
        owner: "growth_control",
        reason: row.change_reason,
        updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
      };
    } catch {
      return {
        id: "GLOBAL_GROWTH_PAUSE",
        engaged: null,
        source: "unavailable",
        owner: "growth_control",
        reason: null,
        updatedAt: null,
      };
    }
  }

  private async pauseGrowth(adminId: string, reason: string): Promise<void> {
    if (!this.db.configured()) {
      throw new ServiceUnavailableException("growth_control unavailable");
    }
    await this.db.query(
      `INSERT INTO public.growth_control (id, enabled, updated_by_admin_id, change_reason, updated_at)
       VALUES (1, false, $1::uuid, $2, now())
       ON CONFLICT (id) DO UPDATE SET
         enabled = false,
         updated_by_admin_id = EXCLUDED.updated_by_admin_id,
         change_reason = EXCLUDED.change_reason,
         updated_at = now()`,
      [adminId, reason],
    );
  }
}

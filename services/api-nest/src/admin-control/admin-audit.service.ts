/**
 * REL-405 control-plane audit writer.
 * Actual operations only. Domain audits stay on their owners.
 * Table is committed-unapplied — memory is authoritative until REL-701-DB.
 */

import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PostgresService } from "../db/postgres";
import { registerAdminAuditWriter } from "./admin-audit.writer";

export type AdminAuditOutcome = "applied" | "denied" | "preview" | "error";

export type AdminAuditRecord = {
  id: string;
  action: string;
  outcome: AdminAuditOutcome;
  actorAdminId: string | null;
  actorRole: string | null;
  capability: string | null;
  reasonCode: string | null;
  reason: string | null;
  targetType: string | null;
  targetId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  mode: "LIVE" | "DRY_RUN" | "SIMULATION" | null;
  createdAt: string;
};

export type AdminAuditWriteInput = {
  action: string;
  outcome: AdminAuditOutcome;
  actorAdminId?: string | null;
  actorRole?: string | null;
  capability?: string | null;
  reasonCode?: string | null;
  reason?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  mode?: "LIVE" | "DRY_RUN" | "SIMULATION" | null;
};

const MAX_MEMORY = 500;

@Injectable()
export class AdminAuditService {
  private readonly memory: AdminAuditRecord[] = [];

  constructor(private readonly db: PostgresService) {
    registerAdminAuditWriter((row) => {
      void this.record(row);
    });
  }

  async record(input: AdminAuditWriteInput): Promise<AdminAuditRecord> {
    if (!input.action || !input.action.trim()) {
      throw new Error("audit action required");
    }
    const row: AdminAuditRecord = {
      id: randomUUID(),
      action: input.action.trim(),
      outcome: input.outcome,
      actorAdminId: input.actorAdminId ?? null,
      actorRole: input.actorRole ?? null,
      capability: input.capability ?? null,
      reasonCode: input.reasonCode ?? null,
      reason: input.reason ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      mode: input.mode ?? null,
      createdAt: new Date().toISOString(),
    };
    this.memory.unshift(row);
    if (this.memory.length > MAX_MEMORY) this.memory.pop();

    if (this.db.configured()) {
      try {
        await this.db.query(
          `INSERT INTO public.admin_control_audit (
             id, action, outcome, actor_admin_id, actor_role, capability,
             reason_code, reason, target_type, target_id, before, after, mode, created_at
           ) VALUES (
             $1::uuid, $2, $3, $4::uuid, $5, $6,
             $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14::timestamptz
           )`,
          [
            row.id,
            row.action,
            row.outcome,
            row.actorAdminId,
            row.actorRole,
            row.capability,
            row.reasonCode,
            row.reason,
            row.targetType,
            row.targetId,
            row.before ? JSON.stringify(row.before) : null,
            row.after ? JSON.stringify(row.after) : null,
            row.mode,
            row.createdAt,
          ],
        );
      } catch {
        /* unapplied — memory still holds the actual operation */
      }
    }
    return row;
  }

  async list(limit = 50): Promise<{
    items: AdminAuditRecord[];
    source: "memory" | "db";
  }> {
    const lim = Math.min(Math.max(limit, 1), 200);
    if (this.db.configured()) {
      try {
        const r = await this.db.query<{
          id: string;
          action: string;
          outcome: AdminAuditOutcome;
          actor_admin_id: string | null;
          actor_role: string | null;
          capability: string | null;
          reason_code: string | null;
          reason: string | null;
          target_type: string | null;
          target_id: string | null;
          before: Record<string, unknown> | null;
          after: Record<string, unknown> | null;
          mode: AdminAuditRecord["mode"];
          created_at: Date;
        }>(
          `SELECT id::text, action, outcome, actor_admin_id::text, actor_role,
                  capability, reason_code, reason, target_type, target_id,
                  before, after, mode, created_at
             FROM public.admin_control_audit
            ORDER BY created_at DESC
            LIMIT $1`,
          [lim],
        );
        if (r.rows.length > 0 || this.memory.length === 0) {
          return {
            source: "db",
            items: r.rows.map((row) => ({
              id: row.id,
              action: row.action,
              outcome: row.outcome,
              actorAdminId: row.actor_admin_id,
              actorRole: row.actor_role,
              capability: row.capability,
              reasonCode: row.reason_code,
              reason: row.reason,
              targetType: row.target_type,
              targetId: row.target_id,
              before: row.before,
              after: row.after,
              mode: row.mode,
              createdAt: new Date(row.created_at).toISOString(),
            })),
          };
        }
      } catch {
        /* unapplied */
      }
    }
    return { source: "memory", items: this.memory.slice(0, lim) };
  }
}

/**
 * REL-222 — LIVE / DRY_RUN / SIMULATION.
 * LIVE requires confirm. DRY_RUN/SIMULATION never post ledger.
 */

import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AdminAuditService } from "./admin-audit.service";

export const ADMIN_OPS_MODES = ["LIVE", "DRY_RUN", "SIMULATION"] as const;
export type AdminOpsMode = (typeof ADMIN_OPS_MODES)[number];

type ImpactRecord = {
  id: string;
  previewed: boolean;
  confirmed: boolean;
  applied: boolean;
  rolledBack: boolean;
  mode: AdminOpsMode;
  verb: string;
  targetCount: number;
  result: Record<string, unknown> | null;
};

@Injectable()
export class OpsModeService {
  private mode: AdminOpsMode = "DRY_RUN";
  private readonly impacts = new Map<string, ImpactRecord>();

  constructor(private readonly audit: AdminAuditService) {}

  getMode(): { mode: AdminOpsMode; source: "memory" } {
    return { mode: this.mode, source: "memory" };
  }

  async setMode(input: {
    mode: unknown;
    confirm?: unknown;
    reason: string;
    adminId: string;
    adminRole?: string | null;
  }): Promise<{ mode: AdminOpsMode }> {
    if (!ADMIN_OPS_MODES.includes(input.mode as AdminOpsMode)) {
      throw new BadRequestException("UNKNOWN_OPS_MODE");
    }
    if (!input.adminId) throw new BadRequestException("adminId required");
    if (!input.reason || input.reason.trim().length < 10) {
      throw new BadRequestException("reason must be ≥10 characters");
    }
    const next = input.mode as AdminOpsMode;
    if (next === "LIVE" && input.confirm !== true) {
      throw new BadRequestException("LIVE_CONFIRM_REQUIRED");
    }
    const previous = this.mode;
    this.mode = next;
    await this.audit.record({
      action: "ops.mode.set",
      outcome: "applied",
      actorAdminId: input.adminId,
      actorRole: input.adminRole ?? null,
      capability: "opsMode",
      reason: input.reason.trim(),
      targetType: "ops_mode",
      before: { mode: previous },
      after: { mode: next },
      mode: next,
    });
    return { mode: this.mode };
  }

  /**
   * Server-side preview of a user surface. Never issues a user JWT.
   */
  async previewAsUser(input: {
    userId: unknown;
    adminId: string;
  }): Promise<{
    impersonation: "server_scope";
    userJwtIssued: false;
    userId: string | null;
    available: boolean;
  }> {
    const userId = typeof input.userId === "string" ? input.userId.trim() : "";
    if (!userId) {
      return {
        impersonation: "server_scope",
        userJwtIssued: false,
        userId: null,
        available: false,
      };
    }
    await this.audit.record({
      action: "ops.preview_as_user",
      outcome: "preview",
      actorAdminId: input.adminId,
      targetType: "user",
      targetId: userId,
      mode: this.mode,
    });
    return {
      impersonation: "server_scope",
      userJwtIssued: false,
      userId,
      available: true,
    };
  }

  async previewImpact(input: {
    verb: unknown;
    targetIds: unknown;
    adminId: string;
  }): Promise<{ id: string; mode: AdminOpsMode; targetCount: number; ledgerWrite: false }> {
    const verb = String(input.verb ?? "");
    const ids = Array.isArray(input.targetIds)
      ? input.targetIds.filter((x) => typeof x === "string")
      : [];
    if (!verb) throw new BadRequestException("verb required");
    const rec: ImpactRecord = {
      id: randomUUID(),
      previewed: true,
      confirmed: false,
      applied: false,
      rolledBack: false,
      mode: this.mode,
      verb,
      targetCount: ids.length,
      result: null,
    };
    this.impacts.set(rec.id, rec);
    await this.audit.record({
      action: "ops.impact.preview",
      outcome: "preview",
      actorAdminId: input.adminId,
      targetType: "impact",
      targetId: rec.id,
      after: { verb, targetCount: ids.length },
      mode: this.mode,
    });
    return {
      id: rec.id,
      mode: this.mode,
      targetCount: ids.length,
      ledgerWrite: false,
    };
  }

  async confirmImpact(input: {
    id: unknown;
    adminId: string;
  }): Promise<{ id: string; confirmed: true }> {
    const rec = this.requireImpact(input.id);
    rec.confirmed = true;
    await this.audit.record({
      action: "ops.impact.confirm",
      outcome: "preview",
      actorAdminId: input.adminId,
      targetType: "impact",
      targetId: rec.id,
      mode: rec.mode,
    });
    return { id: rec.id, confirmed: true };
  }

  async applyImpact(input: {
    id: unknown;
    adminId: string;
  }): Promise<{
    id: string;
    applied: boolean;
    ledgerWrite: false;
    mode: AdminOpsMode;
  }> {
    const rec = this.requireImpact(input.id);
    if (!rec.previewed || !rec.confirmed) {
      throw new BadRequestException("PREVIEW_CONFIRM_REQUIRED");
    }
    if (rec.mode === "LIVE" && this.mode !== "LIVE") {
      throw new BadRequestException("MODE_MISMATCH");
    }
    // DRY_RUN / SIMULATION never touch ledger. LIVE apply in this module
    // is control-plane only — money owners stay elsewhere.
    rec.applied = true;
    rec.result = { ledgerWrite: false, mode: rec.mode };
    await this.audit.record({
      action: "ops.impact.apply",
      outcome: "applied",
      actorAdminId: input.adminId,
      targetType: "impact",
      targetId: rec.id,
      after: rec.result,
      mode: rec.mode,
    });
    return {
      id: rec.id,
      applied: true,
      ledgerWrite: false,
      mode: rec.mode,
    };
  }

  getImpact(id: string): ImpactRecord {
    return this.requireImpact(id);
  }

  async rollbackImpact(input: {
    id: unknown;
    adminId: string;
  }): Promise<{ id: string; rolledBack: true; ledgerWrite: false }> {
    const rec = this.requireImpact(input.id);
    rec.rolledBack = true;
    await this.audit.record({
      action: "ops.impact.rollback",
      outcome: "applied",
      actorAdminId: input.adminId,
      targetType: "impact",
      targetId: rec.id,
      mode: rec.mode,
    });
    return { id: rec.id, rolledBack: true, ledgerWrite: false };
  }

  private requireImpact(id: unknown): ImpactRecord {
    if (typeof id !== "string" || !id) {
      throw new BadRequestException("impact id required");
    }
    const rec = this.impacts.get(id);
    if (!rec) throw new ServiceUnavailableException("impact unavailable");
    return rec;
  }
}

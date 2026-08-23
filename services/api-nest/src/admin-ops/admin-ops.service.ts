/**
 * REL-222 3-mode 서버 강제.
 * DRY_RUN/SIMULATION 은 원장 테이블을 쓰지 않는다.
 * Preview-As-User 는 유저 세션 토큰을 만들지 않는다.
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import { PostgresService } from "../db/postgres";

const requireCjs = createRequire(__filename);
const opsCore = requireCjs(join(__dirname, "..", "..", "admin-ops.core.cjs")) as {
  OPS_MODES: readonly string[];
  OPS_STAGES: readonly string[];
  OPS_FAMILIES: readonly string[];
  normalizeMode: (
    raw: unknown,
  ) => { ok: true; mode: string } | { ok: false; error: string };
  normalizeFamily: (
    raw: unknown,
  ) => { ok: true; family: string } | { ok: false; error: string };
  requireReason: (
    reason: unknown,
  ) => { ok: true; reason: string } | { ok: false; error: string };
  decideWrite: (input: {
    mode?: unknown;
    confirmed?: boolean;
    stage?: string;
  }) => {
    ok: boolean;
    error?: string;
    persist: boolean;
    ledgerWrite: boolean;
    isolated: boolean;
    mode?: string;
  };
  impactPreview: (
    family: unknown,
    count: unknown,
  ) =>
    | { ok: true; family: string; impactCount: number; persist: false; ledgerWrite: false }
    | { ok: false; error: string };
  previewAsUser: (userId: unknown) =>
    | {
        ok: true;
        userId: string;
        mintUserJwt: false;
        moneyWrite: false;
        scope: string;
      }
    | { ok: false; error: string };
  assertNoUserJwt: (payload: unknown) => { ok: boolean; error?: string };
};

const auditCore = requireCjs(
  join(__dirname, "..", "..", "admin-audit.core.cjs"),
) as {
  writeAuditEvent: (
    raw: unknown,
  ) => Promise<{ ok: boolean; error?: string; event?: object }>;
};

type IntentRow = {
  id: string;
  family: string;
  mode: string;
  stage: string;
  confirmed: boolean;
  impact_count: number;
  reason: string;
};

function isUndefinedTable(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      (err as { code?: string }).code === "42P01",
  );
}

@Injectable()
export class AdminOpsService {
  constructor(private readonly db: PostgresService) {}

  modes() {
    return {
      version: 1 as const,
      modes: [...opsCore.OPS_MODES],
      stages: [...opsCore.OPS_STAGES],
      families: [...opsCore.OPS_FAMILIES],
    };
  }

  async preview(input: {
    family: string;
    mode: string;
    impactCount?: number;
    reason: string;
    adminId: string;
    role: string;
  }) {
    const family = opsCore.normalizeFamily(input.family);
    if (!family.ok) throw new BadRequestException(family.error);
    const mode = opsCore.normalizeMode(input.mode);
    if (!mode.ok) throw new BadRequestException(mode.error);
    const reason = opsCore.requireReason(input.reason);
    if (!reason.ok) throw new BadRequestException(reason.error);
    const impact = opsCore.impactPreview(family.family, input.impactCount ?? 0);
    if (!impact.ok) throw new BadRequestException(impact.error);

    const id = await this.persistIntent({
      family: family.family,
      mode: mode.mode,
      stage: "preview",
      confirmed: false,
      impactCount: impact.impactCount,
      reason: reason.reason,
      adminId: input.adminId,
    });
    await this.audit(input, {
      action: "AdminOpsAdminController.preview",
      result: "preview",
      mode: mode.mode,
      targetId: id,
      extra: { family: family.family, impactCount: impact.impactCount },
    });
    return {
      id,
      stage: "preview",
      mode: mode.mode,
      family: family.family,
      impactCount: impact.impactCount,
      persist: false,
      ledgerWrite: false,
      isolated: mode.mode === "SIMULATION",
    };
  }

  async confirm(input: {
    id: string;
    reason: string;
    adminId: string;
    role: string;
  }) {
    const reason = opsCore.requireReason(input.reason);
    if (!reason.ok) throw new BadRequestException(reason.error);
    const row = await this.loadIntent(input.id);
    if (!row) throw new NotFoundException("ops intent not found");
    await this.updateIntent(row.id, { stage: "confirm", confirmed: true });
    await this.audit(input, {
      action: "AdminOpsAdminController.confirm",
      result: "preview",
      mode: row.mode,
      targetId: row.id,
      extra: { family: row.family, stage: "confirm" },
    });
    return { id: row.id, stage: "confirm", confirmed: true, mode: row.mode };
  }

  async apply(input: {
    id: string;
    reason: string;
    adminId: string;
    role: string;
  }) {
    const reason = opsCore.requireReason(input.reason);
    if (!reason.ok) throw new BadRequestException(reason.error);
    const row = await this.loadIntent(input.id);
    if (!row) throw new NotFoundException("ops intent not found");
    const decision = opsCore.decideWrite({
      mode: row.mode,
      confirmed: row.confirmed === true,
      stage: "apply",
    });
    if (!decision.ok) throw new BadRequestException(decision.error);

    if (decision.persist) {
      await this.updateIntent(row.id, { stage: "apply", confirmed: true });
    }
    await this.audit(input, {
      action: "AdminOpsAdminController.apply",
      result: decision.persist ? "applied" : "preview",
      mode: row.mode,
      targetId: row.id,
      extra: {
        family: row.family,
        persist: decision.persist === true,
        ledgerWrite: false,
      },
    });
    return {
      id: row.id,
      stage: "result",
      mode: row.mode,
      persist: decision.persist === true,
      ledgerWrite: false,
      isolated: decision.isolated === true,
    };
  }

  async rollback(input: {
    id: string;
    reason: string;
    adminId: string;
    role: string;
  }) {
    const reason = opsCore.requireReason(input.reason);
    if (!reason.ok) throw new BadRequestException(reason.error);
    const row = await this.loadIntent(input.id);
    if (!row) throw new NotFoundException("ops intent not found");
    if (row.mode !== "LIVE") {
      throw new BadRequestException("ROLLBACK_LIVE_ONLY");
    }
    await this.updateIntent(row.id, { stage: "rollback", confirmed: row.confirmed });
    await this.audit(input, {
      action: "AdminOpsAdminController.rollback",
      result: "rolled_back",
      mode: "LIVE",
      targetId: row.id,
      extra: { family: row.family },
    });
    return { id: row.id, stage: "rollback", ledgerWrite: false };
  }

  async previewAsUser(input: {
    userId: string;
    adminId: string;
    role: string;
  }) {
    const scoped = opsCore.previewAsUser(input.userId);
    if (!scoped.ok) throw new BadRequestException(scoped.error);
    let exists = false;
    if (this.db.configured()) {
      try {
        const { rows } = await this.db.query<{ id: string }>(
          `SELECT id::text FROM public.users WHERE id = $1::uuid`,
          [scoped.userId],
        );
        exists = Boolean(rows[0]);
      } catch (err) {
        if (!isUndefinedTable(err)) throw err;
      }
    }
    const payload = {
      userId: scoped.userId,
      exists,
      mintUserJwt: false as const,
      moneyWrite: false as const,
      scope: scoped.scope,
    };
    const guard = opsCore.assertNoUserJwt(payload);
    if (!guard.ok) throw new BadRequestException(guard.error);
    await this.audit(
      {
        adminId: input.adminId,
        role: input.role,
        reason: "preview as user scoped read",
      },
      {
        action: "AdminOpsAdminController.previewAsUser",
        result: "preview",
        mode: "DRY_RUN",
        targetId: scoped.userId,
        extra: { scope: scoped.scope, exists },
      },
    );
    return payload;
  }

  private async persistIntent(input: {
    family: string;
    mode: string;
    stage: string;
    confirmed: boolean;
    impactCount: number;
    reason: string;
    adminId: string;
  }): Promise<string> {
    const fallback = `ops-${Date.now()}`;
    if (!this.db.configured()) return fallback;
    try {
      const { rows } = await this.db.query<{ id: string }>(
        `INSERT INTO public.admin_ops_intents (
           family, mode, stage, confirmed, impact_count, reason,
           updated_by_admin_id, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7::uuid, now())
         RETURNING id::text`,
        [
          input.family,
          input.mode,
          input.stage,
          input.confirmed,
          input.impactCount,
          input.reason,
          input.adminId,
        ],
      );
      return rows[0]?.id || fallback;
    } catch (err) {
      if (!isUndefinedTable(err)) throw err;
      return fallback;
    }
  }

  private async loadIntent(id: string): Promise<IntentRow | null> {
    if (!this.db.configured()) {
      return {
        id,
        family: "policy",
        mode: "DRY_RUN",
        stage: "preview",
        confirmed: false,
        impact_count: 0,
        reason: "",
      };
    }
    try {
      const { rows } = await this.db.query<IntentRow>(
        `SELECT id::text, family, mode, stage, confirmed, impact_count, reason
           FROM public.admin_ops_intents
          WHERE id = $1::uuid`,
        [id],
      );
      return rows[0] ?? null;
    } catch (err) {
      if (!isUndefinedTable(err)) throw err;
      return null;
    }
  }

  private async updateIntent(
    id: string,
    patch: { stage: string; confirmed: boolean },
  ): Promise<void> {
    if (!this.db.configured()) return;
    try {
      await this.db.query(
        `UPDATE public.admin_ops_intents
            SET stage = $2, confirmed = $3, updated_at = now()
          WHERE id = $1::uuid`,
        [id, patch.stage, patch.confirmed],
      );
    } catch (err) {
      if (!isUndefinedTable(err)) throw err;
    }
  }

  private async audit(
    actor: { adminId: string; role: string; reason: string },
    ev: {
      action: string;
      result: string;
      mode: string;
      targetId: string;
      extra: Record<string, unknown>;
    },
  ) {
    await auditCore.writeAuditEvent({
      actorKey: actor.adminId,
      actorId: actor.adminId,
      role: actor.role || "unknown",
      action: ev.action,
      targetType: "admin_ops",
      targetId: ev.targetId,
      mode: ev.mode,
      result: ev.result,
      reason: actor.reason,
      payload: ev.extra,
    });
  }
}

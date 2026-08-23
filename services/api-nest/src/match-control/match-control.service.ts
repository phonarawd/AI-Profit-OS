/**
 * REL-223 수동 매칭/대량 통제.
 * 허용 동사만 persist. 원장·지갑 테이블은 쓰지 않는다.
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
const matchCore = requireCjs(
  join(__dirname, "..", "..", "admin-match-control.core.cjs"),
) as {
  MATCH_VERBS: readonly string[];
  MATCH_KINDS: readonly string[];
  FORBIDDEN_VERBS: readonly string[];
  normalizeVerb: (
    raw: unknown,
  ) => { ok: true; verb: string } | { ok: false; error: string };
  normalizeKind: (
    raw: unknown,
  ) => { ok: true; kind: string } | { ok: false; error: string };
  requireImpact: (
    kind: unknown,
    count: unknown,
  ) =>
    | { ok: true; kind: string; impactCount: number }
    | { ok: false; error: string };
  requireReassignTarget: (
    verb: string,
    targetId: unknown,
  ) =>
    | { ok: true; targetId: string | null }
    | { ok: false; error: string };
  decideMatchWrite: (input: {
    mode?: unknown;
    confirmed?: boolean;
    stage?: string;
    previewed?: boolean;
  }) => {
    ok: boolean;
    error?: string;
    persist: boolean;
    ledgerWrite: boolean;
    isolated: boolean;
    mode?: string;
  };
  requireReason: (
    reason: unknown,
  ) => { ok: true; reason: string } | { ok: false; error: string };
};

const opsCore = requireCjs(join(__dirname, "..", "..", "admin-ops.core.cjs")) as {
  normalizeMode: (
    raw: unknown,
  ) => { ok: true; mode: string } | { ok: false; error: string };
};

const auditCore = requireCjs(
  join(__dirname, "..", "..", "admin-audit.core.cjs"),
) as {
  writeAuditEvent: (
    raw: unknown,
  ) => Promise<{ ok: boolean; error?: string; event?: object }>;
};

type ControlRow = {
  id: string;
  verb: string;
  kind: string;
  mode: string;
  stage: string;
  confirmed: boolean;
  previewed: boolean;
  impact_count: number;
  target_id: string | null;
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
export class MatchControlService {
  constructor(private readonly db: PostgresService) {}

  verbs() {
    return {
      version: 1 as const,
      verbs: [...matchCore.MATCH_VERBS],
      kinds: [...matchCore.MATCH_KINDS],
      forbiddenVerbs: [...matchCore.FORBIDDEN_VERBS],
    };
  }

  async preview(input: {
    verb: string;
    kind: string;
    mode: string;
    impactCount?: number;
    targetId?: string;
    reason: string;
    adminId: string;
    role: string;
  }) {
    const verb = matchCore.normalizeVerb(input.verb);
    if (!verb.ok) throw new BadRequestException(verb.error);
    const kind = matchCore.normalizeKind(input.kind);
    if (!kind.ok) throw new BadRequestException(kind.error);
    const mode = opsCore.normalizeMode(input.mode);
    if (!mode.ok) throw new BadRequestException(mode.error);
    const reason = matchCore.requireReason(input.reason);
    if (!reason.ok) throw new BadRequestException(reason.error);
    const impact = matchCore.requireImpact(kind.kind, input.impactCount);
    if (!impact.ok) throw new BadRequestException(impact.error);
    const target = matchCore.requireReassignTarget(verb.verb, input.targetId);
    if (!target.ok) throw new BadRequestException(target.error);

    const id = await this.persistControl({
      verb: verb.verb,
      kind: kind.kind,
      mode: mode.mode,
      stage: "preview",
      confirmed: false,
      previewed: true,
      impactCount: impact.impactCount,
      targetId: target.targetId,
      reason: reason.reason,
      adminId: input.adminId,
    });
    await this.audit(input, {
      action: "MatchControlAdminController.preview",
      result: "preview",
      mode: mode.mode,
      targetId: id,
      extra: {
        verb: verb.verb,
        kind: kind.kind,
        impactCount: impact.impactCount,
      },
    });
    return {
      id,
      stage: "preview",
      verb: verb.verb,
      kind: kind.kind,
      mode: mode.mode,
      impactCount: impact.impactCount,
      previewed: true,
      persist: false,
      ledgerWrite: false,
    };
  }

  async confirm(input: {
    id: string;
    reason: string;
    adminId: string;
    role: string;
  }) {
    const reason = matchCore.requireReason(input.reason);
    if (!reason.ok) throw new BadRequestException(reason.error);
    const row = await this.loadControl(input.id);
    if (!row) throw new NotFoundException("match control not found");
    await this.updateControl(row.id, {
      stage: "confirm",
      confirmed: true,
      previewed: true,
    });
    await this.audit(input, {
      action: "MatchControlAdminController.confirm",
      result: "preview",
      mode: row.mode,
      targetId: row.id,
      extra: { verb: row.verb, kind: row.kind, stage: "confirm" },
    });
    return { id: row.id, stage: "confirm", confirmed: true, mode: row.mode };
  }

  async apply(input: {
    id: string;
    reason: string;
    adminId: string;
    role: string;
  }) {
    const reason = matchCore.requireReason(input.reason);
    if (!reason.ok) throw new BadRequestException(reason.error);
    const row = await this.loadControl(input.id);
    if (!row) throw new NotFoundException("match control not found");
    const decision = matchCore.decideMatchWrite({
      mode: row.mode,
      confirmed: row.confirmed === true,
      previewed: row.previewed === true,
      stage: "apply",
    });
    if (!decision.ok) throw new BadRequestException(decision.error);
    if (decision.persist) {
      await this.updateControl(row.id, {
        stage: "apply",
        confirmed: true,
        previewed: true,
      });
    }
    await this.audit(input, {
      action: "MatchControlAdminController.apply",
      result: decision.persist ? "applied" : "preview",
      mode: row.mode,
      targetId: row.id,
      extra: {
        verb: row.verb,
        kind: row.kind,
        persist: decision.persist === true,
        ledgerWrite: false,
      },
    });
    return {
      id: row.id,
      stage: "result",
      verb: row.verb,
      kind: row.kind,
      mode: row.mode,
      persist: decision.persist === true,
      ledgerWrite: false,
    };
  }

  private async persistControl(input: {
    verb: string;
    kind: string;
    mode: string;
    stage: string;
    confirmed: boolean;
    previewed: boolean;
    impactCount: number;
    targetId: string | null;
    reason: string;
    adminId: string;
  }): Promise<string> {
    const fallback = `match-${Date.now()}`;
    if (!this.db.configured()) return fallback;
    try {
      const { rows } = await this.db.query<{ id: string }>(
        `INSERT INTO public.admin_match_controls (
           verb, kind, mode, stage, confirmed, previewed, impact_count,
           target_id, reason, updated_by_admin_id, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::uuid,$9,$10::uuid, now())
         RETURNING id::text`,
        [
          input.verb,
          input.kind,
          input.mode,
          input.stage,
          input.confirmed,
          input.previewed,
          input.impactCount,
          input.targetId,
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

  private async loadControl(id: string): Promise<ControlRow | null> {
    if (!this.db.configured()) {
      return {
        id,
        verb: "ALLOW",
        kind: "match",
        mode: "DRY_RUN",
        stage: "preview",
        confirmed: false,
        previewed: true,
        impact_count: 1,
        target_id: null,
        reason: "",
      };
    }
    try {
      const { rows } = await this.db.query<ControlRow>(
        `SELECT id::text, verb, kind, mode, stage, confirmed, previewed,
                impact_count, target_id::text, reason
           FROM public.admin_match_controls
          WHERE id = $1::uuid`,
        [id],
      );
      return rows[0] ?? null;
    } catch (err) {
      if (!isUndefinedTable(err)) throw err;
      return null;
    }
  }

  private async updateControl(
    id: string,
    patch: { stage: string; confirmed: boolean; previewed: boolean },
  ): Promise<void> {
    if (!this.db.configured()) return;
    try {
      await this.db.query(
        `UPDATE public.admin_match_controls
            SET stage = $2, confirmed = $3, previewed = $4, updated_at = now()
          WHERE id = $1::uuid`,
        [id, patch.stage, patch.confirmed, patch.previewed],
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
      targetType: "match_control",
      targetId: ev.targetId,
      mode: ev.mode,
      result: ev.result,
      reason: actor.reason,
      payload: ev.extra,
    });
  }
}

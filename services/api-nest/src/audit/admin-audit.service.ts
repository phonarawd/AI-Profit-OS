/**
 * REL-405 중앙 admin audit 쓰기/읽기.
 * 리스트 API는 분류된 뒤에만 200이 합법. 삭제 엔드포인트 0.
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import { PostgresService } from "../db/postgres";

const requireCjs = createRequire(__filename);
const auditCore = requireCjs(
  join(__dirname, "..", "..", "admin-audit.core.cjs"),
) as {
  setAuditSink: (fn: ((event: AdminAuditEvent) => boolean | Promise<boolean>) | null) => void;
  resetAuditSink: () => void;
  writeAuditEvent: (
    raw: unknown,
  ) => Promise<
    | { ok: true; event: AdminAuditEvent; persisted: boolean }
    | { ok: false; error: string }
  >;
  isUuid: (value: unknown) => boolean;
};

export type AdminAuditEvent = {
  actorKey: string;
  actorId: string | null;
  role: string;
  action: string;
  targetType: string;
  targetId: string;
  occurredAt: string;
  mode: string;
  result: string;
  reason: string;
  idempotencyKey: string | null;
  payload: Record<string, unknown>;
  id?: string;
};

function isUndefinedTable(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      (err as { code?: string }).code === "42P01",
  );
}

@Injectable()
export class AdminAuditService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly db: PostgresService) {}

  onModuleInit(): void {
    auditCore.setAuditSink(async (event) => {
      if (!this.db.configured()) return false;
      try {
        await this.insert(event);
        return true;
      } catch {
        // 인가 결과는 유지한다. durable 성공으로 위장하지 않는다.
        return false;
      }
    });
  }

  onModuleDestroy(): void {
    auditCore.resetAuditSink();
  }

  async write(raw: unknown) {
    const result = await auditCore.writeAuditEvent(raw);
    if (!result.ok) {
      throw new BadRequestException(result.error);
    }
    return result;
  }

  async list(limitRaw?: number) {
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);
    if (!this.db.configured()) {
      throw new ServiceUnavailableException("AUDIT_STORE_UNAVAILABLE");
    }
    try {
      const res = await this.db.query(
        `SELECT id::text, actor_key, actor_id::text, role, action,
                target_type, target_id, occurred_at, mode, result,
                reason, idempotency_key, payload
           FROM public.admin_audit_events
          ORDER BY occurred_at DESC
          LIMIT $1`,
        [limit],
      );
      return { items: res.rows.map((row) => this.toPublic(row)) };
    } catch (err) {
      if (isUndefinedTable(err)) {
        throw new ServiceUnavailableException("AUDIT_STORE_UNAVAILABLE");
      }
      throw err;
    }
  }

  async get(id: string) {
    if (!auditCore.isUuid(id)) {
      throw new BadRequestException("AUDIT_EVENT_ID_INVALID");
    }
    if (!this.db.configured()) {
      throw new ServiceUnavailableException("AUDIT_STORE_UNAVAILABLE");
    }
    try {
      const res = await this.db.query(
        `SELECT id::text, actor_key, actor_id::text, role, action,
                target_type, target_id, occurred_at, mode, result,
                reason, idempotency_key, payload
           FROM public.admin_audit_events
          WHERE id = $1::uuid`,
        [id],
      );
      if (!res.rows[0]) throw new NotFoundException("AUDIT_EVENT_NOT_FOUND");
      return this.toPublic(res.rows[0]);
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) {
        throw err;
      }
      if (isUndefinedTable(err)) {
        throw new ServiceUnavailableException("AUDIT_STORE_UNAVAILABLE");
      }
      throw err;
    }
  }

  private async insert(event: AdminAuditEvent): Promise<void> {
    await this.db.query(
      `INSERT INTO public.admin_audit_events (
         actor_key, actor_id, role, action, target_type, target_id,
         occurred_at, mode, result, reason, idempotency_key, payload
       ) VALUES (
         $1, $2::uuid, $3, $4, $5, $6,
         $7::timestamptz, $8, $9, $10, $11, $12::jsonb
       )
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        event.actorKey,
        event.actorId,
        event.role,
        event.action,
        event.targetType,
        event.targetId,
        event.occurredAt,
        event.mode,
        event.result,
        event.reason || null,
        event.idempotencyKey,
        JSON.stringify(event.payload || {}),
      ],
    );
  }

  private toPublic(row: Record<string, unknown>) {
    return {
      id: String(row.id ?? ""),
      actorKey: String(row.actor_key ?? ""),
      actorId: row.actor_id == null ? null : String(row.actor_id),
      role: String(row.role ?? ""),
      action: String(row.action ?? ""),
      targetType: String(row.target_type ?? ""),
      targetId: String(row.target_id ?? ""),
      occurredAt:
        row.occurred_at instanceof Date
          ? row.occurred_at.toISOString()
          : String(row.occurred_at ?? ""),
      mode: String(row.mode ?? "n/a"),
      result: String(row.result ?? ""),
      reason: row.reason == null ? "" : String(row.reason),
      idempotencyKey:
        row.idempotency_key == null ? null : String(row.idempotency_key),
      payload:
        row.payload && typeof row.payload === "object"
          ? (row.payload as Record<string, unknown>)
          : {},
    };
  }
}

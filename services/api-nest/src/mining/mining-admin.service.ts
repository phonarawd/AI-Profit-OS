import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { PostgresService, type DbQuerier } from "../db/postgres";
import { assertAmountUsdt, cmpAmount } from "../ledger/ledger.money";
import { MiningOperationCoordinatorService } from "./mining-operation-coordinator.service";

type AdminActor = { adminId: string; role: string };

type MineRow = {
  id: string;
  code: string;
  display_name: string;
  description: string;
  asset_code: string;
  status: string;
  principal_currency: string;
  min_position_usdt: string | null;
  max_position_usdt: string | null;
  display_order: number;
  metadata: Record<string, unknown>;
  published_at: string | Date | null;
  ended_at: string | Date | null;
  created_by_admin_id: string | null;
  updated_by_admin_id: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type RateRow = {
  id: string;
  mine_id: string;
  version_no: number;
  status: string;
  daily_rate: string;
  effective_at: string | Date | null;
  ended_at: string | Date | null;
  approval_requested_at: string | Date | null;
  approved_at: string | Date | null;
  approval_request_id: string | null;
  created_by_admin_id: string | null;
  approved_by_admin_id: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type AuditIdemRow = {
  action: string;
  target_type: string;
  target_id: string;
  payload: { fingerprint?: string; resourceId?: string } | null;
};

function iso(value: string | Date | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new BadRequestException("시간 값을 확인해 주세요.");
  return date.toISOString();
}

function requireText(raw: unknown, label: string, min = 1, max = 200): string {
  const value = String(raw ?? "").trim();
  if (value.length < min || value.length > max) {
    throw new BadRequestException(`${label} 값을 확인해 주세요.`);
  }
  return value;
}

function optionalText(raw: unknown, label: string, max = 2000): string | undefined {
  if (raw === undefined) return undefined;
  const value = String(raw ?? "").trim();
  if (value.length > max) throw new BadRequestException(`${label} 값을 확인해 주세요.`);
  return value;
}

function requireReason(raw: unknown): string {
  return requireText(raw, "사유", 8, 500);
}

function requireAdminKey(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (value.length < 8 || value.length > 128) {
    throw new BadRequestException("요청 키가 필요합니다.");
  }
  return value;
}

function mineCode(raw: unknown): string {
  const value = requireText(raw, "광산 코드", 2, 64).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(value)) {
    throw new BadRequestException("광산 코드를 확인해 주세요.");
  }
  return value;
}

function assetCode(raw: unknown): string {
  return requireText(raw, "자산 코드", 1, 64).toUpperCase();
}

function optionalMoney(raw: unknown, label: string): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || String(raw).trim() === "") return null;
  try {
    return assertAmountUsdt(String(raw), label);
  } catch {
    throw new BadRequestException(`${label} 값을 확인해 주세요.`);
  }
}

function dailyRate(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (!/^(?:0|[1-9]\d{0,17})(?:\.\d{1,18})?$/.test(value)) {
    throw new BadRequestException("일 수익률을 확인해 주세요.");
  }
  return value;
}

function displayOrder(raw: unknown): number {
  const value = Number(raw ?? 0);
  if (!Number.isInteger(value) || value < -1_000_000 || value > 1_000_000) {
    throw new BadRequestException("표시 순서를 확인해 주세요.");
  }
  return value;
}

function metadata(raw: unknown): Record<string, unknown> {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new BadRequestException("메타데이터를 확인해 주세요.");
  }
  return raw as Record<string, unknown>;
}

function effectiveAt(raw: unknown): string {
  const value = requireText(raw, "적용 시각", 1, 100);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new BadRequestException("적용 시각을 확인해 주세요.");
  return date.toISOString();
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

@Injectable()
export class MiningAdminService {
  constructor(
    private readonly db: PostgresService,
    private readonly operations: MiningOperationCoordinatorService,
  ) {}

  async listMines(limitRaw?: number) {
    const limit = Math.min(Math.max(Number(limitRaw) || 100, 1), 200);
    const res = await this.db.query<MineRow & { position_count: string; active_position_count: string }>(
      `SELECT m.id::text,m.code,m.display_name,m.description,m.asset_code,m.status,
              m.principal_currency,m.min_position_usdt::text,m.max_position_usdt::text,
              m.display_order,m.metadata,m.published_at,m.ended_at,
              m.created_by_admin_id::text,m.updated_by_admin_id::text,m.created_at,m.updated_at,
              count(p.id)::text AS position_count,
              count(p.id) FILTER (WHERE p.status='ACTIVE')::text AS active_position_count
         FROM public.mines m
         LEFT JOIN public.mine_positions p ON p.mine_id=m.id
        GROUP BY m.id
        ORDER BY m.display_order,m.created_at
        LIMIT $1`,
      [limit],
    );
    return {
      items: res.rows.map((row) => ({
        ...this.minePublic(row),
        positionCount: Number(row.position_count),
        activePositionCount: Number(row.active_position_count),
      })),
    };
  }

  async getMine(mineId: string) {
    const mine = await this.loadMine(this.db, mineId);
    const rates = await this.listRateVersions(mineId, 20);
    return { ...this.minePublic(mine), rateVersions: rates.items };
  }

  async createMine(input: {
    actor: AdminActor;
    idempotencyKey: unknown;
    code: unknown;
    displayName: unknown;
    description?: unknown;
    assetCode: unknown;
    minPrincipalAmount?: unknown;
    maxPrincipalAmount?: unknown;
    displayOrder?: unknown;
    metadata?: unknown;
    reason: unknown;
  }) {
    const idem = requireAdminKey(input.idempotencyKey);
    const code = mineCode(input.code);
    const name = requireText(input.displayName, "광산명", 1, 100);
    const description = optionalText(input.description, "설명", 4000) ?? "";
    const asset = assetCode(input.assetCode);
    const min = optionalMoney(input.minPrincipalAmount, "최소 운용 금액") ?? null;
    const max = optionalMoney(input.maxPrincipalAmount, "최대 운용 금액") ?? null;
    if (min && max && cmpAmount(min, max) > 0) {
      throw new BadRequestException("최소 운용 금액이 최대 운용 금액보다 클 수 없습니다.");
    }
    const order = displayOrder(input.displayOrder);
    const meta = metadata(input.metadata);
    const reason = requireReason(input.reason);
    const fp = fingerprint(["createMine", code, name, description, asset, min, max, order, meta]);

    return this.withMutation({
      actor: input.actor,
      idempotencyKey: idem,
      action: "MiningAdminController.createMine",
      targetType: "mine",
      reason,
      fingerprint: fp,
      work: async (client) => {
        const inserted = await client.query<MineRow>(
          `INSERT INTO public.mines (
             code,display_name,description,asset_code,status,principal_currency,
             min_position_usdt,max_position_usdt,display_order,metadata,
             created_by_admin_id,updated_by_admin_id
           ) VALUES ($1,$2,$3,$4,'READY','USDT',$5::numeric,$6::numeric,$7,$8::jsonb,$9::uuid,$9::uuid)
           RETURNING id::text,code,display_name,description,asset_code,status,principal_currency,
                     min_position_usdt::text,max_position_usdt::text,display_order,metadata,
                     published_at,ended_at,created_by_admin_id::text,updated_by_admin_id::text,
                     created_at,updated_at`,
          [code, name, description, asset, min, max, order, JSON.stringify(meta), input.actor.adminId],
        );
        const row = inserted.rows[0];
        if (!row) throw new ConflictException("광산을 생성할 수 없습니다.");
        return { resourceId: row.id, value: this.minePublic(row) };
      },
      replay: async (client, resourceId) => this.minePublic(await this.loadMine(client, resourceId)),
    });
  }

  async updateMine(input: {
    actor: AdminActor;
    idempotencyKey: unknown;
    mineId: string;
    body: Record<string, unknown>;
  }) {
    const idem = requireAdminKey(input.idempotencyKey);
    const reason = requireReason(input.body.reason);
    const changes: Array<{ sql: string; value: unknown }> = [];
    const fingerprintParts: unknown[] = ["updateMine", input.mineId];

    if (input.body.displayName !== undefined) {
      const value = requireText(input.body.displayName, "광산명", 1, 100);
      changes.push({ sql: "display_name", value });
      fingerprintParts.push(["displayName", value]);
    }
    if (input.body.description !== undefined) {
      const value = optionalText(input.body.description, "설명", 4000) ?? "";
      changes.push({ sql: "description", value });
      fingerprintParts.push(["description", value]);
    }
    if (input.body.minPrincipalAmount !== undefined) {
      const value = optionalMoney(input.body.minPrincipalAmount, "최소 운용 금액") ?? null;
      changes.push({ sql: "min_position_usdt", value });
      fingerprintParts.push(["minPrincipalAmount", value]);
    }
    if (input.body.maxPrincipalAmount !== undefined) {
      const value = optionalMoney(input.body.maxPrincipalAmount, "최대 운용 금액") ?? null;
      changes.push({ sql: "max_position_usdt", value });
      fingerprintParts.push(["maxPrincipalAmount", value]);
    }
    if (input.body.displayOrder !== undefined) {
      const value = displayOrder(input.body.displayOrder);
      changes.push({ sql: "display_order", value });
      fingerprintParts.push(["displayOrder", value]);
    }
    if (input.body.metadata !== undefined) {
      const value = metadata(input.body.metadata);
      changes.push({ sql: "metadata", value: JSON.stringify(value) });
      fingerprintParts.push(["metadata", value]);
    }
    if (changes.length === 0) throw new BadRequestException("변경할 항목이 없습니다.");

    return this.withMutation({
      actor: input.actor,
      idempotencyKey: idem,
      action: "MiningAdminController.updateMine",
      targetType: "mine",
      reason,
      fingerprint: fingerprint(fingerprintParts),
      work: async (client) => {
        const current = await this.loadMine(client, input.mineId, true);
        if (current.status === "ENDED") throw new ConflictException("종료된 광산은 수정할 수 없습니다.");
        const params: unknown[] = [input.mineId, input.actor.adminId];
        const sets = changes.map((entry, index) => {
          params.push(entry.value);
          const cast = entry.sql === "min_position_usdt" || entry.sql === "max_position_usdt"
            ? "::numeric"
            : entry.sql === "metadata"
              ? "::jsonb"
              : "";
          return `${entry.sql}=$${index + 3}${cast}`;
        });
        await client.query(
          `UPDATE public.mines SET ${sets.join(",")},updated_by_admin_id=$2::uuid WHERE id=$1::uuid`,
          params,
        );
        const next = await this.loadMine(client, input.mineId);
        if (next.min_position_usdt && next.max_position_usdt && cmpAmount(next.min_position_usdt, next.max_position_usdt) > 0) {
          throw new BadRequestException("최소 운용 금액이 최대 운용 금액보다 클 수 없습니다.");
        }
        return { resourceId: input.mineId, value: this.minePublic(next) };
      },
      replay: async (client, resourceId) => this.minePublic(await this.loadMine(client, resourceId)),
    });
  }

  publishMine(input: AdminStateInput) {
    return this.changeMineState(input, "publish", async (client, mine) => {
      if (mine.status === "ENDED") throw new ConflictException("종료된 광산은 공개할 수 없습니다.");
      const rate = await this.currentApprovedRate(client, mine.id, new Date());
      if (!rate) throw new ConflictException("적용 가능한 승인 수익률이 필요합니다.");
      await client.query(
        `UPDATE public.mines
            SET status='ACTIVE',published_at=COALESCE(published_at,now()),ended_at=NULL,updated_by_admin_id=$2::uuid
          WHERE id=$1::uuid`,
        [mine.id, input.actor.adminId],
      );
    });
  }

  pauseNewPositions(input: AdminStateInput) {
    return this.changeMineState(input, "pauseNewPositions", async (client, mine) => {
      if (mine.status === "ENDED") throw new ConflictException("종료된 광산입니다.");
      await client.query(
        `UPDATE public.mines SET status='NEW_POSITIONS_PAUSED',updated_by_admin_id=$2::uuid WHERE id=$1::uuid`,
        [mine.id, input.actor.adminId],
      );
    });
  }

  pauseMine(input: AdminStateInput) {
    return this.changeMineState(input, "pauseMine", async (client, mine) => {
      if (mine.status === "ENDED") throw new ConflictException("종료된 광산입니다.");
      await client.query(
        `UPDATE public.mines SET status='PAUSED',updated_by_admin_id=$2::uuid WHERE id=$1::uuid`,
        [mine.id, input.actor.adminId],
      );
    });
  }

  resumeMine(input: AdminStateInput) {
    return this.changeMineState(input, "resumeMine", async (client, mine) => {
      if (!mine.published_at) throw new ConflictException("먼저 광산을 공개해 주세요.");
      if (mine.status === "ENDED") throw new ConflictException("종료된 광산입니다.");
      const rate = await this.currentApprovedRate(client, mine.id, new Date());
      if (!rate) throw new ConflictException("적용 가능한 승인 수익률이 필요합니다.");
      await client.query(
        `UPDATE public.mines SET status='ACTIVE',updated_by_admin_id=$2::uuid WHERE id=$1::uuid`,
        [mine.id, input.actor.adminId],
      );
    });
  }

  endMine(input: AdminStateInput) {
    return this.changeMineState(input, "endMine", async (client, mine) => {
      if (mine.status === "ENDED") return;
      const open = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM public.mine_positions WHERE mine_id=$1::uuid AND status <> 'ENDED'`,
        [mine.id],
      );
      if (Number(open.rows[0]?.count ?? 0) > 0) {
        throw new ConflictException("운용 중인 포지션이 있어 광산을 종료할 수 없습니다.");
      }
      const endedAt = new Date().toISOString();
      await client.query(
        `UPDATE public.mine_rate_versions
            SET status='ENDED',ended_at=COALESCE(ended_at,$2::timestamptz)
          WHERE mine_id=$1::uuid AND status='ACTIVE'`,
        [mine.id, endedAt],
      );
      await client.query(
        `UPDATE public.mines
            SET status='ENDED',ended_at=$2::timestamptz,updated_by_admin_id=$3::uuid
          WHERE id=$1::uuid`,
        [mine.id, endedAt, input.actor.adminId],
      );
    });
  }

  async listRateVersions(mineId: string, limitRaw?: number) {
    await this.loadMine(this.db, mineId);
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 100);
    const res = await this.db.query<RateRow>(
      `${this.rateSelect()} WHERE mine_id=$1::uuid ORDER BY version_no DESC LIMIT $2`,
      [mineId, limit],
    );
    return { items: res.rows.map((row) => this.ratePublic(row)) };
  }

  async createRateVersion(input: {
    actor: AdminActor;
    idempotencyKey: unknown;
    mineId: string;
    dailyRate: unknown;
    reason: unknown;
  }) {
    const idem = requireAdminKey(input.idempotencyKey);
    const rate = dailyRate(input.dailyRate);
    const reason = requireReason(input.reason);
    const fp = fingerprint(["createRateVersion", input.mineId, rate]);
    return this.withMutation({
      actor: input.actor,
      idempotencyKey: idem,
      action: "MiningAdminController.createRateVersion",
      targetType: "mine_rate_version",
      reason,
      fingerprint: fp,
      work: async (client) => {
        const mine = await this.loadMine(client, input.mineId, true);
        if (mine.status === "ENDED") throw new ConflictException("종료된 광산에는 수익률을 추가할 수 없습니다.");
        const next = await client.query<{ version_no: number }>(
          `SELECT COALESCE(max(version_no),0)+1 AS version_no FROM public.mine_rate_versions WHERE mine_id=$1::uuid`,
          [input.mineId],
        );
        const inserted = await client.query<RateRow>(
          `INSERT INTO public.mine_rate_versions (
             mine_id,version_no,status,daily_rate,created_by_admin_id
           ) VALUES ($1::uuid,$2,'DRAFT',$3::numeric,$4::uuid)
           RETURNING id::text,mine_id::text,version_no,status,daily_rate::text,effective_at,ended_at,
                     approval_requested_at,approved_at,approval_request_id::text,
                     created_by_admin_id::text,approved_by_admin_id::text,created_at,updated_at`,
          [input.mineId, Number(next.rows[0]?.version_no ?? 1), rate, input.actor.adminId],
        );
        const row = inserted.rows[0];
        if (!row) throw new ConflictException("수익률 버전을 생성할 수 없습니다.");
        return { resourceId: row.id, value: this.ratePublic(row) };
      },
      replay: async (client, resourceId) => this.ratePublic(await this.loadRate(client, input.mineId, resourceId)),
    });
  }

  async updateRateVersion(input: {
    actor: AdminActor;
    idempotencyKey: unknown;
    mineId: string;
    rateVersionId: string;
    dailyRate: unknown;
    reason: unknown;
  }) {
    const idem = requireAdminKey(input.idempotencyKey);
    const rate = dailyRate(input.dailyRate);
    const reason = requireReason(input.reason);
    return this.withMutation({
      actor: input.actor,
      idempotencyKey: idem,
      action: "MiningAdminController.updateRateVersion",
      targetType: "mine_rate_version",
      reason,
      fingerprint: fingerprint(["updateRateVersion", input.mineId, input.rateVersionId, rate]),
      work: async (client) => {
        const current = await this.loadRate(client, input.mineId, input.rateVersionId, true);
        if (current.status !== "DRAFT") throw new ConflictException("초안 수익률만 수정할 수 있습니다.");
        await client.query(
          `UPDATE public.mine_rate_versions SET daily_rate=$3::numeric WHERE id=$1::uuid AND mine_id=$2::uuid`,
          [input.rateVersionId, input.mineId, rate],
        );
        return {
          resourceId: input.rateVersionId,
          value: this.ratePublic(await this.loadRate(client, input.mineId, input.rateVersionId)),
        };
      },
      replay: async (client, resourceId) => this.ratePublic(await this.loadRate(client, input.mineId, resourceId)),
    });
  }

  async requestRateApproval(input: RateActionInput) {
    const idem = requireAdminKey(input.idempotencyKey);
    const reason = requireReason(input.reason);
    return this.withMutation({
      actor: input.actor,
      idempotencyKey: idem,
      action: "MiningAdminController.requestRateApproval",
      targetType: "mine_rate_version",
      reason,
      fingerprint: fingerprint(["requestRateApproval", input.mineId, input.rateVersionId, reason]),
      work: async (client) => {
        const current = await this.loadRate(client, input.mineId, input.rateVersionId, true);
        if (current.status !== "DRAFT") throw new ConflictException("초안 수익률만 승인 요청할 수 있습니다.");
        const approval = await client.query<{ id: string }>(
          `INSERT INTO public.admin_approval_requests (
             action_type,payload,maker_admin_id,status,reason
           ) VALUES ('mine_rate_version_approval',$1::jsonb,$2::uuid,'pending',$3)
           RETURNING id::text`,
          [JSON.stringify({ mineId: input.mineId, rateVersionId: input.rateVersionId }), input.actor.adminId, reason],
        );
        const approvalId = approval.rows[0]?.id;
        if (!approvalId) throw new ConflictException("승인 요청을 생성할 수 없습니다.");
        await client.query(
          `UPDATE public.mine_rate_versions
              SET status='APPROVAL_PENDING',approval_requested_at=now(),approval_request_id=$3::uuid
            WHERE id=$1::uuid AND mine_id=$2::uuid`,
          [input.rateVersionId, input.mineId, approvalId],
        );
        return {
          resourceId: input.rateVersionId,
          value: this.ratePublic(await this.loadRate(client, input.mineId, input.rateVersionId)),
        };
      },
      replay: async (client, resourceId) => this.ratePublic(await this.loadRate(client, input.mineId, resourceId)),
    });
  }

  async approveRateVersion(input: RateActionInput) {
    const idem = requireAdminKey(input.idempotencyKey);
    const reason = requireReason(input.reason);
    return this.withMutation({
      actor: input.actor,
      idempotencyKey: idem,
      action: "MiningAdminController.approveRateVersion",
      targetType: "mine_rate_version",
      reason,
      fingerprint: fingerprint(["approveRateVersion", input.mineId, input.rateVersionId, reason]),
      work: async (client) => {
        const current = await this.loadRate(client, input.mineId, input.rateVersionId, true);
        if (current.status !== "APPROVAL_PENDING" || !current.approval_request_id) {
          throw new ConflictException("승인 요청 상태를 확인해 주세요.");
        }
        if (current.created_by_admin_id === input.actor.adminId) {
          throw new ConflictException("작성자와 승인자는 달라야 합니다.");
        }
        const approval = await client.query<{
          status: string;
          maker_admin_id: string;
          checker_admin_id: string | null;
        }>(
          `SELECT status,maker_admin_id::text,checker_admin_id::text
             FROM public.admin_approval_requests
            WHERE id=$1::uuid FOR UPDATE`,
          [current.approval_request_id],
        );
        const request = approval.rows[0];
        if (!request || request.status !== "pending") {
          throw new ConflictException("승인 요청 상태를 확인해 주세요.");
        }
        if (request.maker_admin_id === input.actor.adminId) {
          throw new ConflictException("요청자와 승인자는 달라야 합니다.");
        }
        await client.query(
          `UPDATE public.admin_approval_requests
              SET status='approved',checker_admin_id=$2::uuid,decided_at=now()
            WHERE id=$1::uuid`,
          [current.approval_request_id, input.actor.adminId],
        );
        await client.query(
          `UPDATE public.mine_rate_versions
              SET approved_at=now(),approved_by_admin_id=$3::uuid
            WHERE id=$1::uuid AND mine_id=$2::uuid`,
          [input.rateVersionId, input.mineId, input.actor.adminId],
        );
        return {
          resourceId: input.rateVersionId,
          value: this.ratePublic(await this.loadRate(client, input.mineId, input.rateVersionId)),
        };
      },
      replay: async (client, resourceId) => this.ratePublic(await this.loadRate(client, input.mineId, resourceId)),
    });
  }

  async scheduleRateVersion(input: RateActionInput & { effectiveAt: unknown }) {
    const idem = requireAdminKey(input.idempotencyKey);
    const reason = requireReason(input.reason);
    const when = effectiveAt(input.effectiveAt);
    return this.withMutation({
      actor: input.actor,
      idempotencyKey: idem,
      action: "MiningAdminController.scheduleRateVersion",
      targetType: "mine_rate_version",
      reason,
      fingerprint: fingerprint(["scheduleRateVersion", input.mineId, input.rateVersionId, when]),
      work: async (client) => {
        const current = await this.loadRate(client, input.mineId, input.rateVersionId, true);
        if (current.status !== "APPROVAL_PENDING" || !current.approved_at) {
          throw new ConflictException("승인된 수익률만 예약할 수 있습니다.");
        }
        const due = Date.parse(when) <= Date.now();
        if (due) {
          await this.activateRate(client, input.mineId, input.rateVersionId, when);
        } else {
          await client.query(
            `UPDATE public.mine_rate_versions
                SET status='SCHEDULED',effective_at=$3::timestamptz
              WHERE id=$1::uuid AND mine_id=$2::uuid`,
            [input.rateVersionId, input.mineId, when],
          );
        }
        return {
          resourceId: input.rateVersionId,
          value: this.ratePublic(await this.loadRate(client, input.mineId, input.rateVersionId)),
        };
      },
      replay: async (client, resourceId) => this.ratePublic(await this.loadRate(client, input.mineId, resourceId)),
    });
  }

  async listPositions(filters: { mineId?: string; userId?: string; status?: string; limit?: number }) {
    const params: unknown[] = [];
    const where: string[] = [];
    if (filters.mineId) { params.push(filters.mineId); where.push(`p.mine_id=$${params.length}::uuid`); }
    if (filters.userId) { params.push(filters.userId); where.push(`p.user_id=$${params.length}::uuid`); }
    if (filters.status) { params.push(filters.status); where.push(`p.status=$${params.length}`); }
    const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
    params.push(limit);
    const res = await this.db.query<{
      id: string; user_id: string; mine_id: string; status: string;
      requested_principal_usdt: string; principal_usdt: string;
      started_at: string | Date | null; ended_at: string | Date | null;
      created_at: string | Date; updated_at: string | Date; mine_code: string; mine_name: string;
    }>(
      `SELECT p.id::text,p.user_id::text,p.mine_id::text,p.status,
              p.requested_principal_usdt::text,p.principal_usdt::text,
              p.started_at,p.ended_at,p.created_at,p.updated_at,
              m.code AS mine_code,m.display_name AS mine_name
         FROM public.mine_positions p JOIN public.mines m ON m.id=p.mine_id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY p.created_at DESC LIMIT $${params.length}`,
      params,
    );
    return { items: res.rows.map((row) => this.positionAdmin(row)) };
  }

  async getPosition(positionId: string) {
    const res = await this.db.query<any>(
      `SELECT p.id::text,p.user_id::text,p.mine_id::text,p.status,
              p.requested_principal_usdt::text,p.principal_usdt::text,
              p.started_at,p.ended_at,p.created_at,p.updated_at,
              m.code AS mine_code,m.display_name AS mine_name
         FROM public.mine_positions p JOIN public.mines m ON m.id=p.mine_id
        WHERE p.id=$1::uuid`,
      [positionId],
    );
    const row = res.rows[0];
    if (!row) throw new NotFoundException("운용 내역을 찾을 수 없습니다.");
    const events = await this.db.query<any>(
      `SELECT id::text,event_type,amount_usdt::text,principal_before_usdt::text,
              principal_after_usdt::text,effective_at,ledger_journal_id::text,created_at
         FROM public.mine_position_events WHERE position_id=$1::uuid
        ORDER BY effective_at,created_at`,
      [positionId],
    );
    return { ...this.positionAdmin(row), events: events.rows.map((event) => ({
      eventId: event.id,
      eventType: event.event_type,
      amount: event.amount_usdt,
      principalBeforeAmount: event.principal_before_usdt,
      principalAfterAmount: event.principal_after_usdt,
      effectiveAt: iso(event.effective_at),
      ledgerJournalId: event.ledger_journal_id,
      createdAt: iso(event.created_at),
    })) };
  }

  async listSettlements(filters: { mineId?: string; userId?: string; status?: string; limit?: number }) {
    const params: unknown[] = [];
    const where: string[] = [];
    if (filters.mineId) { params.push(filters.mineId); where.push(`s.mine_id=$${params.length}::uuid`); }
    if (filters.userId) { params.push(filters.userId); where.push(`s.user_id=$${params.length}::uuid`); }
    if (filters.status) { params.push(filters.status); where.push(`s.status=$${params.length}`); }
    const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
    params.push(limit);
    const res = await this.db.query<any>(
      `SELECT s.id::text,s.position_id::text,s.user_id::text,s.mine_id::text,s.status,
              s.period_start,s.period_end,s.calculated_profit_usdt::text,s.credited_profit_usdt::text,
              s.ledger_journal_id::text,s.attempt_count,s.failure_code,s.created_at,s.updated_at,
              m.code AS mine_code,m.display_name AS mine_name
         FROM public.mine_settlements s JOIN public.mines m ON m.id=s.mine_id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY s.period_end DESC,s.id DESC LIMIT $${params.length}`,
      params,
    );
    return { items: res.rows.map((row) => this.settlementAdmin(row)) };
  }

  async getSettlement(settlementId: string) {
    const res = await this.db.query<any>(
      `SELECT s.id::text,s.position_id::text,s.user_id::text,s.mine_id::text,s.status,
              s.period_start,s.period_end,s.calculated_profit_usdt::text,s.credited_profit_usdt::text,
              s.ledger_journal_id::text,s.attempt_count,s.failure_code,s.created_at,s.updated_at,
              m.code AS mine_code,m.display_name AS mine_name
         FROM public.mine_settlements s JOIN public.mines m ON m.id=s.mine_id
        WHERE s.id=$1::uuid`,
      [settlementId],
    );
    const row = res.rows[0];
    if (!row) throw new NotFoundException("정산 내역을 찾을 수 없습니다.");
    const accruals = await this.db.query<any>(
      `SELECT a.id::text,a.rate_version_id::text,a.period_start,a.period_end,
              a.principal_usdt::text,a.daily_rate::text,a.accrued_profit_usdt::text,a.calc_version
         FROM public.mine_settlement_accruals sa
         JOIN public.mine_accruals a ON a.id=sa.accrual_id
        WHERE sa.settlement_id=$1::uuid ORDER BY a.period_start`,
      [settlementId],
    );
    return { ...this.settlementAdmin(row), accruals: accruals.rows.map((a) => ({
      accrualId: a.id,
      rateVersionId: a.rate_version_id,
      periodStartAt: iso(a.period_start),
      periodEndAt: iso(a.period_end),
      principalAmount: a.principal_usdt,
      dailyRate: a.daily_rate,
      profitAmount: a.accrued_profit_usdt,
      calcVersion: a.calc_version,
    })) };
  }

  async retrySettlement(input: {
    actor: AdminActor;
    idempotencyKey: unknown;
    settlementId: string;
    reason: unknown;
  }) {
    const idem = requireAdminKey(input.idempotencyKey);
    const reason = requireReason(input.reason);
    const fp = fingerprint(["retrySettlement", input.settlementId]);
    const existing = await this.db.query<AuditIdemRow>(
      `SELECT action,target_type,target_id,payload FROM public.admin_audit_events WHERE idempotency_key=$1`,
      [idem],
    );
    if (existing.rows[0]) {
      this.assertReplay(existing.rows[0], "MiningAdminController.retrySettlement", fp);
      return this.getSettlement(input.settlementId);
    }
    await this.operations.retrySettlement(input.settlementId);
    const result = await this.getSettlement(input.settlementId);
    await this.db.query(
      `INSERT INTO public.admin_audit_events (
         actor_key,actor_id,role,action,target_type,target_id,occurred_at,mode,result,reason,idempotency_key,payload
       ) VALUES ($1::uuid::text,$1::uuid,$2,$3,'mine_settlement',$4,now(),'LIVE','applied',$5,$6,$7::jsonb)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [input.actor.adminId, input.actor.role, "MiningAdminController.retrySettlement", input.settlementId, reason, idem,
       JSON.stringify({ fingerprint: fp, resourceId: input.settlementId })],
    );
    return result;
  }

  private async changeMineState(
    input: AdminStateInput,
    handler: string,
    apply: (client: PoolClient, mine: MineRow) => Promise<void>,
  ) {
    const idem = requireAdminKey(input.idempotencyKey);
    const reason = requireReason(input.reason);
    return this.withMutation({
      actor: input.actor,
      idempotencyKey: idem,
      action: `MiningAdminController.${handler}`,
      targetType: "mine",
      reason,
      fingerprint: fingerprint([handler, input.mineId]),
      work: async (client) => {
        const mine = await this.loadMine(client, input.mineId, true);
        await apply(client, mine);
        return { resourceId: mine.id, value: this.minePublic(await this.loadMine(client, mine.id)) };
      },
      replay: async (client, resourceId) => this.minePublic(await this.loadMine(client, resourceId)),
    });
  }

  private async withMutation<T>(opts: {
    actor: AdminActor;
    idempotencyKey: string;
    action: string;
    targetType: string;
    reason: string;
    fingerprint: string;
    work: (client: PoolClient) => Promise<{ resourceId: string; value: T }>;
    replay: (client: PoolClient, resourceId: string) => Promise<T>;
  }): Promise<T> {
    return this.db.withTransaction(async (client) => {
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [opts.idempotencyKey]);
      const prior = await client.query<AuditIdemRow>(
        `SELECT action,target_type,target_id,payload FROM public.admin_audit_events WHERE idempotency_key=$1`,
        [opts.idempotencyKey],
      );
      const existing = prior.rows[0];
      if (existing) {
        this.assertReplay(existing, opts.action, opts.fingerprint);
        const resourceId = String(existing.payload?.resourceId ?? existing.target_id ?? "");
        return opts.replay(client, resourceId);
      }
      const completed = await opts.work(client);
      await client.query(
        `INSERT INTO public.admin_audit_events (
           actor_key,actor_id,role,action,target_type,target_id,occurred_at,mode,result,reason,idempotency_key,payload
         ) VALUES ($1::uuid::text,$1::uuid,$2,$3,$4,$5,now(),'LIVE','applied',$6,$7,$8::jsonb)`,
        [
          opts.actor.adminId,
          opts.actor.role,
          opts.action,
          opts.targetType,
          completed.resourceId,
          opts.reason,
          opts.idempotencyKey,
          JSON.stringify({ fingerprint: opts.fingerprint, resourceId: completed.resourceId }),
        ],
      );
      return completed.value;
    });
  }

  private assertReplay(existing: AuditIdemRow, action: string, expectedFingerprint: string) {
    if (existing.action !== action || existing.payload?.fingerprint !== expectedFingerprint) {
      throw new ConflictException("같은 요청 키를 다른 내용으로 사용할 수 없습니다.");
    }
  }

  private async loadMine(q: DbQuerier, mineId: string, lock = false): Promise<MineRow> {
    const res = await q.query<MineRow>(
      `SELECT id::text,code,display_name,description,asset_code,status,principal_currency,
              min_position_usdt::text,max_position_usdt::text,display_order,metadata,
              published_at,ended_at,created_by_admin_id::text,updated_by_admin_id::text,
              created_at,updated_at
         FROM public.mines WHERE id=$1::uuid${lock ? " FOR UPDATE" : ""}`,
      [mineId],
    );
    if (!res.rows[0]) throw new NotFoundException("광산을 찾을 수 없습니다.");
    return res.rows[0];
  }

  private rateSelect() {
    return `SELECT id::text,mine_id::text,version_no,status,daily_rate::text,effective_at,ended_at,
                   approval_requested_at,approved_at,approval_request_id::text,
                   created_by_admin_id::text,approved_by_admin_id::text,created_at,updated_at
              FROM public.mine_rate_versions`;
  }

  private async loadRate(q: DbQuerier, mineId: string, rateVersionId: string, lock = false): Promise<RateRow> {
    const res = await q.query<RateRow>(
      `${this.rateSelect()} WHERE id=$1::uuid AND mine_id=$2::uuid${lock ? " FOR UPDATE" : ""}`,
      [rateVersionId, mineId],
    );
    if (!res.rows[0]) throw new NotFoundException("수익률 버전을 찾을 수 없습니다.");
    return res.rows[0];
  }

  private async currentApprovedRate(q: DbQuerier, mineId: string, now: Date) {
    const res = await q.query<{ id: string }>(
      `SELECT id::text FROM public.mine_rate_versions
        WHERE mine_id=$1::uuid
          AND approved_at IS NOT NULL
          AND effective_at IS NOT NULL
          AND effective_at <= $2::timestamptz
          AND status IN ('ACTIVE','SCHEDULED')
        ORDER BY effective_at DESC LIMIT 1`,
      [mineId, now.toISOString()],
    );
    return res.rows[0] ?? null;
  }

  private async activateRate(client: PoolClient, mineId: string, rateVersionId: string, when: string) {
    await client.query(
      `UPDATE public.mine_rate_versions
          SET status='ENDED',ended_at=$3::timestamptz
        WHERE mine_id=$1::uuid AND status='ACTIVE' AND id <> $2::uuid`,
      [mineId, rateVersionId, when],
    );
    await client.query(
      `UPDATE public.mine_rate_versions
          SET status='ACTIVE',effective_at=$3::timestamptz,ended_at=NULL
        WHERE id=$2::uuid AND mine_id=$1::uuid`,
      [mineId, rateVersionId, when],
    );
  }

  private minePublic(row: MineRow) {
    return {
      mineId: row.id,
      code: row.code,
      displayName: row.display_name,
      description: row.description,
      assetCode: row.asset_code,
      status: row.status,
      principalCurrency: row.principal_currency,
      minPrincipalAmount: row.min_position_usdt,
      maxPrincipalAmount: row.max_position_usdt,
      displayOrder: row.display_order,
      metadata: row.metadata,
      publishedAt: iso(row.published_at),
      endedAt: iso(row.ended_at),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    };
  }

  private ratePublic(row: RateRow) {
    return {
      rateVersionId: row.id,
      mineId: row.mine_id,
      versionNo: row.version_no,
      status: row.status,
      dailyRate: row.daily_rate,
      effectiveAt: iso(row.effective_at),
      endedAt: iso(row.ended_at),
      approvalRequestedAt: iso(row.approval_requested_at),
      approvedAt: iso(row.approved_at),
      approvalRequestId: row.approval_request_id,
      createdByAdminId: row.created_by_admin_id,
      approvedByAdminId: row.approved_by_admin_id,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    };
  }

  private positionAdmin(row: any) {
    return {
      positionId: row.id,
      userId: row.user_id,
      mineId: row.mine_id,
      mineCode: row.mine_code,
      mineName: row.mine_name,
      status: row.status,
      requestedPrincipalAmount: row.requested_principal_usdt,
      principalAmount: row.principal_usdt,
      startedAt: iso(row.started_at),
      endedAt: iso(row.ended_at),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    };
  }

  private settlementAdmin(row: any) {
    return {
      settlementId: row.id,
      positionId: row.position_id,
      userId: row.user_id,
      mineId: row.mine_id,
      mineCode: row.mine_code,
      mineName: row.mine_name,
      status: row.status,
      periodStartAt: iso(row.period_start),
      periodEndAt: iso(row.period_end),
      calculatedProfitAmount: row.calculated_profit_usdt,
      creditedProfitAmount: row.credited_profit_usdt,
      ledgerJournalId: row.ledger_journal_id,
      attemptCount: Number(row.attempt_count ?? 0),
      failureCode: row.failure_code,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    };
  }
}

type AdminStateInput = {
  actor: AdminActor;
  idempotencyKey: unknown;
  mineId: string;
  reason: unknown;
};

type RateActionInput = {
  actor: AdminActor;
  idempotencyKey: unknown;
  mineId: string;
  rateVersionId: string;
  reason: unknown;
};

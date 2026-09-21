import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { PostgresService } from "../db/postgres";
import { KillSwitchService } from "../kill-switch/kill-switch.service";
import {
  assertAmountUsdt,
  cmpAmount,
} from "../ledger/ledger.money";
import { LedgerPostingService } from "../ledger/ledger.posting.service";
import { LedgerProvisionService } from "../ledger/ledger.provision.service";

type AdminActor = { adminId: string; role: string };

type ReviewRow = {
  id: string;
  position_id: string;
  user_id: string;
  mine_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  requested_principal_usdt: string;
  threshold_usdt: string;
  idempotency_key: string;
  approval_request_id: string | null;
  reviewed_by_admin_id: string | null;
  review_reason: string | null;
  requested_at: string | Date;
  reviewed_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  mine_code?: string;
  mine_name?: string;
};

type PositionRow = {
  id: string;
  user_id: string;
  mine_id: string;
  status: string;
  requested_principal_usdt: string;
  principal_usdt: string;
};

type MineGateRow = {
  id: string;
  status: string;
  min_position_usdt: string | null;
  max_position_usdt: string | null;
  metadata: Record<string, unknown>;
};

type AuditRow = {
  action: string;
  target_id: string;
  payload: { fingerprint?: string; resourceId?: string } | null;
};

function iso(value: string | Date | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

function requestKey(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (value.length < 8 || value.length > 200) {
    throw new BadRequestException("요청 키가 필요합니다.");
  }
  return value;
}

function reason(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (value.length < 8 || value.length > 500) {
    throw new BadRequestException("사유를 확인해 주세요.");
  }
  return value;
}

function amount(raw: unknown, label: string): string {
  try {
    return assertAmountUsdt(String(raw ?? ""), label);
  } catch {
    throw new BadRequestException("금액을 확인해 주세요.");
  }
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

@Injectable()
export class MiningHighValueService {
  constructor(
    private readonly db: PostgresService,
    private readonly ledger: LedgerPostingService,
    private readonly provision: LedgerProvisionService,
    private readonly killSwitch: KillSwitchService,
  ) {}

  /**
   * Returns a pending position when high-value review is required.
   * Returns null only when the request is below the configured threshold.
   * Missing/malformed threshold fails closed; it never bypasses review.
   */
  async requestReviewIfRequired(input: {
    userId: string;
    mineId: string;
    principalAmount: unknown;
    idempotencyKey: unknown;
  }): Promise<{ positionId: string } | null> {
    const principal = amount(input.principalAmount, "principalAmount");
    const idem = requestKey(input.idempotencyKey);
    const mine = await this.loadMineGate(input.mineId);
    if (mine.status !== "ACTIVE") {
      throw new ConflictException("현재 신규 운용을 시작할 수 없습니다.");
    }
    this.assertWithinLimits(principal, mine.min_position_usdt, mine.max_position_usdt);
    const threshold = this.thresholdFromMetadata(mine.metadata);
    if (cmpAmount(principal, threshold) < 0) return null;

    await this.provision.provisionUserBucketAccounts(input.userId);

    return this.db.withTransaction(async (client) => {
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [idem]);
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO public.mine_positions (
           user_id,mine_id,status,requested_principal_usdt,principal_usdt,start_idempotency_key
         ) VALUES ($1::uuid,$2::uuid,'START_PENDING',$3::numeric,0,$4)
         ON CONFLICT (start_idempotency_key) DO NOTHING
         RETURNING id::text`,
        [input.userId, input.mineId, principal, idem],
      );
      let positionId = inserted.rows[0]?.id;
      if (!positionId) {
        const existing = await client.query<PositionRow>(
          `SELECT id::text,user_id::text,mine_id::text,status,
                  requested_principal_usdt::text,principal_usdt::text
             FROM public.mine_positions WHERE start_idempotency_key=$1 FOR UPDATE`,
          [idem],
        );
        const row = existing.rows[0];
        if (
          !row ||
          row.user_id !== input.userId ||
          row.mine_id !== input.mineId ||
          cmpAmount(row.requested_principal_usdt, principal) !== 0
        ) {
          throw new ConflictException("같은 요청 키를 다른 내용으로 사용할 수 없습니다.");
        }
        positionId = row.id;
      }

      const current = await client.query<PositionRow>(
        `SELECT id::text,user_id::text,mine_id::text,status,
                requested_principal_usdt::text,principal_usdt::text
           FROM public.mine_positions WHERE id=$1::uuid FOR UPDATE`,
        [positionId],
      );
      const position = current.rows[0];
      if (!position) throw new NotFoundException("운용 내역을 찾을 수 없습니다.");
      if (position.status === "ACTIVE") return { positionId };
      if (position.status !== "START_PENDING") {
        throw new ConflictException("현재 검토할 수 없는 운용 상태입니다.");
      }

      const reviewKey = `mine:high-value:${positionId}`;
      await client.query(
        `INSERT INTO public.mine_high_value_reviews (
           position_id,user_id,mine_id,status,requested_principal_usdt,
           threshold_usdt,idempotency_key
         ) VALUES ($1::uuid,$2::uuid,$3::uuid,'PENDING',$4::numeric,$5::numeric,$6)
         ON CONFLICT (position_id) DO NOTHING`,
        [positionId, input.userId, input.mineId, principal, threshold, reviewKey],
      );
      const review = await client.query<ReviewRow>(
        `SELECT id::text,position_id::text,user_id::text,mine_id::text,status,
                requested_principal_usdt::text,threshold_usdt::text,idempotency_key,
                approval_request_id::text,reviewed_by_admin_id::text,review_reason,
                requested_at,reviewed_at,created_at,updated_at
           FROM public.mine_high_value_reviews WHERE position_id=$1::uuid`,
        [positionId],
      );
      const row = review.rows[0];
      if (
        !row ||
        row.user_id !== input.userId ||
        row.mine_id !== input.mineId ||
        cmpAmount(row.requested_principal_usdt, principal) !== 0 ||
        cmpAmount(row.threshold_usdt, threshold) !== 0
      ) {
        throw new ConflictException("고액운용 검토 요청을 확인할 수 없습니다.");
      }
      return { positionId };
    });
  }

  async listReviews(filters: {
    mineId?: string;
    userId?: string;
    status?: string;
    limit?: number;
  }) {
    const params: unknown[] = [];
    const where: string[] = [];
    if (filters.mineId) {
      params.push(filters.mineId);
      where.push(`r.mine_id=$${params.length}::uuid`);
    }
    if (filters.userId) {
      params.push(filters.userId);
      where.push(`r.user_id=$${params.length}::uuid`);
    }
    if (filters.status) {
      const status = String(filters.status).trim().toUpperCase();
      if (!["PENDING", "APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
        throw new BadRequestException("검토 상태를 확인해 주세요.");
      }
      params.push(status);
      where.push(`r.status=$${params.length}`);
    }
    const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
    params.push(limit);
    const result = await this.db.query<ReviewRow>(
      `SELECT r.id::text,r.position_id::text,r.user_id::text,r.mine_id::text,r.status,
              r.requested_principal_usdt::text,r.threshold_usdt::text,r.idempotency_key,
              r.approval_request_id::text,r.reviewed_by_admin_id::text,r.review_reason,
              r.requested_at,r.reviewed_at,r.created_at,r.updated_at,
              m.code AS mine_code,m.display_name AS mine_name
         FROM public.mine_high_value_reviews r
         JOIN public.mines m ON m.id=r.mine_id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY CASE WHEN r.status='PENDING' THEN 0 ELSE 1 END,r.requested_at DESC
        LIMIT $${params.length}`,
      params,
    );
    return { items: result.rows.map((row) => this.publicReview(row)) };
  }

  async getReview(reviewId: string) {
    const result = await this.db.query<ReviewRow>(
      `SELECT r.id::text,r.position_id::text,r.user_id::text,r.mine_id::text,r.status,
              r.requested_principal_usdt::text,r.threshold_usdt::text,r.idempotency_key,
              r.approval_request_id::text,r.reviewed_by_admin_id::text,r.review_reason,
              r.requested_at,r.reviewed_at,r.created_at,r.updated_at,
              m.code AS mine_code,m.display_name AS mine_name
         FROM public.mine_high_value_reviews r
         JOIN public.mines m ON m.id=r.mine_id
        WHERE r.id=$1::uuid`,
      [reviewId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException("고액운용 검토를 찾을 수 없습니다.");
    return this.publicReview(row);
  }

  async approve(input: {
    actor: AdminActor;
    idempotencyKey: unknown;
    reviewId: string;
    reason: unknown;
  }) {
    await this.killSwitch.assertPath("mining_new_positions");
    const idem = requestKey(input.idempotencyKey);
    const why = reason(input.reason);
    const fp = fingerprint(["approveHighValueReview", input.reviewId, why]);
    const replay = await this.adminReplay(idem, "MiningAdminController.approveHighValueReview", fp);
    if (replay) return this.getReview(input.reviewId);

    const review = await this.loadReview(input.reviewId);
    if (review.status === "REJECTED" || review.status === "CANCELLED") {
      throw new ConflictException("거절되거나 취소된 요청은 승인할 수 없습니다.");
    }
    if (review.status === "PENDING") {
      await this.activatePendingPosition(review);
      await this.db.query(
        `UPDATE public.mine_high_value_reviews
            SET status='APPROVED',reviewed_by_admin_id=$2::uuid,review_reason=$3,
                reviewed_at=COALESCE(reviewed_at,now())
          WHERE id=$1::uuid AND status='PENDING'`,
        [input.reviewId, input.actor.adminId, why],
      );
    }
    await this.writeAudit({
      actor: input.actor,
      idempotencyKey: idem,
      action: "MiningAdminController.approveHighValueReview",
      targetId: input.reviewId,
      reason: why,
      fingerprint: fp,
    });
    return this.getReview(input.reviewId);
  }

  async reject(input: {
    actor: AdminActor;
    idempotencyKey: unknown;
    reviewId: string;
    reason: unknown;
  }) {
    const idem = requestKey(input.idempotencyKey);
    const why = reason(input.reason);
    const fp = fingerprint(["rejectHighValueReview", input.reviewId, why]);
    const replay = await this.adminReplay(idem, "MiningAdminController.rejectHighValueReview", fp);
    if (replay) return this.getReview(input.reviewId);

    await this.db.withTransaction(async (client) => {
      const review = await this.lockReview(client, input.reviewId);
      if (review.status === "APPROVED") {
        throw new ConflictException("이미 승인된 요청은 거절할 수 없습니다.");
      }
      if (review.status === "REJECTED") return;
      if (review.status !== "PENDING") {
        throw new ConflictException("현재 거절할 수 없는 검토 상태입니다.");
      }
      const position = await client.query<PositionRow>(
        `SELECT id::text,user_id::text,mine_id::text,status,
                requested_principal_usdt::text,principal_usdt::text
           FROM public.mine_positions WHERE id=$1::uuid FOR UPDATE`,
        [review.position_id],
      );
      const p = position.rows[0];
      if (!p) throw new NotFoundException("운용 내역을 찾을 수 없습니다.");
      if (p.status !== "START_PENDING" && p.status !== "ENDED") {
        throw new ConflictException("이미 시작된 운용은 거절할 수 없습니다.");
      }
      if (p.status === "START_PENDING") {
        await client.query(
          `UPDATE public.mine_positions
              SET status='ENDED',ended_at=now()
            WHERE id=$1::uuid AND status='START_PENDING'`,
          [p.id],
        );
      }
      await client.query(
        `UPDATE public.mine_high_value_reviews
            SET status='REJECTED',reviewed_by_admin_id=$2::uuid,review_reason=$3,reviewed_at=now()
          WHERE id=$1::uuid`,
        [input.reviewId, input.actor.adminId, why],
      );
    });
    await this.writeAudit({
      actor: input.actor,
      idempotencyKey: idem,
      action: "MiningAdminController.rejectHighValueReview",
      targetId: input.reviewId,
      reason: why,
      fingerprint: fp,
    });
    return this.getReview(input.reviewId);
  }

  private async activatePendingPosition(review: ReviewRow) {
    await this.provision.provisionUserBucketAccounts(review.user_id);
    let journal: Awaited<ReturnType<LedgerPostingService["postJournal"]>>;
    try {
      journal = await this.ledger.postJournal({
        idempotencyKey: `mine:position:start:${review.position_id}`,
        journalType: "mine_position_lock",
        lines: [
          {
            account: { userId: review.user_id, bucket: "principal" },
            direction: "debit",
            amountUsdt: review.requested_principal_usdt,
          },
          {
            account: { userId: review.user_id, bucket: "locked" },
            direction: "credit",
            amountUsdt: review.requested_principal_usdt,
          },
        ],
        referenceType: "mine_position",
        referenceId: review.position_id,
        memo: "mining high-value position start after review",
        createdBy: review.user_id,
      });
    } catch (error) {
      if (
        error instanceof BadRequestException &&
        String(error.message).includes("INSUFFICIENT_BALANCE")
      ) {
        throw new BadRequestException("사용 가능한 잔액이 부족합니다.");
      }
      if (error instanceof ConflictException) throw error;
      throw new ServiceUnavailableException("원장 처리를 완료할 수 없습니다.");
    }

    await this.db.withTransaction(async (client) => {
      const position = await client.query<PositionRow>(
        `SELECT id::text,user_id::text,mine_id::text,status,
                requested_principal_usdt::text,principal_usdt::text
           FROM public.mine_positions
          WHERE id=$1::uuid AND user_id=$2::uuid
          FOR UPDATE`,
        [review.position_id, review.user_id],
      );
      const row = position.rows[0];
      if (!row) throw new NotFoundException("운용 내역을 찾을 수 없습니다.");
      if (row.status === "ACTIVE") return;
      if (row.status !== "START_PENDING") {
        throw new ConflictException("현재 시작할 수 없는 운용 상태입니다.");
      }
      if (cmpAmount(row.requested_principal_usdt, review.requested_principal_usdt) !== 0) {
        throw new ConflictException("검토 금액과 운용 요청 금액이 일치하지 않습니다.");
      }
      const effectiveAt = new Date().toISOString();
      await client.query(
        `INSERT INTO public.mine_position_events (
           position_id,event_type,amount_usdt,principal_before_usdt,principal_after_usdt,
           effective_at,ledger_journal_id,idempotency_key
         ) VALUES ($1::uuid,'START',$2::numeric,0,$2::numeric,$3::timestamptz,$4::uuid,$5)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [
          review.position_id,
          review.requested_principal_usdt,
          effectiveAt,
          journal.id,
          `mine:event:start:${review.position_id}`,
        ],
      );
      await client.query(
        `UPDATE public.mine_positions
            SET status='ACTIVE',principal_usdt=$2::numeric,
                started_at=COALESCE(started_at,$3::timestamptz)
          WHERE id=$1::uuid`,
        [review.position_id, review.requested_principal_usdt, effectiveAt],
      );
    });
  }

  private async loadMineGate(mineId: string): Promise<MineGateRow> {
    const result = await this.db.query<MineGateRow>(
      `SELECT id::text,status,min_position_usdt::text,max_position_usdt::text,metadata
         FROM public.mines
        WHERE id=$1::uuid AND published_at IS NOT NULL`,
      [mineId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException("광산을 찾을 수 없습니다.");
    return row;
  }

  private thresholdFromMetadata(metadata: Record<string, unknown>): string {
    const raw = metadata?.highValueThresholdAmount;
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      throw new ServiceUnavailableException("고액운용 기준 설정을 확인해 주세요.");
    }
    const threshold = amount(raw, "highValueThresholdAmount");
    if (cmpAmount(threshold, "0") <= 0) {
      throw new ServiceUnavailableException("고액운용 기준 설정을 확인해 주세요.");
    }
    return threshold;
  }

  private assertWithinLimits(
    principal: string,
    min: string | null,
    max: string | null,
  ) {
    if (min && cmpAmount(principal, min) < 0) {
      throw new BadRequestException("최소 운용 금액보다 작습니다.");
    }
    if (max && cmpAmount(principal, max) > 0) {
      throw new BadRequestException("최대 운용 금액보다 큽니다.");
    }
  }

  private async loadReview(reviewId: string): Promise<ReviewRow> {
    const result = await this.db.query<ReviewRow>(
      `SELECT id::text,position_id::text,user_id::text,mine_id::text,status,
              requested_principal_usdt::text,threshold_usdt::text,idempotency_key,
              approval_request_id::text,reviewed_by_admin_id::text,review_reason,
              requested_at,reviewed_at,created_at,updated_at
         FROM public.mine_high_value_reviews WHERE id=$1::uuid`,
      [reviewId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException("고액운용 검토를 찾을 수 없습니다.");
    return row;
  }

  private async lockReview(client: PoolClient, reviewId: string): Promise<ReviewRow> {
    const result = await client.query<ReviewRow>(
      `SELECT id::text,position_id::text,user_id::text,mine_id::text,status,
              requested_principal_usdt::text,threshold_usdt::text,idempotency_key,
              approval_request_id::text,reviewed_by_admin_id::text,review_reason,
              requested_at,reviewed_at,created_at,updated_at
         FROM public.mine_high_value_reviews WHERE id=$1::uuid FOR UPDATE`,
      [reviewId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException("고액운용 검토를 찾을 수 없습니다.");
    return row;
  }

  private async adminReplay(idempotencyKey: string, action: string, fp: string) {
    const result = await this.db.query<AuditRow>(
      `SELECT action,target_id,payload
         FROM public.admin_audit_events WHERE idempotency_key=$1`,
      [idempotencyKey],
    );
    const row = result.rows[0];
    if (!row) return false;
    if (row.action !== action || row.payload?.fingerprint !== fp) {
      throw new ConflictException("같은 요청 키를 다른 내용으로 사용할 수 없습니다.");
    }
    return true;
  }

  private async writeAudit(input: {
    actor: AdminActor;
    idempotencyKey: string;
    action: string;
    targetId: string;
    reason: string;
    fingerprint: string;
  }) {
    await this.db.query(
      `INSERT INTO public.admin_audit_events (
         actor_key,actor_id,role,action,target_type,target_id,occurred_at,
         mode,result,reason,idempotency_key,payload
       ) VALUES ($1::uuid::text,$1::uuid,$2,$3,'mine_high_value_review',$4,
                 now(),'LIVE','applied',$5,$6,$7::jsonb)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        input.actor.adminId,
        input.actor.role,
        input.action,
        input.targetId,
        input.reason,
        input.idempotencyKey,
        JSON.stringify({ fingerprint: input.fingerprint, resourceId: input.targetId }),
      ],
    );
  }

  private publicReview(row: ReviewRow) {
    return {
      highValueReviewId: row.id,
      positionId: row.position_id,
      userId: row.user_id,
      mineId: row.mine_id,
      mineCode: row.mine_code ?? null,
      mineName: row.mine_name ?? null,
      status: row.status,
      requestedPrincipalAmount: row.requested_principal_usdt,
      thresholdAmount: row.threshold_usdt,
      approvalRequestId: row.approval_request_id,
      reviewedByAdminId: row.reviewed_by_admin_id,
      reviewReason: row.review_reason,
      requestedAt: iso(row.requested_at),
      reviewedAt: iso(row.reviewed_at),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    };
  }
}

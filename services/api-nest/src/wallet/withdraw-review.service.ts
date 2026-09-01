/**
 * Admin 출금 검수 — withdraw_intents SSOT. 원장 전기 0 · Production mutation 경로 없음.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AdminAuditService } from "../audit/admin-audit.service";
import { PostgresService } from "../db/postgres";
import { InProcessEventBus } from "../events/in-process.bus";
import { WALLET_EVENTS } from "./wallet.events";
import {
  WITHDRAW_REVIEW_PENDING,
  nextWithdrawReviewStatus,
  type WithdrawReviewDecision,
} from "./withdraw-review.policy";

type IntentRow = {
  id: string;
  user_id: string;
  mode: string;
  amount_usdt: string;
  asset: string;
  debit_profit_usdt: string;
  debit_principal_usdt: string;
  require_principal_confirm: boolean;
  status: string;
  destination: string | null;
  reject_reason: string | null;
  created_at: Date;
  updated_at: Date;
};

export type WithdrawReviewItemV1 = {
  id: string;
  userId: string;
  mode: string;
  amountUsdt: string;
  asset: string;
  debitProfitUsdt: string;
  debitPrincipalUsdt: string;
  requirePrincipalConfirm: boolean;
  status: string;
  destination: string | null;
  rejectReason: string | null;
  createdAt: string;
};

@Injectable()
export class WithdrawReviewService {
  constructor(
    private readonly db: PostgresService,
    private readonly audit: AdminAuditService,
    private readonly bus: InProcessEventBus,
  ) {}

  async list(opts?: { limit?: number }): Promise<{ items: WithdrawReviewItemV1[] }> {
    this.requireStore();
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
    const res = await this.db.query<IntentRow>(
      `SELECT ${this.columns()}
         FROM public.withdraw_intents
        WHERE status = $1
        ORDER BY created_at ASC
        LIMIT $2`,
      [WITHDRAW_REVIEW_PENDING, limit],
    );
    return { items: res.rows.map((row) => this.toV1(row)) };
  }

  async get(id: string): Promise<WithdrawReviewItemV1> {
    this.requireStore();
    return this.toV1(await this.requireRow(id));
  }

  async decide(input: {
    id: string;
    decision: WithdrawReviewDecision;
    adminId: string;
    role: string;
    reason: string;
    idempotencyKey: string;
  }): Promise<{
    ok: true;
    decision: WithdrawReviewDecision;
    item: WithdrawReviewItemV1;
    reused: boolean;
    persisted: true;
    auditAction: string;
  }> {
    this.requireStore();
    if (!input.adminId || !input.role.trim()) {
      throw new BadRequestException("ADMIN_AUTH_REQUIRED");
    }
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }
    const reason = input.reason.trim();
    if (input.decision === "reject" && reason.length < 10) {
      throw new BadRequestException("reason minLength 10");
    }

    const locked = await this.requireRow(input.id);
    const transition = nextWithdrawReviewStatus(locked.status, input.decision);
    if (!transition.ok) {
      throw new ConflictException(transition.code);
    }
    if (transition.reused) {
      return {
        ok: true,
        decision: input.decision,
        item: this.toV1(locked),
        reused: true,
        persisted: true,
        auditAction: this.auditAction(input.decision),
      };
    }

    const audit = await this.audit.write({
      actorKey: input.adminId,
      actorId: input.adminId,
      role: input.role,
      action: this.auditAction(input.decision),
      targetType: "withdraw_intent",
      targetId: locked.id,
      mode: "LIVE",
      result: "applied",
      reason,
      idempotencyKey: input.idempotencyKey,
      payload: {
        decision: input.decision,
        previousStatus: locked.status,
        nextStatus: transition.next,
      },
    });
    if (!audit.ok || audit.persisted !== true) {
      throw new ServiceUnavailableException("AUDIT_STORE_UNAVAILABLE");
    }

    const upd = await this.db.query<IntentRow>(
      `UPDATE public.withdraw_intents
          SET status = $2,
              reject_reason = $3,
              updated_at = now()
        WHERE id = $1::uuid AND status = $4
        RETURNING ${this.columns()}`,
      [
        locked.id,
        transition.next,
        input.decision === "reject" ? reason : null,
        WITHDRAW_REVIEW_PENDING,
      ],
    );
    if (!upd.rows[0]) {
      const again = await this.requireRow(input.id);
      const againTransition = nextWithdrawReviewStatus(again.status, input.decision);
      if (againTransition.ok && againTransition.reused) {
        return {
          ok: true,
          decision: input.decision,
          item: this.toV1(again),
          reused: true,
          persisted: true,
          auditAction: this.auditAction(input.decision),
        };
      }
      throw new ConflictException("decide race");
    }

    const item = this.toV1(upd.rows[0]);
    this.bus.emit(
      input.decision === "approve"
        ? WALLET_EVENTS.withdrawAdminApproved
        : WALLET_EVENTS.withdrawAdminRejected,
      {
        id: item.id,
        userId: item.userId,
        auditAction: this.auditAction(input.decision),
      },
    );
    return {
      ok: true,
      decision: input.decision,
      item,
      reused: false,
      persisted: true,
      auditAction: this.auditAction(input.decision),
    };
  }

  private requireStore(): void {
    if (!this.db.configured()) {
      throw new ServiceUnavailableException("WITHDRAW_STORE_UNAVAILABLE");
    }
  }

  private async requireRow(id: string): Promise<IntentRow> {
    const res = await this.db.query<IntentRow>(
      `SELECT ${this.columns()} FROM public.withdraw_intents WHERE id = $1::uuid`,
      [id],
    );
    if (!res.rows[0]) throw new NotFoundException("withdraw intent not found");
    return res.rows[0];
  }

  private auditAction(decision: WithdrawReviewDecision): string {
    return decision === "approve"
      ? "admin.withdraw.approved"
      : "admin.withdraw.rejected";
  }

  private columns(): string {
    return `id::text, user_id::text, mode, amount_usdt::text, asset,
            debit_profit_usdt::text, debit_principal_usdt::text,
            require_principal_confirm, status, destination, reject_reason,
            created_at, updated_at`;
  }

  private toV1(row: IntentRow): WithdrawReviewItemV1 {
    return {
      id: row.id,
      userId: row.user_id,
      mode: row.mode,
      amountUsdt: row.amount_usdt,
      asset: row.asset,
      debitProfitUsdt: row.debit_profit_usdt,
      debitPrincipalUsdt: row.debit_principal_usdt,
      requirePrincipalConfirm: row.require_principal_confirm,
      status: row.status,
      destination: row.destination,
      rejectReason: row.reject_reason,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }
}

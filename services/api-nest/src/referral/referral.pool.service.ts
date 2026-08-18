/**
 * Promo Pool FIFO payout · Money §51.5
 * Debit SYS:PROMO_POOL / Credit user profit · queued_pool when insufficient
 * Pool=0 ≠ invite failure (RE7 · toast REFERRAL_POOL_WAIT)
 */

import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { LedgerPostingService } from "../ledger/ledger.posting.service";
import { cmpAmount } from "../ledger/ledger.money";
import { SYSTEM_ACCOUNT_CODES } from "../ledger/ledger.types";
import { REFERRAL_EVENTS } from "./referral.events";
import { ReferralEdgeService } from "./referral.edge.service";
import type { PoolTopUpInput } from "./referral.types";

type PayoutRow = {
  id: string;
  edge_id: string;
  level: "L2" | "L3";
  beneficiary_user_id: string;
  amount_usdt: string;
  status: string;
  hold_until: Date | null;
  idempotency_key: string;
  journal_id: string | null;
  enqueued_at: Date;
};

@Injectable()
export class ReferralPoolService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
    private readonly posting: LedgerPostingService,
    private readonly edges: ReferralEdgeService,
  ) {}

  async getPoolBalanceUsdt(): Promise<string> {
    const r = await this.db.query<{ balance_usdt: string }>(
      `SELECT balance_usdt::text AS balance_usdt
         FROM public.ledger_accounts
        WHERE code = $1`,
      [SYSTEM_ACCOUNT_CODES.PROMO_POOL],
    );
    return r.rows[0]?.balance_usdt ?? "0";
  }

  async getStatus() {
    const balanceUsdt = await this.getPoolBalanceUsdt();
    const counts = await this.db.query<{ status: string; n: string }>(
      `SELECT status, count(*)::text AS n
         FROM public.referral_payout_queue
        GROUP BY status`,
    );
    const byStatus: Record<string, number> = {};
    for (const row of counts.rows) {
      byStatus[row.status] = Number(row.n);
    }
    return {
      promoPoolBalanceUsdt: balanceUsdt,
      queue: byStatus,
      queuedPool: byStatus.queued_pool ?? 0,
      held: byStatus.held ?? 0,
      pending: byStatus.pending ?? 0,
    };
  }

  /**
   * Enqueue L2/L3 referrer payout. Hold first → release via drain after hold_until.
   * Idempotent on idempotency_key.
   */
  async enqueue(input: {
    edgeId: string;
    level: "L2" | "L3";
    beneficiaryUserId: string;
    amountUsdt: string;
    idempotencyKey: string;
    holdUntil: Date | null;
    initialStatus: "held" | "pending" | "queued_pool";
  }): Promise<{ id: string; status: string; reused: boolean }> {
    if (cmpAmount(input.amountUsdt, "0") <= 0) {
      throw new BadRequestException("payout amount must be > 0");
    }

    const existing = await this.db.query<{ id: string; status: string }>(
      `SELECT id::text, status FROM public.referral_payout_queue
        WHERE idempotency_key = $1`,
      [input.idempotencyKey],
    );
    if (existing.rows[0]) {
      return {
        id: existing.rows[0].id,
        status: existing.rows[0].status,
        reused: true,
      };
    }

    const ins = await this.db.query<{ id: string; status: string }>(
      `INSERT INTO public.referral_payout_queue (
         edge_id, level, beneficiary_user_id, amount_usdt,
         status, hold_until, idempotency_key
       ) VALUES (
         $1::uuid, $2, $3::uuid, $4::numeric, $5, $6, $7
       )
       RETURNING id::text, status`,
      [
        input.edgeId,
        input.level,
        input.beneficiaryUserId,
        input.amountUsdt,
        input.initialStatus,
        input.holdUntil,
        input.idempotencyKey,
      ],
    );

    if (input.initialStatus === "queued_pool") {
      await this.edges.updateStatus(input.edgeId, { status: "queued_pool" });
      this.bus.emit(REFERRAL_EVENTS.l2QueuedPool, {
        edgeId: input.edgeId,
        toastCode: "REFERRAL_POOL_WAIT",
      });
    }

    return {
      id: ins.rows[0].id,
      status: ins.rows[0].status,
      reused: false,
    };
  }

  /** Manual Promo Pool top-up · Debit FEE_REVENUE / Credit PROMO_POOL (margin path) */
  async topUp(input: PoolTopUpInput): Promise<{
    balanceUsdt: string;
    journalId: string;
  }> {
    if (!input.updatedByAdminId) {
      throw new BadRequestException("updatedByAdminId required");
    }
    if (!input.changeReason || input.changeReason.trim().length < 10) {
      throw new BadRequestException("changeReason minLength 10");
    }
    if (cmpAmount(input.amountUsdt, "0") <= 0) {
      throw new BadRequestException("amountUsdt must be > 0");
    }

    const journal = await this.posting.postJournal({
      idempotencyKey: input.idempotencyKey,
      journalType: "other",
      referenceType: "referral_pool_top_up",
      referenceId: input.idempotencyKey,
      memo: input.changeReason.trim(),
      createdBy: input.updatedByAdminId,
      lines: [
        {
          account: { systemCode: SYSTEM_ACCOUNT_CODES.FEE_REVENUE },
          direction: "debit",
          amountUsdt: input.amountUsdt,
        },
        {
          account: { systemCode: SYSTEM_ACCOUNT_CODES.PROMO_POOL },
          direction: "credit",
          amountUsdt: input.amountUsdt,
        },
      ],
    });

    await this.db.query(
      `INSERT INTO public.referral_program_audit (
         action, previous_payload, next_payload, changed_by_admin_id, change_reason
       ) VALUES (
         'pool_top_up', '{}'::jsonb, $1::jsonb, $2::uuid, $3
       )`,
      [
        JSON.stringify({
          amountUsdt: input.amountUsdt,
          journalId: journal.id,
        }),
        input.updatedByAdminId,
        input.changeReason.trim(),
      ],
    );

    this.bus.emit(REFERRAL_EVENTS.poolTopUp, {
      amountUsdt: input.amountUsdt,
      journalId: journal.id,
    });

    await this.drainFifo();
    const balanceUsdt = await this.getPoolBalanceUsdt();
    return { balanceUsdt, journalId: journal.id };
  }

  /**
   * FIFO drain: oldest held(past hold)/pending/queued_pool first.
   * Insufficient pool → mark queued_pool (invite stays valid).
   */
  async drainFifo(opts?: { limit?: number }): Promise<{
    released: number;
    queued: number;
  }> {
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
    const now = new Date();
    const r = await this.db.query<PayoutRow>(
      `SELECT id::text, edge_id::text, level, beneficiary_user_id::text,
              amount_usdt::text, status, hold_until, idempotency_key,
              journal_id::text, enqueued_at
         FROM public.referral_payout_queue
        WHERE status IN ('pending', 'held', 'queued_pool')
          AND (hold_until IS NULL OR hold_until <= $1)
          AND status <> 'clawed_back'
        ORDER BY enqueued_at ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED`,
      [now, limit],
    );

    let released = 0;
    let queued = 0;

    for (const row of r.rows) {
      if (row.status === "held" && row.hold_until && row.hold_until > now) {
        continue;
      }
      const balance = await this.getPoolBalanceUsdt();
      if (cmpAmount(balance, row.amount_usdt) < 0) {
        await this.db.query(
          `UPDATE public.referral_payout_queue
              SET status = 'queued_pool', updated_at = now()
            WHERE id = $1::uuid AND status <> 'released'`,
          [row.id],
        );
        await this.edges.updateStatus(row.edge_id, { status: "queued_pool" });
        this.bus.emit(REFERRAL_EVENTS.l2QueuedPool, {
          edgeId: row.edge_id,
          toastCode: "REFERRAL_POOL_WAIT",
        });
        queued += 1;
        // Stop — later rows also cannot fit (FIFO)
        break;
      }

      const journal = await this.posting.postJournal({
        idempotencyKey: row.idempotency_key,
        journalType: "referral_reward",
        referenceType: "referral_edge",
        referenceId: row.edge_id,
        memo: `referral ${row.level} Promo→profit`,
        lines: [
          {
            account: { systemCode: SYSTEM_ACCOUNT_CODES.PROMO_POOL },
            direction: "debit",
            amountUsdt: row.amount_usdt,
          },
          {
            account: {
              userId: row.beneficiary_user_id,
              bucket: "profit",
            },
            direction: "credit",
            amountUsdt: row.amount_usdt,
          },
        ],
      });

      await this.db.query(
        `UPDATE public.referral_payout_queue SET
           status = 'released',
           journal_id = $2::uuid,
           released_at = now(),
           updated_at = now()
         WHERE id = $1::uuid`,
        [row.id, journal.id],
      );

      const edgeStatus = row.level === "L3" ? "l3_done" : "l2_released";
      await this.edges.updateStatus(row.edge_id, {
        status: edgeStatus,
        l2ReleasedAt: row.level === "L2" ? new Date() : null,
      });

      this.bus.emit(REFERRAL_EVENTS.l2Released, {
        edgeId: row.edge_id,
        level: row.level,
        journalId: journal.id,
        toastCode: "REFERRAL_L2_RELEASED",
      });
      released += 1;
    }

    return { released, queued };
  }
}

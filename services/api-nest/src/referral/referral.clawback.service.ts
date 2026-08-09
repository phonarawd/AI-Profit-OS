/**
 * L2 clawback · Money §51.5 R3 wash · reverse journal + referral.clawback event
 * FORBIDDEN: principal credit for rewards · practice→profit
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { LedgerPostingService } from "../ledger/ledger.posting.service";
import { cmpAmount } from "../ledger/ledger.money";
import { SYSTEM_ACCOUNT_CODES } from "../ledger/ledger.types";
import { ReferralEdgeService } from "./referral.edge.service";
import { REFERRAL_EVENTS } from "./referral.events";
import type { ClawbackInput } from "./referral.types";

@Injectable()
export class ReferralClawbackService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
    private readonly posting: LedgerPostingService,
    private readonly edges: ReferralEdgeService,
  ) {}

  async clawback(input: ClawbackInput) {
    if (!input.reason || input.reason.trim().length < 10) {
      throw new BadRequestException("reason minLength 10");
    }
    if (!input.adminId) {
      throw new BadRequestException("adminId required");
    }

    const edge = await this.edges.getById(input.edgeId);
    if (edge.status === "clawed_back") {
      return { edge, reused: true };
    }

    const payout = await this.db.query<{
      id: string;
      amount_usdt: string;
      status: string;
      journal_id: string | null;
      idempotency_key: string;
      beneficiary_user_id: string;
    }>(
      `SELECT id::text, amount_usdt::text, status, journal_id::text,
              idempotency_key, beneficiary_user_id::text
         FROM public.referral_payout_queue
        WHERE edge_id = $1::uuid AND level = 'L2'
        ORDER BY enqueued_at ASC
        LIMIT 1`,
      [input.edgeId],
    );
    const row = payout.rows[0];

    let journalId: string | null = null;

    if (row && row.status === "released" && row.journal_id) {
      if (cmpAmount(row.amount_usdt, "0") <= 0) {
        throw new BadRequestException("nothing to clawback");
      }
      const reverse = await this.posting.postJournal({
        idempotencyKey: input.idempotencyKey,
        journalType: "referral_clawback",
        referenceType: "referral_edge",
        referenceId: edge.id,
        memo: input.reason.trim(),
        createdBy: input.adminId,
        lines: [
          {
            account: {
              userId: row.beneficiary_user_id,
              bucket: "profit",
            },
            direction: "debit",
            amountUsdt: row.amount_usdt,
          },
          {
            account: { systemCode: SYSTEM_ACCOUNT_CODES.PROMO_POOL },
            direction: "credit",
            amountUsdt: row.amount_usdt,
          },
        ],
      });
      journalId = reverse.id;
    } else if (row) {
      // Not yet released — cancel queue row (no ledger)
      await this.db.query(
        `UPDATE public.referral_payout_queue SET
           status = 'clawed_back',
           clawed_back_at = now(),
           updated_at = now()
         WHERE id = $1::uuid`,
        [row.id],
      );
    } else if (
      edge.status !== "l2_pending_hold" &&
      edge.status !== "l2_released" &&
      edge.status !== "queued_pool" &&
      edge.status !== "held_risk"
    ) {
      throw new NotFoundException("no L2 payout to clawback");
    }

    if (row && row.status === "released") {
      await this.db.query(
        `UPDATE public.referral_payout_queue SET
           status = 'clawed_back',
           clawed_back_at = now(),
           updated_at = now()
         WHERE id = $1::uuid`,
        [row.id],
      );
    }

    await this.db.query(
      `UPDATE public.referral_edges SET
         status = 'clawed_back',
         clawback_journal_id = $2::uuid,
         updated_at = now()
       WHERE id = $1::uuid`,
      [edge.id, journalId],
    );

    this.bus.emit(REFERRAL_EVENTS.clawback, {
      edgeId: edge.id,
      journalId,
      toastCode: "REFERRAL_CLAWBACK",
      reason: input.reason.trim(),
    });

    return {
      edge: await this.edges.getById(edge.id),
      journalId,
      reused: false,
    };
  }

  /**
   * Auto wash: referee withdraws soon after qualifying deposit within clawbackHoursL2.
   */
  async maybeClawbackWash(input: {
    refereeUserId: string;
    clawbackHoursL2: number;
    idempotencyKey: string;
  }) {
    const edge = await this.edges.getByReferee(input.refereeUserId);
    if (!edge || !edge.l2HoldUntil) return { skipped: true as const };
    const holdEnd = new Date(edge.l2HoldUntil).getTime();
    if (Date.now() > holdEnd) return { skipped: true as const };

    return this.clawback({
      edgeId: edge.id,
      adminId: "system:wash_clawback",
      reason: "R3 wash: deposit then immediate withdraw within clawback window",
      idempotencyKey: input.idempotencyKey,
    });
  }
}

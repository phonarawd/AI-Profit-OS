/**
 * Viral Ladder L1→L2→L3 · Money §51.5.1
 * L1 referrer cash=0 · L2/L3 Promo→profit via Pool FIFO · rewardsEnabled gates cash
 */

import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { cmpAmount } from "../ledger/ledger.money";
import {
  computeL2ReferrerPay,
  computeL3ReferrerPay,
  idempotencyKeyFor,
  meetsMinDeposit,
} from "./referral.bonus";
import { ReferralEdgeService } from "./referral.edge.service";
import { REFERRAL_EVENTS } from "./referral.events";
import { ReferralPoolService } from "./referral.pool.service";
import { ReferralProgramService } from "./referral.program.service";

@Injectable()
export class ReferralLadderService {
  constructor(
    private readonly db: PostgresService,
    private readonly program: ReferralProgramService,
    private readonly edges: ReferralEdgeService,
    private readonly pool: ReferralPoolService,
    private readonly bus: InProcessEventBus,
  ) {}

  /**
   * L2 trigger: first qualifying deposit credit (USDT 19conf or KRW admin approve).
   * Idempotent · minRefereeDeposit · practice/rejected excluded by caller amount.
   */
  async onQualifyingDeposit(input: {
    refereeUserId: string;
    qualifyingDepositUsdt: string;
    source: "usdt_deposit_confirmed" | "krw_admin_approve";
  }) {
    const edge = await this.edges.getByReferee(input.refereeUserId);
    if (!edge) return { skipped: true, reason: "no_edge" as const };
    if (edge.levelsAchieved.includes("L2")) {
      return { skipped: true, reason: "already_l2" as const, edge };
    }
    if (
      edge.status === "clawed_back" ||
      edge.status === "held_risk"
    ) {
      return { skipped: true, reason: "blocked_status" as const, edge };
    }

    const cfg = await this.program.get();
    if (!meetsMinDeposit(input.qualifyingDepositUsdt, cfg.minRefereeDepositUsdt)) {
      return { skipped: true, reason: "below_min_deposit" as const, edge };
    }

    const pay = computeL2ReferrerPay(input.qualifyingDepositUsdt, cfg);
    const l2Key = idempotencyKeyFor(edge.id, "L2");
    const holdUntil = new Date(
      Date.now() + cfg.clawbackHoursL2 * 3600 * 1000,
    );

    const levels = Array.from(
      new Set([...edge.levelsAchieved, "L2" as const]),
    );

    // 0원 런칭 / halt: ladder advances, cash accrual 0
    const canCash =
      (await this.program.canAccrueCash()) && cmpAmount(pay, "0") > 0;

    if (!canCash) {
      await this.edges.updateStatus(edge.id, {
        status: "l2_released",
        levelsAchieved: levels,
        qualifyingDepositUsdt: input.qualifyingDepositUsdt,
        computedL2ReferrerUsdt: "0",
        idempotencyKey: l2Key,
        l2ReleasedAt: new Date(),
      });
      return {
        skipped: false,
        rewardsSkipped: true,
        edgeId: edge.id,
        computedL2ReferrerUsdt: "0",
      };
    }

    await this.edges.updateStatus(edge.id, {
      status: "l2_pending_hold",
      levelsAchieved: levels,
      qualifyingDepositUsdt: input.qualifyingDepositUsdt,
      computedL2ReferrerUsdt: pay,
      idempotencyKey: l2Key,
      l2HoldUntil: holdUntil,
    });

    this.bus.emit(REFERRAL_EVENTS.l2Pending, {
      edgeId: edge.id,
      amountUsdt: pay,
      toastCode: "REFERRAL_L2_PENDING",
      source: input.source,
    });

    const poolBal = await this.pool.getPoolBalanceUsdt();
    const initialStatus =
      cmpAmount(poolBal, pay) < 0 ? "queued_pool" : "held";

    await this.pool.enqueue({
      edgeId: edge.id,
      level: "L2",
      beneficiaryUserId: edge.referrerUserId,
      amountUsdt: pay,
      idempotencyKey: l2Key,
      holdUntil,
      initialStatus,
    });

    return {
      skipped: false,
      edgeId: edge.id,
      computedL2ReferrerUsdt: pay,
      holdUntil: holdUntil.toISOString(),
      initialStatus,
    };
  }

  /**
   * L3 trigger: referee first MATCH_SUCCESS.
   */
  async onMatchSuccess(input: { refereeUserId: string }) {
    const edge = await this.edges.getByReferee(input.refereeUserId);
    if (!edge) return { skipped: true, reason: "no_edge" as const };
    if (edge.levelsAchieved.includes("L3")) {
      return { skipped: true, reason: "already_l3" as const, edge };
    }
    if (!edge.levelsAchieved.includes("L2")) {
      return { skipped: true, reason: "l2_required" as const, edge };
    }
    if (edge.status === "clawed_back" || edge.status === "held_risk") {
      return { skipped: true, reason: "blocked_status" as const, edge };
    }

    const cfg = await this.program.get();
    const pay = computeL3ReferrerPay(cfg);
    const l3Key = idempotencyKeyFor(edge.id, "L3");
    const levels = Array.from(
      new Set([...edge.levelsAchieved, "L3" as const]),
    );

    const canCash =
      (await this.program.canAccrueCash()) && cmpAmount(pay, "0") > 0;

    if (!canCash) {
      await this.edges.updateStatus(edge.id, {
        status: "l3_done",
        levelsAchieved: levels,
        idempotencyKey: l3Key,
      });
      return { skipped: false, rewardsSkipped: true, edgeId: edge.id };
    }

    await this.edges.updateStatus(edge.id, {
      status: edge.status === "queued_pool" ? "queued_pool" : "l2_released",
      levelsAchieved: levels,
      idempotencyKey: l3Key,
    });

    const poolBal = await this.pool.getPoolBalanceUsdt();
    const initialStatus =
      cmpAmount(poolBal, pay) < 0 ? "queued_pool" : "pending";

    await this.pool.enqueue({
      edgeId: edge.id,
      level: "L3",
      beneficiaryUserId: edge.referrerUserId,
      amountUsdt: pay,
      idempotencyKey: l3Key,
      holdUntil: null,
      initialStatus,
    });

    if (initialStatus === "pending") {
      await this.pool.drainFifo();
    }

    this.bus.emit(REFERRAL_EVENTS.l3Done, {
      edgeId: edge.id,
      amountUsdt: pay,
    });

    return {
      skipped: false,
      edgeId: edge.id,
      computedL3ReferrerUsdt: pay,
      initialStatus,
    };
  }

  /** Release holds whose hold_until elapsed · call from cron / admin */
  async releaseDueHolds() {
    return this.pool.drainFifo();
  }

  async adminRelease(input: {
    edgeId: string;
    adminId: string;
    reason: string;
    idempotencyKey: string;
  }) {
    if (!input.reason || input.reason.trim().length < 10) {
      throw new BadRequestException("reason minLength 10");
    }
    const edge = await this.edges.getById(input.edgeId);
    if (
      edge.status !== "l2_pending_hold" &&
      edge.status !== "queued_pool" &&
      edge.status !== "held_risk"
    ) {
      throw new BadRequestException("edge not in releasable state");
    }
    await this.db.query(
      `UPDATE public.referral_payout_queue SET
         hold_until = now(),
         status = CASE WHEN status = 'held' THEN 'pending' ELSE status END,
         updated_at = now()
       WHERE edge_id = $1::uuid
         AND status IN ('held', 'pending', 'queued_pool')`,
      [edge.id],
    );
    await this.edges.updateStatus(edge.id, {
      status: "l2_pending_hold",
      l2HoldUntil: new Date(0),
    });
    const result = await this.pool.drainFifo();
    return {
      edgeId: edge.id,
      adminId: input.adminId,
      reason: input.reason.trim(),
      ...result,
    };
  }
}

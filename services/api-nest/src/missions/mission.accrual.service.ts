/**
 * Money §51.8a — accrual insert · hold · Promo Pool release.
 * amountUsdtSnap frozen at insert · release must not inflate from live config.
 * Presentation/demo fanout → ledger path 0 (M-A11).
 */

import { Inject, Injectable } from "@nestjs/common";
import { CLOCK, type Clock } from "../common/clock";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import {
  assertAmountUsdt,
  cmpAmount,
  formatAmount,
  parseAmount,
} from "../ledger/ledger.money";
import { LedgerPostingService } from "../ledger/ledger.posting.service";
import { LedgerProvisionService } from "../ledger/ledger.provision.service";
import { SYSTEM_ACCOUNT_CODES } from "../ledger/ledger.types";
import { MISSION_EVENTS } from "./mission.events";
import { MissionProgramService } from "./mission.program.service";
import type {
  MissionAccrualStatus,
  MissionDefinitionRow,
  MissionRewardKind,
} from "./mission.types";

type AccrualRow = {
  id: string;
  user_id: string;
  mission_id: string;
  idempotency_key: string;
  reward_kind_snap: MissionRewardKind;
  amount_usdt_snap: string;
  status: MissionAccrualStatus;
  source_event_id: string | null;
  ledger_journal_id: string | null;
  hold_until: Date | null;
};

@Injectable()
export class MissionAccrualService {
  constructor(
    private readonly db: PostgresService,
    private readonly posting: LedgerPostingService,
    private readonly provision: LedgerProvisionService,
    private readonly program: MissionProgramService,
    private readonly bus: InProcessEventBus,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  idempotencyKey(userId: string, missionId: string, periodKey?: string): string {
    return periodKey
      ? `mission:${userId}:${missionId}:${periodKey}`
      : `mission:${userId}:${missionId}`;
  }

  async insertAccrual(input: {
    userId: string;
    definition: MissionDefinitionRow;
    amountUsdtSnap: string;
    sourceEventId: string;
    holdHours: number;
  }): Promise<{
    id: string;
    status: MissionAccrualStatus;
    reused: boolean;
  } | null> {
    if (!this.db.configured()) return null;

    const kind = input.definition.reward_kind;
    const amount =
      kind === "none"
        ? "0"
        : assertAmountUsdt(input.amountUsdtSnap);
    const idem = this.idempotencyKey(input.userId, input.definition.id);

    let status: MissionAccrualStatus;
    let holdUntil: Date | null = null;

    if (kind === "none") {
      status = "released";
    } else if (input.holdHours > 0) {
      status = "pending_hold";
      holdUntil = new Date(this.clock.nowMs() + input.holdHours * 3600_000);
    } else {
      status = "pending";
    }

    const r = await this.db.query<{ id: string; status: MissionAccrualStatus }>(
      `INSERT INTO public.mission_accruals (
         user_id, mission_id, idempotency_key, reward_kind_snap,
         amount_usdt_snap, status, source_event_id, hold_until,
         released_at
       ) VALUES (
         $1::uuid, $2, $3, $4, $5::numeric, $6, $7, $8,
         CASE WHEN $6 = 'released' THEN now() ELSE NULL END
       )
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING id::text, status`,
      [
        input.userId,
        input.definition.id,
        idem,
        kind,
        amount,
        status,
        input.sourceEventId,
        holdUntil?.toISOString() ?? null,
      ],
    );

    const row = r.rows[0];
    if (!row) {
      return { id: "", status: "skipped", reused: true };
    }

    this.bus.emit(MISSION_EVENTS.accrualCreated, {
      accrualId: row.id,
      userId: input.userId,
      missionId: input.definition.id,
      status: row.status,
      amountUsdtSnap: amount,
    });
    this.bus.emit(MISSION_EVENTS.benefitsUpdated, {
      userId: input.userId,
      reason: "accrual_created",
    });

    if (row.status === "pending") {
      await this.tryRelease(row.id);
    }

    return { id: row.id, status: row.status, reused: false };
  }

  async insertSkipped(input: {
    userId: string;
    missionId: string;
    sourceEventId: string;
    reason: string;
  }): Promise<void> {
    if (!this.db.configured()) return;
    const idem = this.idempotencyKey(input.userId, input.missionId);
    await this.db.query(
      `INSERT INTO public.mission_accruals (
         user_id, mission_id, idempotency_key, reward_kind_snap,
         amount_usdt_snap, status, source_event_id, failure_reason
       ) VALUES (
         $1::uuid, $2, $3, 'none', 0, 'skipped', $4, $5
       )
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        input.userId,
        input.missionId,
        idem,
        input.sourceEventId,
        input.reason,
      ],
    );
    this.bus.emit(MISSION_EVENTS.accrualSkipped, {
      userId: input.userId,
      missionId: input.missionId,
      reason: input.reason,
    });
  }

  /** Phase0 cron / post-evaluate — release hold + Pool FIFO. */
  async releaseDue(opts?: { limit?: number }): Promise<{
    released: number;
    queued: number;
  }> {
    if (!this.db.configured()) return { released: 0, queued: 0 };
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
    const now = new Date(this.clock.nowMs());
    const r = await this.db.query<{ id: string }>(
      `SELECT id::text
         FROM public.mission_accruals
        WHERE status IN ('pending', 'pending_hold', 'queued_pool')
          AND reward_kind_snap <> 'none'
          AND (hold_until IS NULL OR hold_until <= $1)
        ORDER BY created_at ASC
        LIMIT $2`,
      [now.toISOString(), limit],
    );

    let released = 0;
    let queued = 0;
    for (const row of r.rows) {
      const result = await this.tryRelease(row.id);
      if (result === "released") released += 1;
      if (result === "queued_pool") queued += 1;
    }
    return { released, queued };
  }

  private async tryRelease(
    accrualId: string,
  ): Promise<"released" | "queued_pool" | "skipped" | "noop"> {
    const cfg = await this.program.getConfig();
    if (cfg.accrualHalted) return "noop";

    const r = await this.db.query<AccrualRow>(
      `SELECT id::text, user_id::text, mission_id, idempotency_key,
              reward_kind_snap, amount_usdt_snap::text, status,
              source_event_id, ledger_journal_id::text, hold_until
         FROM public.mission_accruals
        WHERE id = $1::uuid`,
      [accrualId],
    );
    const row = r.rows[0];
    if (!row) return "noop";
    if (
      row.status !== "pending" &&
      row.status !== "pending_hold" &&
      row.status !== "queued_pool"
    ) {
      return "noop";
    }
    if (row.hold_until && row.hold_until.getTime() > this.clock.nowMs()) {
      return "noop";
    }

    // §51.8a · profit mission release — frozen/banned re-check
    if (await this.isUserBlocked(row.user_id)) {
      await this.db.query(
        `UPDATE public.mission_accruals
            SET status = 'skipped', failure_reason = 'user_frozen_or_banned',
                updated_at = now()
          WHERE id = $1::uuid`,
        [accrualId],
      );
      return "skipped";
    }

    if (row.reward_kind_snap === "fee_coupon" || row.reward_kind_snap === "none") {
      await this.db.query(
        `UPDATE public.mission_accruals
            SET status = 'released', released_at = now(), updated_at = now()
          WHERE id = $1::uuid`,
        [accrualId],
      );
      this.bus.emit(MISSION_EVENTS.accrualReleased, {
        accrualId,
        userId: row.user_id,
        missionId: row.mission_id,
      });
      return "released";
    }

    const poolBal = await this.getPromoPoolBalance();
    if (cmpAmount(poolBal, row.amount_usdt_snap) < 0) {
      await this.db.query(
        `UPDATE public.mission_accruals
            SET status = 'queued_pool', updated_at = now()
          WHERE id = $1::uuid AND status <> 'released'`,
        [accrualId],
      );
      this.bus.emit(MISSION_EVENTS.accrualQueuedPool, {
        accrualId,
        userId: row.user_id,
        missionId: row.mission_id,
      });
      return "queued_pool";
    }

    await this.db.query(
      `UPDATE public.mission_accruals
          SET status = 'posting', updated_at = now()
        WHERE id = $1::uuid`,
      [accrualId],
    );

    await this.provision.provisionUserBucketAccounts(row.user_id);
    const bucket =
      row.reward_kind_snap === "practice" ? "practice" : "profit";

    try {
      const journal = await this.posting.postJournal({
        idempotencyKey: row.idempotency_key,
        journalType: "mission_reward",
        referenceType: "mission_accrual",
        referenceId: accrualId,
        memo: `mission ${row.mission_id} Promo→${bucket}`,
        lines: [
          {
            account: { systemCode: SYSTEM_ACCOUNT_CODES.PROMO_POOL },
            direction: "debit",
            amountUsdt: row.amount_usdt_snap,
          },
          {
            account: { userId: row.user_id, bucket },
            direction: "credit",
            amountUsdt: row.amount_usdt_snap,
          },
        ],
      });

      await this.db.query(
        `UPDATE public.mission_accruals SET
           status = 'released',
           ledger_journal_id = $2::uuid,
           released_at = now(),
           updated_at = now()
         WHERE id = $1::uuid`,
        [accrualId, journal.id],
      );

      this.bus.emit(MISSION_EVENTS.accrualReleased, {
        accrualId,
        userId: row.user_id,
        missionId: row.mission_id,
        journalId: journal.id,
        toastCode: "MISSION_REWARD_RELEASED",
      });
      this.bus.emit(MISSION_EVENTS.benefitsUpdated, {
        userId: row.user_id,
        reason: "accrual_released",
      });
      return "released";
    } catch (err) {
      // ME2 — posting fail · retry later · never mark released without journal
      await this.db.query(
        `UPDATE public.mission_accruals SET
           status = 'queued_pool',
           failure_reason = $2,
           updated_at = now()
         WHERE id = $1::uuid AND status = 'posting'`,
        [
          accrualId,
          err instanceof Error ? err.message.slice(0, 200) : "posting_failed",
        ],
      );
      return "queued_pool";
    }
  }

  private async getPromoPoolBalance(): Promise<string> {
    const r = await this.db.query<{ balance_usdt: string }>(
      `SELECT balance_usdt::text
         FROM public.ledger_accounts
        WHERE code = $1`,
      [SYSTEM_ACCOUNT_CODES.PROMO_POOL],
    );
    return formatAmount(parseAmount(r.rows[0]?.balance_usdt ?? "0"));
  }

  private async isUserBlocked(userId: string): Promise<boolean> {
    const u = await this.db.query<{ status: string }>(
      `SELECT status FROM public.users WHERE id = $1::uuid`,
      [userId],
    );
    if (u.rows[0]?.status === "banned" || u.rows[0]?.status === "deleted") {
      return true;
    }
    const risk = await this.db.query<{ status: string }>(
      `SELECT status FROM public.user_risk_state WHERE user_id = $1::uuid`,
      [userId],
    );
    const s = risk.rows[0]?.status;
    return s === "frozen" || s === "banned";
  }
}

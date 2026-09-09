/**
 * PUTDUK desk trial operating capital.
 * Do not change practice-grant.service logic. This service only grants trial.
 */

import { Injectable } from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { LEDGER_EVENTS } from "./ledger.events";
import { LedgerPostingService } from "./ledger.posting.service";
import { LedgerProvisionService } from "./ledger.provision.service";
import { SYSTEM_ACCOUNT_CODES } from "./ledger.types";
import { krwToUsdt } from "./trial-fx";

export const TRIAL_GRANT_KEY_WELCOME = "trial_grant_welcome";

export type TrialGrantStatus = "active" | "failed_fx";

type GrantRow = {
  id: string;
  user_id: string;
  grant_key: string;
  status: TrialGrantStatus;
  amount_usdt: string | null;
  amount_krw: number | null;
  fx_snapshot_id: string | null;
  grant_journal_id: string | null;
  fail_reason: string | null;
};

type ProgramRow = {
  welcome_krw: number;
  default_max_participations: number;
};

@Injectable()
export class TrialGrantService {
  constructor(
    private readonly db: PostgresService,
    private readonly posting: LedgerPostingService,
    private readonly provision: LedgerProvisionService,
    private readonly bus: InProcessEventBus,
  ) {}

  /**
   * Once per user. No FX => no journal, status failed_fx.
   * failed_fx retries when FX appears, same grant key.
   */
  async grantWelcome(userId: string): Promise<{
    status: TrialGrantStatus;
    reused: boolean;
    amountUsdt?: string;
  }> {
    if (!userId) {
      return { status: "failed_fx", reused: true };
    }
    await this.provision.provisionUserBucketAccounts(userId);

    const existing = await this.db.query<GrantRow>(
      `SELECT id::text, user_id::text, grant_key, status,
              amount_usdt::text, amount_krw, fx_snapshot_id,
              grant_journal_id::text, fail_reason
         FROM public.trial_grants
        WHERE user_id = $1::uuid AND grant_key = $2`,
      [userId, TRIAL_GRANT_KEY_WELCOME],
    );
    const row = existing.rows[0];
    if (row?.status === "active") {
      return {
        status: "active",
        reused: true,
        amountUsdt: row.amount_usdt ?? undefined,
      };
    }

    const program = await this.db.query<ProgramRow>(
      `SELECT welcome_krw, default_max_participations
         FROM public.trial_program_config WHERE id = 1`,
    );
    const welcomeKrw = program.rows[0]?.welcome_krw ?? 10000;
    const maxPart = program.rows[0]?.default_max_participations ?? 1;

    const fx = await this.db.query<{ id: string; usd_krw: string }>(
      `SELECT id, usd_krw::text FROM public.fx_snapshots
        WHERE usd_krw > 0
        ORDER BY captured_at DESC
        LIMIT 1`,
    );
    const snap = fx.rows[0];
    if (!snap) {
      await this.upsertFailed(userId, row, "FX_MISSING");
      return { status: "failed_fx", reused: false };
    }

    let amountUsdt: string;
    try {
      amountUsdt = krwToUsdt(welcomeKrw, snap.usd_krw);
    } catch {
      await this.upsertFailed(userId, row, "FX_CONVERT_FAILED");
      return { status: "failed_fx", reused: false };
    }

    const idempotencyKey = `trial:${TRIAL_GRANT_KEY_WELCOME}:${userId}`;
    const journal = await this.posting.postJournal({
      idempotencyKey,
      journalType: "trial_grant",
      referenceType: "trial_grant",
      referenceId: TRIAL_GRANT_KEY_WELCOME,
      memo: "trial welcome ~10000 KRW once",
      fxSnapshotId: snap.id,
      createdBy: userId,
      lines: [
        {
          account: { systemCode: SYSTEM_ACCOUNT_CODES.OPS_POOL },
          direction: "debit",
          amountUsdt,
        },
        {
          account: { userId, bucket: "trial_principal" },
          direction: "credit",
          amountUsdt,
        },
      ],
    });

    if (row?.id) {
      await this.db.query(
        `UPDATE public.trial_grants
            SET status = 'active',
                amount_usdt = $2::numeric,
                amount_krw = $3,
                fx_snapshot_id = $4,
                grant_journal_id = $5::uuid,
                fail_reason = NULL,
                updated_at = now()
          WHERE id = $1::uuid`,
        [row.id, amountUsdt, welcomeKrw, snap.id, journal.id],
      );
    } else {
      await this.db.query(
        `INSERT INTO public.trial_grants (
           user_id, grant_key, status, amount_usdt, amount_krw,
           fx_snapshot_id, grant_journal_id, idempotency_key
         ) VALUES (
           $1::uuid, $2, 'active', $3::numeric, $4,
           $5, $6::uuid, $7
         )
         ON CONFLICT (user_id, grant_key) DO NOTHING`,
        [
          userId,
          TRIAL_GRANT_KEY_WELCOME,
          amountUsdt,
          welcomeKrw,
          snap.id,
          journal.id,
          idempotencyKey,
        ],
      );
    }

    await this.db.query(
      `INSERT INTO public.trial_user_state (user_id, max_participations)
       VALUES ($1::uuid, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, maxPart],
    );

    this.bus.emit(LEDGER_EVENTS.trialGranted, {
      userId,
      amountUsdt,
      amountKrw: welcomeKrw,
      reused: journal.reused === true,
    });

    return { status: "active", reused: journal.reused === true, amountUsdt };
  }

  private async upsertFailed(
    userId: string,
    existing: GrantRow | undefined,
    reason: string,
  ): Promise<void> {
    const idempotencyKey = `trial:${TRIAL_GRANT_KEY_WELCOME}:${userId}:fx-fail`;
    if (existing?.id) {
      await this.db.query(
        `UPDATE public.trial_grants
            SET status = 'failed_fx',
                fail_reason = $2,
                updated_at = now()
          WHERE id = $1::uuid AND status = 'failed_fx'`,
        [existing.id, reason],
      );
      return;
    }
    await this.db.query(
      `INSERT INTO public.trial_grants (
         user_id, grant_key, status, fail_reason, idempotency_key
       ) VALUES ($1::uuid, $2, 'failed_fx', $3, $4)
       ON CONFLICT (user_id, grant_key) DO UPDATE
         SET status = 'failed_fx',
             fail_reason = EXCLUDED.fail_reason,
             updated_at = now()
         WHERE public.trial_grants.status = 'failed_fx'`,
      [userId, TRIAL_GRANT_KEY_WELCOME, reason, idempotencyKey],
    );
  }
}

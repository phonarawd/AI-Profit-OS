/**
 * Money §51.7 — practice bucket onboarding.
 * welcome +10 USDT 1회 · expire 7d · practice→profit/withdraw/participate 0
 * Double-entry only (OPS_POOL ↔ practice) · balance UPDATE forbidden.
 */

import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { assertAmountUsdt, cmpAmount } from "./ledger.money";
import { LedgerPostingService } from "./ledger.posting.service";
import { LedgerProvisionService } from "./ledger.provision.service";
import { SYSTEM_ACCOUNT_CODES } from "./ledger.types";
import { LEDGER_EVENTS } from "./ledger.events";

export const PRACTICE_WELCOME_USDT = "10";
export const PRACTICE_WELCOME_EXPIRE_DAYS = 7;
export const PRACTICE_GRANT_KEY_WELCOME = "practice_grant_welcome";

export type PracticeGrantStatus = "active" | "expired" | "revoked";

export type PracticeGrantV1 = {
  id: string;
  userId: string;
  grantKey: string;
  amountUsdt: string;
  status: PracticeGrantStatus;
  expiresAt: string;
  grantedAt: string;
  expiredAt: string | null;
  grantJournalId: string | null;
  expireJournalId: string | null;
};

type GrantRow = {
  id: string;
  user_id: string;
  grant_key: string;
  amount_usdt: string;
  status: PracticeGrantStatus;
  expires_at: Date;
  grant_journal_id: string | null;
  expire_journal_id: string | null;
  granted_at: Date;
  expired_at: Date | null;
};

@Injectable()
export class PracticeGrantService {
  constructor(
    private readonly db: PostgresService,
    private readonly posting: LedgerPostingService,
    private readonly provision: LedgerProvisionService,
    private readonly bus: InProcessEventBus,
  ) {}

  /**
   * §51.7 welcome — +10 USDT practice · 1회 · expire 7d.
   * Idempotent on (user_id, practice_grant_welcome).
   */
  async grantWelcome(userId: string): Promise<{
    grant: PracticeGrantV1;
    reused: boolean;
    toastCode: "PRACTICE_GRANTED";
  }> {
    return this.grant({
      userId,
      grantKey: PRACTICE_GRANT_KEY_WELCOME,
      amountUsdt: PRACTICE_WELCOME_USDT,
      expireDays: PRACTICE_WELCOME_EXPIRE_DAYS,
      idempotencyKey: `practice:${PRACTICE_GRANT_KEY_WELCOME}:${userId}`,
      memo: "§51.7 welcome practice +10 · expire 7d",
    });
  }

  /**
   * §51.5 referee bonus practice (pointer) — never cash / profit.
   * Unique per edge via grant_key.
   */
  async grantRefereeBonus(input: {
    userId: string;
    edgeId: string;
    amountUsdt: string;
    expireDays?: number;
  }): Promise<{
    grant: PracticeGrantV1;
    reused: boolean;
    toastCode: "PRACTICE_GRANTED";
  }> {
    const grantKey = `practice_grant_referee:${input.edgeId}`;
    return this.grant({
      userId: input.userId,
      grantKey,
      amountUsdt: input.amountUsdt,
      expireDays: input.expireDays ?? PRACTICE_WELCOME_EXPIRE_DAYS,
      idempotencyKey: `practice:${grantKey}`,
      memo: `§51.5/§51.7 referee practice edge=${input.edgeId}`,
    });
  }

  /** Phase0 in-process cron — expire due grants · toast PRACTICE_EXPIRED */
  async expireDue(opts?: { now?: Date; limit?: number }): Promise<{
    expired: number;
    toastCode: "PRACTICE_EXPIRED";
  }> {
    const now = opts?.now ?? new Date();
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
    if (!this.db.configured()) {
      return { expired: 0, toastCode: "PRACTICE_EXPIRED" };
    }

    const due = await this.db.query<GrantRow>(
      `SELECT id::text, user_id::text, grant_key, amount_usdt::text,
              status, expires_at, grant_journal_id::text,
              expire_journal_id::text, granted_at, expired_at
         FROM public.practice_grants
        WHERE status = 'active'
          AND expires_at <= $1
        ORDER BY expires_at ASC
        LIMIT $2`,
      [now.toISOString(), limit],
    );

    let expired = 0;
    for (const row of due.rows) {
      const ok = await this.expireOne(row);
      if (ok) expired += 1;
    }
    return { expired, toastCode: "PRACTICE_EXPIRED" };
  }

  async listActiveForUser(userId: string): Promise<PracticeGrantV1[]> {
    if (!this.db.configured()) return [];
    const r = await this.db.query<GrantRow>(
      `SELECT id::text, user_id::text, grant_key, amount_usdt::text,
              status, expires_at, grant_journal_id::text,
              expire_journal_id::text, granted_at, expired_at
         FROM public.practice_grants
        WHERE user_id = $1::uuid AND status = 'active'
        ORDER BY expires_at ASC`,
      [userId],
    );
    return r.rows.map((row) => this.toV1(row));
  }

  private async grant(input: {
    userId: string;
    grantKey: string;
    amountUsdt: string;
    expireDays: number;
    idempotencyKey: string;
    memo: string;
  }): Promise<{
    grant: PracticeGrantV1;
    reused: boolean;
    toastCode: "PRACTICE_GRANTED";
  }> {
    if (!input.userId || input.userId === "pending-user") {
      throw new BadRequestException("userId required for practice grant");
    }
    const amountUsdt = assertAmountUsdt(input.amountUsdt, "amountUsdt");
    if (cmpAmount(amountUsdt, "0") <= 0) {
      throw new BadRequestException("amountUsdt must be > 0");
    }

    await this.provision.provisionUserBucketAccounts(input.userId);

    const existing = await this.db.query<GrantRow>(
      `SELECT id::text, user_id::text, grant_key, amount_usdt::text,
              status, expires_at, grant_journal_id::text,
              expire_journal_id::text, granted_at, expired_at
         FROM public.practice_grants
        WHERE user_id = $1::uuid AND grant_key = $2`,
      [input.userId, input.grantKey],
    );
    if (existing.rows[0]) {
      return {
        grant: this.toV1(existing.rows[0]),
        reused: true,
        toastCode: "PRACTICE_GRANTED",
      };
    }

    const journal = await this.posting.postJournal({
      idempotencyKey: input.idempotencyKey,
      journalType: "practice_grant",
      referenceType: "practice_grant",
      referenceId: input.grantKey,
      memo: input.memo,
      createdBy: input.userId,
      lines: [
        {
          account: { systemCode: SYSTEM_ACCOUNT_CODES.OPS_POOL },
          direction: "debit",
          amountUsdt,
        },
        {
          account: { userId: input.userId, bucket: "practice" },
          direction: "credit",
          amountUsdt,
        },
      ],
    });

    const journalCreatedAtMs = Date.parse(journal.createdAt);
    if (!Number.isFinite(journalCreatedAtMs)) {
      throw new BadRequestException("practice grant journal createdAt invalid");
    }
    // Recovery of a reused journal must preserve the original 7-day window;
    // never grant a fresh +7 days merely because projection-row repair was late.
    const expiresAt = new Date(
      journalCreatedAtMs + input.expireDays * 24 * 60 * 60 * 1000,
    );

    if (journal.reused) {
      const again = await this.db.query<GrantRow>(
        `SELECT id::text, user_id::text, grant_key, amount_usdt::text,
                status, expires_at, grant_journal_id::text,
                expire_journal_id::text, granted_at, expired_at
           FROM public.practice_grants
          WHERE idempotency_key = $1`,
        [input.idempotencyKey],
      );
      if (again.rows[0]) {
        return {
          grant: this.toV1(again.rows[0]),
          reused: true,
          toastCode: "PRACTICE_GRANTED",
        };
      }
    }

    const ins = await this.db.query<GrantRow>(
      `INSERT INTO public.practice_grants (
         user_id, grant_key, amount_usdt, status, expires_at,
         grant_journal_id, idempotency_key
       ) VALUES (
         $1::uuid, $2, $3::numeric, 'active', $4,
         $5::uuid, $6
       )
       ON CONFLICT (user_id, grant_key) DO NOTHING
       RETURNING id::text, user_id::text, grant_key, amount_usdt::text,
                 status, expires_at, grant_journal_id::text,
                 expire_journal_id::text, granted_at, expired_at`,
      [
        input.userId,
        input.grantKey,
        amountUsdt,
        expiresAt.toISOString(),
        journal.id,
        input.idempotencyKey,
      ],
    );

    let row = ins.rows[0];
    if (!row) {
      const conflict = await this.db.query<GrantRow>(
        `SELECT id::text, user_id::text, grant_key, amount_usdt::text,
                status, expires_at, grant_journal_id::text,
                expire_journal_id::text, granted_at, expired_at
           FROM public.practice_grants
          WHERE user_id = $1::uuid AND grant_key = $2`,
        [input.userId, input.grantKey],
      );
      row = conflict.rows[0];
      if (!row) throw new BadRequestException("practice grant insert failed");
      return {
        grant: this.toV1(row),
        reused: true,
        toastCode: "PRACTICE_GRANTED",
      };
    }

    this.bus.emit(LEDGER_EVENTS.practiceGranted, {
      userId: input.userId,
      grantKey: input.grantKey,
      amountUsdt,
      expiresAt: expiresAt.toISOString(),
      journalId: journal.id,
      toastCode: "PRACTICE_GRANTED" as const,
    });

    return {
      grant: this.toV1(row),
      reused: false,
      toastCode: "PRACTICE_GRANTED",
    };
  }

  private async expireOne(row: GrantRow): Promise<boolean> {
    // Debit only up to remaining practice balance (partial grants / prior drains)
    const bal = await this.db.query<{ practice_usdt: string }>(
      `SELECT balance_usdt::text AS practice_usdt
         FROM public.ledger_accounts
        WHERE owner_user_id = $1::uuid AND bucket = 'practice'`,
      [row.user_id],
    );
    const practiceUsdt = bal.rows[0]?.practice_usdt ?? "0";
    const burn =
      cmpAmount(practiceUsdt, row.amount_usdt) < 0
        ? practiceUsdt
        : row.amount_usdt;

    let expireJournalId: string | null = null;
    if (cmpAmount(burn, "0") > 0) {
      const journal = await this.posting.postJournal({
        idempotencyKey: `practice_expire:${row.id}`,
        journalType: "practice_expire",
        referenceType: "practice_grant",
        referenceId: row.id,
        memo: `§51.7 practice expire grant_key=${row.grant_key}`,
        createdBy: "system:practice_expire",
        lines: [
          {
            account: { userId: row.user_id, bucket: "practice" },
            direction: "debit",
            amountUsdt: burn,
          },
          {
            account: { systemCode: SYSTEM_ACCOUNT_CODES.OPS_POOL },
            direction: "credit",
            amountUsdt: burn,
          },
        ],
      });
      expireJournalId = journal.id;
    }

    const upd = await this.db.query(
      `UPDATE public.practice_grants
          SET status = 'expired',
              expired_at = now(),
              expire_journal_id = $2::uuid,
              updated_at = now()
        WHERE id = $1::uuid AND status = 'active'`,
      [row.id, expireJournalId],
    );
    if ((upd.rowCount ?? 0) === 0) return false;

    this.bus.emit(LEDGER_EVENTS.practiceExpired, {
      userId: row.user_id,
      grantId: row.id,
      grantKey: row.grant_key,
      amountUsdt: burn,
      toastCode: "PRACTICE_EXPIRED" as const,
      toastKo: "⏰ 연습 잔액이 만료됐어요",
    });
    return true;
  }

  private toV1(row: GrantRow): PracticeGrantV1 {
    return {
      id: row.id,
      userId: row.user_id,
      grantKey: row.grant_key,
      amountUsdt: row.amount_usdt,
      status: row.status,
      expiresAt: row.expires_at.toISOString(),
      grantedAt: row.granted_at.toISOString(),
      expiredAt: row.expired_at ? row.expired_at.toISOString() : null,
      grantJournalId: row.grant_journal_id,
      expireJournalId: row.expire_journal_id,
    };
  }
}

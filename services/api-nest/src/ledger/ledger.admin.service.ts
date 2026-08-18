/**
 * Admin ledger contracts (Money Owns · UI=Admin):
 * - journals / recon / financial report
 * - balance-adjust (§9.8.3) double-entry only · reason≥10 · bucket required
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { LedgerBucketsService } from "./ledger.buckets.service";
import { LEDGER_EVENTS } from "./ledger.events";
import {
  ADMIN_ADJUST_DUAL_CONFIRM_USDT,
  addAmount,
  assertAmountUsdt,
  cmpAmount,
  formatAmount,
  parseAmount,
} from "./ledger.money";
import { LedgerPostingService } from "./ledger.posting.service";
import { LedgerReconService } from "./ledger.recon.service";
import {
  SYSTEM_ACCOUNT_CODES,
  USER_BUCKETS,
  type AdminAdjustInput,
  type FinancialReportBucket,
  type LedgerJournalRow,
  type UserBucket,
} from "./ledger.types";

@Injectable()
export class LedgerAdminService {
  constructor(
    private readonly db: PostgresService,
    private readonly posting: LedgerPostingService,
    private readonly buckets: LedgerBucketsService,
    private readonly recon: LedgerReconService,
    private readonly bus: InProcessEventBus,
  ) {}

  async listJournals(opts: {
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: LedgerJournalRow[]; total: number }> {
    const limit = Math.min(opts.limit ?? 50, 200);
    const offset = opts.offset ?? 0;

    if (opts.userId) {
      const ids = await this.db.query<{ id: string; total: string }>(
        `WITH j AS (
           SELECT DISTINCT j.id, j.created_at
             FROM public.ledger_journals j
             JOIN public.ledger_entries e ON e.journal_id = j.id
             JOIN public.ledger_accounts a ON a.id = e.account_id
            WHERE a.owner_user_id = $1::uuid
         )
         SELECT id, COUNT(*) OVER()::text AS total
           FROM j
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3`,
        [opts.userId, limit, offset],
      );
      const items: LedgerJournalRow[] = [];
      for (const row of ids.rows) {
        items.push(await this.posting.getJournal(row.id));
      }
      return {
        items,
        total: Number(ids.rows[0]?.total ?? 0),
      };
    }

    const ids = await this.db.query<{ id: string; total: string }>(
      `SELECT id, COUNT(*) OVER()::text AS total
         FROM public.ledger_journals
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const items: LedgerJournalRow[] = [];
    for (const row of ids.rows) {
      items.push(await this.posting.getJournal(row.id));
    }
    return { items, total: Number(ids.rows[0]?.total ?? 0) };
  }

  async financialReport(opts: {
    granularity: "day" | "month";
    from?: string;
    to?: string;
  }): Promise<{ granularity: "day" | "month"; buckets: FinancialReportBucket[] }> {
    const trunc = opts.granularity === "month" ? "month" : "day";
    const r = await this.db.query<{
      period: Date;
      deposit_usdt: string;
      withdraw_usdt: string;
      admin_credit_usdt: string;
      admin_debit_usdt: string;
      settlement_user_profit_usdt: string;
      fee_usdt: string;
      journal_count: string;
    }>(
      `WITH bounds AS (
         SELECT
           COALESCE($2::timestamptz, now() - interval '90 days') AS t_from,
           COALESCE($3::timestamptz, now()) AS t_to
       ),
       j AS (
         SELECT *
           FROM public.ledger_journals
          WHERE created_at >= (SELECT t_from FROM bounds)
            AND created_at <= (SELECT t_to FROM bounds)
       ),
       line AS (
         SELECT
           date_trunc($1, j.created_at) AS period,
           j.journal_type,
           e.direction,
           e.amount_usdt,
           a.account_kind,
           a.bucket
         FROM j
         JOIN public.ledger_entries e ON e.journal_id = j.id
         JOIN public.ledger_accounts a ON a.id = e.account_id
       )
       SELECT
         period,
         COALESCE(SUM(amount_usdt) FILTER (
           WHERE journal_type IN ('deposit_usdt','deposit_krw')
             AND account_kind = 'user_bucket'
             AND direction = 'credit'
         ), 0)::text AS deposit_usdt,
         COALESCE(SUM(amount_usdt) FILTER (
           WHERE journal_type = 'withdraw'
             AND account_kind = 'user_bucket'
             AND direction = 'debit'
         ), 0)::text AS withdraw_usdt,
         COALESCE(SUM(amount_usdt) FILTER (
           WHERE journal_type = 'admin_adjust'
             AND account_kind = 'user_bucket'
             AND direction = 'credit'
         ), 0)::text AS admin_credit_usdt,
         COALESCE(SUM(amount_usdt) FILTER (
           WHERE journal_type = 'admin_adjust'
             AND account_kind = 'user_bucket'
             AND direction = 'debit'
         ), 0)::text AS admin_debit_usdt,
         COALESCE(SUM(amount_usdt) FILTER (
           WHERE journal_type = 'settlement'
             AND bucket = 'profit'
             AND direction = 'credit'
         ), 0)::text AS settlement_user_profit_usdt,
         COALESCE(SUM(amount_usdt) FILTER (
           WHERE journal_type = 'fee'
             AND account_kind = 'fee_revenue'
             AND direction = 'credit'
         ), 0)::text AS fee_usdt,
         COUNT(DISTINCT period)::text AS journal_count
       FROM line
       GROUP BY period
       ORDER BY period DESC`,
      [trunc, opts.from ?? null, opts.to ?? null],
    );

    // journal_count above is wrong (COUNT DISTINCT period) — recompute per bucket
    const counts = await this.db.query<{
      period: Date;
      journal_count: string;
    }>(
      `SELECT date_trunc($1, created_at) AS period,
              COUNT(*)::text AS journal_count
         FROM public.ledger_journals
        WHERE created_at >= COALESCE($2::timestamptz, now() - interval '90 days')
          AND created_at <= COALESCE($3::timestamptz, now())
        GROUP BY 1`,
      [trunc, opts.from ?? null, opts.to ?? null],
    );
    const countMap = new Map(
      counts.rows.map((c) => [c.period.toISOString(), c.journal_count]),
    );

    const buckets: FinancialReportBucket[] = r.rows.map((row) => ({
      period: row.period.toISOString(),
      depositUsdt: formatAmount(parseAmount(row.deposit_usdt)),
      withdrawUsdt: formatAmount(parseAmount(row.withdraw_usdt)),
      adminCreditUsdt: formatAmount(parseAmount(row.admin_credit_usdt)),
      adminDebitUsdt: formatAmount(parseAmount(row.admin_debit_usdt)),
      settlementUserProfitUsdt: formatAmount(
        parseAmount(row.settlement_user_profit_usdt),
      ),
      feeUsdt: formatAmount(parseAmount(row.fee_usdt)),
      journalCount: Number(
        countMap.get(row.period.toISOString()) ?? row.journal_count,
      ),
    }));

    return { granularity: opts.granularity, buckets };
  }

  async balanceAdjust(input: AdminAdjustInput) {
    this.validateAdjust(input);

    if (input.kind === "correct") {
      if (!input.reverseJournalId) {
        throw new BadRequestException("correct requires reverseJournalId");
      }
      const applyKind = input.applyKind ?? "credit";
      const original = await this.posting.getJournal(input.reverseJournalId);
      const reverseLines = original.entries.map((e) => ({
        account: { accountId: e.accountId },
        direction:
          e.direction === "debit"
            ? ("credit" as const)
            : ("debit" as const),
        amountUsdt: e.amountUsdt,
      }));
      const reversal = await this.posting.postJournal({
        idempotencyKey: `${input.idempotencyKey}:reversal`,
        journalType: "admin_adjust",
        lines: reverseLines,
        referenceType: "admin_adjust_reversal",
        referenceId: original.id,
        memo: input.reason,
        createdBy: input.createdBy,
        fxSnapshotId: input.fxSnapshotId ?? null,
      });

      const journal = await this.postJournalAdjust({
        userId: input.userId,
        bucket: input.bucket,
        kind: applyKind,
        amountUsdt: input.amountUsdt,
        reason: input.reason,
        idempotencyKey: `${input.idempotencyKey}:apply`,
        createdBy: input.createdBy,
        secondApproverId: input.secondApproverId,
        fxSnapshotId: input.fxSnapshotId,
      });

      this.bus.emit(LEDGER_EVENTS.adminBalanceCorrect, {
        userId: input.userId,
        reversalJournalId: reversal.id,
        journalId: journal.id,
        reason: input.reason,
      });

      const buckets = await this.buckets.getUserBuckets(input.userId);
      return {
        ok: true as const,
        kind: "correct" as const,
        reversal,
        journal,
        buckets,
        toastCode: "BALANCE_ADJUSTED" as const,
      };
    }

    const kind = input.kind;
    if (kind !== "credit" && kind !== "debit") {
      throw new BadRequestException("kind must be credit|debit|correct");
    }
    const journal = await this.postJournalAdjust({ ...input, kind });
    const event =
      kind === "credit"
        ? LEDGER_EVENTS.adminBalanceCredit
        : LEDGER_EVENTS.adminBalanceDebit;
    this.bus.emit(event, {
      userId: input.userId,
      journalId: journal.id,
      bucket: input.bucket,
      amountUsdt: input.amountUsdt,
      reason: input.reason,
    });

    const buckets = await this.buckets.getUserBuckets(input.userId);
    return {
      ok: true as const,
      kind,
      journal,
      buckets,
      toastCode: "BALANCE_ADJUSTED" as const,
      reused: journal.reused,
    };
  }

  private async postJournalAdjust(
    input: Omit<AdminAdjustInput, "kind"> & { kind: "credit" | "debit" },
  ) {
    const amountUsdt = assertAmountUsdt(input.amountUsdt);
    const userLine =
      input.kind === "credit"
        ? {
            account: { userId: input.userId, bucket: input.bucket },
            direction: "credit" as const,
            amountUsdt,
          }
        : {
            account: { userId: input.userId, bucket: input.bucket },
            direction: "debit" as const,
            amountUsdt,
          };
    const opsLine =
      input.kind === "credit"
        ? {
            account: { systemCode: SYSTEM_ACCOUNT_CODES.OPS_POOL },
            direction: "debit" as const,
            amountUsdt,
          }
        : {
            account: { systemCode: SYSTEM_ACCOUNT_CODES.OPS_POOL },
            direction: "credit" as const,
            amountUsdt,
          };

    return this.posting.postJournal({
      idempotencyKey: input.idempotencyKey,
      journalType: "admin_adjust",
      lines: [opsLine, userLine],
      referenceType: "admin_balance_adjust",
      referenceId: input.userId,
      memo: input.reason,
      createdBy: input.createdBy,
      fxSnapshotId: input.fxSnapshotId ?? null,
    });
  }

  private validateAdjust(input: AdminAdjustInput): void {
    if (!input.userId) throw new BadRequestException("userId required");
    if (!(USER_BUCKETS as readonly string[]).includes(input.bucket)) {
      throw new BadRequestException("bucket required (principal|profit|locked|practice)");
    }
    if (!["credit", "debit", "correct"].includes(input.kind)) {
      throw new BadRequestException("kind must be credit|debit|correct");
    }
    if (!input.reason || input.reason.trim().length < 10) {
      throw new BadRequestException("reason must be ≥10 characters");
    }
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }
    if (!input.createdBy) throw new BadRequestException("createdBy required");

    const amount = assertAmountUsdt(input.amountUsdt);
    if (cmpAmount(amount, ADMIN_ADJUST_DUAL_CONFIRM_USDT) > 0) {
      if (!input.secondApproverId) {
        throw new ForbiddenException(
          "DUAL_CONFIRM_REQUIRED: amount > 1000 USDT needs secondApproverId",
        );
      }
      if (input.secondApproverId === input.createdBy) {
        throw new ForbiddenException(
          "DUAL_CONFIRM_REQUIRED: secondApproverId must differ from createdBy",
        );
      }
    }
  }

  /** Expose recon for admin ledger surface */
  reconcile(userId?: string) {
    return this.recon.runReconciliation({ userId });
  }

  getBuckets(userId: string) {
    return this.buckets.getUserBuckets(userId);
  }
}

/** Type guard helper exported for verify scans */
export function isUserBucket(v: string): v is UserBucket {
  return (USER_BUCKETS as readonly string[]).includes(v);
}

/** Sum helper for invariant docs / tests */
export function bucketsSumEqualsLiability(b: {
  principalUsdt: string;
  profitUsdt: string;
  lockedUsdt: string;
  practiceUsdt: string;
  liabilityUsdt: string;
}): boolean {
  const sum = addAmount(
    addAmount(addAmount(b.principalUsdt, b.profitUsdt), b.lockedUsdt),
    b.practiceUsdt,
  );
  return cmpAmount(sum, b.liabilityUsdt) === 0;
}

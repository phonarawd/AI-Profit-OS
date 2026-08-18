/**
 * Ledger reconciliation — journals balanced · projection = entries · bucket invariant.
 * Mismatch ⇒ report + in-process event (circuit hook for later todos).
 */

import { Injectable } from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { LEDGER_EVENTS } from "./ledger.events";
import {
  addAmount,
  cmpAmount,
  formatAmount,
  parseAmount,
  subAmount,
} from "./ledger.money";
import {
  CREDIT_NORMAL_KINDS,
  DEBIT_NORMAL_KINDS,
  type ReconMismatch,
  type ReconReport,
} from "./ledger.types";

@Injectable()
export class LedgerReconService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
  ) {}

  async runReconciliation(opts?: {
    userId?: string;
    limitJournals?: number;
  }): Promise<ReconReport> {
    const mismatches: ReconMismatch[] = [];
    const limit = opts?.limitJournals ?? 5000;

    const journals = await this.db.query<{ id: string }>(
      `SELECT id FROM public.ledger_journals
        ORDER BY created_at DESC
        LIMIT $1`,
      [limit],
    );

    for (const j of journals.rows) {
      const lines = await this.db.query<{
        direction: "debit" | "credit";
        amount_usdt: string;
      }>(
        `SELECT direction, amount_usdt::text
           FROM public.ledger_entries WHERE journal_id = $1`,
        [j.id],
      );
      let debit = "0";
      let credit = "0";
      for (const l of lines.rows) {
        const amt = formatAmount(parseAmount(l.amount_usdt));
        if (l.direction === "debit") debit = addAmount(debit, amt);
        else credit = addAmount(credit, amt);
      }
      if (cmpAmount(debit, credit) !== 0) {
        mismatches.push({
          code: "JOURNAL_UNBALANCED",
          detail: `debit=${debit} credit=${credit}`,
          journalId: j.id,
        });
      }
    }

    const accounts = await this.db.query<{
      id: string;
      account_kind: string;
      balance_usdt: string;
      owner_user_id: string | null;
    }>(
      opts?.userId
        ? `SELECT id, account_kind, balance_usdt::text, owner_user_id::text
             FROM public.ledger_accounts
            WHERE owner_user_id = $1::uuid OR owner_type = 'system'`
        : `SELECT id, account_kind, balance_usdt::text, owner_user_id::text
             FROM public.ledger_accounts`,
      opts?.userId ? [opts.userId] : [],
    );

    for (const a of accounts.rows) {
      const agg = await this.db.query<{
        debit: string | null;
        credit: string | null;
      }>(
        `SELECT
           COALESCE(SUM(amount_usdt) FILTER (WHERE direction = 'debit'), 0)::text AS debit,
           COALESCE(SUM(amount_usdt) FILTER (WHERE direction = 'credit'), 0)::text AS credit
         FROM public.ledger_entries WHERE account_id = $1`,
        [a.id],
      );
      const debit = formatAmount(parseAmount(agg.rows[0]?.debit ?? "0"));
      const credit = formatAmount(parseAmount(agg.rows[0]?.credit ?? "0"));
      const expected = this.expectedBalance(a.account_kind, debit, credit);
      const actual = formatAmount(parseAmount(a.balance_usdt));
      if (cmpAmount(expected, actual) !== 0) {
        mismatches.push({
          code: "PROJECTION_DRIFT",
          detail: `expected=${expected} actual=${actual}`,
          accountId: a.id,
          userId: a.owner_user_id ?? undefined,
        });
      }
    }

    const users = await this.db.query<{
      user_id: string;
      principal_usdt: string;
      profit_usdt: string;
      locked_usdt: string;
      practice_usdt: string;
      liability_usdt: string;
    }>(
      opts?.userId
        ? `SELECT user_id::text, principal_usdt::text, profit_usdt::text,
                  locked_usdt::text, practice_usdt::text, liability_usdt::text
             FROM public.wallet_buckets WHERE user_id = $1::uuid`
        : `SELECT user_id::text, principal_usdt::text, profit_usdt::text,
                  locked_usdt::text, practice_usdt::text, liability_usdt::text
             FROM public.wallet_buckets
            WHERE principal_usdt <> 0 OR profit_usdt <> 0
               OR locked_usdt <> 0 OR practice_usdt <> 0
            LIMIT 10000`,
      opts?.userId ? [opts.userId] : [],
    );

    for (const u of users.rows) {
      const sum = addAmount(
        addAmount(
          addAmount(
            formatAmount(parseAmount(u.principal_usdt)),
            formatAmount(parseAmount(u.profit_usdt)),
          ),
          formatAmount(parseAmount(u.locked_usdt)),
        ),
        formatAmount(parseAmount(u.practice_usdt)),
      );
      const liability = formatAmount(parseAmount(u.liability_usdt));
      if (cmpAmount(sum, liability) !== 0) {
        mismatches.push({
          code: "BUCKET_INVARIANT",
          detail: `sum=${sum} liability=${liability}`,
          userId: u.user_id,
        });
      }
    }

    const report: ReconReport = {
      ok: mismatches.length === 0,
      checkedAt: new Date().toISOString(),
      journalsChecked: journals.rows.length,
      accountsChecked: accounts.rows.length,
      usersChecked: users.rows.length,
      mismatches,
    };

    if (!report.ok) {
      this.bus.emit(LEDGER_EVENTS.reconMismatch, report);
    }
    return report;
  }

  private expectedBalance(
    accountKind: string,
    debit: string,
    credit: string,
  ): string {
    if (DEBIT_NORMAL_KINDS.has(accountKind)) {
      return subAmount(debit, credit);
    }
    if (CREDIT_NORMAL_KINDS.has(accountKind)) {
      return subAmount(credit, debit);
    }
    return "0";
  }
}

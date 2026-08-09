/**
 * Double-entry posting SoT (Money §11 · §43.5 · §49).
 * ONLY path that mutates ledger_accounts.balance_usdt (app.ledger_posting=on).
 * Lock order: account_id ASC FOR UPDATE · idempotency_key UNIQUE silent reuse.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { PoolClient } from "pg";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { LEDGER_EVENTS } from "./ledger.events";
import {
  addAmount,
  assertAmountUsdt,
  cmpAmount,
  formatAmount,
  parseAmount,
  subAmount,
} from "./ledger.money";
import {
  CREDIT_NORMAL_KINDS,
  DEBIT_NORMAL_KINDS,
  PRACTICE_FORBIDDEN_JOURNAL_TYPES,
  type AccountRef,
  type JournalType,
  type LedgerEntryRow,
  type LedgerJournalRow,
  type PostingLineInput,
  type PostJournalInput,
  type UserBucket,
} from "./ledger.types";

type AccountRow = {
  id: string;
  code: string;
  account_kind: string;
  bucket: UserBucket | null;
  owner_user_id: string | null;
  balance_usdt: string;
};

@Injectable()
export class LedgerPostingService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
  ) {}

  async postJournal(input: PostJournalInput): Promise<LedgerJournalRow> {
    this.validateInput(input);

    let result: LedgerJournalRow;
    try {
      result = await this.db.withTransaction(async (client) => {
        // Enable balance projection updates for this TX only (§17 guard)
        await client.query("SELECT set_config('app.ledger_posting', 'on', true)");

        const existing = await this.findByIdempotency(
          client,
          input.idempotencyKey,
        );
        if (existing) return { ...existing, reused: true };

        const resolved = await this.resolveLines(client, input.lines);
        this.assertPracticeIsolation(input.journalType, resolved);
        this.assertBalanced(resolved);

        const accountIds = [
          ...new Set(resolved.map((l) => l.account.id)),
        ].sort();
        const locked = await this.lockAccountsAsc(client, accountIds);
        const byId = new Map(locked.map((a) => [a.id, a]));

        const deltas = new Map<string, string>();
        for (const line of resolved) {
          const acc = byId.get(line.account.id);
          if (!acc) throw new NotFoundException(`account ${line.account.id}`);
          const next = this.applyDelta(
            acc.balance_usdt,
            acc.account_kind,
            line.direction,
            line.amountUsdt,
          );
          if (acc.account_kind === "user_bucket" && cmpAmount(next, "0") < 0) {
            throw new BadRequestException("INSUFFICIENT_BALANCE");
          }
          deltas.set(acc.id, next);
          acc.balance_usdt = next;
        }

        const journal = await client.query<{
          id: string;
          idempotency_key: string;
          journal_type: JournalType;
          reference_type: string | null;
          reference_id: string | null;
          memo: string | null;
          fx_snapshot_id: string | null;
          created_by: string | null;
          created_at: Date;
        }>(
          `INSERT INTO public.ledger_journals (
             idempotency_key, journal_type, reference_type, reference_id,
             memo, fx_snapshot_id, created_by
           ) VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING id, idempotency_key, journal_type, reference_type, reference_id,
                     memo, fx_snapshot_id, created_by, created_at`,
          [
            input.idempotencyKey,
            input.journalType,
            input.referenceType ?? null,
            input.referenceId ?? null,
            input.memo ?? null,
            input.fxSnapshotId ?? null,
            input.createdBy ?? null,
          ],
        );

        const j = journal.rows[0];
        if (!j) throw new ConflictException("journal insert failed");

        const entries: LedgerEntryRow[] = [];
        for (const line of resolved) {
          const er = await client.query<{
            id: string;
            journal_id: string;
            account_id: string;
            direction: "debit" | "credit";
            amount_usdt: string;
            created_at: Date;
          }>(
            `INSERT INTO public.ledger_entries (
               journal_id, account_id, direction, amount_usdt
             ) VALUES ($1,$2,$3,$4::numeric)
             RETURNING id, journal_id, account_id, direction, amount_usdt::text, created_at`,
            [j.id, line.account.id, line.direction, line.amountUsdt],
          );
          const e = er.rows[0];
          entries.push({
            id: e.id,
            journalId: e.journal_id,
            accountId: e.account_id,
            direction: e.direction,
            amountUsdt: formatAmount(parseAmount(e.amount_usdt)),
            createdAt: e.created_at.toISOString(),
          });
        }

        for (const [accountId, balance] of deltas) {
          await client.query(
            `UPDATE public.ledger_accounts
               SET balance_usdt = $2::numeric
             WHERE id = $1`,
            [accountId, balance],
          );
        }

        return {
          id: j.id,
          idempotencyKey: j.idempotency_key,
          journalType: j.journal_type,
          referenceType: j.reference_type,
          referenceId: j.reference_id,
          memo: j.memo,
          fxSnapshotId: j.fx_snapshot_id,
          createdBy: j.created_by,
          createdAt: j.created_at.toISOString(),
          entries,
          reused: false,
        } satisfies LedgerJournalRow;
      });
    } catch (err: unknown) {
      // Unique violation on idempotency_key (23505) → silent reuse
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "23505"
      ) {
        const existing = await this.getByIdempotencyKey(input.idempotencyKey);
        if (existing) {
          result = { ...existing, reused: true };
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }

    if (!result.reused) {
      this.bus.emit(LEDGER_EVENTS.journalPosted, {
        journalId: result.id,
        journalType: result.journalType,
        idempotencyKey: result.idempotencyKey,
      });
    }
    return result;
  }

  async getByIdempotencyKey(key: string): Promise<LedgerJournalRow | null> {
    const client = await this.db.query<{ id: string }>(
      `SELECT id FROM public.ledger_journals WHERE idempotency_key = $1`,
      [key],
    );
    if (!client.rows[0]) return null;
    return this.getJournal(client.rows[0].id);
  }

  async getJournal(journalId: string): Promise<LedgerJournalRow> {
    const jr = await this.db.query<{
      id: string;
      idempotency_key: string;
      journal_type: JournalType;
      reference_type: string | null;
      reference_id: string | null;
      memo: string | null;
      fx_snapshot_id: string | null;
      created_by: string | null;
      created_at: Date;
    }>(
      `SELECT id, idempotency_key, journal_type, reference_type, reference_id,
              memo, fx_snapshot_id, created_by, created_at
         FROM public.ledger_journals WHERE id = $1`,
      [journalId],
    );
    const j = jr.rows[0];
    if (!j) throw new NotFoundException("journal not found");
    const er = await this.db.query<{
      id: string;
      journal_id: string;
      account_id: string;
      direction: "debit" | "credit";
      amount_usdt: string;
      created_at: Date;
    }>(
      `SELECT id, journal_id, account_id, direction, amount_usdt::text, created_at
         FROM public.ledger_entries WHERE journal_id = $1 ORDER BY id ASC`,
      [j.id],
    );
    return {
      id: j.id,
      idempotencyKey: j.idempotency_key,
      journalType: j.journal_type,
      referenceType: j.reference_type,
      referenceId: j.reference_id,
      memo: j.memo,
      fxSnapshotId: j.fx_snapshot_id,
      createdBy: j.created_by,
      createdAt: j.created_at.toISOString(),
      reused: false,
      entries: er.rows.map((e) => ({
        id: e.id,
        journalId: e.journal_id,
        accountId: e.account_id,
        direction: e.direction,
        amountUsdt: formatAmount(parseAmount(e.amount_usdt)),
        createdAt: e.created_at.toISOString(),
      })),
    };
  }

  private validateInput(input: PostJournalInput): void {
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }
    if (!input.lines || input.lines.length < 2) {
      throw new BadRequestException("journal requires ≥2 lines");
    }
  }

  private assertBalanced(
    lines: Array<{ direction: "debit" | "credit"; amountUsdt: string }>,
  ): void {
    let debit = "0";
    let credit = "0";
    for (const l of lines) {
      if (l.direction === "debit") debit = addAmount(debit, l.amountUsdt);
      else credit = addAmount(credit, l.amountUsdt);
    }
    if (cmpAmount(debit, credit) !== 0) {
      throw new BadRequestException(
        `unbalanced journal debit=${debit} credit=${credit}`,
      );
    }
  }

  private assertPracticeIsolation(
    journalType: JournalType,
    lines: Array<{ account: AccountRow }>,
  ): void {
    if (!PRACTICE_FORBIDDEN_JOURNAL_TYPES.has(journalType)) return;
    for (const l of lines) {
      if (l.account.bucket === "practice") {
        throw new BadRequestException(
          "PRACTICE_PATH_FORBIDDEN: practice bucket cannot enter withdraw/participate/settlement paths",
        );
      }
    }
  }

  private applyDelta(
    current: string,
    accountKind: string,
    direction: "debit" | "credit",
    amount: string,
  ): string {
    const debitNormal = DEBIT_NORMAL_KINDS.has(accountKind);
    const creditNormal = CREDIT_NORMAL_KINDS.has(accountKind);
    if (!debitNormal && !creditNormal) {
      throw new BadRequestException(`unknown account_kind ${accountKind}`);
    }
    const increases =
      (debitNormal && direction === "debit") ||
      (creditNormal && direction === "credit");
    return increases ? addAmount(current, amount) : subAmount(current, amount);
  }

  private async resolveLines(
    client: PoolClient,
    lines: PostingLineInput[],
  ): Promise<Array<{ account: AccountRow; direction: "debit" | "credit"; amountUsdt: string }>> {
    const out: Array<{
      account: AccountRow;
      direction: "debit" | "credit";
      amountUsdt: string;
    }> = [];
    for (const line of lines) {
      const amountUsdt = assertAmountUsdt(line.amountUsdt);
      const account = await this.resolveAccount(client, line.account);
      out.push({ account, direction: line.direction, amountUsdt });
    }
    return out;
  }

  private async resolveAccount(
    client: PoolClient,
    ref: AccountRef,
  ): Promise<AccountRow> {
    if ("accountId" in ref) {
      const r = await client.query<AccountRow>(
        `SELECT id, code, account_kind, bucket, owner_user_id,
                balance_usdt::text AS balance_usdt
           FROM public.ledger_accounts WHERE id = $1`,
        [ref.accountId],
      );
      if (!r.rows[0]) throw new NotFoundException("account not found");
      return r.rows[0];
    }
    if ("systemCode" in ref) {
      const r = await client.query<AccountRow>(
        `SELECT id, code, account_kind, bucket, owner_user_id,
                balance_usdt::text AS balance_usdt
           FROM public.ledger_accounts WHERE code = $1`,
        [ref.systemCode],
      );
      if (!r.rows[0]) throw new NotFoundException(`system account ${ref.systemCode}`);
      return r.rows[0];
    }
    const r = await client.query<AccountRow>(
      `SELECT id, code, account_kind, bucket, owner_user_id,
              balance_usdt::text AS balance_usdt
         FROM public.ledger_accounts
        WHERE owner_user_id = $1 AND bucket = $2`,
      [ref.userId, ref.bucket],
    );
    if (!r.rows[0]) {
      throw new NotFoundException(
        `user bucket missing · call provision_user_bucket_accounts(${ref.userId})`,
      );
    }
    return r.rows[0];
  }

  /** Deadlock-safe: always lock in account_id ASC order (§43.5). */
  private async lockAccountsAsc(
    client: PoolClient,
    accountIds: string[],
  ): Promise<AccountRow[]> {
    if (accountIds.length === 0) return [];
    const r = await client.query<AccountRow>(
      `SELECT id, code, account_kind, bucket, owner_user_id,
              balance_usdt::text AS balance_usdt
         FROM public.ledger_accounts
        WHERE id = ANY($1::uuid[])
        ORDER BY id ASC
        FOR UPDATE`,
      [accountIds],
    );
    if (r.rows.length !== accountIds.length) {
      throw new NotFoundException("one or more accounts missing under lock");
    }
    return r.rows;
  }

  private async findByIdempotency(
    client: PoolClient,
    key: string,
  ): Promise<LedgerJournalRow | null> {
    return this.loadJournal(client, { idempotencyKey: key });
  }

  private async loadJournal(
    client: PoolClient,
    q: { id?: string; idempotencyKey?: string },
  ): Promise<LedgerJournalRow | null> {
    const jr = q.id
      ? await client.query<{
          id: string;
          idempotency_key: string;
          journal_type: JournalType;
          reference_type: string | null;
          reference_id: string | null;
          memo: string | null;
          fx_snapshot_id: string | null;
          created_by: string | null;
          created_at: Date;
        }>(
          `SELECT id, idempotency_key, journal_type, reference_type, reference_id,
                  memo, fx_snapshot_id, created_by, created_at
             FROM public.ledger_journals WHERE id = $1`,
          [q.id],
        )
      : await client.query<{
          id: string;
          idempotency_key: string;
          journal_type: JournalType;
          reference_type: string | null;
          reference_id: string | null;
          memo: string | null;
          fx_snapshot_id: string | null;
          created_by: string | null;
          created_at: Date;
        }>(
          `SELECT id, idempotency_key, journal_type, reference_type, reference_id,
                  memo, fx_snapshot_id, created_by, created_at
             FROM public.ledger_journals WHERE idempotency_key = $1`,
          [q.idempotencyKey],
        );
    const j = jr.rows[0];
    if (!j) return null;
    const er = await client.query<{
      id: string;
      journal_id: string;
      account_id: string;
      direction: "debit" | "credit";
      amount_usdt: string;
      created_at: Date;
    }>(
      `SELECT id, journal_id, account_id, direction, amount_usdt::text, created_at
         FROM public.ledger_entries WHERE journal_id = $1 ORDER BY id ASC`,
      [j.id],
    );
    return {
      id: j.id,
      idempotencyKey: j.idempotency_key,
      journalType: j.journal_type,
      referenceType: j.reference_type,
      referenceId: j.reference_id,
      memo: j.memo,
      fxSnapshotId: j.fx_snapshot_id,
      createdBy: j.created_by,
      createdAt: j.created_at.toISOString(),
      reused: false,
      entries: er.rows.map((e) => ({
        id: e.id,
        journalId: e.journal_id,
        accountId: e.account_id,
        direction: e.direction,
        amountUsdt: formatAmount(parseAmount(e.amount_usdt)),
        createdAt: e.created_at.toISOString(),
      })),
    };
  }
}

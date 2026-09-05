/**
 * Double-entry posting SoT (Money §11 · §43.5 · §49).
 * ONLY path that mutates ledger_accounts.balance_usdt (app.ledger_posting=on).
 * Lock order: account_id ASC FOR UPDATE · idempotency_key UNIQUE
 * · same key + same fingerprint → reuse · different fingerprint → 409 conflict.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { PoolClient } from "pg";
import { PostgresService } from "../db/postgres";
import {
  assertFingerprintMatch,
  fingerprintPayload,
  ledgerJournalSemantic,
} from "./idempotency-fingerprint";
import { LEDGER_EVENTS } from "./ledger.events";
import { LedgerOutboxService } from "./ledger.outbox.service";
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
    private readonly outbox: LedgerOutboxService,
  ) {}

  async postJournal(input: PostJournalInput): Promise<LedgerJournalRow> {
    this.validateInput(input);
    const requestFingerprint = this.fingerprintForInput(input);

    let result: LedgerJournalRow;
    try {
      result = await this.db.withTransaction((client) =>
        this.postJournalCore(client, input, requestFingerprint),
      );
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
          await this.assertExistingFingerprintById(
            existing.id,
            requestFingerprint,
          );
          result = { ...existing, reused: true };
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }

    if (!result.reused) {
      // Clause2/3 — crash-safe replay via outbox · emit() return ≠ ack
      await this.outbox.drain(20);
    }
    return result;
  }

  /**
   * Money-safety fix (PUTDUK continuation session, Step 7.1): posts a
   * journal on a transaction the CALLER already opened and will commit or
   * roll back as a whole, instead of postJournal's own always-separate
   * transaction. Exists so a caller like ParticipateService can make
   * "lock principal->locked" and "create the trade/participate_request
   * rows that account for that lock" a single atomic unit - if the
   * caller's later statements fail for any reason, this journal's ledger
   * entries and balance updates roll back with them, so a mid-flow DB
   * error can never leave locked capital with no matching trade (the
   * previous two-separate-transactions design's real gap).
   *
   * Deliberately does NOT swallow a 23505 unique-violation the way
   * postJournal does - inside a caller-managed transaction, a constraint
   * violation aborts that whole transaction (Postgres marks it failed
   * until ROLLBACK), so there is no safe "quietly read the existing row on
   * this same connection" fallback here. The caller must catch the error
   * to their transaction, ROLLBACK, and only then check for prior
   * completion on a fresh connection (which ParticipateService.
   * insertAccepted does - see its own comment for the exact contract).
   * Outbox draining is also the caller's responsibility, once, after its
   * own transaction actually commits - draining here would run before the
   * caller's other writes are even durable.
   */
  async postJournalInTransaction(
    client: PoolClient,
    input: PostJournalInput,
  ): Promise<LedgerJournalRow> {
    this.validateInput(input);
    const requestFingerprint = this.fingerprintForInput(input);
    return this.postJournalCore(client, input, requestFingerprint);
  }

  private async postJournalCore(
    client: PoolClient,
    input: PostJournalInput,
    requestFingerprint: string,
  ): Promise<LedgerJournalRow> {
    // Enable balance projection updates for this TX only (§17 guard)
    await client.query("SELECT set_config('app.ledger_posting', 'on', true)");

    const existing = await this.findByIdempotency(client, input.idempotencyKey);
    if (existing) {
      await this.assertExistingFingerprint(client, existing.id, requestFingerprint);
      return { ...existing, reused: true };
    }

    const resolved = await this.resolveLines(client, input.lines);
    this.assertPracticeIsolation(input.journalType, resolved);
    this.assertBalanced(resolved);

    const accountIds = [...new Set(resolved.map((l) => l.account.id))].sort();
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
         memo, fx_snapshot_id, created_by, request_fingerprint
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
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
        requestFingerprint,
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

    // Clause1 — publication intent in same TX as ledger commit (emit≠여기)
    await client.query(
      `INSERT INTO public.ledger_outbox_events (journal_id, event_name, payload)
       VALUES ($1, $2, $3::jsonb)`,
      [
        j.id,
        LEDGER_EVENTS.journalPosted,
        JSON.stringify({
          journalId: j.id,
          journalType: j.journal_type,
          idempotencyKey: j.idempotency_key,
        }),
      ],
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
      entries,
      reused: false,
    } satisfies LedgerJournalRow;
  }

  /**
   * Lets a caller that owns a transaction (postJournalInTransaction) drain
   * the outbox exactly once, after its own transaction has actually
   * committed - draining is otherwise private to postJournal itself.
   */
  async drainOutboxAfterCommit(): Promise<void> {
    await this.outbox.drain(20);
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

  private fingerprintForInput(input: PostJournalInput): string {
    const lines = input.lines.map((l) => ({
      accountCode: this.accountRefKey(l.account),
      direction: l.direction,
      amountUsdt: formatAmount(parseAmount(l.amountUsdt)),
    }));
    return fingerprintPayload(
      ledgerJournalSemantic({
        journalType: input.journalType,
        lines,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      }),
    );
  }

  private accountRefKey(ref: AccountRef): string {
    if ("accountId" in ref) return `id:${ref.accountId}`;
    if ("systemCode" in ref) return `sys:${ref.systemCode}`;
    return `user:${ref.userId}:${ref.bucket}`;
  }

  private async assertExistingFingerprint(
    querier: PostgresService | PoolClient,
    journalId: string,
    incoming: string,
  ): Promise<void> {
    const text = `SELECT request_fingerprint
         FROM public.ledger_journals WHERE id = $1`;
    const params = [journalId];
    // PoolClient.query와 PostgresService.query는 오버로드가 달라 유니온에서 직접 호출 불가.
    // release 유무로 좁혀 각 시그니처를 그대로 호출한다(쿼리 의미는 동일).
    const r =
      "release" in querier
        ? await querier.query<{ request_fingerprint: string | null }>(
            text,
            params,
          )
        : await querier.query<{ request_fingerprint: string | null }>(
            text,
            params,
          );
    const stored = r.rows[0]?.request_fingerprint;
    // legacy(null): 이전 silent-reuse 유지 · fingerprint 있는 행만 conflict 강제
    assertFingerprintMatch({ stored, incoming });
  }

  private async assertExistingFingerprintById(
    journalId: string,
    incoming: string,
  ): Promise<void> {
    await this.assertExistingFingerprint(this.db, journalId, incoming);
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
